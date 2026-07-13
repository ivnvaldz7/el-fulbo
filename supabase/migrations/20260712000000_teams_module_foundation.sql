do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_role' and typnamespace = 'public'::regnamespace) then
    create type public.team_role as enum ('admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'team_match_status' and typnamespace = 'public'::regnamespace) then
    create type public.team_match_status as enum ('scheduled', 'played', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'team_match_signup_status' and typnamespace = 'public'::regnamespace) then
    create type public.team_match_signup_status as enum ('going', 'not_going');
  end if;

  if not exists (select 1 from pg_type where typname = 'team_stat_kind' and typnamespace = 'public'::regnamespace) then
    create type public.team_stat_kind as enum ('goals', 'assists', 'tackles');
  end if;

  if not exists (select 1 from pg_type where typname = 'team_stat_submission_status' and typnamespace = 'public'::regnamespace) then
    create type public.team_stat_submission_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  badge_url text,
  primary_color text,
  secondary_color text,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teams_name_length check (char_length(trim(name)) between 1 and 60),
  constraint teams_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.team_role not null default 'member',
  primary_position public.player_position not null,
  secondary_position public.player_position,
  added_by_user_id uuid references public.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint team_members_secondary_different check (secondary_position is null or secondary_position <> primary_position)
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  code text not null unique,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  accepted_by_user_id uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint team_invitations_code_format check (code = upper(trim(code)) and char_length(code) between 6 and 40),
  constraint team_invitations_acceptance_consistent check (
    (accepted_at is null and accepted_by_user_id is null)
    or (accepted_at is not null and accepted_by_user_id is not null)
  )
);

create table public.team_matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  scheduled_at timestamptz not null,
  opponent_name text,
  field_name text,
  field_maps_url text,
  status public.team_match_status not null default 'scheduled',
  team_score smallint check (team_score is null or team_score >= 0),
  opponent_score smallint check (opponent_score is null or opponent_score >= 0),
  mvp_user_id uuid references public.users(id) on delete set null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  played_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_matches_played_requires_result check (
    status <> 'played'
    or (team_score is not null and opponent_score is not null and played_at is not null)
  ),
  constraint team_matches_opponent_length check (opponent_name is null or char_length(trim(opponent_name)) between 1 and 60),
  unique (id, team_id)
);

create table public.team_match_signups (
  id uuid primary key default gen_random_uuid(),
  team_match_id uuid not null,
  team_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  status public.team_match_signup_status not null default 'going',
  signed_up_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_match_signups_match_team_fk foreign key (team_match_id, team_id)
    references public.team_matches(id, team_id) on delete cascade,
  constraint team_match_signups_unique unique (team_match_id, user_id)
);

create table public.team_stat_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  team_match_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  stat_kind public.team_stat_kind not null,
  value smallint not null check (value >= 0 and value <= 99),
  status public.team_stat_submission_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  constraint team_stat_submissions_match_team_fk foreign key (team_match_id, team_id)
    references public.team_matches(id, team_id) on delete cascade,
  constraint team_stat_submissions_unique unique (team_match_id, user_id, stat_kind),
  constraint team_stat_submissions_review_consistent check (
    (status = 'pending' and reviewed_by_user_id is null and reviewed_at is null and rejection_reason is null)
    or (status = 'approved' and reviewed_by_user_id is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_by_user_id is not null and reviewed_at is not null)
  )
);

create unique index team_members_unique_active_idx on public.team_members(team_id, user_id) where archived_at is null;
create index team_members_user_idx on public.team_members(user_id) where archived_at is null;
create index team_matches_team_status_idx on public.team_matches(team_id, status, scheduled_at);
create index team_match_signups_user_idx on public.team_match_signups(user_id);
create index team_stat_submissions_team_status_idx on public.team_stat_submissions(team_id, status);
create index team_invitations_team_idx on public.team_invitations(team_id);

create or replace function app_private.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.archived_at is null
  )
  where true;
$$;

create or replace function app_private.is_team_admin(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
      and tm.archived_at is null
  )
  where true;
$$;

create or replace function app_private.can_bootstrap_team_admin(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and t.created_by_user_id = auth.uid()
      and p_user_id = auth.uid()
      and t.archived_at is null
      and not exists (
        select 1
        from public.team_members tm
        where tm.team_id = p_team_id
          and tm.archived_at is null
      )
  )
  where true;
$$;

create or replace function app_private.is_team_match_played(p_team_match_id uuid, p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.team_matches tm
    where tm.id = p_team_match_id
      and tm.team_id = p_team_id
      and tm.status = 'played'
  )
  where true;
$$;

create or replace function app_private.is_team_match_future(p_team_match_id uuid, p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.team_matches tm
    where tm.id = p_team_match_id
      and tm.team_id = p_team_id
      and tm.status = 'scheduled'
      and tm.scheduled_at > now()
  )
  where true;
