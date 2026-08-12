-- Teams central card RPCs (Unit 2 of the teams-central-card change).
-- Adds the card/admission/merit/mission RPC layer, widens the stats invariant
-- to 55-99 so missions can write boosted stats, and drops the legacy
-- progression machinery (RPC, state table and helpers).

create or replace function app_private.team_card_stats_invariant(p_stats jsonb, p_position public.player_position)
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
        and (p_stats->>'div')::int between 55 and 99
        and (p_stats->>'han')::int between 55 and 99
        and (p_stats->>'kic')::int between 55 and 99
        and (p_stats->>'ref')::int between 55 and 99
        and (p_stats->>'spd')::int between 55 and 99
        and (p_stats->>'pos')::int between 55 and 99
      else
        p_stats ? 'pac'
        and p_stats ? 'sho'
        and p_stats ? 'pas'
        and p_stats ? 'dri'
        and p_stats ? 'def'
        and p_stats ? 'phy'
        and (p_stats->>'pac')::int between 55 and 99
        and (p_stats->>'sho')::int between 55 and 99
        and (p_stats->>'pas')::int between 55 and 99
        and (p_stats->>'dri')::int between 55 and 99
        and (p_stats->>'def')::int between 55 and 99
        and (p_stats->>'phy')::int between 55 and 99
    end;
$$;

alter table public.team_cards
  drop constraint team_cards_stats_valid;

alter table public.team_cards
  add constraint team_cards_stats_valid check (app_private.team_card_stats_invariant(stats, primary_position));

drop function app_private.team_card_stats_valid(jsonb, public.player_position);

create or replace function app_private.team_card_build_valid(p_stats jsonb, p_position public.player_position)
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

create or replace function app_private.team_card_overall(p_stats jsonb)
returns integer
language sql
immutable
set search_path = public, app_private
as $$
  select round(avg((v)::numeric))::integer
  from jsonb_each_text(coalesce(p_stats, '{}'::jsonb)) as entries(k, v);
$$;

create or replace function app_private.team_card_key_valid(p_key text, p_position public.player_position)
returns boolean
language sql
immutable
set search_path = public, app_private
as $$
  select case
    when p_position = 'ARQ' then p_key in ('div', 'han', 'kic', 'ref', 'spd', 'pos')
    else p_key in ('pac', 'sho', 'pas', 'dri', 'def', 'phy')
  end;
$$;

create or replace function app_private.team_card_aptitude_keys(p_position public.player_position)
returns text[]
language sql
immutable
set search_path = public, app_private
as $$
  select case
    when p_position = 'ARQ' then array['div', 'ref', 'han']
    when p_position = 'DEF' then array['def', 'phy', 'pas']
    when p_position = 'MED' then array['pas', 'dri', 'phy']
    else array['pac', 'sho', 'dri']
  end;
$$;

