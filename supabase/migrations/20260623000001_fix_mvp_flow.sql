-- Remove MVP requirement from load_match_result
CREATE OR REPLACE FUNCTION public.load_match_result(
  p_event_id uuid,
  p_team_a_score integer,
  p_team_b_score integer,
  p_mvp_player_id uuid default null,
  p_notes text default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event public.events%rowtype;
  target_participation record;
  new_boost jsonb;
  applied_notes text;
  team_score integer;
  opponent_score integer;
BEGIN
  SELECT *
  INTO target_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF NOT public.is_group_admin_or_owner(target_event.group_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF target_event.status = 'played' THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF target_event.status <> 'drawn' THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF p_team_a_score IS NULL OR p_team_b_score IS NULL
     OR p_team_a_score < 0 OR p_team_a_score > 99
     OR p_team_b_score < 0 OR p_team_b_score > 99 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  applied_notes := nullif(trim(coalesce(p_notes, '')), '');
  IF applied_notes IS NOT NULL AND char_length(applied_notes) > 300 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  IF p_mvp_player_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.match_participations
      WHERE event_id = p_event_id
        AND player_id = p_mvp_player_id
        AND team IN ('A', 'B')
    ) THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
  END IF;

  UPDATE public.events
  SET
    team_a_score = p_team_a_score,
    team_b_score = p_team_b_score,
    mvp_player_id = p_mvp_player_id,
    notes = applied_notes,
    status = 'played',
    played_at = now()
  WHERE id = p_event_id;

  FOR target_participation IN
    SELECT
      mp.player_id,
      mp.team,
      player.user_id,
      player.primary_position,
      player.display_name,
      player.current_boost
    FROM public.match_participations mp
    JOIN public.players player ON player.id = mp.player_id
    WHERE mp.event_id = p_event_id
      AND mp.team IN ('A', 'B')
  LOOP
    team_score := CASE WHEN target_participation.team = 'A' THEN p_team_a_score ELSE p_team_b_score END;
    opponent_score := CASE WHEN target_participation.team = 'A' THEN p_team_b_score ELSE p_team_a_score END;

    new_boost := CASE
      WHEN team_score > opponent_score AND target_participation.player_id = p_mvp_player_id THEN
        CASE target_participation.primary_position
          WHEN 'ARQ' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('div', 1, 'han', 3, 'kic', 1, 'ref', 3, 'spd', 1, 'pos', 1))
          WHEN 'DEF' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('pac', 1, 'sho', 1, 'pas', 1, 'dri', 1, 'def', 3, 'phy', 3))
          WHEN 'MED' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('pac', 1, 'sho', 1, 'pas', 3, 'dri', 3, 'def', 1, 'phy', 1))
          ELSE jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('pac', 3, 'sho', 3, 'pas', 1, 'dri', 1, 'def', 1, 'phy', 1))
        END
      WHEN team_score > opponent_score THEN
        CASE target_participation.primary_position
          WHEN 'ARQ' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory', 'modifiers', jsonb_build_object('han', 1, 'ref', 1))
          WHEN 'DEF' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory', 'modifiers', jsonb_build_object('def', 1, 'phy', 1))
          WHEN 'MED' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory', 'modifiers', jsonb_build_object('pas', 1, 'dri', 1))
          ELSE jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory', 'modifiers', jsonb_build_object('pac', 1, 'sho', 1))
        END
      WHEN target_participation.player_id = p_mvp_player_id THEN
        CASE target_participation.primary_position
          WHEN 'ARQ' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('han', 1, 'ref', 1))
          WHEN 'DEF' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('def', 1, 'phy', 1))
          WHEN 'MED' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('pas', 1, 'dri', 1))
          ELSE jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('pac', 1, 'sho', 1))
        END
      ELSE NULL
    END;

    IF new_boost IS NOT NULL THEN
      UPDATE public.players
      SET current_boost = new_boost
      WHERE id = target_participation.player_id;

      UPDATE public.match_participations
      SET boost_applied = new_boost
      WHERE event_id = p_event_id
        AND player_id = target_participation.player_id;

      IF target_participation.user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, payload)
        VALUES (
          target_participation.user_id,
          'boost_applied',
          jsonb_build_object(
            'event_id', p_event_id,
            'player_id', target_participation.player_id,
            'reason', new_boost->>'reason',
            'modifiers', new_boost->'modifiers'
          )
        );
      END IF;
    ELSE
      UPDATE public.players
      SET current_boost = CASE
        WHEN COALESCE((current_boost->>'partidos_remaining')::integer, 0) <= 1 THEN NULL
        ELSE jsonb_set(current_boost, '{partidos_remaining}', to_jsonb(((current_boost->>'partidos_remaining')::integer - 1)))
      END
      WHERE id = target_participation.player_id;

      UPDATE public.match_participations
      SET boost_applied = NULL
      WHERE event_id = p_event_id
        AND player_id = target_participation.player_id;
    END IF;
  END LOOP;

  UPDATE public.players
  SET current_boost = NULL
  WHERE current_boost IS NOT NULL
    AND COALESCE((current_boost->>'partidos_remaining')::integer, 0) <= 0;

  IF p_mvp_player_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, payload)
    SELECT
      mvp_player.user_id,
      'mvp_awarded',
      jsonb_build_object(
        'event_id', p_event_id,
        'player_id', p_mvp_player_id
      )
    FROM public.players mvp_player
    WHERE mvp_player.id = p_mvp_player_id
      AND mvp_player.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.notifications (user_id, type, payload)
  SELECT
    player.user_id,
    'match_result_loaded',
    jsonb_build_object(
      'event_id', p_event_id,
      'team_a_score', p_team_a_score,
      'team_b_score', p_team_b_score,
      'mvp_player_id', p_mvp_player_id
    )
  FROM public.players player
  WHERE player.group_id = target_event.group_id
    AND player.user_id IS NOT NULL
    AND player.archived_at IS NULL;
