import { calculateOverall, type CurrentBoost, type PlayerPosition, type PlayerStats } from '@/lib/types';

export function getActiveBoost(boost: CurrentBoost | null | undefined): CurrentBoost | null {
  if (!boost) {
    return null;
  }

  const remaining = boost.partidosRemaining ?? boost.partidos_remaining ?? 0;
  return remaining > 0 ? boost : null;
}

export function applyBoostToStats(stats: PlayerStats, boost: CurrentBoost | null | undefined): PlayerStats {
  const activeBoost = getActiveBoost(boost);
  if (!activeBoost) {
    return stats;
  }

  const output = { ...stats } as Record<string, number>;
  for (const [key, delta] of Object.entries(activeBoost.modifiers ?? {})) {
    if (output[key] !== undefined) {
      output[key] = Math.min(10, output[key] + delta / 10);
    }
  }

  return output as unknown as PlayerStats;
}

export function calculateBoostedOverall(
  stats: PlayerStats,
  position: PlayerPosition,
  boost: CurrentBoost | null | undefined,
) {
  return Math.min(99, calculateOverall(applyBoostToStats(stats, boost), position));
}

export function getBoostRemainingLabel(boost: CurrentBoost | null | undefined) {
  const activeBoost = getActiveBoost(boost);
  if (!activeBoost) {
    return null;
  }

  const remaining = activeBoost.partidosRemaining ?? activeBoost.partidos_remaining ?? 0;
  if (remaining <= 1) {
    return 'Boost: último partido';
  }

  return `Boost: ${remaining} partidos más`;
}

export function isMvpBoost(boost: CurrentBoost | null | undefined) {
  const reason = getActiveBoost(boost)?.reason ?? null;
  return reason === 'victory_mvp' || reason === 'draw_mvp' || reason === 'loss_mvp';
}