create or replace function public.create_team_card(
  p_stats jsonb,
  p_primary_position public.player_position,
  p_secondary_position public.player_position
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_card public.team_cards%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if p_secondary_position = p_primary_position then
    raise exception 'VALIDATION_ERROR: secondary_position' using errcode = '23514';
  end if;

  if not app_private.team_card_build_valid(p_stats, p_primary_position) then
    raise exception 'VALIDATION_ERROR: stats' using errcode = '23514';
  end if;

  insert into public.team_cards (user_id, stats, primary_position, secondary_position)
  values (auth.uid(), p_stats, p_primary_position, p_secondary_position)
  on conflict (user_id) do nothing
  returning * into v_card;

  if v_card.user_id is null then
    raise exception 'TEAM_CARD_EXISTS' using errcode = '23514';
  end if;

  update public.team_card_snapshots
  set card_stats = p_stats,
      positions = jsonb_build_object('primary', p_primary_position, 'secondary', p_secondary_position),
      status = 'pending'
  where user_id = auth.uid()
    and status = 'draft';

  user_id := v_card.user_id;
  return next;
end;
$$;

create or replace function public.update_team_card(
  p_stats jsonb,
  p_primary_position public.player_position,
  p_secondary_position public.player_position
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_card public.team_cards%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if p_secondary_position = p_primary_position then
    raise exception 'VALIDATION_ERROR: secondary_position' using errcode = '23514';
  end if;

  if not app_private.team_card_build_valid(p_stats, p_primary_position) then
    raise exception 'VALIDATION_ERROR: stats' using errcode = '23514';
  end if;

  select * into v_card
  from public.team_cards
  where user_id = auth.uid();

  if v_card.user_id is null then
    raise exception 'TEAM_CARD_REQUIRED' using errcode = '23514';
  end if;

  if v_card.positions_locked_at is not null then
    raise exception 'TEAM_CARD_POSITIONS_LOCKED' using errcode = '23514';
  end if;

  update public.team_cards
  set stats = p_stats,
      primary_position = p_primary_position,
      secondary_position = p_secondary_position,
      updated_at = now()
  where user_id = auth.uid()
  returning user_id into v_card;

  user_id := v_card.user_id;
  return next;
end;
$$;

create or replace function public.review_team_admission(
  p_team_id uuid,
  p_user_id uuid,
  p_decision public.team_card_snapshot_status,
  p_rejection_reason text default null
)
returns table (team_id uuid, user_id uuid, status public.team_card_snapshot_status)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_snapshot public.team_card_snapshots%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'VALIDATION_ERROR: decision' using errcode = '23514';
  end if;

  if not app_private.is_team_admin(p_team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_snapshot
  from public.team_card_snapshots
  where team_id = p_team_id
    and user_id = p_user_id;

  if v_snapshot.team_id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  if v_snapshot.status <> 'pending' then
    raise exception 'TEAM_CARD_SNAPSHOT_FINAL' using errcode = '23514';
  end if;

  update public.team_card_snapshots
  set status = p_decision,
      rejection_reason = case when p_decision = 'rejected' then p_rejection_reason else null end
  where team_id = p_team_id
    and user_id = p_user_id
    and public.team_card_snapshots.status = 'pending'
  returning * into v_snapshot;

  if p_decision = 'approved' then
    update public.team_cards
    set positions_locked_at = coalesce(positions_locked_at, now()),
        updated_at = now()
    where user_id = p_user_id;
  end if;

  team_id := v_snapshot.team_id;
  user_id := v_snapshot.user_id;
  status := v_snapshot.status;
  return next;
end;
$$;

create or replace function public.grant_team_merit(
  p_team_id uuid,
  p_user_id uuid,
  p_stat_keys jsonb,
  p_points_total smallint
)
returns table (grant_id uuid, stats jsonb, overall integer, card_tier text)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_card public.team_cards%rowtype;
  v_performance public.team_local_performance%rowtype;
  v_keys text[];
  v_key text;
  v_remaining smallint;
  v_new_stats jsonb;
  v_overall integer;
  v_grant_id uuid;
begin
  if p_points_total not between 1 and 3 then
    raise exception 'VALIDATION_ERROR: points_total' using errcode = '23514';
  end if;

  if jsonb_typeof(p_stat_keys) <> 'array' or jsonb_array_length(p_stat_keys) not between 1 and 2 then
    raise exception 'VALIDATION_ERROR: stat_keys' using errcode = '23514';
  end if;

  if not app_private.is_team_admin(p_team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not app_private.is_active_team_member(p_team_id, p_user_id) then
    raise exception 'TEAM_MERIT_USER_NOT_MEMBER' using errcode = '23514';
  end if;

  select * into v_card
  from public.team_cards
  where user_id = p_user_id;

  if v_card.user_id is null then
    raise exception 'TEAM_CARD_REQUIRED' using errcode = '23514';
  end if;

  select * into v_performance
  from public.team_local_performance
  where team_id = p_team_id
    and user_id = p_user_id;

  if v_performance.team_id is null or v_performance.matches_played < 10 then
    raise exception 'MERIT_MATCHES_THRESHOLD' using errcode = '23514';
  end if;

  select array_agg(k) into v_keys
  from jsonb_array_elements_text(p_stat_keys) as keys(k);

  foreach v_key in array v_keys loop
    if not app_private.team_card_key_valid(v_key, v_card.primary_position) then
      raise exception 'VALIDATION_ERROR: stat_keys' using errcode = '23514';
    end if;
  end loop;

  v_new_stats := v_card.stats;
  v_remaining := p_points_total;

  while v_remaining > 0 loop
    foreach v_key in array v_keys loop
      exit when v_remaining = 0;
      v_new_stats := jsonb_set(
        v_new_stats,
        array[v_key],
        to_jsonb(least(99, coalesce((v_new_stats->>v_key)::integer, 0) + 1)),
        true
      );
      v_remaining := v_remaining - 1;
    end loop;
  end loop;

  insert into public.team_merit_grants (team_id, user_id, stat_keys, points_total, created_by_user_id)
  values (p_team_id, p_user_id, p_stat_keys, p_points_total, auth.uid())
  returning id into v_grant_id;

  update public.team_cards
  set stats = v_new_stats,
      updated_at = now()
  where user_id = p_user_id;

  v_overall := app_private.team_card_overall(v_new_stats);

  grant_id := v_grant_id;
  stats := v_new_stats;
  overall := v_overall;
  card_tier := app_private.team_card_tier(v_overall);
  return next;
end;
$$;

create or replace function app_private.apply_mission_milestone(
  p_user_id uuid,
  p_ref text,
  p_stat_key text,
  inout p_stats jsonb,
  inout p_applied integer
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_points integer;
begin
  insert into public.team_mission_ledger (user_id, kind, ref, stat_key, points)
  values (p_user_id, 'milestone', p_ref, p_stat_key, 1)
  on conflict (user_id, kind, ref) do nothing
  returning points into v_points;

  if v_points is not null then
    p_stats := jsonb_set(
      p_stats,
      array[p_stat_key],
      to_jsonb(least(99, coalesce((p_stats->>p_stat_key)::integer, 0) + 1)),
      true
    );
    p_applied := p_applied + v_points;
  end if;
end;
$$;

create or replace function public.process_team_central_missions(p_user_id uuid)
returns table (applied_points integer, stats jsonb, overall integer, card_tier text)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_card public.team_cards%rowtype;
  v_aggregate public.team_central_card_aggregates%rowtype;
  v_keys text[];
  v_key text;
  v_new_stats jsonb;
  v_applied integer := 0;
  v_points integer;
  v_cycle integer;
  v_cycle_ref text;
  v_overall integer;
  v_trophy_ref text;
  v_trophy_thresholds constant text[] := array[
    'mvp:3', 'mvp:5', 'mvp:10', 'mvp:20',
    'goals:10', 'goals:25', 'goals:50', 'goals:100',
    'assists:10', 'assists:25', 'assists:50', 'assists:100',
    'tackles:20', 'tackles:50', 'tackles:100', 'tackles:200'
  ];
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if auth.uid() <> p_user_id and not exists (
    select 1
    from public.team_members tm
    where tm.user_id = auth.uid()
      and tm.role = 'admin'
      and tm.archived_at is null
      and exists (
        select 1
        from public.team_members target_tm
        where target_tm.team_id = tm.team_id
          and target_tm.user_id = p_user_id
          and target_tm.archived_at is null
      )
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('team_central_missions:' || p_user_id::text, 0));

  select * into v_card
  from public.team_cards
  where user_id = p_user_id;

  if v_card.user_id is null then
    raise exception 'TEAM_CARD_REQUIRED' using errcode = '23514';
  end if;

  select * into v_aggregate
  from public.team_central_card_aggregates
  where user_id = p_user_id;

  foreach v_trophy_ref in array v_trophy_thresholds loop
    if (
      (v_trophy_ref like 'mvp:%' and v_aggregate.mvps >= split_part(v_trophy_ref, ':', 2)::integer)
      or (v_trophy_ref like 'goals:%' and v_aggregate.goals >= split_part(v_trophy_ref, ':', 2)::integer)
      or (v_trophy_ref like 'assists:%' and v_aggregate.assists >= split_part(v_trophy_ref, ':', 2)::integer)
      or (v_trophy_ref like 'tackles:%' and v_aggregate.tackles >= split_part(v_trophy_ref, ':', 2)::integer)
    ) then
      insert into public.team_mission_ledger (user_id, kind, ref)
      values (p_user_id, 'trophy', v_trophy_ref)
      on conflict (user_id, kind, ref) do nothing;
    end if;
  end loop;

  v_keys := app_private.team_card_aptitude_keys(v_card.primary_position);
  v_new_stats := v_card.stats;
  v_cycle := v_aggregate.mvps / 5;

  for v_cycle_ref in select (generate_series(1, v_cycle) * 5)::text loop
    insert into public.team_mission_ledger (user_id, kind, ref, points)
    values (p_user_id, 'mvp_cycle', v_cycle_ref, 6)
    on conflict (user_id, kind, ref) do nothing
    returning points into v_points;

    if v_points is not null then
      foreach v_key in array v_keys loop
        v_new_stats := jsonb_set(
          v_new_stats,
          array[v_key],
          to_jsonb(least(99, coalesce((v_new_stats->>v_key)::integer, 0) + 2)),
          true
        );
      end loop;
      v_applied := v_applied + v_points;
    end if;
  end loop;

  if v_aggregate.goals >= 25 and 'sho' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'goals:25', 'sho', v_new_stats, v_applied);
  end if;
  if v_aggregate.goals >= 50 and 'pac' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'goals:50', 'pac', v_new_stats, v_applied);
  end if;
  if v_aggregate.assists >= 25 and 'pas' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'assists:25', 'pas', v_new_stats, v_applied);
  end if;
  if v_aggregate.assists >= 50 and 'dri' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'assists:50', 'dri', v_new_stats, v_applied);
  end if;
  if v_aggregate.tackles >= 50 and 'def' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'tackles:50', 'def', v_new_stats, v_applied);
  end if;
  if v_aggregate.tackles >= 100 and 'phy' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'tackles:100', 'phy', v_new_stats, v_applied);
  end if;
  if v_aggregate.tackles >= 50 and 'div' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'tackles:50', 'div', v_new_stats, v_applied);
  end if;
  if v_aggregate.tackles >= 100 and 'ref' = any(v_keys) then
    select * into v_new_stats, v_applied from app_private.apply_mission_milestone(p_user_id, 'tackles:100', 'ref', v_new_stats, v_applied);
  end if;

  if v_applied > 0 then
    update public.team_cards
    set stats = v_new_stats,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  v_overall := app_private.team_card_overall(v_new_stats);

  applied_points := v_applied;
  stats := v_new_stats;
  overall := v_overall;
  card_tier := app_private.team_card_tier(v_overall);
  return next;
