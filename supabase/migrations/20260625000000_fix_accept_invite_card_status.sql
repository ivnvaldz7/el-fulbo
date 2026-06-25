-- Fix: heredar stats_status de la carta origen en vez de hardcodear 'pending_approval'
-- Fix: incluir cartas archivadas al buscar stats para copiar
--
-- Cambios respecto a la version anterior de accept_invite_for_user:
-- 1. v_has_other_cards ya no filtra archived_at is null (incluye archivadas)
-- 2. La busqueda de carta origen ya no filtra archived_at is null (incluye archivadas)
-- 3. stats_status se hereda de la carta origen:
--    - source 'rejected' → 'pending_approval' (fresh start)
--    - source 'approved' o 'pending_approval' → se hereda tal cual

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
    -- Copy stats from the most recently created card (including archived)
    select * into v_player
    from public.players
    where user_id = auth.uid()
    order by joined_at desc
    limit 1;

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
