import { describe, expect, it } from 'vitest';
import { submitOnboardingStatsSchema } from '@/lib/validations/onboarding';
import { selectPrimaryPositionDraft } from './onboarding-wizard';

describe('selectPrimaryPositionDraft', () => {
  it('uses goalkeeper stats when ARQ is selected as first position', () => {
    const draft = selectPrimaryPositionDraft(
      {
        step: 1,
        primaryPosition: null,
        secondaryPosition: null,
        stats: { pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 },
      },
      'ARQ',
    );

    expect(draft.stats).toEqual({ div: 5, han: 5, kic: 5, ref: 5, spd: 5, pos: 5 });
    expect('pac' in draft.stats).toBe(false);
    expect(
      submitOnboardingStatsSchema.safeParse({
        groupId: '11111111-1111-4111-8111-111111111111',
        primaryPosition: draft.primaryPosition,
        secondaryPosition: draft.secondaryPosition,
        stats: draft.stats,
      }).success,
    ).toBe(true);
  });
});
