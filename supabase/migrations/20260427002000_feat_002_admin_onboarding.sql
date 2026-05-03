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
    auth.uid(),
    v_old_stats,
    p_stats,
    'admin_self_creation'
  );

  player_id := v_player.id;
  status := v_player.stats_status;
  return next;
end;
$$;
