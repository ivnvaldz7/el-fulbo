-- Sube el rango de stats de 1-8 a 1-99 en todas las validaciones.
-- Esto unifica el rango: tanto onboarding como aprobacion aceptan 1-99.
-- Anteriormente, auto-aprobacion y onboarding tenian max 8,
-- mientras que "modo dios" admin ya permitia 1-99 desde 20260618190000.

-- 1. submit_onboarding_stats: cambiar validacion de 8 a 99
create or replace function public.submit_onboarding_stats(
  p_group_id uuid,
  p_primary_position public.player_position,
  p_secondary_position public.player_position,
  p_stats jsonb
)
returns table (
  player_id uuid,
  status public.stats_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_user public.users%rowtype;
  v_admin_user_id uuid;
  v_is_goalkeeper boolean;
  v_stat_keys text[];
  v_key text;
  v_value numeric;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_user from public.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if p_secondary_position is not null and p_secondary_position = p_primary_position then
    raise exception 'VALIDATION_ERROR: secondary_position' using errcode = '23514';
  end if;

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
    if v_value <> floor(v_value) or v_value < 1 or v_value > 99 then
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

  select * into v_player
  from public.players p
  where p.group_id = p_group_id
    and p.user_id = auth.uid()
    and p.archived_at is null
  limit 1;

  if v_player.id is null then
    if (
      select count(*)
      from public.players p
      where p.group_id = p_group_id and p.archived_at is null
    ) >= 50 then
      raise exception 'PLAYER_GROUP_LIMIT_REACHED' using errcode = '23514';
    end if;

    insert into public.players (
      user_id, group_id, display_name, photo_url,
      primary_position, secondary_position, stats,
      is_phantom, stats_status
    )
    values (
      auth.uid(), p_group_id, v_user.display_name, v_user.photo_url,
      p_primary_position, p_secondary_position, p_stats,
      false, 'pending_approval'
    )
    returning * into v_player;
  else
    if v_player.stats_status <> 'pending_approval' then
      raise exception 'STATS_PENDING_APPROVAL' using errcode = '23514';
    end if;

    update public.players
    set
      primary_position = p_primary_position,
      secondary_position = p_secondary_position,
      stats = p_stats,
      stats_status = 'pending_approval'
    where id = v_player.id
      and user_id = auth.uid()
      and stats_status = 'pending_approval'
    returning * into v_player;
  end if;

  select admin_user_id into v_admin_user_id
  from public.groups
  where id = p_group_id;

  begin
    insert into public.notifications (user_id, type, payload)
    values (
      v_admin_user_id,
      'stats_pending_approval',
      jsonb_build_object(
        'group_id', p_group_id,
        'player_id', v_player.id,
        'display_name', v_player.display_name
      )
    );
  exception
    when others then
      null;
  end;

  player_id := v_player.id;
  status := v_player.stats_status;
  return next;
end;
$$;

-- 2. submit_admin_onboarding_stats: cambiar validacion de 8 a 99
create or replace function public.submit_admin_onboarding_stats(
  p_group_id uuid,
  p_primary_position public.player_position,
  p_secondary_position public.player_position,
  p_stats jsonb
)
returns table (
  player_id uuid,
  status public.stats_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_old_stats jsonb;
  v_is_goalkeeper boolean;
  v_stat_keys text[];
  v_key text;
  v_value numeric;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and g.admin_user_id = auth.uid()
      and g.archived_at is null
  ) then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if p_secondary_position is not null and p_secondary_position = p_primary_position then
    raise exception 'VALIDATION_ERROR: secondary_position' using errcode = '23514';
  end if;

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
    if v_value <> floor(v_value) or v_value < 1 or v_value > 99 then
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

  select * into v_player
  from public.players p
  where p.group_id = p_group_id
    and p.user_id = auth.uid()
    and p.archived_at is null
  limit 1;

  if v_player.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  if v_player.stats_status <> 'pending_approval' then
    raise exception 'STATS_PENDING_APPROVAL' using errcode = '23514';
  end if;

  v_old_stats := v_player.stats;

  update public.players
  set
    primary_position = p_primary_position,
    secondary_position = p_secondary_position,
    stats = p_stats,
    stats_status = 'approved'
  where id = v_player.id
    and user_id = auth.uid()
    and stats_status = 'pending_approval'
  returning * into v_player;

  insert into public.player_stat_change_logs (
    player_id, changed_by_user_id, requested_by_user_id,
    before_stats, after_stats, reason
  )
  values (
    v_player.id, auth.uid(), auth.uid(),
    v_old_stats, p_stats, 'admin_self_creation'
  );

  player_id := v_player.id;
  status := v_player.stats_status;
  return next;
end;
$$;

-- 3. approve_initial_stats: auto-aprobacion sube de 8 a 99
create or replace function public.approve_initial_stats(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_group public.groups%rowtype;
  v_max integer := 99;
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
    v_max := 99;
  end if;

  perform public.assert_player_stats_valid(v_player.stats, v_player.primary_position, v_max);

  update public.players
  set stats_status = 'approved'
  where id = v_player.id;

  insert into public.player_stat_change_logs (
    player_id, changed_by_user_id, requested_by_user_id,
    before_stats, after_stats, reason
  )
  values (
    v_player.id, auth.uid(), v_player.user_id,
    null, v_player.stats, 'initial_approval'
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

-- 4. approve_stat_revision: auto-aprobacion sube de 8 a 99
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
  v_max integer := 99;
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
    v_max := 99;
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
    player_id, changed_by_user_id, requested_by_user_id,
    before_stats, after_stats, reason
  )
  values (
    v_player.id, auth.uid(), v_request.user_id,
    v_player.stats, v_final_stats, 'revision_approved'
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
