create table if not exists public.team_player_progression_state (
  user_id uuid primary key references public.users(id) on delete cascade,
  applied_mvp_rewards integer not null default 0 check (applied_mvp_rewards >= 0),
  applied_win_streak_rewards integer not null default 0 check (applied_win_streak_rewards >= 0),
  updated_at timestamptz not null default now()
);

alter table public.team_player_progression_state enable row level security;

create policy team_player_progression_state_select_self on public.team_player_progression_state
  for select using (user_id = auth.uid());

create policy team_player_progression_state_select_admin_same_team on public.team_player_progression_state
  for select using (
    exists (
      select 1
      from public.team_members tm
      join public.team_members target_tm
        on target_tm.team_id = tm.team_id
        and target_tm.user_id = team_player_progression_state.user_id
        and target_tm.archived_at is null
      where tm.user_id = auth.uid()
        and tm.role = 'admin'
        and tm.archived_at is null
    )
  );

create or replace function app_private.slugify_team_name(p_name text)
returns text
language sql
immutable
set search_path = public, app_private
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_name, 'team')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function app_private.team_card_tier(p_overall integer)
returns text
language sql
immutable
set search_path = public, app_private
as $$
  select case
    when p_overall >= 90 then 'premium_gold'
    when p_overall >= 80 then 'gold'
    when p_overall >= 70 then 'silver'
    else 'bronze'
  end;
$$;

create or replace function app_private.team_stats_overall(p_stats jsonb, p_position public.player_position)
returns integer
language plpgsql
immutable
set search_path = public, app_private
as $$
declare
  v_total numeric := 0;
  v_weight numeric := 0;
begin
  if p_position = 'ARQ' and p_stats ? 'div' then
    v_total := coalesce((p_stats->>'div')::numeric, 0) * 1.25
      + coalesce((p_stats->>'han')::numeric, 0) * 1.25
      + coalesce((p_stats->>'kic')::numeric, 0) * 0.75
      + coalesce((p_stats->>'ref')::numeric, 0) * 1.5
      + coalesce((p_stats->>'spd')::numeric, 0) * 0.5
      + coalesce((p_stats->>'pos')::numeric, 0) * 1.25;
    v_weight := 6.5;
  elsif p_position = 'DEF' then
    v_total := coalesce((p_stats->>'pac')::numeric, 0)
      + coalesce((p_stats->>'sho')::numeric, 0) * 0.5
      + coalesce((p_stats->>'pas')::numeric, 0)
      + coalesce((p_stats->>'dri')::numeric, 0) * 0.75
      + coalesce((p_stats->>'def')::numeric, 0) * 1.5
      + coalesce((p_stats->>'phy')::numeric, 0) * 1.25;
    v_weight := 6;
  elsif p_position = 'MED' then
    v_total := coalesce((p_stats->>'pac')::numeric, 0)
      + coalesce((p_stats->>'sho')::numeric, 0)
      + coalesce((p_stats->>'pas')::numeric, 0) * 1.5
      + coalesce((p_stats->>'dri')::numeric, 0) * 1.25
      + coalesce((p_stats->>'def')::numeric, 0)
      + coalesce((p_stats->>'phy')::numeric, 0) * 0.75;
    v_weight := 6.5;
  else
    v_total := coalesce((p_stats->>'pac')::numeric, 0) * 1.25
      + coalesce((p_stats->>'sho')::numeric, 0) * 1.5
      + coalesce((p_stats->>'pas')::numeric, 0) * 0.75
      + coalesce((p_stats->>'dri')::numeric, 0) * 1.25
      + coalesce((p_stats->>'def')::numeric, 0) * 0.5
      + coalesce((p_stats->>'phy')::numeric, 0) * 0.75;
    v_weight := 6;
  end if;

  return least(99, greatest(1, round(v_total / nullif(v_weight, 0))::integer));
end;
$$;

create or replace function app_private.apply_team_progression_to_stats(
  p_stats jsonb,
  p_position public.player_position,
  p_rewards integer
)
returns jsonb
language plpgsql
immutable
set search_path = public, app_private
as $$
declare
  v_stats jsonb := coalesce(p_stats, '{}'::jsonb);
  v_keys text[];
  v_key text;
begin
  if p_rewards <= 0 then
    return v_stats;
  end if;

  v_keys := case p_position
    when 'ARQ' then array['div', 'ref', 'han']
    when 'DEF' then array['def', 'phy', 'pas']
    when 'MED' then array['pas', 'dri', 'phy']
    else array['pac', 'sho', 'dri']
  end;

  foreach v_key in array v_keys loop
    v_stats := jsonb_set(
      v_stats,
      array[v_key],
      to_jsonb(least(99, coalesce((v_stats->>v_key)::integer, 0) + p_rewards)),
      true
    );
  end loop;

  return v_stats;
