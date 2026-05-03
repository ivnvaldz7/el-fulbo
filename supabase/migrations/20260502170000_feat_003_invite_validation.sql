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
  v_user_groups_count bigint;
  v_user_status text;
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

  select u.display_name into v_admin_name
  from public.users u
  where u.id = v_group.admin_user_id;

  select count(*) into v_active_players_count
  from public.players p
  where p.group_id = v_group.id and p.archived_at is null;

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
    'user_status', v_user_status
  );
end;
$$;
