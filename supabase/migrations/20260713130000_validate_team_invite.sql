create or replace function public.validate_team_invite(p_code text)
returns table (
  valid boolean,
  team_id uuid,
  team_name text,
  already_member boolean
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_membership public.team_members%rowtype;
begin
  select * into v_invitation
  from public.team_invitations ti
  where ti.code = upper(trim(p_code))
    and ti.revoked_at is null
    and (ti.expires_at is null or ti.expires_at > now())
    and ti.accepted_at is null;

  if v_invitation.id is null then
    return query select false, null::uuid, null::text, false;
    return;
  end if;

  if auth.uid() is not null then
    select * into v_membership
    from public.team_members tm
    where tm.team_id = v_invitation.team_id
      and tm.user_id = auth.uid()
      and tm.archived_at is null
    limit 1;
  end if;

  team_name := (select t.name from public.teams t where t.id = v_invitation.team_id);

  return query select true, v_invitation.team_id, team_name, v_membership.id is not null;
end;
$$;

grant execute on function public.validate_team_invite(text) to authenticated, anon;
