-- Fix card rejection cycle
-- 
-- Problema: stats_status solo tenía 'pending_approval' y 'approved'.
-- Al rechazar una carta, el estado no cambiaba → el admin veía al jugador
-- para siempre en "Cartas nuevas" y el jugador no tenía forma de reintentar.
--
-- Solución:
-- 1. Agregar 'rejected' al enum stats_status
-- 2. reject_initial_stats ahora setea stats_status = 'rejected'
-- 3. submit_onboarding_stats acepta resubmit si status = 'rejected'
-- 4. Las queries de admin ya filtran por 'pending_approval' → los rechazados
--    desaparecen automáticamente

-- 1. Agregar 'rejected' al enum
alter type public.stats_status add value if not exists 'rejected';

-- 2. Actualizar reject_initial_stats para que cambie el estado
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

  -- ✅ Cambiar estado a rejected
  update public.players
  set stats_status = 'rejected'
  where id = v_player.id;

  if v_player.user_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_player.user_id,
      'stats_rejected',
      jsonb_build_object('group_id', v_group.id, 'player_id', v_player.id, 'note', v_note)
    );
  end if;
end;
$$;

-- 3. Actualizar submit_onboarding_stats para aceptar 'rejected'
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
    if v_value <> floor(v_value) or v_value < 1 or v_value > 8 then
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
    -- Player doesn't exist, we must INSERT
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
    -- ✅ Ahora acepta 'pending_approval' (primera vez) y 'rejected' (re-submit)
    if v_player.stats_status not in ('pending_approval', 'rejected') then
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
      and stats_status in ('pending_approval', 'rejected')
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
