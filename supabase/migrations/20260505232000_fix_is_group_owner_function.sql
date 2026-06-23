create or replace function public.is_group_admin(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.groups
    where id = gid and admin_user_id = auth.uid() and archived_at is null
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.group_memberships
    where group_id = gid and user_id = auth.uid() and role = 'owner'
  ) or exists(
    select 1
    from public.temporary_owners t
    join public.events e on e.id = t.event_id
    where e.group_id = gid
      and t.user_id = auth.uid()
      and t.confirmed_at is not null
      and t.expires_at > now()
  );
$$;

create or replace function public.is_group_admin_or_owner(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_group_admin(gid) or public.is_group_owner(gid);
$$;
