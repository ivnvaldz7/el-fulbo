-- Teams central card domain (Unit 1 of the teams-central-card change).
-- Additive only: dedicated Teams card tables, snapshot lifecycle, local
-- performance accounting, mission ledger, approved-only aggregate view, RLS.
-- Groups tables and legacy progression are NOT touched (dropped in Unit 2).

create type public.team_card_snapshot_status as enum ('draft', 'pending', 'approved', 'rejected');
create type public.team_mission_kind as enum ('trophy', 'mvp_cycle', 'milestone');

create or replace function app_private.team_card_stats_valid(p_stats jsonb, p_position public.player_position)
returns boolean
language sql
immutable
set search_path = public, app_private
as $$
  select
    p_stats is not null
    and jsonb_typeof(p_stats) = 'object'
    and (select count(*) from jsonb_object_keys(p_stats)) = 6
    and case
      when p_position = 'ARQ' then
        p_stats ? 'div'
        and p_stats ? 'han'
        and p_stats ? 'kic'
        and p_stats ? 'ref'
        and p_stats ? 'spd'
        and p_stats ? 'pos'
        and (p_stats->>'div')::int between 55 and 75
        and (p_stats->>'han')::int between 55 and 75
        and (p_stats->>'kic')::int between 55 and 75
        and (p_stats->>'ref')::int between 55 and 75
        and (p_stats->>'spd')::int between 55 and 75
        and (p_stats->>'pos')::int between 55 and 75
      else
        p_stats ? 'pac'
        and p_stats ? 'sho'
        and p_stats ? 'pas'
        and p_stats ? 'dri'
        and p_stats ? 'def'
        and p_stats ? 'phy'
        and (p_stats->>'pac')::int between 55 and 75
        and (p_stats->>'sho')::int between 55 and 75
        and (p_stats->>'pas')::int between 55 and 75
        and (p_stats->>'dri')::int between 55 and 75
        and (p_stats->>'def')::int between 55 and 75
        and (p_stats->>'phy')::int between 55 and 75
    end;
$$;

create table public.team_cards (
  user_id uuid primary key references public.users(id) on delete cascade,
  stats jsonb not null,
  primary_position public.player_position not null,
  secondary_position public.player_position not null,
  positions_locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_cards_secondary_different check (secondary_position <> primary_position),
  constraint team_cards_stats_valid check (app_private.team_card_stats_valid(stats, primary_position))
);

create or replace function app_private.team_card_positions_lock()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if old.positions_locked_at is not null
    and (new.primary_position is distinct from old.primary_position
         or new.secondary_position is distinct from old.secondary_position) then
    raise exception 'TEAM_CARD_POSITIONS_LOCKED' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger team_card_positions_lock_before_update
before update on public.team_cards
for each row
execute function app_private.team_card_positions_lock();

create table public.team_card_snapshots (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  card_stats jsonb not null,
  positions jsonb,
  status public.team_card_snapshot_status not null default 'draft',
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  constraint team_card_snapshots_positions_shape check (
    positions is null or (positions ? 'primary' and positions ? 'secondary')
  ),
  constraint team_card_snapshots_review_consistent check (
    (status in ('draft', 'pending') and reviewed_by_user_id is null and reviewed_at is null and rejection_reason is null)
    or (status = 'approved' and reviewed_by_user_id is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_by_user_id is not null and reviewed_at is not null)
  )
);

create index team_card_snapshots_user_idx on public.team_card_snapshots(user_id);

create or replace function app_private.seal_team_card_snapshot_review()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if tg_op = 'UPDATE' and old.status in ('approved', 'rejected') then
    if new.team_id is distinct from old.team_id
      or new.user_id is distinct from old.user_id
      or new.card_stats is distinct from old.card_stats
      or new.positions is distinct from old.positions
      or new.status is distinct from old.status
      or new.reviewed_by_user_id is distinct from old.reviewed_by_user_id
      or new.reviewed_at is distinct from old.reviewed_at
      or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'TEAM_CARD_SNAPSHOT_FINAL' using errcode = '23514';
    end if;
  end if;

  if new.status in ('draft', 'pending') then
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

create trigger seal_team_card_snapshot_review_before_insert_update
before insert or update of team_id, user_id, card_stats, positions, status, reviewed_by_user_id, reviewed_at, rejection_reason
on public.team_card_snapshots
for each row
execute function app_private.seal_team_card_snapshot_review();

