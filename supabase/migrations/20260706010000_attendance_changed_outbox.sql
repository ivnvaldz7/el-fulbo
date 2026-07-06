create or replace function public.update_attendance(
  p_event_id uuid,
  p_status public.attendance_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  target_player public.players%rowtype;
  old_status public.attendance_status;
  hours_to_event numeric;
  max_p integer;
  going_count integer;
  first_waitlist_player_id uuid;
  first_waitlist_user_id uuid;
begin
  select *
  into target_event
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if target_event.status not in ('scheduled', 'confirming') then
    raise exception 'CONFLICT: el partido ya arrancó o terminó';
  end if;

  select *
  into target_player
  from public.players
  where group_id = target_event.group_id
    and user_id = auth.uid()
    and archived_at is null;

  if not found then
    raise exception 'FORBIDDEN';
  end if;

  if target_player.stats_status = 'pending_approval' then
    raise exception 'STATS_PENDING_APPROVAL';
  end if;

  select status
  into old_status
  from public.event_attendances
  where event_id = p_event_id
    and player_id = target_player.id;

  if p_status = 'going' and (old_status is null or old_status <> 'going') then
    max_p := case target_event.modality
      when 'F5' then 10
      when 'F6' then 12
      when 'F7' then 14
      when 'F8' then 16
      when 'F9' then 18
      when 'F11' then 22
      else 10
    end;

    select count(*) into going_count
    from public.event_attendances
    where event_id = p_event_id and status = 'going' and player_id <> target_player.id;

    if going_count >= max_p then
      p_status := 'waitlist';
    end if;
  end if;

  insert into public.event_attendances (event_id, player_id, status)
  values (p_event_id, target_player.id, p_status)
  on conflict (event_id, player_id)
  do update
    set status = excluded.status,
        updated_at = now();

  if p_status in ('going', 'not_going')
     and (old_status is null or old_status <> p_status) then
    perform public.create_notification_once(
      recipients.user_id,
      'attendance_changed'::public.notification_type,
      jsonb_build_object(
        'group_id', target_event.group_id,
        'event_id', p_event_id,
        'player_id', target_player.id,
        'player_name', target_player.display_name,
        'status', p_status,
        'old_status', old_status,
        'scheduled_at', target_event.scheduled_at,
        'field_name', target_event.field_name
      ),
      'attendance_changed:' || p_event_id::text || ':' || target_player.id::text || ':' || p_status::text || ':' || recipients.user_id::text
    )
    from (
      select g.admin_user_id as user_id
      from public.groups g
      where g.id = target_event.group_id

      union

      select gm.user_id
      from public.group_memberships gm
      where gm.group_id = target_event.group_id
        and gm.role = 'owner'::public.group_role
    ) recipients
    where recipients.user_id <> auth.uid();
  end if;

  hours_to_event := extract(epoch from (target_event.scheduled_at - now())) / 3600;

  if (old_status in ('going', 'maybe') or old_status is null)
     and p_status = 'not_going'
     and hours_to_event < 6 then
    insert into public.notifications (user_id, type, payload)
    select
      g.admin_user_id,
      'someone_dropped',
      jsonb_build_object(
        'event_id', p_event_id,
        'player_id', target_player.id,
        'player_name', target_player.display_name,
        'hours_to_event', hours_to_event
      )
    from public.groups g
    where g.id = target_event.group_id;
  end if;

  if old_status = 'going' and p_status <> 'going' then
    select ea.player_id, p.user_id
    into first_waitlist_player_id, first_waitlist_user_id
    from public.event_attendances ea
    join public.players p on p.id = ea.player_id
    where ea.event_id = p_event_id and ea.status = 'waitlist'
    order by ea.updated_at asc
    limit 1;
    
    if first_waitlist_player_id is not null then
      update public.event_attendances
      set status = 'going',
          updated_at = now()
      where event_id = p_event_id and player_id = first_waitlist_player_id;
      
      if first_waitlist_user_id is not null then
        insert into public.notifications (user_id, type, payload)
        values (
          first_waitlist_user_id,
          'waitlist_promoted',
          jsonb_build_object(
            'event_id', p_event_id,
            'player_id', first_waitlist_player_id,
            'field_name', target_event.field_name
          )
        );
      end if;
    end if;
  end if;
end;
$$;

create or replace function public.claim_attendance_changed_push_notifications(
  p_limit integer default 50,
  p_max_attempts integer default 3
)
returns table (
  notification_id uuid,
  user_id uuid,
  type public.notification_type,
  payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select n.id
    from public.notifications n
    where n.pushed_at is null
      and n.type = 'attendance_changed'::public.notification_type
      and n.push_attempt_count < p_max_attempts
      and exists (
        select 1
        from public.user_notification_preferences pref
        where pref.user_id = n.user_id
          and pref.push_enabled = true
      )
      and exists (
        select 1
        from public.push_subscriptions sub
        where sub.user_id = n.user_id
      )
      and (
        (
          n.payload ? 'scheduled_at'
          and n.payload->>'scheduled_at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
          and (n.payload->>'scheduled_at')::timestamptz > now()
        )
        or (
          not (
            n.payload ? 'scheduled_at'
            and n.payload->>'scheduled_at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
          )
          and n.created_at >= now() - interval '24 hours'
        )
      )
    order by n.created_at asc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    for update skip locked
  )
  update public.notifications n
  set
    push_attempted_at = now(),
    push_attempt_count = n.push_attempt_count + 1
  from candidates c
  where n.id = c.id
  returning n.id, n.user_id, n.type, n.payload;
end;
$$;

revoke execute on function public.claim_attendance_changed_push_notifications(integer, integer) from public;
revoke execute on function public.claim_attendance_changed_push_notifications(integer, integer) from anon;
revoke execute on function public.claim_attendance_changed_push_notifications(integer, integer) from authenticated;
grant execute on function public.claim_attendance_changed_push_notifications(integer, integer) to service_role;