$$;

create or replace function app_private.team_member_stat_kind_allowed(
  p_team_id uuid,
  p_user_id uuid,
  p_stat_kind public.team_stat_kind
)
returns boolean
language sql
security definer
stable
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = p_user_id
      and tm.archived_at is null
      and (
        (p_stat_kind = 'goals' and 'DEL' in (tm.primary_position, tm.secondary_position))
        or (p_stat_kind = 'assists' and 'MED' in (tm.primary_position, tm.secondary_position))
        or (p_stat_kind = 'tackles' and ('DEF' in (tm.primary_position, tm.secondary_position) or 'ARQ' in (tm.primary_position, tm.secondary_position)))
      )
  )
  where true;
$$;

create or replace function app_private.is_active_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = p_user_id
      and tm.archived_at is null
  )
  where true;
$$;

create or replace function app_private.validate_team_match_signup_member()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.is_active_team_member(new.team_id, new.user_id) then
    raise exception 'TEAM_SIGNUP_USER_NOT_MEMBER' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger validate_team_match_signup_member_before_insert_update
before insert or update of team_id, user_id
on public.team_match_signups
for each row
execute function app_private.validate_team_match_signup_member();

create or replace function app_private.validate_team_stat_submission()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.is_team_match_played(new.team_match_id, new.team_id) then
    raise exception 'TEAM_MATCH_NOT_PLAYED' using errcode = '23514';
  end if;

  if not app_private.team_member_stat_kind_allowed(new.team_id, new.user_id, new.stat_kind) then
    raise exception 'TEAM_STAT_KIND_NOT_ALLOWED' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger validate_team_stat_submission_before_insert_update
before insert or update of team_id, team_match_id, user_id, stat_kind
on public.team_stat_submissions
for each row
execute function app_private.validate_team_stat_submission();

create or replace function app_private.seal_team_stat_submission_review()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new.status = 'pending' then
    new.reviewed_by_user_id := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  new.reviewed_by_user_id := auth.uid();
  new.reviewed_at := coalesce(new.reviewed_at, now());

  if new.status = 'approved' then
    new.rejection_reason := null;
  end if;

  return new;
end;
$$;

create trigger seal_team_stat_submission_review_before_insert_update
before insert or update of status, reviewed_by_user_id, reviewed_at, rejection_reason
on public.team_stat_submissions
for each row
execute function app_private.seal_team_stat_submission_review();