end;
$$;

create or replace function app_private.valid_team_win_streak_rewards(p_user_id uuid)
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
    select tm.id, tm.team_score, tm.opponent_score
    from public.team_matches tm
    where tm.status = 'played'
      and tm.team_score is not null
      and tm.opponent_score is not null
      and exists (
        select 1
        from public.team_stat_submissions tss
        where tss.team_match_id = tm.id
          and tss.team_id = tm.team_id
          and tss.user_id = p_user_id
          and tss.status = 'approved'
      )
    order by tm.played_at asc, tm.scheduled_at asc, tm.id asc
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

create or replace function public.create_team(
  p_name text,
  p_primary_position public.player_position,
  p_secondary_position public.player_position default null,
  p_badge_url text default null,
  p_primary_color text default null,
  p_secondary_color text default null
)
returns table (team_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_team public.teams%rowtype;
  v_slug_base text;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if p_secondary_position is not null and p_secondary_position = p_primary_position then
    raise exception 'VALIDATION_ERROR: secondary_position' using errcode = '23514';
  end if;

  v_slug_base := nullif(app_private.slugify_team_name(p_name), '');
  v_slug := coalesce(v_slug_base, 'team') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.teams (name, slug, badge_url, primary_color, secondary_color, created_by_user_id)
  values (trim(p_name), v_slug, p_badge_url, p_primary_color, p_secondary_color, auth.uid())
  returning * into v_team;

  insert into public.team_members (team_id, user_id, role, primary_position, secondary_position, added_by_user_id)
  values (v_team.id, auth.uid(), 'admin', p_primary_position, p_secondary_position, auth.uid());

  team_id := v_team.id;
  return next;
end;
$$;

create or replace function public.create_team_invitation(p_team_id uuid, p_code text default null)
returns table (invitation_id uuid, code text)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_code text;
begin
  if not app_private.is_team_admin(p_team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_code := coalesce(upper(trim(p_code)), 'TEAM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));

  insert into public.team_invitations (team_id, code, created_by_user_id)
  values (p_team_id, v_code, auth.uid())
  returning * into v_invitation;

  invitation_id := v_invitation.id;
  code := v_invitation.code;
  return next;
end;
$$;

create or replace function public.add_team_member(
  p_team_id uuid,
  p_user_id uuid,
  p_primary_position public.player_position,
  p_secondary_position public.player_position default null
)
returns table (member_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_member public.team_members%rowtype;
begin
  if not app_private.is_team_admin(p_team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_secondary_position is not null and p_secondary_position = p_primary_position then
    raise exception 'VALIDATION_ERROR: secondary_position' using errcode = '23514';
  end if;

  update public.team_members
  set archived_at = null,
      role = 'member',
      primary_position = p_primary_position,
      secondary_position = p_secondary_position,
      added_by_user_id = auth.uid()
  where team_id = p_team_id
    and user_id = p_user_id
    and archived_at is not null
  returning * into v_member;

  if v_member.id is null then
    insert into public.team_members (team_id, user_id, role, primary_position, secondary_position, added_by_user_id)
    values (p_team_id, p_user_id, 'member', p_primary_position, p_secondary_position, auth.uid())
    returning * into v_member;
  end if;

  member_id := v_member.id;
  return next;
end;
$$;

create or replace function public.remove_team_member(p_team_id uuid, p_user_id uuid)
returns table (archived_member_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_member public.team_members%rowtype;
begin
  if not app_private.is_team_admin(p_team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.team_members
  set archived_at = now()
  where team_id = p_team_id
    and user_id = p_user_id
    and archived_at is null
  returning * into v_member;

  if v_member.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  archived_member_id := v_member.id;
  return next;
end;
$$;

create or replace function public.create_team_match(
  p_team_id uuid,
  p_scheduled_at timestamptz,
  p_opponent_name text default null,
  p_field_name text default null,
  p_field_maps_url text default null,
  p_status public.team_match_status default 'scheduled',
  p_team_score smallint default null,
  p_opponent_score smallint default null,
  p_mvp_user_id uuid default null,
  p_played_at timestamptz default null,
  p_notes text default null
)
returns table (match_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_match public.team_matches%rowtype;
begin
  if not app_private.is_team_admin(p_team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_mvp_user_id is not null and not app_private.is_active_team_member(p_team_id, p_mvp_user_id) then
    raise exception 'TEAM_MVP_USER_NOT_MEMBER' using errcode = '23514';
  end if;

  insert into public.team_matches (
    team_id,
    scheduled_at,
    opponent_name,
    field_name,
    field_maps_url,
    status,
    team_score,
    opponent_score,
    mvp_user_id,
    played_at,
    notes,
    created_by_user_id
  )
  values (
    p_team_id,
    p_scheduled_at,
    p_opponent_name,
    p_field_name,
    p_field_maps_url,
    p_status,
    p_team_score,
    p_opponent_score,
    p_mvp_user_id,
    p_played_at,
    p_notes,
    auth.uid()
  )
  returning * into v_match;

  match_id := v_match.id;
  return next;
end;
$$;

create or replace function public.signup_team_match(p_team_id uuid, p_team_match_id uuid)
returns table (signup_id uuid, status public.team_match_signup_status)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_signup public.team_match_signups%rowtype;
begin
  if not app_private.is_active_team_member(p_team_id, auth.uid()) then
    raise exception 'TEAM_SIGNUP_USER_NOT_MEMBER' using errcode = '23514';
  end if;

  if not app_private.is_team_match_future(p_team_match_id, p_team_id) then
    raise exception 'TEAM_MATCH_NOT_OPEN' using errcode = '23514';
  end if;

  insert into public.team_match_signups (team_match_id, team_id, user_id, status)
  values (p_team_match_id, p_team_id, auth.uid(), 'going')
  on conflict (team_match_id, user_id)
  do update set status = 'going', updated_at = now()
  returning * into v_signup;

  signup_id := v_signup.id;
  status := v_signup.status;
  return next;
end;
$$;

create or replace function public.submit_team_match_stat(
  p_team_id uuid,
  p_team_match_id uuid,
  p_stat_kind public.team_stat_kind,
  p_value smallint
)
returns table (submission_id uuid, status public.team_stat_submission_status)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_submission public.team_stat_submissions%rowtype;
begin
  if not app_private.is_active_team_member(p_team_id, auth.uid()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not app_private.is_team_match_played(p_team_match_id, p_team_id) then
    raise exception 'TEAM_MATCH_NOT_PLAYED' using errcode = '23514';
  end if;

  if not app_private.team_member_stat_kind_allowed(p_team_id, auth.uid(), p_stat_kind) then
    raise exception 'TEAM_STAT_KIND_NOT_ALLOWED' using errcode = '23514';
  end if;

  insert into public.team_stat_submissions (team_id, team_match_id, user_id, stat_kind, value, status)
  values (p_team_id, p_team_match_id, auth.uid(), p_stat_kind, p_value, 'pending')
  on conflict (team_match_id, user_id, stat_kind)
  do update set value = excluded.value,
                status = 'pending',
                submitted_at = now(),
                reviewed_by_user_id = null,
                reviewed_at = null,
                rejection_reason = null
  where public.team_stat_submissions.status = 'pending'
  returning * into v_submission;

  if v_submission.id is null then
    raise exception 'TEAM_STAT_SUBMISSION_FINAL' using errcode = '23514';
  end if;

  submission_id := v_submission.id;
  status := v_submission.status;
  return next;
end;
$$;

create or replace function public.review_team_stat_submission(
  p_submission_id uuid,
  p_decision public.team_stat_submission_status,
  p_rejection_reason text default null
)
returns table (submission_id uuid, status public.team_stat_submission_status)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_submission public.team_stat_submissions%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'VALIDATION_ERROR: decision' using errcode = '23514';
  end if;

  select * into v_submission
  from public.team_stat_submissions
  where id = p_submission_id;

  if v_submission.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  if not app_private.is_team_admin(v_submission.team_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_submission.status <> 'pending' then
    raise exception 'TEAM_STAT_SUBMISSION_FINAL' using errcode = '23514';
  end if;

  update public.team_stat_submissions
  set status = p_decision,
      rejection_reason = case when p_decision = 'rejected' then p_rejection_reason else null end
  where id = p_submission_id
    and public.team_stat_submissions.status = 'pending'
  returning * into v_submission;

  if v_submission.id is null then
    raise exception 'TEAM_STAT_SUBMISSION_FINAL' using errcode = '23514';
  end if;

  submission_id := v_submission.id;
  status := v_submission.status;
  return next;
end;
$$;

create or replace function public.process_team_player_progression(p_user_id uuid)
returns table (applied_rewards integer, stats jsonb, overall integer, card_tier text)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_player public.players%rowtype;
  v_state public.team_player_progression_state%rowtype;
  v_mvp_rewards integer;
  v_streak_rewards integer;
  v_new_mvp_rewards integer;
  v_new_streak_rewards integer;
  v_total_new_rewards integer;
  v_stats jsonb;
  v_overall integer;
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

  perform pg_advisory_xact_lock(hashtextextended('team_player_progression_state:' || p_user_id::text, 0));

  select * into v_player
  from public.players p
  where p.user_id = p_user_id
    and p.archived_at is null
    and p.is_phantom = false
    and p.stats_status = 'approved'
  order by p.joined_at asc
  limit 1;

  if v_player.id is null then
    raise exception 'TEAM_PLAYER_PROFILE_REQUIRED' using errcode = '23514';
  end if;

  insert into public.team_player_progression_state (user_id)
  values (p_user_id)
  on conflict (user_id)
  do update set updated_at = public.team_player_progression_state.updated_at
  returning * into v_state;

  select (count(distinct tm.id) / 3)::integer into v_mvp_rewards
  from public.team_matches tm
  join public.team_stat_submissions tss
    on tss.team_match_id = tm.id
    and tss.team_id = tm.team_id
    and tss.user_id = p_user_id
    and tss.status = 'approved'
  where tm.status = 'played'
    and tm.mvp_user_id = p_user_id;

  v_streak_rewards := app_private.valid_team_win_streak_rewards(p_user_id);
  v_new_mvp_rewards := greatest(0, v_mvp_rewards - v_state.applied_mvp_rewards);
  v_new_streak_rewards := greatest(0, v_streak_rewards - v_state.applied_win_streak_rewards);
  v_total_new_rewards := v_new_mvp_rewards + v_new_streak_rewards;
  v_stats := app_private.apply_team_progression_to_stats(v_player.stats, v_player.primary_position, v_total_new_rewards);
  v_overall := app_private.team_stats_overall(v_stats, v_player.primary_position);

  if v_total_new_rewards > 0 then
    update public.players
    set stats = v_stats
    where id = v_player.id;

    update public.team_player_progression_state
    set applied_mvp_rewards = v_mvp_rewards,
        applied_win_streak_rewards = v_streak_rewards,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  applied_rewards := v_total_new_rewards;
  stats := v_stats;
  overall := v_overall;
  card_tier := app_private.team_card_tier(v_overall);
  return next;
end;
$$;

revoke all on function app_private.slugify_team_name(text) from public, anon, authenticated;
revoke all on function app_private.team_card_tier(integer) from public, anon, authenticated;
revoke all on function app_private.team_stats_overall(jsonb, public.player_position) from public, anon, authenticated;
revoke all on function app_private.apply_team_progression_to_stats(jsonb, public.player_position, integer) from public, anon, authenticated;
revoke all on function app_private.valid_team_win_streak_rewards(uuid) from public, anon, authenticated;

grant select on public.team_player_progression_state to authenticated;

revoke all on function public.create_team(text, public.player_position, public.player_position, text, text, text) from public, anon;
revoke all on function public.create_team_invitation(uuid, text) from public, anon;
revoke all on function public.add_team_member(uuid, uuid, public.player_position, public.player_position) from public, anon;
revoke all on function public.remove_team_member(uuid, uuid) from public, anon;
revoke all on function public.create_team_match(uuid, timestamptz, text, text, text, public.team_match_status, smallint, smallint, uuid, timestamptz, text) from public, anon;
revoke all on function public.signup_team_match(uuid, uuid) from public, anon;
revoke all on function public.submit_team_match_stat(uuid, uuid, public.team_stat_kind, smallint) from public, anon;
revoke all on function public.review_team_stat_submission(uuid, public.team_stat_submission_status, text) from public, anon;
revoke all on function public.process_team_player_progression(uuid) from public, anon;

grant execute on function public.create_team(text, public.player_position, public.player_position, text, text, text) to authenticated;
grant execute on function public.create_team_invitation(uuid, text) to authenticated;
grant execute on function public.add_team_member(uuid, uuid, public.player_position, public.player_position) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;
grant execute on function public.create_team_match(uuid, timestamptz, text, text, text, public.team_match_status, smallint, smallint, uuid, timestamptz, text) to authenticated;
grant execute on function public.signup_team_match(uuid, uuid) to authenticated;
grant execute on function public.submit_team_match_stat(uuid, uuid, public.team_stat_kind, smallint) to authenticated;
grant execute on function public.review_team_stat_submission(uuid, public.team_stat_submission_status, text) to authenticated;
grant execute on function public.process_team_player_progression(uuid) to authenticated;
