create or replace function app_private.team_valid_win_streak_rewards(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, app_private
as $$
declare
  v_rewards integer := 0;
  v_streak integer := 0;
  v_match record;
begin
  for v_match in
    select tm.team_score, tm.opponent_score
    from public.team_matches tm
    where tm.status = 'played'
      and tm.team_score is not null
      and tm.opponent_score is not null
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
    order by tm.played_at asc nulls last, tm.scheduled_at asc, tm.id asc
  loop
    if v_match.team_score > v_match.opponent_score then
      v_streak := v_streak + 1;
      if v_streak % 3 = 0 then
        v_rewards := v_rewards + 1;
      end if;
    else
      v_streak := 0;
    end if;
  end loop;

  return v_rewards;
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
  v_streak_rewards integer;
  v_streak_ref text;
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
  v_cycle := v_aggregate.mvps / 3;

  for v_cycle_ref in select (generate_series(1, v_cycle) * 3)::text loop
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

  v_streak_rewards := app_private.team_valid_win_streak_rewards(p_user_id);

  for v_streak_ref in select 'win_streak:' || (generate_series(1, v_streak_rewards) * 3)::text loop
    insert into public.team_mission_ledger (user_id, kind, ref, points)
    values (p_user_id, 'milestone', v_streak_ref, 3)
    on conflict (user_id, kind, ref) do nothing
    returning points into v_points;

    if v_points is not null then
      foreach v_key in array v_keys loop
        v_new_stats := jsonb_set(
          v_new_stats,
          array[v_key],
          to_jsonb(least(99, coalesce((v_new_stats->>v_key)::integer, 0) + 1)),
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

revoke all on function app_private.team_valid_win_streak_rewards(uuid) from public, anon, authenticated;
