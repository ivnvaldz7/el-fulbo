-- Update public.player_stats_aggregate view to use new event_attendances schema and ENUM
CREATE OR REPLACE VIEW public.player_stats_aggregate
WITH (security_invoker = true)
AS
SELECT
  p.id AS player_id,
  p.group_id,
  p.user_id,
  p.display_name,
  count(DISTINCT mp.event_id) FILTER (
    WHERE mp.team IN ('A', 'B') AND e.status = 'played'
  )::INTEGER AS matches_played,
  count(DISTINCT mp.event_id) FILTER (
    WHERE (
      (mp.team = 'A' AND e.status = 'played' AND e.team_a_score > e.team_b_score)
      OR (mp.team = 'B' AND e.status = 'played' AND e.team_b_score > e.team_a_score)
    )
  )::INTEGER AS wins,
  count(DISTINCT mp.event_id) FILTER (
    WHERE mp.team IN ('A', 'B') AND e.status = 'played' AND e.team_a_score = e.team_b_score
  )::INTEGER AS draws,
  count(DISTINCT mp.event_id) FILTER (
    WHERE (
      (mp.team = 'A' AND e.status = 'played' AND e.team_a_score < e.team_b_score)
      OR (mp.team = 'B' AND e.status = 'played' AND e.team_b_score < e.team_a_score)
    )
  )::INTEGER AS losses,
  count(DISTINCT e.id) FILTER (
    WHERE e.mvp_player_id = p.id AND e.status = 'played'
  )::INTEGER AS mvp_count,
  max(e.played_at) FILTER (
    WHERE e.mvp_player_id = p.id AND e.status = 'played'
  ) AS last_mvp_at,
  CASE
    WHEN (
      SELECT count(*)
      FROM public.events e2
      WHERE e2.group_id = p.group_id
        AND e2.status = 'played'
        AND coalesce(e2.played_at, e2.scheduled_at) >= p.joined_at
    ) > 0 THEN round(
      100.0 * count(DISTINCT mp.event_id) FILTER (
        WHERE mp.team IN ('A', 'B') AND e.status = 'played'
      ) / (
        SELECT count(*)
        FROM public.events e2
        WHERE e2.group_id = p.group_id
          AND e2.status = 'played'
          AND coalesce(e2.played_at, e2.scheduled_at) >= p.joined_at
      ),
      1
    )
    ELSE NULL
  END AS attendance_rate,
  (
    SELECT count(*)
    FROM public.event_attendances ea
    JOIN public.events ev ON ev.id = ea.event_id
    WHERE ea.user_id = p.user_id -- Changed from player_id to user_id
      AND ea.status = 'DECLINED' -- Changed from 'not_going' to 'DECLINED'
      AND ea.updated_at > (ev.scheduled_at - INTERVAL '6 hours')
  )::INTEGER AS late_dropouts
FROM public.players p
LEFT JOIN public.match_participations mp ON mp.player_id = p.id
LEFT JOIN public.events e ON e.id = mp.event_id AND e.status = 'played'
WHERE p.archived_at IS NULL
GROUP BY p.id, p.group_id, p.user_id, p.display_name, p.joined_at;