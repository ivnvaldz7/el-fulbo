import { describe, expect, it } from 'vitest';
import {
  fieldStatsSchema,
  goalkeeperStatsSchema,
  submitOnboardingStatsSchema,
} from './onboarding';

describe('onboarding validations', () => {
  const groupId = '11111111-1111-4111-8111-111111111111';

  it('accepts field stats with all values at onboarding max 8', () => {
    expect(
      fieldStatsSchema.safeParse({ pac: 8, sho: 8, pas: 8, dri: 8, def: 8, phy: 8 }).success,
    ).toBe(true);
  });

  it('rejects field stats above onboarding max 8', () => {
    expect(
      fieldStatsSchema.safeParse({ pac: 9, sho: 8, pas: 8, dri: 8, def: 8, phy: 8 }).success,
    ).toBe(false);
  });

  it('rejects field stats below 1', () => {
    expect(
      fieldStatsSchema.safeParse({ pac: 0, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 }).success,
    ).toBe(false);
  });

  it('rejects goalkeeper position with field stats', () => {
    expect(
      submitOnboardingStatsSchema.safeParse({
        groupId,
        primaryPosition: 'ARQ',
        secondaryPosition: null,
        stats: { pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 },
      }).success,
    ).toBe(false);
  });

  it('accepts goalkeeper stats for goalkeeper position', () => {
    expect(
      submitOnboardingStatsSchema.safeParse({
        groupId,
        primaryPosition: 'ARQ',
        secondaryPosition: null,
        stats: { div: 5, han: 5, kic: 5, ref: 5, spd: 5, pos: 5 },
      }).success,
    ).toBe(true);
  });

  it('rejects secondary position equal to primary', () => {
    expect(
      submitOnboardingStatsSchema.safeParse({
        groupId,
        primaryPosition: 'MED',
        secondaryPosition: 'MED',
        stats: { pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 },
      }).success,
    ).toBe(false);
  });

  it('keeps goalkeeper stat max at 8 too', () => {
    expect(
      goalkeeperStatsSchema.safeParse({ div: 8, han: 8, kic: 8, ref: 8, spd: 8, pos: 8 }).success,
    ).toBe(true);
  });
});
