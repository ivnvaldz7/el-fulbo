create or replace function public.assign_owner(
  p_group_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_user_id uuid;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'FORBIDDEN';
  end if;

  select admin_user_id
  into v_admin_user_id
  from public.groups
  where id = p_group_id
    and archived_at is null;

  if v_admin_user_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_admin_user_id = p_user_id then
    raise exception 'VALIDATION_ERROR: el admin no puede ser owner';
  end if;

  if not exists (
    select 1
    from public.players
    where group_id = p_group_id
      and user_id = p_user_id
      and archived_at is null
      and is_phantom = false
  ) then
    raise exception 'NOT_FOUND: el usuario no es miembro activo';
  end if;

  insert into public.group_memberships (user_id, group_id, role, assigned_by_user_id)
  values (p_user_id, p_group_id, 'owner', auth.uid());

  insert into public.notifications (user_id, type, payload)
  values (
    p_user_id,
    'owner_assigned',
    jsonb_build_object(
      'group_id', p_group_id,
      'assigned_by', auth.uid()
    )
  );
end;
$$;

create or replace function public.remove_owner(
  p_group_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.group_memberships
  where group_id = p_group_id
    and user_id = p_user_id
    and role = 'owner';

  insert into public.notifications (user_id, type, payload)
  values (
    p_user_id,
    'owner_removed',
    jsonb_build_object('group_id', p_group_id)
  );
end;
$$;
