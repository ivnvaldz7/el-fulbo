create extension if not exists "pgcrypto";

create type public.modality as enum ('F5', 'F6', 'F7', 'F8', 'F11');
create type public.player_position as enum ('ARQ', 'DEF', 'MED', 'DEL');
create type public.group_role as enum ('admin', 'owner');
create type public.event_status as enum (
  'scheduled',
  'confirming',
  'checked_in',
  'drawn',
  'played',
  'cancelled'
);
create type public.attendance_status as enum ('going', 'not_going', 'maybe');
create type public.participation_team as enum ('A', 'B', 'substitute');
create type public.stats_status as enum ('pending_approval', 'approved');
create type public.revision_status as enum ('pending', 'approved', 'rejected');
create type public.boost_reason as enum ('victory_mvp', 'victory', 'draw_mvp', 'loss_mvp');
create type public.notification_type as enum (
  'event_created',
  'event_cancelled',
  'attendance_changed',
  'someone_dropped',
  'owner_temporary_assigned',
  'owner_assigned',
  'owner_removed',
  'owner_temporary_accepted',
  'owner_temporary_rejected',
  'owner_temporary_no_one_accepted',
  'stats_pending_approval',
  'stats_approved',
  'stats_revision_requested',
  'stats_revision_resolved',
  'stats_changed_log',
  'player_returned',
  'reintegration_request',
  'reintegration_approved',
  'reintegration_rejected',
  'event_rescheduled',
  'event_updated',
  'match_ready',
  'mvp_awarded',
  'boost_applied',
  'weekly_digest'
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  photo_url text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  constraint users_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint users_display_name_length check (char_length(trim(display_name)) between 1 and 40)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_modality public.modality not null,
  logo_url text,
  admin_user_id uuid not null references public.users(id) on delete restrict,
  invite_code text not null unique default ('FULBO-' || upper(substr(md5(random()::text), 1, 6))),
  donation_link text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint groups_name_length check (char_length(trim(name)) between 1 and 40)
);

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  role public.group_role not null,
  assigned_by_user_id uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  constraint memberships_unique unique (user_id, group_id)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  group_id uuid not null references public.groups(id) on delete cascade,
  display_name text not null,
  photo_url text,
  primary_position public.player_position not null,
  secondary_position public.player_position,
  stats_status public.stats_status not null default 'pending_approval',
  stats jsonb not null,
  current_boost jsonb,
  is_phantom boolean not null default false,
  is_expelled boolean not null default false,
  joined_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint players_name_length check (char_length(trim(display_name)) between 1 and 40),
  constraint players_secondary_different check (
    secondary_position is null or secondary_position <> primary_position
  ),
  constraint players_phantom_no_user check (
    (is_phantom = true and user_id is null) or (is_phantom = false)
  ),
  constraint players_user_unique_per_group unique (user_id, group_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  modality public.modality not null,
  field_name text not null,
  field_maps_url text,
  scheduled_at timestamptz not null,
  status public.event_status not null default 'scheduled',
  team_a_name text not null default 'Equipo A',
  team_b_name text not null default 'Equipo B',
  team_a_score smallint check (team_a_score is null or team_a_score >= 0),
  team_b_score smallint check (team_b_score is null or team_b_score >= 0),
  mvp_player_id uuid references public.players(id) on delete set null,
  draw_seed text,
  created_by_user_id uuid not null references public.users(id),
  drawn_by_user_id uuid references public.users(id),
  played_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint events_field_length check (char_length(trim(field_name)) between 1 and 60),
  constraint events_played_requires_score check (
    status <> 'played'
    or (team_a_score is not null and team_b_score is not null and mvp_player_id is not null)
  )
);

create table public.event_attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status public.attendance_status not null,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_unique unique (event_id, player_id),
  constraint attendance_checkin_valid check (
    checked_in = false or status in ('going', 'maybe')
  )
);

create table public.match_participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team public.participation_team not null,
  assigned_position public.player_position,
  played_primary_position boolean not null default true,
  boost_applied jsonb,
  created_at timestamptz not null default now(),
  constraint participations_unique unique (event_id, player_id),
  constraint participations_position_required check (
    (team = 'substitute' and assigned_position is null)
    or (team <> 'substitute' and assigned_position is not null)
  )
);