end;
$$;

create policy team_card_snapshots_insert_self on public.team_card_snapshots
  for insert with check (
    user_id = auth.uid()
    and status in ('draft', 'pending')
    and card_stats = (select tc.stats from public.team_cards tc where tc.user_id = auth.uid())
    and positions = (
      select jsonb_build_object('primary', tc.primary_position, 'secondary', tc.secondary_position)
      from public.team_cards tc
      where tc.user_id = auth.uid()
    )
  );

create policy team_card_snapshots_delete_self_rejected on public.team_card_snapshots
  for delete using (user_id = auth.uid() and status = 'rejected');

grant insert, delete on public.team_card_snapshots to authenticated;

drop function public.process_team_player_progression(uuid);

drop table public.team_player_progression_state;

drop function app_private.valid_team_win_streak_rewards(uuid);

drop function app_private.apply_team_progression_to_stats(jsonb, public.player_position, integer);

drop function app_private.team_stats_overall(jsonb, public.player_position);

revoke all on function app_private.team_card_stats_invariant(jsonb, public.player_position) from public, anon;
grant execute on function app_private.team_card_stats_invariant(jsonb, public.player_position) to authenticated, service_role;
revoke all on function app_private.team_card_build_valid(jsonb, public.player_position) from public, anon, authenticated;
revoke all on function app_private.team_card_overall(jsonb) from public, anon, authenticated;
revoke all on function app_private.team_card_key_valid(text, public.player_position) from public, anon, authenticated;
revoke all on function app_private.team_card_aptitude_keys(public.player_position) from public, anon, authenticated;
revoke all on function app_private.apply_mission_milestone(uuid, text, text, jsonb, integer) from public, anon, authenticated;
