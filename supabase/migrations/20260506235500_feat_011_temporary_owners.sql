create or replace function public.designate_temporary_owners(
  p_event_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_group public.groups%rowtype;
  v_inserted integer := 0;
  v_candidate record;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if v_event.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select *
  into v_group
  from public.groups
  where id = v_event.group_id
    and archived_at is null;

  if v_group.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_event.status <> 'scheduled' then
    return 0;
  end if;

  if exists (
    select 1
    from public.event_attendances ea
    join public.players p on p.id = ea.player_id
    where ea.event_id = v_event.id
      and p.user_id = v_group.admin_user_id
      and ea.status = 'going'
      and p.archived_at is null
  ) then
    return 0;
  end if;

  if exists (
    select 1
    from public.group_memberships gm
    join public.players p on p.user_id = gm.user_id and p.group_id = gm.group_id
    join public.event_attendances ea on ea.player_id = p.id and ea.event_id = v_event.id
    where gm.group_id = v_event.group_id
      and gm.role = 'owner'
      and ea.status = 'going'
      and p.archived_at is null
  ) then
    return 0;
  end if;

  for v_candidate in
    select
      p.user_id,
      p.display_name
    from public.event_attendances ea
    join public.players p on p.id = ea.player_id
    where ea.event_id = v_event.id
      and ea.status = 'going'
      and p.user_id is not null
      and p.is_phantom = false
      and p.archived_at is null
      and p.user_id <> v_group.admin_user_id
      and not exists (
        select 1
        from public.group_memberships gm
        where gm.group_id = v_event.group_id
          and gm.user_id = p.user_id
          and gm.role = 'owner'
      )
      and not exists (
        select 1
        from public.temporary_owners t
        where t.event_id = v_event.id
          and t.user_id = p.user_id
      )
    order by p.joined_at asc
    limit greatest(0, 2 - (
      select count(*)
      from public.temporary_owners t
      where t.event_id = v_event.id
    ))
  loop
    insert into public.temporary_owners (
      event_id,
      user_id,
      assigned_reason,
      expires_at
    )
    values (
      v_event.id,
      v_candidate.user_id,
      'admin_no_confirm_no_owners',
      v_event.scheduled_at + interval '24 hours'
    )
    on conflict (event_id, user_id) do nothing;

    if found then
      v_inserted := v_inserted + 1;

      insert into public.notifications (user_id, type, payload)
      values (
        v_candidate.user_id,
        'owner_temporary_assigned',
        jsonb_build_object(
          'event_id', v_event.id,
          'group_id', v_event.group_id,
          'group_name', v_group.name,
          'scheduled_at', v_event.scheduled_at,
          'field_name', v_event.field_name
        )
      );
    end if;
  end loop;

  if v_inserted = 0
     and not exists (
       select 1
       from public.temporary_owners t
       where t.event_id = v_event.id
     ) then
    insert into public.notifications (user_id, type, payload)
    values (
      v_group.admin_user_id,
      'owner_temporary_no_one_accepted',
      jsonb_build_object(
        'event_id', v_event.id,
        'group_id', v_event.group_id,
        'field_name', v_event.field_name,
        'scheduled_at', v_event.scheduled_at
      )
    );
  end if;

  return v_inserted;
end;
$$;

create or replace function public.respond_temporary_owner_invite(
  p_event_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_group public.groups%rowtype;
  v_assignment public.temporary_owners%rowtype;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if v_event.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select *
  into v_group
  from public.groups
  where id = v_event.group_id;

  select *
  into v_assignment
  from public.temporary_owners
  where event_id = p_event_id
    and user_id = auth.uid();

  if v_assignment.id is null then
    raise exception 'FORBIDDEN';
  end if;

  if p_accept then
    update public.temporary_owners
    set confirmed_at = now()
    where id = v_assignment.id;

    insert into public.notifications (user_id, type, payload)
    values (
      v_group.admin_user_id,
      'owner_temporary_accepted',
      jsonb_build_object(
        'event_id', v_event.id,
        'group_id', v_group.id,
        'user_id', auth.uid()
      )
    );
  else
    delete from public.temporary_owners
    where id = v_assignment.id;

    insert into public.notifications (user_id, type, payload)
    values (
      v_group.admin_user_id,
      'owner_temporary_rejected',
      jsonb_build_object(
        'event_id', v_event.id,
        'group_id', v_group.id,
        'user_id', auth.uid()
      )
    );

    perform public.designate_temporary_owners(v_event.id);
  end if;
end;
$$;

create or replace function public.process_temporary_owner_jobs()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_designated integer := 0;
  v_expired integer := 0;
begin
  update public.temporary_owners
  set confirmed_at = null
  where confirmed_at is not null
    and expires_at < now();

  get diagnostics v_expired = row_count;

  for v_event in
    select e.id
    from public.events e
    where e.status = 'scheduled'
      and e.scheduled_at between now() + interval '1 hour' and now() + interval '2 hours'
  loop
    v_designated := v_designated + public.designate_temporary_owners(v_event.id);
  end loop;

  return jsonb_build_object(
    'designated', v_designated,
    'expired', v_expired
  );
end;
$$;
