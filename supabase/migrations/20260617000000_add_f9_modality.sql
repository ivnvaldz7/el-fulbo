-- Add F9 (9 vs 9) modality to the modality enum
-- Requires: F9 is already defined in TypeScript types, Zod schemas, formations, and UI

alter type public.modality add value if not exists 'F9';

-- Update waitlist max players calculation to include F9
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

  -- Logic to calculate waitlist on 'going'
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

  -- Waitlist promotion logic
  if old_status = 'going' and p_status <> 'going' then
    -- A spot opened up!
    -- Find the first person in the waitlist
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
      
      -- Send notification to the promoted player
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
