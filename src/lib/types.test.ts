import { describe, expect, it } from 'vitest';
import { FORMATIONS, getTeamSize, type Modality } from './types';

const ALL_MODALITIES: Modality[] = ['F5', 'F6', 'F7', 'F8', 'F9', 'F11'];

describe('formations contract', () => {
  it.each(ALL_MODALITIES)('keeps %s team size aligned with its formation', (modality) => {
    const formation = FORMATIONS[modality];
    const total = Object.values(formation).reduce((sum, v) => sum + v, 0);
    expect(total).toBe(getTeamSize(modality));
  });

  it('keeps F5 team size aligned with the V2 formation', () => {
    expect(FORMATIONS.F5).toEqual({ ARQ: 1, DEF: 1, MED: 2, DEL: 1 });
    expect(getTeamSize('F5')).toBe(5);
  });

  it('keeps F9 team size aligned with the V2 formation', () => {
    expect(FORMATIONS.F9).toEqual({ ARQ: 1, DEF: 3, MED: 3, DEL: 2 });
    expect(getTeamSize('F9')).toBe(9);
  });

  it('keeps F11 team size aligned with the V2 formation', () => {
    expect(FORMATIONS.F11).toEqual({ ARQ: 1, DEF: 4, MED: 3, DEL: 3 });
    expect(getTeamSize('F11')).toBe(11);
  });
});
