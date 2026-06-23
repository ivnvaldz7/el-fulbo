import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerId, PlayerStatsAggregate, Result } from '@/lib/types';
import { mapSupabaseError } from './errors';

function mapStats(row: Record<string, unknown>): PlayerStatsAggregate {
  const matchesPlayed = (row.matches_played as number) ?? 0;
  const wins = (row.wins as number) ?? 0;
  return {
    playerId: row.player_id as string,
    groupId: row.group_id as string,
    userId: (row.user_id as string) ?? null,
    displayName: row.display_name as string,
    matchesPlayed,
    wins,
    draws: (row.draws as number) ?? 0,
    losses: (row.losses as number) ?? 0,
    winPercentage: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : null,
    mvpCount: (row.mvp_count as number) ?? 0,
    lastMvpAt: (row.last_mvp_at as string) ?? null,
    attendanceRate: (row.attendance_rate as number) ?? null,
    lateDropouts: (row.late_dropouts as number) ?? 0,
  };
}

export async function fetchPlayerStats(
  supabase: SupabaseClient,
  playerId: PlayerId,
): Promise<Result<PlayerStatsAggregate>> {
  const { data, error } = await supabase
    .rpc('get_player_stats', { p_player_id: playerId })
    .maybeSingle();

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  if (!data) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'No encontramos las estadísticas.' } };
  }

  return { ok: true, data: mapStats(data as Record<string, unknown>) };
}
