-- Teams central card valid-match lifecycle gate (Unit 3 of teams-central-card).
--
-- A match counts toward a player's counters only when the full lifecycle is
-- complete:
--   1. team_matches.status = 'played'            (result + played_at required)
--   2. the player's signup is an active one      (team_match_signups.status <> 'not_going')
--   3. at least one approved stat exists         (team_stat_submissions.status = 'approved')
-- Incomplete matches (scheduled/cancelled, not_going signup, or no approved
-- stat) never advance matches_played, goals/assists/tackles or mvps. The same
-- gate applies to the official MVP counter: an MVP assigned in a match the
-- player dropped from is not an official reward and must not advance missions.
--
-- Enforcement lives in refresh_team_local_performance, the single write path
-- feeding team_local_performance, team_central_card_aggregates, mission
-- processing and the merit threshold. A signup status flip (going -> not_going
-- or back) re-runs the refresh so stale counters never survive a drop-out.

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
      and not exists (
        select 1
        from public.team_match_signups tms
        where tms.team_match_id = tm.id
          and tms.team_id = tm.team_id
          and tms.user_id = p_user_id
          and tms.status = 'not_going'
      )
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
      and not exists (
        select 1
        from public.team_match_signups tms
        where tms.team_match_id = tm.id
          and tms.team_id = tm.team_id
          and tms.user_id = p_user_id
          and tms.status = 'not_going'
      )
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

create or replace function app_private.team_local_performance_signup_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new.status is distinct from old.status then
    perform app_private.refresh_team_local_performance(new.team_id, new.user_id);
  end if;

  return null;
end;
$$;

create trigger team_local_performance_signup_after_update
after update of status
on public.team_match_signups
for each row
execute function app_private.team_local_performance_signup_trigger();

revoke all on function app_private.team_local_performance_signup_trigger() from public, anon, authenticated;
