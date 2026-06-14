create or replace function public.accept_invite_for_user(p_invite_code text)
returns table (
  group_id uuid,
  player_id uuid,
  already_member boolean,
  needs_onboarding boolean,
  status public.stats_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_player public.players%rowtype;
  v_user public.users%rowtype;
  v_has_other_cards boolean;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_user from public.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select id into v_group_id
  from public.groups
  where invite_code = upper(trim(p_invite_code))
    and archived_at is null;

  if v_group_id is null then
    raise exception 'INVITE_CODE_INVALID' using errcode = '23514';
  end if;

  select * into v_player
  from public.players p
  where p.user_id = auth.uid()
    and p.group_id = v_group_id
    and p.archived_at is null
  limit 1;

  if v_player.id is not null then
    group_id := v_group_id;
    player_id := v_player.id;
    already_member := true;
    needs_onboarding := false;
    status := v_player.stats_status;
    return next;
    return;
  end if;

  if (
    select count(*)
    from public.players p
    where p.group_id = v_group_id and p.archived_at is null
  ) >= 50 then
    raise exception 'PLAYER_GROUP_LIMIT_REACHED' using errcode = '23514';
  end if;

  if (
    select count(*)
    from public.players p
    where p.user_id = auth.uid() and p.archived_at is null
  ) >= 10 then
    raise exception 'USER_PLAYER_GROUPS_LIMIT_REACHED' using errcode = '23514';
  end if;

  -- Check if user has ANY other player cards
  select exists(
    select 1
    from public.players
    where user_id = auth.uid() and archived_at is null
  ) into v_has_other_cards;

  if v_has_other_cards then
    -- User has other cards, copy stats from the most recently created one
    select * into v_player
    from public.players
    where user_id = auth.uid() and archived_at is null
    order by created_at desc
    limit 1;

    insert into public.players (
      user_id,
      group_id,
      display_name,
      photo_url,
      primary_position,
      secondary_position,
      stats,
      is_phantom,
      stats_status
    )
    values (
      auth.uid(),
      v_group_id,
      v_user.display_name,
      v_user.photo_url,
      v_player.primary_position,
      v_player.secondary_position,
      v_player.stats,
      false,
      'pending_approval'
    )
    returning * into v_player;

    group_id := v_group_id;
    player_id := v_player.id;
    already_member := false;
    needs_onboarding := false;
    status := v_player.stats_status;
    return next;
  else
    -- New user, don't insert player yet, but tell the client to do onboarding
    group_id := v_group_id;
    player_id := null;
    already_member := false;
    needs_onboarding := true;
    status := null;
    return next;
  end if;
end;
$$;

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
      user_id,
      group_id,
      display_name,
      photo_url,
      primary_position,
      secondary_position,
      stats,
      is_phantom,
      stats_status
    )
    values (
      auth.uid(),
      p_group_id,
      v_user.display_name,
      v_user.photo_url,
      p_primary_position,
      p_secondary_position,
      p_stats,
      false,
      'pending_approval'
    )
    returning * into v_player;
  else
    -- Player already exists, update
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
