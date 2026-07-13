import {
  calculateOverall,
  FORMATIONS,
  getTeamSize,
  type DrawAssignment,
  type DrawResult,
  type DrawWarning,
  type Modality,
  type PlayerForDraw,
  type PlayerPosition,
} from '@/lib/types';
import { applyBoostToStats, getActiveBoost } from '@/lib/boost';

type PlayerSlot = {
  player: PlayerForDraw;
  overall: number;
  playedPrimaryPosition: boolean;
};

type TeamBuckets = Record<PlayerPosition, PlayerSlot[]>;

function createBuckets(): TeamBuckets {
  return { ARQ: [], DEF: [], MED: [], DEL: [] };
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string) {
  let state = hashSeed(seed) || 1;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function shuffle<T>(items: T[], rng: () => number) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex]!, output[index]!];
  }
  return output;
}

function getOverall(player: PlayerForDraw) {
  const boost = getActiveBoost(player.current_boost);
  const stats = applyBoostToStats(player.stats, boost ?? null);
  return calculateOverall(stats, player.primary_position);
}

function avg(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

function teamOverall(team: TeamBuckets) {
  return avg(Object.values(team).flat().map((slot) => slot.overall));
}

function findFillCandidate(pool: PlayerForDraw[], target: PlayerPosition) {
  const pick = (predicate: (player: PlayerForDraw) => boolean) => pool.find(predicate) ?? null;

  return (
    pick((player) => player.secondary_position === target && player.primary_position === 'MED') ??
    pick((player) => player.secondary_position === target) ??
    pick((player) => player.primary_position === 'MED') ??
    pick(() => true)
  );
}

function removePlayer(pool: PlayerForDraw[], playerId: string) {
  const index = pool.findIndex((entry) => entry.id === playerId);
  if (index >= 0) {
    pool.splice(index, 1);
  }
}

function pushSlot(team: TeamBuckets, position: PlayerPosition, player: PlayerForDraw) {
  team[position].push({
    player,
    overall: getOverall(player),
    playedPrimaryPosition: player.primary_position === position,
  });
}

function flattenTeam(team: TeamBuckets) {
  return (['ARQ', 'DEF', 'MED', 'DEL'] as const).flatMap((position) =>
    team[position].map((slot) => ({ position, ...slot })),
  );
}

function swapBest(teamA: TeamBuckets, teamB: TeamBuckets) {
  const beforeDiff = Math.abs(teamOverall(teamA) - teamOverall(teamB));
  let best:
    | {
        position: PlayerPosition;
        leftIndex: number;
        rightIndex: number;
        diff: number;
      }
    | null = null;

  (['ARQ', 'DEF', 'MED', 'DEL'] as const).forEach((position) => {
    teamA[position].forEach((leftSlot, leftIndex) => {
      teamB[position].forEach((rightSlot, rightIndex) => {
        const left = [...teamA[position]];
        const right = [...teamB[position]];
        left[leftIndex] = rightSlot;
        right[rightIndex] = leftSlot;

        const nextTeamA = { ...teamA, [position]: left };
        const nextTeamB = { ...teamB, [position]: right };
        const nextDiff = Math.abs(teamOverall(nextTeamA) - teamOverall(nextTeamB));

        if (nextDiff < beforeDiff && (!best || nextDiff < best.diff)) {
          best = { position, leftIndex, rightIndex, diff: nextDiff };
        }
      });
    });
  });

  if (!best) {
    return false;
  }

  const { position, leftIndex, rightIndex } = best;
  const temp = teamA[position][leftIndex]!;
  teamA[position][leftIndex] = teamB[position][rightIndex]!;
  teamB[position][rightIndex] = temp;
  return true;
}

function buildAssignments(team: 'A' | 'B', buckets: TeamBuckets, warnings: DrawWarning[]): DrawAssignment[] {
  return (['ARQ', 'DEF', 'MED', 'DEL'] as const).flatMap((position) =>
    buckets[position].map((slot) => {
      if (!slot.playedPrimaryPosition) {
        warnings.push({
          kind: 'out_of_position',
          playerId: slot.player.id,
          primary: slot.player.primary_position,
          assigned: position,
        });
      }

      return {
        playerId: slot.player.id,
        team,
        assignedPosition: position,
        playedPrimaryPosition: slot.playedPrimaryPosition,
      };
    }),
  );
}

export function drawTeams(input: {
  modality: Modality;
  players: PlayerForDraw[];
  seed: string;
  allowUnderfilled?: boolean;
}): DrawResult {
  const warnings: DrawWarning[] = [];
  const teamSize = getTeamSize(input.modality);
  const totalNeeded = teamSize * 2;

  if (input.players.length < totalNeeded) {
    if (!input.allowUnderfilled) {
      return {
        assignments: [],
        teamAOverallAvg: 0,
        teamBOverallAvg: 0,
        ratingDiff: 0,
        warnings: [{ kind: 'not_enough_players', needed: totalNeeded, got: input.players.length }],
      };
    }
    warnings.push({ kind: 'not_enough_players', needed: totalNeeded, got: input.players.length });
  }

  const players = [...input.players].sort((left, right) => {
    const joinedLeft = left.joined_at ? Date.parse(left.joined_at) : 0;
    const joinedRight = right.joined_at ? Date.parse(right.joined_at) : 0;
    return joinedLeft - joinedRight;
  });
  const substitutes = players.splice(totalNeeded);
  const rng = createRng(input.seed);
  const bucketsA = createBuckets();
  const bucketsB = createBuckets();
  const slots = FORMATIONS[input.modality];

  const active = shuffle(players, rng);
  const goalkeepers = active.filter((player) => player.primary_position === 'ARQ');
  const pool = active.filter((player) => player.primary_position !== 'ARQ');

  if (goalkeepers.length >= 2) {
    const shuffledKeepers = shuffle(goalkeepers, rng);
    pushSlot(bucketsA, 'ARQ', shuffledKeepers[0]!);
    pushSlot(bucketsB, 'ARQ', shuffledKeepers[1]!);

    shuffledKeepers.slice(2).forEach((player) => {
      pool.push(player);
    });
  } else {
    warnings.push({ kind: 'not_enough_goalkeepers', got: goalkeepers.length, needed: 2 });

    [bucketsA, bucketsB].forEach((team) => {
      const forced = pool.sort((left, right) => getOverall(left) - getOverall(right))[0];
      if (forced) {
        removePlayer(pool, forced.id);
        pushSlot(team, 'ARQ', {
          ...forced,
          secondary_position: forced.secondary_position ?? 'ARQ',
        });
        warnings.push({ kind: 'forced_goalkeeper', playerId: forced.id });
      }
    });
  }

  (['DEL', 'DEF', 'MED'] as const).forEach((position) => {
    const candidates = pool
      .filter((player) => player.primary_position === position)
      .sort((left, right) => getOverall(right) - getOverall(left));

    candidates.forEach((player, index) => {
      const team = index % 2 === 0 ? bucketsA : bucketsB;
      const fallbackTeam = team === bucketsA ? bucketsB : bucketsA;

      if (team[position].length < slots[position]) {
        pushSlot(team, position, player);
      } else if (fallbackTeam[position].length < slots[position]) {
        pushSlot(fallbackTeam, position, player);
      } else {
        pool.push(player);
      }

      removePlayer(pool, player.id);
    });
  });

  (['ARQ', 'DEF', 'MED', 'DEL'] as const).forEach((position) => {
    while (bucketsA[position].length < slots[position]) {
      const candidate = findFillCandidate(pool, position);
      if (!candidate) break;
      removePlayer(pool, candidate.id);
      pushSlot(bucketsA, position, candidate);
    }

    while (bucketsB[position].length < slots[position]) {
      const candidate = findFillCandidate(pool, position);
      if (!candidate) break;
      removePlayer(pool, candidate.id);
      pushSlot(bucketsB, position, candidate);
    }
  });

  let iterations = 0;
  while (iterations < 100 && swapBest(bucketsA, bucketsB)) {
    iterations += 1;
  }

  const teamAOverallAvg = teamOverall(bucketsA);
  const teamBOverallAvg = teamOverall(bucketsB);
  const ratingDiff = Math.round(Math.abs(teamAOverallAvg - teamBOverallAvg) * 10) / 10;

  if (ratingDiff > 5) {
    warnings.push({ kind: 'imbalance', diff: ratingDiff });
  }

  return {
    assignments: [
      ...buildAssignments('A', bucketsA, warnings),
      ...buildAssignments('B', bucketsB, warnings),
      ...substitutes.map<DrawAssignment>((player) => ({
        playerId: player.id,
        team: 'substitute',
        assignedPosition: null,
        playedPrimaryPosition: false,
      })),
    ],
    teamAOverallAvg,
    teamBOverallAvg,
    ratingDiff,
    warnings,
  };
}
