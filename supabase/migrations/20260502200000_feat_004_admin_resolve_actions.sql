create or replace function public.assert_player_stats_valid(
  p_stats jsonb,
  p_primary_position public.player_position,
  p_max_value integer
)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  v_is_goalkeeper boolean;
  v_stat_keys text[];
  v_key text;
  v_value numeric;
begin
  v_is_goalkeeper := p_primary_position = 'ARQ';
  v_stat_keys := case
    when v_is_goalkeeper then array['div', 'han', 'kic', 'ref', 'spd', 'pos']
    else array['pac', 'sho', 'pas', 'dri', 'def', 'phy']
  end;

  if jsonb_typeof(p_stats) <> 'object' or (
    select count(*)
    from jsonb_object_keys(p_stats)
  ) <> 6 then
    raise exception 'VALIDATION_ERROR: stats shape' using errcode = '23514';
  end if;

  foreach v_key in array v_stat_keys loop
    if not p_stats ? v_key then
      raise exception 'VALIDATION_ERROR: missing stat' using errcode = '23514';
    end if;

    v_value := (p_stats ->> v_key)::numeric;
    if v_value <> floor(v_value) or v_value < 1 or v_value > p_max_value then
      raise exception 'VALIDATION_ERROR: stat range' using errcode = '23514';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_object_keys(p_stats) supplied(key)
    where not supplied.key = any(v_stat_keys)
  ) then
    raise exception 'VALIDATION_ERROR: stat keys' using errcode = '23514';
  end if;
end;
$$;

create or replace function public.approve_initial_stats(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_group public.groups%rowtype;
  v_max integer := 10;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id
    and archived_at is null;

  if v_player.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_group
  from public.groups
  where id = v_player.group_id
    and archived_at is null;

  if v_group.id is null or v_group.admin_user_id <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_player.stats_status <> 'pending_approval' then
    raise exception 'CONFLICT' using errcode = '23505';
  end if;

  if v_player.user_id = auth.uid() then
    v_max := 8;
  end if;

  perform public.assert_player_stats_valid(v_player.stats, v_player.primary_position, v_max);

  update public.players
  set stats_status = 'approved'
  where id = v_player.id;

  insert into public.player_stat_change_logs (
    player_id,
    changed_by_user_id,
    requested_by_user_id,
    before_stats,
    after_stats,
    reason
  )
  values (
    v_player.id,
    auth.uid(),
    v_player.user_id,
    null,
    v_player.stats,
    'initial_approval'
  );

  if v_player.user_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_player.user_id,
      'stats_approved',
      jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id)
    );
  end if;

  insert into public.notifications (user_id, type, payload)
  select
    p.user_id,
    'stats_changed_log',
    jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id, 'reason', 'initial_approval')
  from public.players p
  where p.group_id = v_group.id
    and p.archived_at is null
    and p.user_id is not null;
end;
$$;

create or replace function public.reject_initial_stats(
  p_player_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_group public.groups%rowtype;
  v_note text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  v_note := nullif(trim(p_note), '');
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'VALIDATION_ERROR: note' using errcode = '23514';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id
    and archived_at is null;

  if v_player.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_group
  from public.groups
  where id = v_player.group_id
    and archived_at is null;

  if v_group.id is null or v_group.admin_user_id <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_player.stats_status <> 'pending_approval' then
    raise exception 'CONFLICT' using errcode = '23505';
  end if;

  if v_player.user_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_player.user_id,
      'stats_revision_resolved',
      jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id, 'decision', 'rejected', 'note', v_note)
    );
  end if;
end;
$$;

