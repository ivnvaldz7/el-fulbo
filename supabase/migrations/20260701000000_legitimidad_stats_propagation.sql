-- Propagacion de stats con legitimidad de grupo
-- 
-- Cuando un jugador actualiza sus stats en un grupo "legítimo"
-- (>=4 jugadores activos + >=1 partido jugado), los cambios se
-- propagan automaticamente a TODAS sus cartas en todos los grupos.
--
-- Esto permite que la carta base del jugador refleje su nivel real
-- en todos lados, sin permitir inflar stats en grupos truchos.

-- 1. Funcion de legitimidad
create or replace function public.is_group_legitimate(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_count integer;
  v_has_played_event boolean;
begin
  select count(*) into v_player_count
  from public.players
  where group_id = p_group_id
    and archived_at is null
    and is_phantom = false
    and is_expelled = false;

  select exists(
    select 1
    from public.events
    where group_id = p_group_id
      and status = 'played'
  ) into v_has_played_event;

  return v_player_count >= 4 and v_has_played_event;
end;
$$;

-- 2. Propagacion de stats a todas las cartas del mismo usuario
create or replace function public.propagate_player_stats(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
begin
  select * into v_player
  from public.players
  where id = p_player_id
    and archived_at is null;

  if v_player.id is null or v_player.user_id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  if not public.is_group_legitimate(v_player.group_id) then
    raise exception 'GROUP_NOT_LEGITIMATE' using errcode = '23514';
  end if;

  update public.players
  set
    stats = v_player.stats,
    primary_position = v_player.primary_position,
    secondary_position = v_player.secondary_position
  where user_id = v_player.user_id
    and archived_at is null
    and id <> v_player.id;
end;
$$;

-- 3. Batch: sincroniza todos los jugadores en grupos legitimios
create or replace function public.sync_pending_stats_propagation()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group record;
  v_player record;
begin
  for v_group in
    select id from public.groups
    where archived_at is null
      and public.is_group_legitimate(id)
  loop
    for v_player in
      select distinct on (p.user_id) p.id
      from public.players p
      where p.group_id = v_group.id
        and p.archived_at is null
        and p.user_id is not null
        and p.stats_status = 'approved'
      order by p.user_id, p.joined_at desc
    loop
      begin
        perform public.propagate_player_stats(v_player.id);
      exception
        when others then null;
      end;
    end loop;
  end loop;
end;
$$;

-- 4. Modificar submit_onboarding_stats
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

  -- Propagacion si el grupo es legitimio
  begin
    if (select public.is_group_legitimate(p_group_id)) then
      perform public.propagate_player_stats(v_player.id);
    end if;
  exception
    when others then null;
  end;

  player_id := v_player.id;
  status := v_player.stats_status;
  return next;
end;
$$;

-- 5. Modificar approve_initial_stats
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

  -- Propagacion si el grupo es legitimio
  begin
    if (select public.is_group_legitimate(v_group.id)) then
      perform public.propagate_player_stats(v_player.id);
    end if;
  exception
    when others then null;
  end;
end;
$$;

-- 6. Modificar approve_stat_revision
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

  -- Re-leer el player para obtener stats actualizadas (ya que v_player tiene las viejas)
  select * into v_player
  from public.players
  where id = v_request.player_id;

  -- Propagacion si el grupo es legitimio
  begin
    if (select public.is_group_legitimate(v_group.id)) then
      perform public.propagate_player_stats(v_player.id);
    end if;
  exception
    when others then null;
  end;
end;
$$;
