-- Remove 30-day cooldown after rejection.
-- A rejected player can immediately re-request via invite link.
-- The admin decides each time; no forced wait period.

-- 1. Remove cooldown check from validate_invite_code
create or replace function public.validate_invite_code(p_invite_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_group public.groups%rowtype;
  v_admin_name text;
  v_active_players_count bigint;
  v_active_player public.players%rowtype;
  v_archived_player public.players%rowtype;
  v_user_groups_count bigint;
  v_pending_request public.reintegration_requests%rowtype;
  v_user_status text;
  v_extras jsonb := null;
begin
  select g.* into v_group
  from public.groups g
  where g.invite_code = upper(trim(p_invite_code))
  limit 1;

  if v_group.id is null then
    return jsonb_build_object(
      'valid', false,
      'reason', 'not_found'
    );
  end if;

  select u.display_name into v_admin_name
  from public.users u
  where u.id = v_group.admin_user_id;

  select count(*) into v_active_players_count
  from public.players p
  where p.group_id = v_group.id and p.archived_at is null;

  if v_group.archived_at is not null then
    return jsonb_build_object(
      'valid', false,
      'reason', 'archived',
      'group', jsonb_build_object(
        'id', v_group.id,
        'name', v_group.name
      )
    );
  end if;

  if auth.uid() is null then
    v_user_status := 'anonymous';
  else
    select * into v_active_player
    from public.players p
    where p.user_id = auth.uid()
      and p.group_id = v_group.id
      and p.archived_at is null
    limit 1;

    if v_active_player.id is not null then
      v_user_status := 'active_member';
    else
      select * into v_archived_player
      from public.players p
      where p.user_id = auth.uid()
        and p.group_id = v_group.id
        and p.archived_at is not null
      order by p.archived_at desc
      limit 1;

      if v_archived_player.id is not null and v_archived_player.archived_at >= now() - interval '365 days' then
        if v_archived_player.is_expelled then
          select * into v_pending_request
          from public.reintegration_requests r
          where r.player_id = v_archived_player.id
            and r.status = 'pending'
          order by r.created_at desc
          limit 1;

          if v_pending_request.id is not null then
            v_user_status := 'expelled_pending_request';
            v_extras := jsonb_build_object(
              'request_created_at', v_pending_request.created_at
            );
          else
            -- No cooldown: expelled user can always request again
            v_user_status := 'expelled_can_request';
          end if;
        else
          v_user_status := 'voluntary_returner';
          v_extras := jsonb_build_object(
            'archived_player', jsonb_build_object(
              'id', v_archived_player.id,
              'display_name', v_archived_player.display_name,
              'primary_position', v_archived_player.primary_position,
              'secondary_position', v_archived_player.secondary_position,
              'stats', v_archived_player.stats,
              'stats_status', v_archived_player.stats_status,
              'archived_at', v_archived_player.archived_at
            )
          );
        end if;
      elsif v_active_players_count >= 50 then
        v_user_status := 'group_full';
      else
        select count(*) into v_user_groups_count
        from public.players p
        where p.user_id = auth.uid()
          and p.archived_at is null;

        if v_user_groups_count >= 10 then
          v_user_status := 'user_limit';
        else
          v_user_status := 'new';
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'valid', true,
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'default_modality', v_group.default_modality,
      'logo_url', v_group.logo_url,
      'admin_name', v_admin_name,
      'active_players_count', v_active_players_count
    ),
    'user_status', v_user_status,
    'extras', coalesce(v_extras, '{}'::jsonb)
  );
end;
$$;

-- 2. Remove cooldown check from create_reintegration_request
create or replace function public.create_reintegration_request(
  p_invite_code text,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups%rowtype;
  target_player public.players%rowtype;
  pending_request_id uuid;
  new_request_id uuid;
  trimmed_message text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  trimmed_message := nullif(trim(p_message), '');

  if trimmed_message is not null and char_length(trimmed_message) > 200 then
    raise exception 'VALIDATION_ERROR: reintegration_message' using errcode = '23514';
  end if;

  select * into target_group
  from public.groups
  where invite_code = upper(trim(p_invite_code))
    and archived_at is null;

  if target_group.id is null then
    raise exception 'INVITE_CODE_INVALID' using errcode = '23514';
  end if;

  select * into target_player
  from public.players
  where user_id = auth.uid()
    and group_id = target_group.id
    and archived_at is not null
  order by archived_at desc
  limit 1;

  if target_player.id is null or target_player.is_expelled = false then
    raise exception 'NOT_EXPELLED' using errcode = '23514';
  end if;

  select id into pending_request_id
  from public.reintegration_requests
  where player_id = target_player.id
    and status = 'pending'
  limit 1;

  if pending_request_id is not null then
    raise exception 'REINTEGRATION_REQUEST_PENDING' using errcode = '23514';
  end if;

  -- No cooldown check: expelled user can always create a new request

  insert into public.reintegration_requests (player_id, user_id, group_id, message)
  values (target_player.id, auth.uid(), target_group.id, trimmed_message)
  returning id into new_request_id;

  begin
    insert into public.notifications (user_id, type, payload)
    values (
      target_group.admin_user_id,
      'reintegration_request',
      jsonb_build_object(
        'request_id', new_request_id,
        'player_id', target_player.id,
        'player_name', target_player.display_name,
        'message', trimmed_message
      )
    );
  exception
    when others then
      null;
  end;

  return new_request_id;
end;
$$;
