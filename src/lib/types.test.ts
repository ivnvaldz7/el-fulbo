import { describe, expect, it } from 'vitest';
import { FORMATIONS, getTeamSize } from './types';

describe('formations contract', () => {
  it('keeps F5 team size aligned with the V2 formation', () => {
    expect(FORMATIONS.F5).toEqual({ ARQ: 1, DEF: 1, MED: 2, DEL: 1 });
    expect(getTeamSize('F5')).toBe(5);
  });

  it('keeps F11 team size aligned with the V2 formation', () => {
    expect(FORMATIONS.F11).toEqual({ ARQ: 1, DEF: 4, MED: 3, DEL: 3 });
    expect(getTeamSize('F11')).toBe(11);
  });
});
