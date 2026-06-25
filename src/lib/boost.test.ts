import { describe, expect, it } from 'vitest';
import { applyBoostToStats, calculateBoostedOverall, getActiveBoost, getBoostRemainingLabel, isMvpBoost } from './boost';

describe('boost helpers', () => {
  it('returns only active boosts', () => {
    expect(getActiveBoost(null)).toBeNull();
    expect(getActiveBoost({ partidos_remaining: 0, modifiers: {} })).toBeNull();
    expect(getActiveBoost({ partidos_remaining: 2, modifiers: { pac: 1 } })).toEqual({
      partidos_remaining: 2,
      modifiers: { pac: 1 },
    });
  });

  it('applies boost modifiers as direct deltas in 1-99 range', () => {
    expect(
      applyBoostToStats(
        { pac: 8, sho: 7, pas: 6, dri: 5, def: 4, phy: 3 },
        {
          partidos_remaining: 3,
          modifiers: { pac: 3, sho: 1 },
        },
      ),
    ).toEqual({
      pac: 11,  // 8 + 3
      sho: 8,   // 7 + 1
      pas: 6,
      dri: 5,
      def: 4,
      phy: 3,
    });
  });

  it('clamps each boosted stat to 99 and returns correct overall', () => {
    expect(
      calculateBoostedOverall(
        { pac: 99, sho: 99, pas: 99, dri: 99, def: 99, phy: 99 },
        'DEL',
        {
          partidos_remaining: 3,
          modifiers: { pac: 3, sho: 3, pas: 1, dri: 1, def: 1, phy: 1 },
          reason: 'victory_mvp',
        },
      ),
    ).toBe(99);
  });

  it('builds the remaining matches label and MVP marker', () => {
    expect(getBoostRemainingLabel({ partidos_remaining: 3, modifiers: { pac: 1 } })).toBe('Boost: 3 partidos más');
    expect(getBoostRemainingLabel({ partidos_remaining: 1, modifiers: { pac: 1 } })).toBe('Boost: último partido');
    expect(isMvpBoost({ partidos_remaining: 3, modifiers: { pac: 3 }, reason: 'victory_mvp' })).toBe(true);
    expect(isMvpBoost({ partidos_remaining: 3, modifiers: { pac: 1 }, reason: 'victory' })).toBe(false);
  });
});
