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
  const proField = { pac: 8, sho: 8, pas: 8, dri: 8, def: 8, phy: 8 };
  const amateurField = { pac: 4, sho: 4, pas: 4, dri: 4, def: 4, phy: 4 };
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

  it('handles F7 modality with 14 players', () => {
    const players: PlayerForDraw[] = [
      makePlayer('p1', 'ARQ', goalkeeper),
      makePlayer('p2', 'ARQ', goalkeeper),
      ...Array.from({ length: 4 }, (_, i) => makePlayer(`d${i}`, 'DEF', baseField)),
      ...Array.from({ length: 6 }, (_, i) => makePlayer(`m${i}`, 'MED', baseField)),
      ...Array.from({ length: 2 }, (_, i) => makePlayer(`f${i}`, 'DEL', baseField)),
    ];

    const result = drawTeams({ modality: 'F7', players, seed: 'seed-3' });

    expect(result.assignments).toHaveLength(14);
    const teamA = result.assignments.filter(a => a.team === 'A');
    const teamB = result.assignments.filter(a => a.team === 'B');
    expect(teamA).toHaveLength(7);
    expect(teamB).toHaveLength(7);
    expect(result.warnings).toHaveLength(0); // Perfect distribution
  });

  it('balances extreme rating differences successfully', () => {
    const players: PlayerForDraw[] = [
      makePlayer('p1', 'ARQ', goalkeeper),
      makePlayer('p2', 'ARQ', goalkeeper),
      makePlayer('pro1', 'DEF', proField),
      makePlayer('pro2', 'MED', proField),
      makePlayer('pro3', 'DEL', proField),
      makePlayer('pro4', 'MED', proField),
      makePlayer('am1', 'DEF', amateurField),
      makePlayer('am2', 'MED', amateurField),
      makePlayer('am3', 'DEL', amateurField),
      makePlayer('am4', 'MED', amateurField),
    ];

    const result = drawTeams({ modality: 'F5', players, seed: 'seed-4' });

    // The rating difference should be minimal, ideally <= 1.0 or similar
    expect(result.ratingDiff).toBeLessThanOrEqual(2.0);
  });

  it('handles not enough players with a warning', () => {
    const players: PlayerForDraw[] = [
      makePlayer('p1', 'ARQ', goalkeeper),
      makePlayer('p2', 'DEF', baseField),
      makePlayer('p3', 'MED', baseField),
    ]; // Only 3 players

    const result = drawTeams({ modality: 'F5', players, seed: 'seed-5' });

    expect(result.assignments).toHaveLength(0);
    expect(result.warnings).toContainEqual({
      kind: 'not_enough_players',
      needed: 10,
      got: 3,
    });
  });

  it('handles odd number of players (11 players for F5) putting the extra as substitute', () => {
    const players: PlayerForDraw[] = [
      makePlayer('p1', 'ARQ', goalkeeper),
      makePlayer('p2', 'ARQ', goalkeeper),
      ...Array.from({ length: 9 }, (_, i) => makePlayer(`f${i}`, 'MED', baseField)),
    ]; // 11 players

    const result = drawTeams({ modality: 'F5', players, seed: 'seed-6' });

    expect(result.assignments).toHaveLength(11);
    const subs = result.assignments.filter(a => a.team === 'substitute');
    expect(subs).toHaveLength(1);
    const teamA = result.assignments.filter(a => a.team === 'A');
    expect(teamA).toHaveLength(5);
  });
});
