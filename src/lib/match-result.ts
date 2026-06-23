import type { BoostReason, CurrentBoost, FieldStats, GoalkeeperStats, PlayerPosition } from '@/lib/types';

type BoostModifiers = Partial<Record<keyof FieldStats | keyof GoalkeeperStats, number>>;

const PRINCIPAL_STATS: Record<PlayerPosition, [keyof BoostModifiers, keyof BoostModifiers]> = {
  ARQ: ['han', 'ref'],
  DEF: ['def', 'phy'],
  MED: ['pas', 'dri'],
  DEL: ['pac', 'sho'],
};

const POSITION_STATS: Record<PlayerPosition, Array<keyof BoostModifiers>> = {
  ARQ: ['div', 'han', 'kic', 'ref', 'spd', 'pos'],
  DEF: ['pac', 'sho', 'pas', 'dri', 'def', 'phy'],
  MED: ['pac', 'sho', 'pas', 'dri', 'def', 'phy'],
  DEL: ['pac', 'sho', 'pas', 'dri', 'def', 'phy'],
};

export function calculateMatchBoost(input: {
  appliedAtEventId: string;
  isWinner: boolean;
  isDraw: boolean;
  isMvp: boolean;
  position: PlayerPosition;
}): CurrentBoost | null {
  const { appliedAtEventId, isWinner, isDraw, isMvp, position } = input;
  const [mainA, mainB] = PRINCIPAL_STATS[position];
  const availableStats = POSITION_STATS[position];

  const withBase = (reason: BoostReason, mainValue: number, otherValue = 0): CurrentBoost => {
    const modifiers: BoostModifiers = {};

    for (const stat of availableStats) {
      modifiers[stat] = otherValue;
    }

    modifiers[mainA] = mainValue;
    modifiers[mainB] = mainValue;

    if (otherValue === 0) {
      for (const [key, value] of Object.entries(modifiers)) {
        if (!value) {
          delete modifiers[key as keyof BoostModifiers];
        }
      }
    }

    return {
      applied_at_event_id: appliedAtEventId,
      partidos_remaining: 3,
      modifiers,
      reason,
    };
  };

  if (isWinner && isMvp) {
    return withBase('victory_mvp', 3, 1);
  }

  if (isWinner) {
    return withBase('victory', 1);
  }

  if (isMvp) {
    return withBase(isDraw ? 'draw_mvp' : 'loss_mvp', 1);
  }

  return null;
}

export function decrementBoostAfterParticipation(boost: CurrentBoost | null | undefined): CurrentBoost | null {
  if (!boost) {
    return null;
  }

  const remaining = boost.partidos_remaining ?? boost.partidosRemaining ?? 0;
  if (remaining <= 1) {
    return null;
  }

  return {
    ...boost,
    partidos_remaining: remaining - 1,
  };
}
