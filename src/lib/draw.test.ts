import { describe, expect, it } from 'vitest';
import type { PlayerForDraw } from '@/lib/types';
import { drawTeams } from '@/lib/draw';

function makePlayer(
  id: string,
  primary: PlayerForDraw['primary_position'],
  stats: PlayerForDraw['stats'],
  secondary: PlayerForDraw['secondary_position'] = null,
): PlayerForDraw {
  return {
    id,
    display_name: id,
    primary_position: primary,
    secondary_position: secondary,
    stats,
    current_boost: null,
    is_phantom: false,
    joined_at: `2026-01-${String(Math.min(Number(id.replace(/\D/g, '')) || 1, 28)).padStart(2, '0')}T10:00:00Z`,
  };
}

describe('drawTeams', () => {
  const baseField = { pac: 6, sho: 6, pas: 6, dri: 6, def: 6, phy: 6 };
  const goalkeeper = { div: 6, han: 6, kic: 6, ref: 6, spd: 6, pos: 6 };

  it('is reproducible with the same seed', () => {
    const players: PlayerForDraw[] = [
      makePlayer('p1', 'ARQ', goalkeeper),
      makePlayer('p2', 'ARQ', goalkeeper),
      makePlayer('p3', 'DEF', baseField),
      makePlayer('p4', 'DEF', baseField),
      makePlayer('p5', 'MED', baseField),
      makePlayer('p6', 'MED', baseField),
      makePlayer('p7', 'MED', baseField),
      makePlayer('p8', 'MED', baseField),
      makePlayer('p9', 'DEL', baseField),
      makePlayer('p10', 'DEL', baseField),
    ];

    const first = drawTeams({ modality: 'F5', players, seed: 'seed-1' });
    const second = drawTeams({ modality: 'F5', players, seed: 'seed-1' });

    expect(second).toEqual(first);
  });

  it('marks missing goalkeepers with warnings and still produces teams', () => {
    const players: PlayerForDraw[] = [
      makePlayer('p1', 'DEF', baseField, 'ARQ'),
      makePlayer('p2', 'DEF', baseField, 'ARQ'),
      makePlayer('p3', 'DEF', baseField),
      makePlayer('p4', 'DEF', baseField),
      makePlayer('p5', 'MED', baseField),
      makePlayer('p6', 'MED', baseField),
      makePlayer('p7', 'MED', baseField),
      makePlayer('p8', 'MED', baseField),
      makePlayer('p9', 'DEL', baseField),
      makePlayer('p10', 'DEL', baseField),
    ];

    const result = drawTeams({ modality: 'F5', players, seed: 'seed-2' });

    expect(result.assignments).toHaveLength(10);
    expect(result.warnings.some((warning) => warning.kind === 'not_enough_goalkeepers')).toBe(true);
    expect(result.warnings.filter((warning) => warning.kind === 'forced_goalkeeper')).toHaveLength(2);
  });
});