create or replace function app_private.team_card_snapshot_on_membership()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_card public.team_cards%rowtype;
begin
  select * into v_card
  from public.team_cards
  where user_id = new.user_id;

  insert into public.team_card_snapshots (team_id, user_id, card_stats, positions, status)
  values (
    new.team_id,
    new.user_id,
    coalesce(v_card.stats, '{}'::jsonb),
    case when v_card.user_id is null then null
         else jsonb_build_object('primary', v_card.primary_position, 'secondary', v_card.secondary_position)
    end,
    (case when v_card.user_id is null then 'draft' else 'pending' end)::public.team_card_snapshot_status
  )
  on conflict (team_id, user_id) do nothing;

  return null;
end;
$$;

create trigger team_card_snapshot_on_membership_after_insert
after insert on public.team_members
for each row
execute function app_private.team_card_snapshot_on_membership();

create table public.team_local_performance (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  matches_played integer not null default 0 check (matches_played >= 0),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  tackles integer not null default 0 check (tackles >= 0),
  mvps integer not null default 0 check (mvps >= 0),
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_local_performance_user_idx on public.team_local_performance(user_id);

create or replace function app_private.refresh_team_local_performance(p_team_id uuid, p_user_id uuid)
returns void
language sql
security definer
set search_path = public, app_private
as $$
  with played_matches as (
    select tm.id
    from public.team_matches tm
    where tm.team_id = p_team_id
      and tm.status = 'played'
      and exists (
        select 1
        from public.team_stat_submissions tss
        where tss.team_match_id = tm.id
          and tss.team_id = tm.team_id
          and tss.user_id = p_user_id
          and tss.status = 'approved'
      )
  ),
  aggregates as (
    select
      count(*)::int as matches_played,
      coalesce(sum(tss.value) filter (where tss.stat_kind = 'goals'), 0)::int as goals,
      coalesce(sum(tss.value) filter (where tss.stat_kind = 'assists'), 0)::int as assists,
      coalesce(sum(tss.value) filter (where tss.stat_kind = 'tackles'), 0)::int as tackles
    from played_matches pm
    left join public.team_stat_submissions tss
      on tss.team_match_id = pm.id
      and tss.team_id = p_team_id
      and tss.user_id = p_user_id
      and tss.status = 'approved'
  ),
  mvps as (
    select count(*)::int as mvps
    from public.team_matches tm
    where tm.team_id = p_team_id
      and tm.status = 'played'
      and tm.mvp_user_id = p_user_id
  )
  insert into public.team_local_performance (team_id, user_id, matches_played, goals, assists, tackles, mvps)
  select p_team_id, p_user_id, a.matches_played, a.goals, a.assists, a.tackles, m.mvps
  from aggregates a
  cross join mvps m
  on conflict (team_id, user_id) do update set
    matches_played = excluded.matches_played,
    goals = excluded.goals,
    assists = excluded.assists,
    tackles = excluded.tackles,
    mvps = excluded.mvps,
    updated_at = now();
$$;

create or replace function app_private.team_local_performance_submission_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    perform app_private.refresh_team_local_performance(new.team_id, new.user_id);
  end if;

  return null;
end;
$$;

create trigger team_local_performance_submission_after_insert_update
after insert or update of status
on public.team_stat_submissions
for each row
execute function app_private.team_local_performance_submission_trigger();

create or replace function app_private.team_local_performance_match_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_user uuid;
begin
  if new.mvp_user_id is distinct from old.mvp_user_id then
    if old.mvp_user_id is not null then
      perform app_private.refresh_team_local_performance(old.team_id, old.mvp_user_id);
    end if;
    if new.mvp_user_id is not null then
      perform app_private.refresh_team_local_performance(new.team_id, new.mvp_user_id);
    end if;
  elsif new.status = 'played' and new.mvp_user_id is not null and old.status is distinct from new.status then
    perform app_private.refresh_team_local_performance(new.team_id, new.mvp_user_id);
  end if;

  if new.status is distinct from old.status and (new.status = 'played' or old.status = 'played') then
    for v_user in
      select distinct tss.user_id
      from public.team_stat_submissions tss
      where tss.team_match_id = new.id
        and tss.team_id = new.team_id
        and tss.status = 'approved'
    loop
      perform app_private.refresh_team_local_performance(new.team_id, v_user);
    end loop;
  end if;

  return null;
end;
$$;

create trigger team_local_performance_match_after_insert_update
after insert or update of status, mvp_user_id
on public.team_matches
for each row
execute function app_private.team_local_performance_match_trigger();

create table public.team_merit_grants (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  stat_keys jsonb not null,
  points_total smallint not null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint team_merit_grants_points_range check (points_total between 1 and 3),
  constraint team_merit_grants_keys_count check (
    jsonb_typeof(stat_keys) = 'array' and jsonb_array_length(stat_keys) between 1 and 2
  )
);

create index team_merit_grants_team_user_idx on public.team_merit_grants(team_id, user_id);

create table public.team_mission_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind public.team_mission_kind not null,
  ref text not null,
  stat_key text,
  points smallint check (points is null or points > 0),
  created_at timestamptz not null default now(),
  constraint team_mission_ledger_unique unique (user_id, kind, ref)
);

