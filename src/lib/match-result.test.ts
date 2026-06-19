import { describe, expect, it } from 'vitest';
import { calculateMatchBoost, decrementBoostAfterParticipation } from './match-result';

describe('match-result boost rules', () => {
  it('applies victory + MVP boost with +3 on principal stats and +1 on the rest', () => {
    const boost = calculateMatchBoost({
      appliedAtEventId: '11111111-1111-1111-1111-111111111111',
      isWinner: true,
      isDraw: false,
      isMvp: true,
      position: 'DEL',
    });

    expect(boost).toEqual({
      applied_at_event_id: '11111111-1111-1111-1111-111111111111',
      partidos_remaining: 3,
      reason: 'victory_mvp',
      modifiers: {
        pac: 3,
        sho: 3,
        pas: 1,
        dri: 1,
        def: 1,
        phy: 1,
      },
    });
  });

  it('applies victory boost only on principal stats', () => {
    const boost = calculateMatchBoost({
      appliedAtEventId: 'event-2',
      isWinner: true,
      isDraw: false,
      isMvp: false,
      position: 'MED',
    });

    expect(boost).toEqual({
      applied_at_event_id: 'event-2',
      partidos_remaining: 3,
      reason: 'victory',
      modifiers: {
        pas: 1,
        dri: 1,
      },
    });
  });

  it('applies MVP boost on draw/loss only on principal stats', () => {
    expect(
      calculateMatchBoost({
        appliedAtEventId: 'event-3',
        isWinner: false,
        isDraw: true,
        isMvp: true,
        position: 'ARQ',
      }),
    ).toEqual({
      applied_at_event_id: 'event-3',
      partidos_remaining: 3,
      reason: 'draw_mvp',
      modifiers: {
        han: 1,
        ref: 1,
      },
    });

    expect(
      calculateMatchBoost({
        appliedAtEventId: 'event-4',
        isWinner: false,
        isDraw: false,
        isMvp: true,
        position: 'DEF',
      }),
    ).toEqual({
      applied_at_event_id: 'event-4',
      partidos_remaining: 3,
      reason: 'loss_mvp',
      modifiers: {
        def: 1,
        phy: 1,
      },
    });
  });

  it('returns null with no boost and decrements existing boosts only when needed', () => {
    expect(
      calculateMatchBoost({
        appliedAtEventId: 'event-5',
        isWinner: false,
        isDraw: false,
        isMvp: false,
        position: 'DEL',
      }),
    ).toBeNull();

    expect(
      decrementBoostAfterParticipation({
        applied_at_event_id: 'old-event',
        partidos_remaining: 2,
        reason: 'victory',
        modifiers: { pac: 1, sho: 1 },
      }),
    ).toEqual({
      applied_at_event_id: 'old-event',
      partidos_remaining: 1,
      reason: 'victory',
      modifiers: { pac: 1, sho: 1 },
    });

    expect(
      decrementBoostAfterParticipation({
        applied_at_event_id: 'old-event',
        partidos_remaining: 1,
        reason: 'victory',
        modifiers: { pac: 1, sho: 1 },
      }),
    ).toBeNull();
  });
});
