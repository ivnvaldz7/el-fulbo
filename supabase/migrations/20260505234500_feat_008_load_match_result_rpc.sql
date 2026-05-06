alter type public.notification_type add value if not exists 'match_result_loaded';

create or replace function public.load_match_result(
  p_event_id uuid,
  p_team_a_score integer,
  p_team_b_score integer,
  p_mvp_player_id uuid,
  p_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  target_participation record;
  new_boost jsonb;
  applied_notes text;
  team_score integer;
  opponent_score integer;
begin
  select *
  into target_event
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if not public.is_group_admin_or_owner(target_event.group_id) then
    raise exception 'FORBIDDEN';
  end if;

  if target_event.status = 'played' then
    raise exception 'CONFLICT';
  end if;

  if target_event.status <> 'drawn' then
    raise exception 'CONFLICT';
  end if;

  if p_team_a_score is null or p_team_b_score is null
     or p_team_a_score < 0 or p_team_a_score > 99
     or p_team_b_score < 0 or p_team_b_score > 99 then
    raise exception 'VALIDATION_ERROR';
  end if;

  applied_notes := nullif(trim(coalesce(p_notes, '')), '');
  if applied_notes is not null and char_length(applied_notes) > 300 then
    raise exception 'VALIDATION_ERROR';
  end if;

  if not exists (
    select 1
    from public.match_participations
    where event_id = p_event_id
      and player_id = p_mvp_player_id
      and team in ('A', 'B')
  ) then
    raise exception 'VALIDATION_ERROR';
  end if;

  update public.events
  set
    team_a_score = p_team_a_score,
    team_b_score = p_team_b_score,
    mvp_player_id = p_mvp_player_id,
    notes = applied_notes,
    status = 'played',
    played_at = now()
  where id = p_event_id;

  for target_participation in
    select
      mp.player_id,
      mp.team,
      player.user_id,
      player.primary_position,
      player.display_name,
      player.current_boost
    from public.match_participations mp
    join public.players player on player.id = mp.player_id
    where mp.event_id = p_event_id
      and mp.team in ('A', 'B')
  loop
    team_score := case when target_participation.team = 'A' then p_team_a_score else p_team_b_score end;
    opponent_score := case when target_participation.team = 'A' then p_team_b_score else p_team_a_score end;

    new_boost := case
      when team_score > opponent_score and target_participation.player_id = p_mvp_player_id then
        case target_participation.primary_position
          when 'ARQ' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory_mvp',
            'modifiers', jsonb_build_object('div', 1, 'han', 3, 'kic', 1, 'ref', 3, 'spd', 1, 'pos', 1)
          )
          when 'DEF' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory_mvp',
            'modifiers', jsonb_build_object('pac', 1, 'sho', 1, 'pas', 1, 'dri', 1, 'def', 3, 'phy', 3)
          )
          when 'MED' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory_mvp',
            'modifiers', jsonb_build_object('pac', 1, 'sho', 1, 'pas', 3, 'dri', 3, 'def', 1, 'phy', 1)
          )
          else jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory_mvp',
            'modifiers', jsonb_build_object('pac', 3, 'sho', 3, 'pas', 1, 'dri', 1, 'def', 1, 'phy', 1)
          )
        end
      when team_score > opponent_score then
        case target_participation.primary_position
          when 'ARQ' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory',
            'modifiers', jsonb_build_object('han', 1, 'ref', 1)
          )
          when 'DEF' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory',
            'modifiers', jsonb_build_object('def', 1, 'phy', 1)
          )
          when 'MED' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory',
            'modifiers', jsonb_build_object('pas', 1, 'dri', 1)
          )
          else jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', 'victory',
            'modifiers', jsonb_build_object('pac', 1, 'sho', 1)
          )
        end
      when target_participation.player_id = p_mvp_player_id then
        case target_participation.primary_position
          when 'ARQ' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', case when team_score = opponent_score then 'draw_mvp' else 'loss_mvp' end,
            'modifiers', jsonb_build_object('han', 1, 'ref', 1)
          )
          when 'DEF' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', case when team_score = opponent_score then 'draw_mvp' else 'loss_mvp' end,
            'modifiers', jsonb_build_object('def', 1, 'phy', 1)
          )
          when 'MED' then jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', case when team_score = opponent_score then 'draw_mvp' else 'loss_mvp' end,
            'modifiers', jsonb_build_object('pas', 1, 'dri', 1)
          )
          else jsonb_build_object(
            'applied_at_event_id', p_event_id,
            'partidos_remaining', 3,
            'reason', case when team_score = opponent_score then 'draw_mvp' else 'loss_mvp' end,
            'modifiers', jsonb_build_object('pac', 1, 'sho', 1)
          )
        end
      else null
    end;

    if new_boost is not null then
      update public.players
      set current_boost = new_boost
      where id = target_participation.player_id;

      update public.match_participations
      set boost_applied = new_boost
      where event_id = p_event_id
        and player_id = target_participation.player_id;

      if target_participation.user_id is not null then
        insert into public.notifications (user_id, type, payload)
        values (
          target_participation.user_id,
          'boost_applied',
          jsonb_build_object(
            'event_id', p_event_id,
            'player_id', target_participation.player_id,
            'reason', new_boost->>'reason',
            'modifiers', new_boost->'modifiers'
          )
        );
      end if;
    else
      update public.players
      set current_boost = case
        when coalesce((current_boost->>'partidos_remaining')::integer, 0) <= 1 then null
        else jsonb_set(current_boost, '{partidos_remaining}', to_jsonb(((current_boost->>'partidos_remaining')::integer - 1)))
      end
      where id = target_participation.player_id;

      update public.match_participations
      set boost_applied = null
      where event_id = p_event_id
        and player_id = target_participation.player_id;
    end if;
  end loop;

  update public.players
  set current_boost = null
  where current_boost is not null
    and coalesce((current_boost->>'partidos_remaining')::integer, 0) <= 0;

  insert into public.notifications (user_id, type, payload)
  select
    mvp_player.user_id,
    'mvp_awarded',
    jsonb_build_object(
      'event_id', p_event_id,
      'player_id', p_mvp_player_id
    )
  from public.players mvp_player
  where mvp_player.id = p_mvp_player_id
    and mvp_player.user_id is not null;

  insert into public.notifications (user_id, type, payload)
  select
    player.user_id,
    'match_result_loaded',
    jsonb_build_object(
      'event_id', p_event_id,
      'team_a_score', p_team_a_score,
      'team_b_score', p_team_b_score,
      'mvp_player_id', p_mvp_player_id
    )
  from public.players player
  where player.group_id = target_event.group_id
    and player.user_id is not null
    and player.archived_at is null;
end;
$$;
