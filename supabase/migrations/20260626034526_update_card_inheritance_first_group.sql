-- Modificar la logica de herencia de cartas para que siempre herede de la PRIMERA carta que el usuario creo
-- (su carta base) en lugar de la mas reciente, y ademas garantizamos que ningun stat sea menor a 50.

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

  -- Check if user has ANY other player cards (including archived)
  select exists(
    select 1
    from public.players
    where user_id = auth.uid()
  ) into v_has_other_cards;

  if v_has_other_cards then
    -- Copy stats from the FIRST card the user ever created (their true Base Card)
    select * into v_player
    from public.players
    where user_id = auth.uid()
    order by 
      case when archived_at is null then 0 else 1 end,
      joined_at asc
    limit 1;

    -- Clamp stats to 50 minimum
    v_player.stats := jsonb_build_object(
      'pac', greatest(coalesce((v_player.stats->>'pac')::int, 50), 50),
      'sho', greatest(coalesce((v_player.stats->>'sho')::int, 50), 50),
      'pas', greatest(coalesce((v_player.stats->>'pas')::int, 50), 50),
      'dri', greatest(coalesce((v_player.stats->>'dri')::int, 50), 50),
      'def', greatest(coalesce((v_player.stats->>'def')::int, 50), 50),
      'phy', greatest(coalesce((v_player.stats->>'phy')::int, 50), 50)
    );

    -- Inherit stats_status: if source is 'rejected', start fresh with 'pending_approval'
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
      case
        when v_player.stats_status = 'rejected' then 'pending_approval'::public.stats_status
        else coalesce(v_player.stats_status, 'pending_approval')
      end
    )
    returning * into v_player;

    group_id := v_group_id;
    player_id := v_player.id;
    already_member := false;
    needs_onboarding := false;
    status := v_player.stats_status;
    return next;
  else
    -- New user, don't insert player yet, tell the client to do onboarding
    group_id := v_group_id;
    player_id := null;
    already_member := false;
    needs_onboarding := true;
    status := null;
    return next;
  end if;
end;
$$;


create or replace function public.create_group(
  p_name text,
  p_modality public.modality
)
returns table (
  group_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_group_id uuid;
  v_name text;
  v_has_other_cards boolean;
  v_player public.players%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_user from public.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  v_name := trim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'VALIDATION_ERROR: group name' using errcode = '23514';
  end if;

  if (
    select count(*)
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = auth.uid()
      and gm.role = 'admin'
      and g.archived_at is null
  ) >= 3 then
    raise exception 'ADMIN_GROUP_LIMIT_REACHED' using errcode = '23514';
  end if;

  insert into public.groups (name, default_modality, admin_user_id)
  values (v_name, p_modality, auth.uid())
  returning id into v_group_id;

  insert into public.group_memberships (user_id, group_id, role)
  values (auth.uid(), v_group_id, 'admin');

  -- Check if user has ANY other player cards (including archived)
  select exists(
    select 1
    from public.players
    where user_id = auth.uid()
  ) into v_has_other_cards;

  if v_has_other_cards then
    -- Inherit stats from FIRST created card (Base Card)
    select * into v_player
    from public.players
    where user_id = auth.uid()
    order by 
      case when archived_at is null then 0 else 1 end,
      joined_at asc
    limit 1;

    -- Clamp stats to 50 minimum
    v_player.stats := jsonb_build_object(
      'pac', greatest(coalesce((v_player.stats->>'pac')::int, 50), 50),
      'sho', greatest(coalesce((v_player.stats->>'sho')::int, 50), 50),
      'pas', greatest(coalesce((v_player.stats->>'pas')::int, 50), 50),
      'dri', greatest(coalesce((v_player.stats->>'dri')::int, 50), 50),
      'def', greatest(coalesce((v_player.stats->>'def')::int, 50), 50),
      'phy', greatest(coalesce((v_player.stats->>'phy')::int, 50), 50)
    );

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
      case
        when v_player.stats_status = 'rejected' then 'pending_approval'::public.stats_status
        else coalesce(v_player.stats_status, 'pending_approval')
      end
    );
  else
    -- New user/first group, use default card clamped to 50
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
      'MED',
      null,
      '{"pac":50,"sho":50,"pas":50,"dri":50,"def":50,"phy":50}'::jsonb,
      false,
      'pending_approval'
    );
  end if;

  group_id := v_group_id;
  return next;
end;
$$;

-- Ensure all existing active players have at least 50 in their stats
update public.players
set stats = jsonb_build_object(
  'pac', greatest(coalesce((stats->>'pac')::int, 50), 50),
  'sho', greatest(coalesce((stats->>'sho')::int, 50), 50),
  'pas', greatest(coalesce((stats->>'pas')::int, 50), 50),
  'dri', greatest(coalesce((stats->>'dri')::int, 50), 50),
  'def', greatest(coalesce((stats->>'def')::int, 50), 50),
  'phy', greatest(coalesce((stats->>'phy')::int, 50), 50)
)
where archived_at is null;