create view public.team_central_card_aggregates
with (security_invoker = true)
as
with approved_performance as (
  select
    tlp.user_id,
    sum(tlp.matches_played) as matches_played,
    sum(tlp.goals) as goals,
    sum(tlp.assists) as assists,
    sum(tlp.tackles) as tackles,
    sum(tlp.mvps) as mvps
  from public.team_local_performance tlp
  join public.team_card_snapshots tcs
    on tcs.team_id = tlp.team_id
    and tcs.user_id = tlp.user_id
    and tcs.status = 'approved'
  group by tlp.user_id
),
mission_totals as (
  select
    tml.user_id,
    count(*) filter (where tml.kind = 'trophy') as trophies,
    count(*) filter (where tml.kind in ('mvp_cycle', 'milestone')) as missions,
    coalesce(sum(tml.points), 0) as mission_points
  from public.team_mission_ledger tml
  group by tml.user_id
)
select
  tc.user_id,
  tc.stats,
  tc.primary_position,
  tc.secondary_position,
  coalesce(ap.matches_played, 0)::int as matches_played,
  coalesce(ap.goals, 0)::int as goals,
  coalesce(ap.assists, 0)::int as assists,
  coalesce(ap.tackles, 0)::int as tackles,
  coalesce(ap.mvps, 0)::int as mvps,
  coalesce(mt.trophies, 0)::int as trophies,
  coalesce(mt.missions, 0)::int as missions,
  coalesce(mt.mission_points, 0)::int as mission_points
from public.team_cards tc
left join approved_performance ap on ap.user_id = tc.user_id
left join mission_totals mt on mt.user_id = tc.user_id;

alter table public.team_cards enable row level security;
alter table public.team_card_snapshots enable row level security;
alter table public.team_local_performance enable row level security;
alter table public.team_merit_grants enable row level security;
alter table public.team_mission_ledger enable row level security;

create policy team_cards_select_self on public.team_cards
  for select using (user_id = auth.uid());
create policy team_cards_insert_self on public.team_cards
  for insert with check (user_id = auth.uid());
create policy team_cards_update_self on public.team_cards
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy team_card_snapshots_select_member on public.team_card_snapshots
  for select using (app_private.is_team_member(team_id));
create policy team_card_snapshots_update_admin on public.team_card_snapshots
  for update using (app_private.is_team_admin(team_id)) with check (app_private.is_team_admin(team_id));

create policy team_local_performance_select_member on public.team_local_performance
  for select using (app_private.is_team_member(team_id));

create policy team_merit_grants_select_member on public.team_merit_grants
  for select using (app_private.is_team_member(team_id));

create policy team_mission_ledger_select_self on public.team_mission_ledger
  for select using (user_id = auth.uid());

grant select, insert, update on public.team_cards to authenticated;
grant select, update on public.team_card_snapshots to authenticated;
grant select on public.team_local_performance to authenticated;
grant select on public.team_merit_grants to authenticated;
grant select on public.team_mission_ledger to authenticated;
grant select on public.team_central_card_aggregates to authenticated;

revoke all on function app_private.team_card_stats_valid(jsonb, public.player_position) from public, anon, authenticated;
revoke all on function app_private.team_card_positions_lock() from public, anon, authenticated;
revoke all on function app_private.seal_team_card_snapshot_review() from public, anon, authenticated;
revoke all on function app_private.team_card_snapshot_on_membership() from public, anon, authenticated;
revoke all on function app_private.refresh_team_local_performance(uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.team_local_performance_submission_trigger() from public, anon, authenticated;
revoke all on function app_private.team_local_performance_match_trigger() from public, anon, authenticated;