create table public.player_stat_change_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  changed_by_user_id uuid not null references public.users(id),
  requested_by_user_id uuid references public.users(id) on delete set null,
  before_stats jsonb,
  after_stats jsonb not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.stat_revision_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  proposed_stats jsonb,
  status public.revision_status not null default 'pending',
  resolved_by_user_id uuid references public.users(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revision_message_length check (char_length(message) between 1 and 200)
);

create table public.reintegration_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text,
  status public.revision_status not null default 'pending',
  resolved_by_user_id uuid references public.users(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reintegration_message_length check (
    message is null or char_length(message) <= 300
  )
);

create table public.temporary_owners (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_reason text not null,
  confirmed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint temp_owner_unique unique (event_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  pushed_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create unique index one_admin_per_group on public.group_memberships(group_id)
  where role = 'admin';
create unique index one_pending_revision_per_player on public.stat_revision_requests(player_id)
  where status = 'pending';
create unique index one_pending_reintegration_per_player
  on public.reintegration_requests(player_id) where status = 'pending';

create index groups_admin_idx on public.groups(admin_user_id);
create index groups_archived_idx on public.groups(archived_at) where archived_at is not null;
create index memberships_group_idx on public.group_memberships(group_id);
create index memberships_user_idx on public.group_memberships(user_id);
create index players_group_idx on public.players(group_id) where archived_at is null;
create index players_user_idx on public.players(user_id) where user_id is not null;
create index events_group_idx on public.events(group_id);
create index events_status_idx on public.events(group_id, status);
create index events_scheduled_idx on public.events(scheduled_at)
  where status in ('scheduled', 'confirming');
create index attendance_event_idx on public.event_attendances(event_id);
create index attendance_player_idx on public.event_attendances(player_id);
create index participations_event_idx on public.match_participations(event_id);
create index participations_player_idx on public.match_participations(player_id);
create index stat_log_player_idx on public.player_stat_change_logs(player_id, created_at desc);
create index revision_player_idx on public.stat_revision_requests(player_id);
create index reintegration_group_idx on public.reintegration_requests(group_id, created_at desc);
create index temp_owner_event_idx on public.temporary_owners(event_id);
create index temp_owner_expires_idx on public.temporary_owners(expires_at)
  where confirmed_at is not null;
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;
create index push_user_idx on public.push_subscriptions(user_id) where archived = false;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_attendance_updated_at
  before update on public.event_attendances
  for each row execute function public.touch_updated_at();

create trigger trg_revision_updated_at
  before update on public.stat_revision_requests
  for each row execute function public.touch_updated_at();

create trigger trg_reintegration_updated_at
  before update on public.reintegration_requests
  for each row execute function public.touch_updated_at();

create or replace function public.check_admin_group_limit()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' then
    if (
      select count(*)
      from public.group_memberships
      where user_id = new.user_id and role = 'admin' and id <> coalesce(new.id, gen_random_uuid())
    ) >= 3 then
      raise exception 'ADMIN_GROUP_LIMIT_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_admin_limit
  before insert or update on public.group_memberships
  for each row execute function public.check_admin_group_limit();

create or replace function public.check_owner_cap()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'owner' then
    if (
      select count(*)
      from public.group_memberships
      where group_id = new.group_id and role = 'owner' and id <> coalesce(new.id, gen_random_uuid())
    ) >= 2 then
      raise exception 'OWNER_CAP_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_owner_cap
  before insert or update on public.group_memberships
  for each row execute function public.check_owner_cap();

create or replace function public.check_player_limit()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is null then
    if (
      select count(*)
      from public.players
      where group_id = new.group_id and archived_at is null and id <> coalesce(new.id, gen_random_uuid())
    ) >= 50 then
      raise exception 'PLAYER_GROUP_LIMIT_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_player_limit
  before insert or update on public.players
  for each row execute function public.check_player_limit();

create or replace function public.check_user_player_groups_limit()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null and new.archived_at is null then
    if (
      select count(*)
      from public.players
      where user_id = new.user_id and archived_at is null and id <> coalesce(new.id, gen_random_uuid())
    ) >= 10 then
      raise exception 'USER_PLAYER_GROUPS_LIMIT_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_user_player_groups
  before insert or update on public.players
  for each row execute function public.check_user_player_groups_limit();

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.players
    where group_id = gid and user_id = auth.uid() and archived_at is null
  ) or exists(
    select 1 from public.group_memberships
    where group_id = gid and user_id = auth.uid()
  );
$$;

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

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.players enable row level security;
alter table public.events enable row level security;
alter table public.event_attendances enable row level security;
alter table public.match_participations enable row level security;
alter table public.player_stat_change_logs enable row level security;
alter table public.stat_revision_requests enable row level security;
alter table public.reintegration_requests enable row level security;
alter table public.temporary_owners enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy users_select_self on public.users for select using (id = auth.uid());
create policy users_insert_self on public.users for insert with check (id = auth.uid());
create policy users_update_self on public.users for update using (id = auth.uid());

create policy groups_select_member on public.groups for select using (public.is_group_member(id));
create policy groups_insert_authenticated on public.groups for insert with check (auth.uid() is not null);
create policy groups_update_admin on public.groups for update using (public.is_group_admin(id));
create policy groups_delete_admin on public.groups for delete using (public.is_group_admin(id));

create policy memberships_select_member on public.group_memberships
  for select using (public.is_group_member(group_id));
create policy memberships_insert_admin_or_bootstrap on public.group_memberships
  for insert with check (
    (
      role = 'admin'
      and user_id = auth.uid()
      and not exists (
        select 1 from public.group_memberships existing
        where existing.group_id = group_memberships.group_id
      )
    )
    or public.is_group_admin(group_id)
  );
create policy memberships_delete_admin on public.group_memberships
  for delete using (public.is_group_admin(group_id));

create policy players_select_visible on public.players for select using (
  public.is_group_member(group_id)
  and (stats_status = 'approved' or user_id = auth.uid() or public.is_group_admin(group_id))
);
create policy players_insert_self_or_admin on public.players for insert with check (
  (user_id = auth.uid() and is_phantom = false)
  or public.is_group_admin_or_owner(group_id)
);
create policy players_update_admin_or_pending_self on public.players for update using (
  public.is_group_admin(group_id)
  or (user_id = auth.uid() and stats_status = 'pending_approval')
);
create policy players_delete_admin on public.players for delete using (public.is_group_admin(group_id));

create policy events_select_member on public.events for select using (public.is_group_member(group_id));
create policy events_insert_admin_owner on public.events
  for insert with check (public.is_group_admin_or_owner(group_id));
create policy events_update_admin_owner on public.events
  for update using (public.is_group_admin_or_owner(group_id));
create policy events_delete_admin on public.events for delete using (public.is_group_admin(group_id));

create policy attendance_select_member on public.event_attendances for select using (
  public.is_group_member((select group_id from public.events where id = event_id))
);
create policy attendance_insert_own_or_owner on public.event_attendances for insert with check (
  exists(select 1 from public.players where id = player_id and user_id = auth.uid())
  or public.is_group_admin_or_owner((select group_id from public.events where id = event_id))
);
create policy attendance_update_own_or_owner on public.event_attendances for update using (
  exists(select 1 from public.players where id = player_id and user_id = auth.uid())
  or public.is_group_admin_or_owner((select group_id from public.events where id = event_id))
);

create policy participations_select_member on public.match_participations for select using (
  public.is_group_member((select group_id from public.events where id = event_id))
);
create policy participations_write_admin_owner on public.match_participations for all using (
  public.is_group_admin_or_owner((select group_id from public.events where id = event_id))
) with check (
  public.is_group_admin_or_owner((select group_id from public.events where id = event_id))
);

create policy stat_logs_select_member on public.player_stat_change_logs for select using (
  public.is_group_member((select group_id from public.players where id = player_id))
);
create policy stat_logs_insert_admin on public.player_stat_change_logs for insert with check (
  public.is_group_admin((select group_id from public.players where id = player_id))
);

create policy revisions_select_related on public.stat_revision_requests for select using (
  user_id = auth.uid()
  or public.is_group_admin((select group_id from public.players where id = player_id))
);
create policy revisions_insert_self on public.stat_revision_requests for insert with check (
  user_id = auth.uid()
);
create policy revisions_update_admin on public.stat_revision_requests for update using (
  public.is_group_admin((select group_id from public.players where id = player_id))
);

create policy reintegration_select_related on public.reintegration_requests for select using (
  user_id = auth.uid() or public.is_group_admin(group_id)
);
create policy reintegration_insert_self on public.reintegration_requests for insert with check (
  user_id = auth.uid()
);
create policy reintegration_update_admin on public.reintegration_requests for update using (
  public.is_group_admin(group_id)
);

create policy temp_owner_select_member on public.temporary_owners for select using (
  public.is_group_member((select group_id from public.events where id = event_id))
);
create policy temp_owner_write_admin on public.temporary_owners for all using (
  public.is_group_admin((select group_id from public.events where id = event_id))
) with check (
  public.is_group_admin((select group_id from public.events where id = event_id))
);

create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update using (user_id = auth.uid());
create policy notifications_insert_service on public.notifications for insert with check (auth.uid() is not null);

create policy push_sub_select_own on public.push_subscriptions for select using (user_id = auth.uid());
create policy push_sub_insert_own on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy push_sub_update_own on public.push_subscriptions for update using (user_id = auth.uid());
create policy push_sub_delete_own on public.push_subscriptions for delete using (user_id = auth.uid());

create or replace view public.player_stats_aggregate
with (security_invoker = true)
as
select
  p.id as player_id,
  p.group_id,
  p.user_id,
  p.display_name,
  count(distinct mp.event_id) filter (
    where mp.team in ('A', 'B') and e.status = 'played'
  )::integer as matches_played,
  count(distinct mp.event_id) filter (
    where (
      (mp.team = 'A' and e.status = 'played' and e.team_a_score > e.team_b_score)
      or (mp.team = 'B' and e.status = 'played' and e.team_b_score > e.team_a_score)
    )
  )::integer as wins,
  count(distinct mp.event_id) filter (
    where mp.team in ('A', 'B') and e.status = 'played' and e.team_a_score = e.team_b_score
  )::integer as draws,
  count(distinct mp.event_id) filter (
    where (
      (mp.team = 'A' and e.status = 'played' and e.team_a_score < e.team_b_score)
      or (mp.team = 'B' and e.status = 'played' and e.team_b_score < e.team_a_score)
    )
  )::integer as losses,
  count(distinct e.id) filter (
    where e.mvp_player_id = p.id and e.status = 'played'
  )::integer as mvp_count,
  max(e.played_at) filter (
    where e.mvp_player_id = p.id and e.status = 'played'
  ) as last_mvp_at,
  case
    when (
      select count(*)
      from public.events e2
      where e2.group_id = p.group_id
        and e2.status = 'played'
        and coalesce(e2.played_at, e2.scheduled_at) >= p.joined_at
    ) > 0 then round(
      100.0 * count(distinct mp.event_id) filter (
        where mp.team in ('A', 'B') and e.status = 'played'
      ) / (
        select count(*)
        from public.events e2
        where e2.group_id = p.group_id
          and e2.status = 'played'
          and coalesce(e2.played_at, e2.scheduled_at) >= p.joined_at
      ),
      1
    )
    else null
  end as attendance_rate,
  (
    select count(*)
    from public.event_attendances ea
    join public.events ev on ev.id = ea.event_id
    where ea.player_id = p.id
      and ea.status = 'not_going'
      and ea.updated_at > (ev.scheduled_at - interval '6 hours')
  )::integer as late_dropouts
from public.players p
left join public.match_participations mp on mp.player_id = p.id
left join public.events e on e.id = mp.event_id and e.status = 'played'
where p.archived_at is null
group by p.id, p.group_id, p.user_id, p.display_name, p.joined_at;

create or replace function public.accept_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid
  from public.groups
  where invite_code = p_invite_code and archived_at is null;

  if gid is null then
    raise exception 'INVITE_CODE_INVALID';
  end if;

  insert into public.players (
    user_id,
    group_id,
    display_name,
    primary_position,
    stats,
    is_phantom,
    stats_status
  )
  select
    auth.uid(),
    gid,
    u.display_name,
    'MED',
    '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb,
    false,
    'pending_approval'
  from public.users u
  where u.id = auth.uid()
  on conflict (user_id, group_id) do nothing;

  return gid;
end;
$$;

create or replace function public.apply_match_outcome(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise notice 'TODO: implementar segun business-rules V2 feat-008/feat-009';
end;
$$;