create or replace function public.approve_stat_revision(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.stat_revision_requests%rowtype;
  v_player public.players%rowtype;
  v_group public.groups%rowtype;
  v_final_stats jsonb;
  v_max integer := 10;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_request
  from public.stat_revision_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_player
  from public.players
  where id = v_request.player_id
    and archived_at is null;

  if v_player.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_group
  from public.groups
  where id = v_player.group_id
    and archived_at is null;

  if v_group.id is null or v_group.admin_user_id <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'CONFLICT' using errcode = '23505';
  end if;

  v_final_stats := coalesce(v_request.proposed_stats, v_player.stats);

  if v_player.user_id = auth.uid() then
    v_max := 8;
  end if;

  perform public.assert_player_stats_valid(v_final_stats, v_player.primary_position, v_max);

  update public.players
  set stats = v_final_stats
  where id = v_player.id;

  update public.stat_revision_requests
  set status = 'approved',
      resolved_by_user_id = auth.uid(),
      resolved_at = now()
  where id = v_request.id;

  insert into public.player_stat_change_logs (
    player_id,
    changed_by_user_id,
    requested_by_user_id,
    before_stats,
    after_stats,
    reason
  )
  values (
    v_player.id,
    auth.uid(),
    v_request.user_id,
    v_player.stats,
    v_final_stats,
    'revision_approved'
  );

  if v_player.user_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_player.user_id,
      'stats_revision_resolved',
      jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id, 'decision', 'approved')
    );
  end if;

  insert into public.notifications (user_id, type, payload)
  select
    p.user_id,
    'stats_changed_log',
    jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id, 'reason', 'revision_approved')
  from public.players p
  where p.group_id = v_group.id
    and p.archived_at is null
    and p.user_id is not null;
end;
$$;

create or replace function public.reject_stat_revision(
  p_request_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.stat_revision_requests%rowtype;
  v_player public.players%rowtype;
  v_group public.groups%rowtype;
  v_note text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  v_note := nullif(trim(p_note), '');
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'VALIDATION_ERROR: note' using errcode = '23514';
  end if;

  select * into v_request
  from public.stat_revision_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_player
  from public.players
  where id = v_request.player_id
    and archived_at is null;

  if v_player.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_group
  from public.groups
  where id = v_player.group_id
    and archived_at is null;

  if v_group.id is null or v_group.admin_user_id <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'CONFLICT' using errcode = '23505';
  end if;

  update public.stat_revision_requests
  set status = 'rejected',
      resolved_by_user_id = auth.uid(),
      resolved_at = now(),
      resolution_note = v_note
  where id = v_request.id;

  if v_player.user_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_player.user_id,
      'stats_revision_resolved',
      jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id, 'decision', 'rejected', 'note', v_note)
    );
  end if;
end;
$$;

create or replace function public.approve_reintegration_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.reintegration_requests%rowtype;
  v_player public.players%rowtype;
  v_group public.groups%rowtype;
  v_active_count bigint;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_request
  from public.reintegration_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_player
  from public.players
  where id = v_request.player_id;

  select * into v_group
  from public.groups
  where id = v_request.group_id
    and archived_at is null;

  if v_group.id is null or v_group.admin_user_id <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'CONFLICT' using errcode = '23505';
  end if;

  select count(*) into v_active_count
  from public.players
  where group_id = v_group.id
    and archived_at is null;

  if v_active_count >= 50 then
    raise exception 'PLAYER_GROUP_LIMIT_REACHED' using errcode = '23514';
  end if;

  update public.reintegration_requests
  set status = 'approved',
      resolved_by_user_id = auth.uid(),
      resolved_at = now()
  where id = v_request.id;

  update public.players
  set archived_at = null,
      is_expelled = false,
      current_boost = null
  where id = v_player.id;

  if v_player.user_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_player.user_id,
      'reintegration_approved',
      jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id)
    );
  end if;

  insert into public.notifications (user_id, type, payload)
  values (
    auth.uid(),
    'player_returned',
    jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id)
  );
end;
$$;

create or replace function public.reject_reintegration_request(
  p_request_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.reintegration_requests%rowtype;
  v_player public.players%rowtype;
  v_group public.groups%rowtype;
  v_note text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  v_note := nullif(trim(p_note), '');
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'VALIDATION_ERROR: note' using errcode = '23514';
  end if;

  select * into v_request
  from public.reintegration_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  select * into v_player
  from public.players
  where id = v_request.player_id;

  select * into v_group
  from public.groups
  where id = v_request.group_id
    and archived_at is null;

  if v_group.id is null or v_group.admin_user_id <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'CONFLICT' using errcode = '23505';
  end if;

  update public.reintegration_requests
  set status = 'rejected',
      resolved_by_user_id = auth.uid(),
      resolved_at = now(),
      resolution_note = v_note
  where id = v_request.id;

  if v_player.user_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_player.user_id,
      'reintegration_rejected',
      jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id, 'note', v_note)
    );
  end if;
end;
$$;
