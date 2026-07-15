create or replace function public.set_team_match_mvp(p_team_id uuid, p_match_id uuid, p_mvp_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.is_team_admin(p_team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_mvp_user_id is not null and not app_private.is_active_team_member(p_team_id, p_mvp_user_id) then
    raise exception 'TEAM_MVP_USER_NOT_MEMBER' using errcode = '23514';
  end if;

  update public.team_matches
  set mvp_user_id = p_mvp_user_id
  where id = p_match_id and team_id = p_team_id;

  if not found then
    raise exception 'MATCH_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.set_team_match_mvp(uuid, uuid, uuid) to authenticated;
