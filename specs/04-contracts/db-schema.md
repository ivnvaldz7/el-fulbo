# DB Schema V2

Schema físico de PostgreSQL (Supabase) para El Fulbo V2. Fuente única de verdad.

**Convenciones:**
- Tablas en `snake_case` plural.
- Columnas en `snake_case` singular.
- UUIDs generados por `gen_random_uuid()`.
- Timestamps `timestamptz`.
- Soft delete vía `archived_at`.
- RLS habilitado en todas las tablas.

---

## 1. Extensiones

```sql
create extension if not exists "pgcrypto";
```

## 2. Enums

```sql
create type modality as enum ('F5', 'F6', 'F7', 'F8', 'F9', 'F11');
create type player_position as enum ('ARQ', 'DEF', 'MED', 'DEL');
create type group_role as enum ('admin', 'owner');
create type event_status as enum ('scheduled', 'confirming', 'checked_in', 'drawn', 'played', 'cancelled');
create type attendance_status as enum ('going', 'not_going', 'maybe');
create type participation_team as enum ('A', 'B', 'substitute');
create type stats_status as enum ('pending_approval', 'approved', 'rejected');
create type revision_status as enum ('pending', 'approved', 'rejected');
create type boost_reason as enum ('victory_mvp', 'victory', 'draw_mvp', 'loss_mvp');
create type notification_type as enum (
  'event_created', 'event_cancelled', 'attendance_changed', 'someone_dropped',
  'owner_temporary_assigned', 'stats_pending_approval', 'stats_approved',
  'stats_revision_requested', 'stats_revision_resolved', 'stats_changed_log',
  'mvp_awarded', 'boost_applied', 'stats_rejected', 'weekly_digest'
);
```

## 3. Tablas

### 3.1 `public.users`

```sql
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
```

### 3.2 `public.groups`

```sql
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_modality modality not null,
  logo_url text,
  admin_user_id uuid not null references public.users(id) on delete restrict,
  invite_code text not null unique default ('FULBO-' || upper(substr(md5(random()::text), 1, 6))),
  donation_link text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint groups_name_length check (char_length(trim(name)) between 1 and 40)
);

create index groups_admin_idx on public.groups(admin_user_id);
create index groups_archived_idx on public.groups(archived_at) where archived_at is not null;
```

### 3.3 `public.group_memberships`

```sql
create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  role group_role not null,
  assigned_by_user_id uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  constraint memberships_unique unique (user_id, group_id)
);

create unique index one_admin_per_group
  on public.group_memberships(group_id) where role = 'admin';

create index memberships_group_idx on public.group_memberships(group_id);
create index memberships_user_idx on public.group_memberships(user_id);
```

**Triggers:**

```sql
-- Admin no puede ser Admin de >3 Groups
create or replace function check_admin_group_limit()
returns trigger language plpgsql as $$
begin
  if new.role = 'admin' then
    if (select count(*) from public.group_memberships
        where user_id = new.user_id and role = 'admin') >= 3 then
      raise exception 'ADMIN_GROUP_LIMIT_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_admin_limit before insert or update on public.group_memberships
  for each row execute function check_admin_group_limit();

-- Owner cap: max 2 Owners por Group
create or replace function check_owner_cap()
returns trigger language plpgsql as $$
begin
  if new.role = 'owner' then
    if (select count(*) from public.group_memberships
        where group_id = new.group_id and role = 'owner'
        and id != coalesce(new.id, gen_random_uuid())) >= 2 then
      raise exception 'OWNER_CAP_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_owner_cap before insert or update on public.group_memberships
  for each row execute function check_owner_cap();
```

### 3.4 `public.players`

```sql
create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  group_id uuid not null references public.groups(id) on delete cascade,
  display_name text not null,
  photo_url text,
  primary_position player_position not null,
  secondary_position player_position,
  stats_status stats_status not null default 'pending_approval',
  stats jsonb not null,
  current_boost jsonb,
  is_phantom boolean not null default false,
  is_expelled boolean not null default false,
  joined_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint players_name_length check (char_length(trim(display_name)) between 1 and 40),
  constraint players_secondary_different check (
    secondary_position is null or secondary_position != primary_position
  ),
  constraint players_phantom_no_user check (
    (is_phantom = true and user_id is null) or (is_phantom = false)
  ),
  constraint players_user_unique_per_group unique (user_id, group_id)
);

create index players_group_idx on public.players(group_id) where archived_at is null;
create index players_user_idx on public.players(user_id) where user_id is not null;
```

**Triggers:**

```sql
-- Max 50 players activos por Group
create or replace function check_player_limit()
returns trigger language plpgsql as $$
begin
  if new.archived_at is null then
    if (select count(*) from public.players
        where group_id = new.group_id and archived_at is null
        and id != coalesce(new.id, gen_random_uuid())) >= 50 then
      raise exception 'PLAYER_GROUP_LIMIT_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_player_limit before insert or update on public.players
  for each row execute function check_player_limit();

-- Max 10 Groups activos por User (como Player)
create or replace function check_user_player_groups_limit()
returns trigger language plpgsql as $$
begin
  if new.user_id is not null and new.archived_at is null then
    if (select count(*) from public.players
        where user_id = new.user_id and archived_at is null
        and id != coalesce(new.id, gen_random_uuid())) >= 10 then
      raise exception 'USER_PLAYER_GROUPS_LIMIT_REACHED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_user_player_groups before insert or update on public.players
  for each row execute function check_user_player_groups_limit();
```

