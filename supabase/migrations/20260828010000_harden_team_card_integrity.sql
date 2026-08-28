drop policy if exists team_card_snapshots_insert_self on public.team_card_snapshots;

create policy team_card_snapshots_insert_self on public.team_card_snapshots
  for insert with check (
    user_id = auth.uid()
    and app_private.is_active_team_member(team_id, auth.uid())
    and status in ('draft', 'pending')
    and card_stats = (select tc.stats from public.team_cards tc where tc.user_id = auth.uid())
    and positions = (
      select jsonb_build_object('primary', tc.primary_position, 'secondary', tc.secondary_position)
      from public.team_cards tc
      where tc.user_id = auth.uid()
    )
  );

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

  if not app_private.is_active_team_member(p_team_id, p_user_id) then
    raise exception 'TEAM_CARD_ADMISSION_NOT_MEMBER' using errcode = '23514';
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

create or replace function public.resubmit_team_admission(p_team_id uuid)
returns table (team_id uuid, user_id uuid, status public.team_card_snapshot_status)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_card public.team_cards%rowtype;
  v_snapshot public.team_card_snapshots%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if not app_private.is_active_team_member(p_team_id, auth.uid()) then
    raise exception 'TEAM_CARD_ADMISSION_NOT_MEMBER' using errcode = '23514';
  end if;

  select * into v_card
  from public.team_cards
  where user_id = auth.uid();

  if v_card.user_id is null then
    raise exception 'TEAM_CARD_REQUIRED' using errcode = '23514';
  end if;

  select * into v_snapshot
  from public.team_card_snapshots
  where team_id = p_team_id
    and user_id = auth.uid();

  if v_snapshot.team_id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  if v_snapshot.status <> 'rejected' then
    raise exception 'TEAM_CARD_SNAPSHOT_NOT_REJECTED' using errcode = '23514';
  end if;

  delete from public.team_card_snapshots
  where team_id = p_team_id
    and user_id = auth.uid()
    and status = 'rejected';

  insert into public.team_card_snapshots (team_id, user_id, card_stats, positions, status)
  values (
    p_team_id,
    auth.uid(),
    v_card.stats,
    jsonb_build_object('primary', v_card.primary_position, 'secondary', v_card.secondary_position),
    'pending'
  )
  returning * into v_snapshot;

  team_id := v_snapshot.team_id;
  user_id := v_snapshot.user_id;
  status := v_snapshot.status;
  return next;
end;
$$;

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
      and exists (
        select 1
        from public.team_stat_submissions tss
        where tss.team_match_id = tm.id
          and tss.team_id = tm.team_id
          and tss.user_id = p_user_id
          and tss.status = 'approved'
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

revoke all on function public.resubmit_team_admission(uuid) from public, anon;
grant execute on function public.resubmit_team_admission(uuid) to authenticated;