END;
$$;

-- Refactor close_mvp_voting to calculate and apply MVP boost
CREATE OR REPLACE FUNCTION public.close_mvp_voting(
  p_event_id uuid,
  p_tiebreaker_player_id uuid default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event public.events%rowtype;
  top_votes integer;
  tied_count integer;
  winner_id uuid;
  mvp_participation record;
  new_boost jsonb;
  team_score integer;
  opponent_score integer;
BEGIN
  SELECT * INTO target_event FROM public.events WHERE id = p_event_id;

  IF NOT public.is_group_admin_or_owner(target_event.group_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF target_event.status <> 'played' THEN
    RAISE EXCEPTION 'El partido no está finalizado.';
  END IF;

  IF target_event.mvp_player_id IS NOT NULL THEN
    RAISE EXCEPTION 'La votación ya cerró, el MVP ya fue elegido.';
  END IF;

  -- Verify votes
  IF NOT EXISTS (SELECT 1 FROM public.event_mvp_votes WHERE event_id = p_event_id) THEN
    IF p_tiebreaker_player_id IS NULL THEN
      RAISE EXCEPTION 'EMPATE';
    ELSE
      winner_id := p_tiebreaker_player_id;
    END IF;
  ELSE
    -- Find max votes
    SELECT count(*) INTO top_votes
    FROM public.event_mvp_votes
    WHERE event_id = p_event_id
    GROUP BY voted_player_id
    ORDER BY count(*) DESC
    LIMIT 1;

    -- Check how many have the top votes
    SELECT count(*) INTO tied_count
    FROM (
      SELECT voted_player_id
      FROM public.event_mvp_votes
      WHERE event_id = p_event_id
      GROUP BY voted_player_id
      HAVING count(*) = top_votes
    ) sub;

    IF tied_count > 1 THEN
      IF p_tiebreaker_player_id IS NULL THEN
        RAISE EXCEPTION 'EMPATE';
      END IF;
      winner_id := p_tiebreaker_player_id;
    ELSE
      -- Clear winner
      SELECT voted_player_id INTO winner_id
      FROM public.event_mvp_votes
      WHERE event_id = p_event_id
      GROUP BY voted_player_id
      ORDER BY count(*) DESC
      LIMIT 1;
    END IF;
  END IF;

  IF winner_id IS NOT NULL THEN
    -- Verify tiebreaker/winner played the match
    SELECT mp.team, p.primary_position, p.user_id 
    INTO mvp_participation
    FROM public.match_participations mp
    JOIN public.players p ON p.id = mp.player_id
    WHERE mp.event_id = p_event_id AND mp.player_id = winner_id AND mp.team IN ('A', 'B');

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El jugador elegido no jugó el partido.';
    END IF;

    -- Update events
    UPDATE public.events SET mvp_player_id = winner_id WHERE id = p_event_id;

    -- Calculate MVP boost
    team_score := CASE WHEN mvp_participation.team = 'A' THEN target_event.team_a_score ELSE target_event.team_b_score END;
    opponent_score := CASE WHEN mvp_participation.team = 'A' THEN target_event.team_b_score ELSE target_event.team_a_score END;

    new_boost := CASE
      WHEN team_score > opponent_score THEN
        CASE mvp_participation.primary_position
          WHEN 'ARQ' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('div', 1, 'han', 3, 'kic', 1, 'ref', 3, 'spd', 1, 'pos', 1))
          WHEN 'DEF' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('pac', 1, 'sho', 1, 'pas', 1, 'dri', 1, 'def', 3, 'phy', 3))
          WHEN 'MED' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('pac', 1, 'sho', 1, 'pas', 3, 'dri', 3, 'def', 1, 'phy', 1))
          ELSE jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', 'victory_mvp', 'modifiers', jsonb_build_object('pac', 3, 'sho', 3, 'pas', 1, 'dri', 1, 'def', 1, 'phy', 1))
        END
      ELSE
        CASE mvp_participation.primary_position
          WHEN 'ARQ' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('han', 1, 'ref', 1))
          WHEN 'DEF' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('def', 1, 'phy', 1))
          WHEN 'MED' THEN jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('pas', 1, 'dri', 1))
          ELSE jsonb_build_object('applied_at_event_id', p_event_id, 'partidos_remaining', 3, 'reason', CASE WHEN team_score = opponent_score THEN 'draw_mvp' ELSE 'loss_mvp' END, 'modifiers', jsonb_build_object('pac', 1, 'sho', 1))
        END
    END;

    -- Apply new MVP boost
    UPDATE public.players SET current_boost = new_boost WHERE id = winner_id;
    UPDATE public.match_participations SET boost_applied = new_boost WHERE event_id = p_event_id AND player_id = winner_id;

    -- Notify MVP awarded
    IF mvp_participation.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, payload)
      VALUES (mvp_participation.user_id, 'mvp_awarded', jsonb_build_object('event_id', p_event_id, 'player_id', winner_id));
      
      -- Notify Boost explicitly if MVP awarded
      INSERT INTO public.notifications (user_id, type, payload)
      VALUES (
        mvp_participation.user_id,
        'boost_applied',
        jsonb_build_object(
          'event_id', p_event_id,
          'player_id', winner_id,
          'reason', new_boost->>'reason',
          'modifiers', new_boost->'modifiers'
        )
      );
    END IF;
  END IF;
END;
$$;