### 3.5 `public.events`

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  modality modality not null,
  field_name text not null,
  field_maps_url text,
  scheduled_at timestamptz not null,
  status event_status not null default 'scheduled',
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
    status != 'played' or (team_a_score is not null and team_b_score is not null and mvp_player_id is not null)
  )
);

create index events_group_idx on public.events(group_id);
create index events_status_idx on public.events(group_id, status);
create index events_scheduled_idx on public.events(scheduled_at) where status in ('scheduled', 'confirming');
```

### 3.6 `public.event_attendances`

```sql
create table public.event_attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status attendance_status not null,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_unique unique (event_id, player_id),
  constraint attendance_checkin_valid check (
    checked_in = false or status in ('going', 'maybe')
  )
);

create index attendance_event_idx on public.event_attendances(event_id);
create index attendance_player_idx on public.event_attendances(player_id);
```

### 3.7 `public.match_participations`

```sql
create table public.match_participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team participation_team not null,
  assigned_position player_position,
  played_primary_position boolean not null default true,
  boost_applied jsonb,
  created_at timestamptz not null default now(),
  constraint participations_unique unique (event_id, player_id),
  constraint participations_position_required check (
    (team = 'substitute' and assigned_position is null) or
    (team != 'substitute' and assigned_position is not null)
  )
);

create index participations_event_idx on public.match_participations(event_id);
create index participations_player_idx on public.match_participations(player_id);
```

### 3.8 `public.player_stat_change_logs`

```sql
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

create index stat_log_player_idx on public.player_stat_change_logs(player_id, created_at desc);
```

### 3.9 `public.stat_revision_requests`

```sql
create table public.stat_revision_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  proposed_stats jsonb,
  status revision_status not null default 'pending',
  resolved_by_user_id uuid references public.users(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  constraint revision_message_length check (char_length(message) between 1 and 200)
);

-- Max 1 pending por Player
create unique index one_pending_revision_per_player
  on public.stat_revision_requests(player_id) where status = 'pending';

create index revision_player_idx on public.stat_revision_requests(player_id);
```

### 3.10 `public.temporary_owners`

```sql
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

create index temp_owner_event_idx on public.temporary_owners(event_id);
create index temp_owner_expires_idx on public.temporary_owners(expires_at)
  where confirmed_at is not null;
```

### 3.11 `public.notifications`

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  pushed_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;
```

### 3.12 `public.push_subscriptions`

```sql
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

create index push_user_idx on public.push_subscriptions(user_id) where archived = false;
```

---

## 4. Helper functions para RLS

```sql
-- User es miembro del Group (Admin, Owner o Player)?
create or replace function is_group_member(gid uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.players where group_id = gid and user_id = auth.uid() and archived_at is null
  ) or exists(
    select 1 from public.group_memberships where group_id = gid and user_id = auth.uid()
  );
$$;

-- User es Admin del Group?
create or replace function is_group_admin(gid uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.groups where id = gid and admin_user_id = auth.uid()
  );
$$;

-- User es Owner (fijo o temporal confirmado) del Group?
create or replace function is_group_owner(gid uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.group_memberships
    where group_id = gid and user_id = auth.uid() and role = 'owner'
  ) or exists(
    select 1 from public.temporary_owners t
    join public.events e on e.id = t.event_id
    where e.group_id = gid and t.user_id = auth.uid()
    and t.confirmed_at is not null and t.expires_at > now()
  );
$$;

-- User tiene permisos de admin-or-owner?
create or replace function is_group_admin_or_owner(gid uuid)
returns boolean language sql security definer stable as $$
  select is_group_admin(gid) or is_group_owner(gid);
$$;
```

---

## 5. Row Level Security

Todas las tablas: `alter table X enable row level security;`

### 5.1 `users`
```sql
create policy users_select_self on public.users for select using (id = auth.uid());
create policy users_update_self on public.users for update using (id = auth.uid());
create policy users_insert_self on public.users for insert with check (id = auth.uid());
```

### 5.2 `groups`
```sql
create policy groups_select_member on public.groups for select using (is_group_member(id));
create policy groups_insert_any_authenticated on public.groups for insert with check (auth.uid() is not null);
create policy groups_update_admin on public.groups for update using (is_group_admin(id));
create policy groups_delete_admin on public.groups for delete using (is_group_admin(id));
```

### 5.3 `group_memberships`
```sql
create policy memberships_select_member on public.group_memberships for select using (is_group_member(group_id));
create policy memberships_insert_admin_or_bootstrap on public.group_memberships for insert with check (
  (role = 'admin' and user_id = auth.uid() and
   not exists(select 1 from public.group_memberships where group_id = group_memberships.group_id))
  or is_group_admin(group_id)
);
create policy memberships_delete_admin on public.group_memberships for delete using (is_group_admin(group_id));
```

