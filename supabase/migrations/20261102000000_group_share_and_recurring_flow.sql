alter table public.groups
  add column if not exists public_attendance_token uuid not null default gen_random_uuid();

create unique index if not exists groups_public_attendance_token_unique
  on public.groups (public_attendance_token);

alter table public.events
  add column if not exists recurring_schedule_id uuid
  references public.group_recurring_schedules(id) on delete set null;

create unique index if not exists events_recurring_occurrence_unique
  on public.events (recurring_schedule_id, scheduled_at)
  where recurring_schedule_id is not null;

create table if not exists public.event_guest_claims (
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  guest_key uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_id, player_id),
  unique (event_id, guest_key)
);

alter table public.event_guest_claims enable row level security;

create or replace function public.open_recurring_event(
  p_schedule_id uuid,
  p_scheduled_at timestamptz
)
returns table(event_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.group_recurring_schedules%rowtype;
  v_event_id uuid;
begin
  select * into v_schedule
  from public.group_recurring_schedules
  where id = p_schedule_id and active = true;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if auth.role() <> 'service_role' and not public.is_group_admin_or_owner(v_schedule.group_id) then
    raise exception 'FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_schedule.id::text || p_scheduled_at::text));

  select id into v_event_id
  from public.events
  where recurring_schedule_id = v_schedule.id
    and scheduled_at = p_scheduled_at;

  if v_event_id is not null then
    return query select v_event_id, false;
    return;
  end if;

  insert into public.events (
    group_id,
    modality,
    field_name,
    field_maps_url,
    scheduled_at,
    notes,
    status,
    created_by_user_id,
    recurring_schedule_id
  ) values (
    v_schedule.group_id,
    v_schedule.modality,
    v_schedule.field_name,
    v_schedule.field_maps_url,
    p_scheduled_at,
    v_schedule.notes,
    'scheduled',
    (select admin_user_id from public.groups where id = v_schedule.group_id),
    v_schedule.id
  ) returning id into v_event_id;

  return query select v_event_id, true;
end;
$$;

create or replace function public.get_shared_group_attendance(
  p_share_token uuid,
  p_guest_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups%rowtype;
  v_event public.events%rowtype;
  v_guest_player_id uuid;
  v_max_players integer;
begin
  select * into v_group
  from public.groups
  where public_attendance_token = p_share_token
    and archived_at is null;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_event
  from public.events
  where group_id = v_group.id
    and status in ('scheduled', 'confirming')
    and scheduled_at >= now() - interval '4 hours'
  order by scheduled_at asc
  limit 1;

  if not found then
    return jsonb_build_object('groupName', v_group.name, 'event', null, 'attendees', '[]'::jsonb);
  end if;

  if p_guest_key is not null then
    select player_id into v_guest_player_id
    from public.event_guest_claims
    where event_id = v_event.id and guest_key = p_guest_key;
  end if;

  v_max_players := case v_event.modality
    when 'F5' then 10 when 'F6' then 12 when 'F7' then 14
    when 'F8' then 16 when 'F9' then 18 when 'F11' then 22 else 10 end;

  return jsonb_build_object(
    'groupId', v_group.id,
    'groupName', v_group.name,
    'event', jsonb_build_object(
      'id', v_event.id,
      'fieldName', v_event.field_name,
      'scheduledAt', v_event.scheduled_at,
      'modality', v_event.modality,
      'notes', v_event.notes,
      'maxPlayers', v_max_players,
      'guestPlayerId', v_guest_player_id
    ),
    'attendees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'playerId', player.id,
        'displayName', player.display_name,
        'status', attendance.status,
        'isGuest', player.is_phantom
      ) order by attendance.created_at asc)
      from public.event_attendances attendance
      join public.players player on player.id = attendance.player_id
      where attendance.event_id = v_event.id
        and attendance.status in ('going', 'waitlist', 'maybe')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.reserve_shared_guest_attendance(
  p_share_token uuid,
  p_event_id uuid,
  p_guest_key uuid,
  p_display_name text,
  p_status public.attendance_status default 'going'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups%rowtype;
  v_event public.events%rowtype;
  v_player_id uuid;
  v_max_players integer;
  v_going_count integer;
  v_status public.attendance_status;
  v_old_status public.attendance_status;
  v_next_waitlist_player_id uuid;
begin
  select * into v_group
  from public.groups
  where public_attendance_token = p_share_token and archived_at is null;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id and group_id = v_group.id
  for update;

  if not found or v_event.status not in ('scheduled', 'confirming') then
    raise exception 'CONFLICT';
  end if;

  if char_length(trim(p_display_name)) not between 2 and 40 then
    raise exception 'VALIDATION_ERROR';
  end if;

  select claim.player_id into v_player_id
  from public.event_guest_claims claim
  join public.events claimed_event on claimed_event.id = claim.event_id
  where claimed_event.group_id = v_group.id
    and claim.guest_key = p_guest_key
  order by claim.created_at desc
  limit 1;

  if v_player_id is null then
    insert into public.players (
      user_id, group_id, display_name, primary_position, stats_status, stats, is_phantom
    ) values (
      null, v_group.id, trim(p_display_name), 'MED', 'approved',
      jsonb_build_object('pac', 6, 'sho', 6, 'pas', 6, 'dri', 6, 'def', 6, 'phy', 6), true
    ) returning id into v_player_id;

    insert into public.event_guest_claims (event_id, player_id, guest_key)
    values (p_event_id, v_player_id, p_guest_key);
  else
    update public.players set display_name = trim(p_display_name)
    where id = v_player_id;
  end if;

  select status into v_old_status
  from public.event_attendances
  where event_id = p_event_id and player_id = v_player_id;

  v_status := p_status;
  if p_status = 'going' then
    v_max_players := case v_event.modality
      when 'F5' then 10 when 'F6' then 12 when 'F7' then 14
      when 'F8' then 16 when 'F9' then 18 when 'F11' then 22 else 10 end;

    select count(*) into v_going_count
    from public.event_attendances
    where event_id = p_event_id and status = 'going' and player_id <> v_player_id;

    if v_going_count >= v_max_players then
      v_status := 'waitlist';
    end if;
  end if;

  insert into public.event_attendances (event_id, player_id, status, checked_in, checked_in_at)
  values (p_event_id, v_player_id, v_status, false, null)
  on conflict (event_id, player_id) do update
  set status = excluded.status, checked_in = false, checked_in_at = null, updated_at = now();

  if v_old_status = 'going' and v_status <> 'going' then
    select player_id into v_next_waitlist_player_id
    from public.event_attendances
    where event_id = p_event_id and status = 'waitlist'
    order by updated_at asc
    limit 1;

    if v_next_waitlist_player_id is not null then
      update public.event_attendances
      set status = 'going', updated_at = now()
      where event_id = p_event_id and player_id = v_next_waitlist_player_id;
    end if;
  end if;

  return jsonb_build_object('playerId', v_player_id, 'status', v_status);
end;
$$;

create or replace function public.get_shared_mvp_vote(
  p_share_token uuid,
  p_event_id uuid,
  p_guest_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups%rowtype;
  v_event public.events%rowtype;
  v_guest_player_id uuid;
begin
  select * into v_group from public.groups where public_attendance_token = p_share_token and archived_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_event from public.events where id = p_event_id and group_id = v_group.id;
  if not found or v_event.status <> 'played' then raise exception 'NOT_FOUND'; end if;

  if p_guest_key is not null then
    select player_id into v_guest_player_id from public.event_guest_claims
    where event_id = p_event_id and guest_key = p_guest_key;
  end if;

  return jsonb_build_object(
    'groupId', v_group.id,
    'groupName', v_group.name,
    'fieldName', v_event.field_name,
    'playedAt', v_event.played_at,
    'isClosed', v_event.mvp_player_id is not null or (v_event.played_at is not null and now() > v_event.played_at + interval '24 hours'),
    'guestPlayerId', v_guest_player_id,
    'hasVoted', exists(select 1 from public.event_mvp_votes where event_id = p_event_id and voter_player_id = v_guest_player_id),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('playerId', player.id, 'displayName', player.display_name, 'votes', coalesce(votes.total, 0)))
      from public.match_participations participation
      join public.players player on player.id = participation.player_id
      left join (
        select voted_player_id, count(*)::integer as total from public.event_mvp_votes where event_id = p_event_id group by voted_player_id
      ) votes on votes.voted_player_id = player.id
      where participation.event_id = p_event_id and participation.team in ('A', 'B')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_shared_guest_mvp_vote(
  p_share_token uuid,
  p_event_id uuid,
  p_guest_key uuid,
  p_voted_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups%rowtype;
  v_event public.events%rowtype;
  v_voter_player_id uuid;
begin
  select * into v_group from public.groups where public_attendance_token = p_share_token and archived_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_event from public.events where id = p_event_id and group_id = v_group.id;
  if not found or v_event.status <> 'played' then raise exception 'CONFLICT'; end if;
  if v_event.mvp_player_id is not null or (v_event.played_at is not null and now() > v_event.played_at + interval '24 hours') then
    raise exception 'CONFLICT';
  end if;

  select player_id into v_voter_player_id from public.event_guest_claims
  where event_id = p_event_id and guest_key = p_guest_key;

  if v_voter_player_id is null or not exists (
    select 1 from public.match_participations where event_id = p_event_id and player_id = v_voter_player_id
  ) then raise exception 'FORBIDDEN'; end if;

  if p_voted_player_id = v_voter_player_id or not exists (
    select 1 from public.match_participations where event_id = p_event_id and player_id = p_voted_player_id
  ) then raise exception 'VALIDATION_ERROR'; end if;

  insert into public.event_mvp_votes (event_id, voter_player_id, voted_player_id)
  values (p_event_id, v_voter_player_id, p_voted_player_id)
  on conflict (event_id, voter_player_id) do nothing;
end;
$$;

grant execute on function public.get_shared_group_attendance(uuid, uuid) to anon, authenticated;
grant execute on function public.reserve_shared_guest_attendance(uuid, uuid, uuid, text, public.attendance_status) to anon, authenticated;
grant execute on function public.get_shared_mvp_vote(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.submit_shared_guest_mvp_vote(uuid, uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.open_recurring_event(uuid, timestamptz) to authenticated, service_role;