create or replace function public.accept_team_invite(p_code text)
returns table (
  team_id uuid,
  membership_id uuid,
  already_member boolean,
  role public.team_role
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_membership public.team_members%rowtype;
  v_user public.users%rowtype;
  v_primary_position public.player_position;
  v_secondary_position public.player_position;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_user
  from public.users
  where id = auth.uid();

  if v_user.id is null then
    raise exception 'USER_NOT_FOUND' using errcode = '23514';
  end if;

  update public.team_invitations ti
  set accepted_by_user_id = auth.uid(), accepted_at = now()
  where ti.code = upper(trim(p_code))
    and ti.revoked_at is null
    and (ti.expires_at is null or ti.expires_at > now())
    and ti.accepted_at is null
  returning * into v_invitation;

  if v_invitation.id is null then
    raise exception 'TEAM_INVITE_CODE_INVALID' using errcode = '23514';
  end if;

  select * into v_membership
  from public.team_members tm
  where tm.team_id = v_invitation.team_id
    and tm.user_id = auth.uid()
    and tm.archived_at is null
  limit 1;

  if v_membership.id is not null then
    team_id := v_membership.team_id;
    membership_id := v_membership.id;
    already_member := true;
    role := v_membership.role;
    return next;
    return;
  end if;

  select p.primary_position, p.secondary_position
  into v_primary_position, v_secondary_position
  from public.players p
  where p.user_id = auth.uid()
    and p.is_phantom = false
    and p.stats_status <> 'rejected'
  order by p.joined_at desc
  limit 1;

  if v_primary_position is null then
    raise exception 'TEAM_PLAYER_PROFILE_REQUIRED' using errcode = '23514';
  end if;

  insert into public.team_members (
    team_id,
    user_id,
    role,
    primary_position,
    secondary_position,
    added_by_user_id
  )
  values (
    v_invitation.team_id,
    auth.uid(),
    'member',
    v_primary_position,
    v_secondary_position,
    v_invitation.created_by_user_id
  )
  returning * into v_membership;

  team_id := v_membership.team_id;
  membership_id := v_membership.id;
  already_member := false;
  role := v_membership.role;
  return next;
end;
$$;

create view public.team_approved_stat_totals
with (security_invoker = true)
as
select
  tm.team_id,
  count(distinct tm.id)::int as matches_played,
  coalesce(sum(tss.value) filter (where tss.stat_kind = 'goals'), 0) as goals,
  coalesce(sum(tss.value) filter (where tss.stat_kind = 'assists'), 0) as assists,
  coalesce(sum(tss.value) filter (where tss.stat_kind = 'tackles'), 0) as tackles
from public.team_matches tm
left join public.team_stat_submissions tss
  on tss.team_match_id = tm.id
  and tss.team_id = tm.team_id
  and tss.status = 'approved'
where tm.status = 'played'
group by tm.team_id;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.team_matches enable row level security;
alter table public.team_match_signups enable row level security;
alter table public.team_stat_submissions enable row level security;

create policy teams_select_member_or_creator on public.teams
  for select using (app_private.is_team_member(id) or created_by_user_id = auth.uid());
create policy teams_insert_authenticated on public.teams
  for insert with check (created_by_user_id = auth.uid());
create policy teams_update_admin on public.teams
  for update using (app_private.is_team_admin(id)) with check (app_private.is_team_admin(id));
create policy teams_delete_admin on public.teams
  for delete using (app_private.is_team_admin(id));

create policy team_members_select_team_member on public.team_members
  for select using (app_private.is_team_member(team_id));
create policy team_members_insert_admin_or_bootstrap on public.team_members
  for insert with check (app_private.is_team_admin(team_id) or app_private.can_bootstrap_team_admin(team_id, user_id));
create policy team_members_update_admin on public.team_members
  for update using (app_private.is_team_admin(team_id)) with check (app_private.is_team_admin(team_id));
create policy team_members_delete_admin on public.team_members
  for delete using (app_private.is_team_admin(team_id));

create policy team_invitations_select_admin on public.team_invitations
  for select using (app_private.is_team_admin(team_id));
create policy team_invitations_insert_admin on public.team_invitations
  for insert with check (app_private.is_team_admin(team_id) and created_by_user_id = auth.uid());
create policy team_invitations_update_admin on public.team_invitations
  for update using (app_private.is_team_admin(team_id)) with check (app_private.is_team_admin(team_id));
create policy team_invitations_delete_admin on public.team_invitations
  for delete using (app_private.is_team_admin(team_id));

create policy team_matches_select_member on public.team_matches
  for select using (app_private.is_team_member(team_id));
create policy team_matches_insert_admin on public.team_matches
  for insert with check (app_private.is_team_admin(team_id) and created_by_user_id = auth.uid());
create policy team_matches_update_admin on public.team_matches
  for update using (app_private.is_team_admin(team_id)) with check (app_private.is_team_admin(team_id));
create policy team_matches_delete_admin on public.team_matches
  for delete using (app_private.is_team_admin(team_id));

create policy team_match_signups_select_member on public.team_match_signups
  for select using (app_private.is_team_member(team_id));
create policy team_match_signups_insert_own_member on public.team_match_signups
  for insert with check (
    user_id = auth.uid()
    and app_private.is_team_member(team_id)
    and app_private.is_team_match_future(team_match_id, team_id)
  );
create policy team_match_signups_update_own_or_admin on public.team_match_signups
  for update using (user_id = auth.uid() or app_private.is_team_admin(team_id))
  with check (app_private.is_team_member(team_id) and (user_id = auth.uid() or app_private.is_team_admin(team_id)));
create policy team_match_signups_delete_own_or_admin on public.team_match_signups
  for delete using (user_id = auth.uid() or app_private.is_team_admin(team_id));

create policy team_stat_submissions_select_member on public.team_stat_submissions
  for select using (app_private.is_team_member(team_id));
create policy team_stat_submissions_insert_own_member on public.team_stat_submissions
  for insert with check (
    user_id = auth.uid()
    and app_private.is_team_member(team_id)
    and app_private.is_team_match_played(team_match_id, team_id)
    and status = 'pending'
  );
create policy team_stat_submissions_update_admin on public.team_stat_submissions
  for update using (app_private.is_team_admin(team_id)) with check (app_private.is_team_admin(team_id));
create policy team_stat_submissions_delete_admin on public.team_stat_submissions
  for delete using (app_private.is_team_admin(team_id));

grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.team_invitations to authenticated;
grant select, insert, update, delete on public.team_matches to authenticated;
grant select, insert, update, delete on public.team_match_signups to authenticated;
grant select, insert, update, delete on public.team_stat_submissions to authenticated;
grant select on public.team_approved_stat_totals to authenticated;

revoke all on function app_private.validate_team_match_signup_member() from public, anon, authenticated;
revoke all on function app_private.validate_team_stat_submission() from public, anon, authenticated;
revoke all on function app_private.seal_team_stat_submission_review() from public, anon, authenticated;
revoke all on function public.accept_team_invite(text) from public, anon;
grant execute on function public.accept_team_invite(text) to authenticated;