### 5.4 `players`
```sql
create policy players_select_visible on public.players for select using (
  is_group_member(group_id) and (stats_status = 'approved' or user_id = auth.uid() or is_group_admin(group_id))
);
create policy players_insert_member on public.players for insert with check (
  is_group_member(group_id) or
  (user_id = auth.uid() and not exists(select 1 from public.players where group_id = players.group_id and user_id = auth.uid()))
);
create policy players_update_owner_or_self on public.players for update using (
  is_group_admin(group_id) or
  (user_id = auth.uid() and stats_status = 'pending_approval')
);
create policy players_delete_admin on public.players for delete using (is_group_admin(group_id));
```

### 5.5 `events`
```sql
create policy events_select_member on public.events for select using (is_group_member(group_id));
create policy events_insert_admin_owner on public.events for insert with check (is_group_admin_or_owner(group_id));
create policy events_update_admin_owner on public.events for update using (is_group_admin_or_owner(group_id));
create policy events_delete_admin on public.events for delete using (is_group_admin(group_id));
```

### 5.6 `event_attendances`
```sql
create policy attendance_select_member on public.event_attendances for select using (
  is_group_member((select group_id from public.events where id = event_id))
);
create policy attendance_insert_own on public.event_attendances for insert with check (
  exists(select 1 from public.players where id = player_id and user_id = auth.uid()) or
  is_group_admin_or_owner((select group_id from public.events where id = event_id))
);
create policy attendance_update_own_or_owner on public.event_attendances for update using (
  exists(select 1 from public.players where id = player_id and user_id = auth.uid()) or
  is_group_admin_or_owner((select group_id from public.events where id = event_id))
);
```

### 5.7 `match_participations`, `player_stat_change_logs`, `stat_revision_requests`, `temporary_owners`

Policies similares: SELECT para miembros del Group, INSERT/UPDATE restringido según rol.

### 5.8 `notifications`, `push_subscriptions`

```sql
create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update using (user_id = auth.uid());

create policy push_sub_select_own on public.push_subscriptions for select using (user_id = auth.uid());
create policy push_sub_all_own on public.push_subscriptions for all using (user_id = auth.uid());
```

---

## 6. Server-side functions

### 6.1 `apply_match_outcome(event_id)`

Aplica boosts post-partido atómicamente. Placeholder:

```sql
create or replace function apply_match_outcome(p_event_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Ver business-rules §5 y balancing-algorithm §Aplicación del boost
  -- Implementación completa en migration aparte una vez validado con tests
  raise notice 'TODO: implementar según business-rules V2';
end;
$$;
```

### 6.2 `accept_invite(invite_code, user_id)`

```sql
create or replace function accept_invite(p_invite_code text)
returns uuid language plpgsql security definer as $$
declare
  gid uuid;
begin
  select id into gid from public.groups where invite_code = p_invite_code and archived_at is null;
  if gid is null then
    raise exception 'INVITE_CODE_INVALID';
  end if;
  insert into public.players (user_id, group_id, display_name, primary_position, stats, is_phantom, stats_status)
  select auth.uid(), gid, u.display_name, 'MED', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, false, 'pending_approval'
  from public.users u where u.id = auth.uid();
  return gid;
end;
$$;
```

### 6.3 Cronjobs (pg_cron)

```sql
-- Archivar grupos huérfanos > 30 días
select cron.schedule('delete-orphaned-groups', '0 3 * * *', $$
  delete from public.groups where archived_at is not null and archived_at < now() - interval '30 days';
$$);

-- Hard delete players archivados > 365 días
select cron.schedule('delete-old-players', '0 4 * * *', $$
  delete from public.players where archived_at is not null and archived_at < now() - interval '365 days';
$$);

-- Expiración de temporary_owners
select cron.schedule('expire-temp-owners', '0 * * * *', $$
  update public.temporary_owners set confirmed_at = null
  where confirmed_at is not null and expires_at < now();
$$);

-- Archivar players fantasma no decididos
select cron.schedule('archive-phantoms', '0 5 * * *', $$
  update public.players set archived_at = now()
  where is_phantom = true and archived_at is null and created_at < now() - interval '7 days';
$$);

-- Designación automática de Owners temporales
select cron.schedule('assign-temporary-owners', '*/15 * * * *', $$
  -- Ver business-rules §11
  -- Implementación compleja, dedicada function
$$);
```

---

## 7. Storage buckets

```
# Creados vía Supabase dashboard:
# - player-photos: público, max 2MB, path: groups/{group_id}/players/{player_id}.webp
# - group-logos: público, max 2MB, path: groups/{group_id}/logo.webp
```

---

## 8. Migrations

- Path: `/supabase/migrations/YYYYMMDDHHMMSS_name.sql`.
- Nunca modificar una aplicada en prod; crear nueva.
- Primera: `20260421000000_initial_schema_v2.sql` con todo el contenido de este doc.
