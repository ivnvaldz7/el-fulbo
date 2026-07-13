import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TeamsService,
  applyTeamProgression,
  getCardTierByOverall,
  getProgressionStatKeys,
  getTeamStatKindForPosition,
} from './teams.service';

function createRpcSupabase(result: { data?: unknown; error?: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe('teams service validation and orchestration', () => {
  it('validates team creation input before calling the RPC', async () => {
    const supabase = createRpcSupabase({ data: [{ team_id: 'team-1' }] });
    const service = new TeamsService(supabase);

    const invalid = await service.createTeam({ name: '', primaryPosition: 'DEL' });
    const valid = await service.createTeam({ name: '  Los Pibes  ', primaryPosition: 'MED' });

    expect(invalid).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('create_team', {
      p_name: 'Los Pibes',
      p_primary_position: 'MED',
      p_secondary_position: null,
      p_badge_url: null,
      p_primary_color: null,
      p_secondary_color: null,
    });
    expect(valid).toEqual({ ok: true, data: { teamId: 'team-1' } });
  });

  it('validates roster, match, signup and submission inputs before RPC calls', async () => {
    const supabase = createRpcSupabase({ data: [{ id: 'created' }] });
    const service = new TeamsService(supabase);

    await expect(service.addTeamMember({ teamId: 'bad', userId: crypto.randomUUID(), primaryPosition: 'DEF' })).resolves.toMatchObject({ ok: false });
    await expect(service.createTeamMatch({ teamId: crypto.randomUUID(), scheduledAt: 'not-date' })).resolves.toMatchObject({ ok: false });
    await expect(service.signUpForTeamMatch({ teamId: crypto.randomUUID(), matchId: 'bad' })).resolves.toMatchObject({ ok: false });
    await expect(
      service.submitTeamStat({
        teamId: crypto.randomUUID(),
        matchId: crypto.randomUUID(),
        statKind: 'goals',
        value: 100,
      }),
    ).resolves.toMatchObject({ ok: false });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('maps player positions to the only allowed submitted stat kind', () => {
    expect(getTeamStatKindForPosition('DEL')).toBe('goals');
    expect(getTeamStatKindForPosition('MED')).toBe('assists');
    expect(getTeamStatKindForPosition('DEF')).toBe('tackles');
    expect(getTeamStatKindForPosition('ARQ')).toBe('tackles');
  });

  it('calls progression RPC with the existing base-card contract', async () => {
    const userId = crypto.randomUUID();
    const supabase = createRpcSupabase({
      data: [{ applied_rewards: 1, stats: { pas: 71, dri: 71, phy: 71 }, overall: 71, card_tier: 'silver' }],
    });
    const service = new TeamsService(supabase);

    const result = await service.processTeamPlayerProgression({ userId });

    expect(supabase.rpc).toHaveBeenCalledWith('process_team_player_progression', {
      p_user_id: userId,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        appliedRewards: 1,
        stats: { pas: 71, dri: 71, phy: 71 },
        overall: 71,
        cardTier: 'silver',
      },
    });
  });

  it('allocates permanent progression by position, caps stats at 99 and derives visual tier', () => {
    const forward = applyTeamProgression({
      position: 'DEL',
      stats: { pac: 98, sho: 99, pas: 80, dri: 80, def: 40, phy: 70 },
      amount: 2,
    });
    const defender = applyTeamProgression({
      position: 'DEF',
      stats: { pac: 60, sho: 55, pas: 70, dri: 62, def: 98, phy: 98 },
      amount: 1,
    });

    expect(getProgressionStatKeys('DEL')).toEqual(['pac', 'sho', 'dri']);
    expect(forward.stats).toMatchObject({ pac: 99, sho: 99, dri: 82 });
    expect(forward.overall).toBeGreaterThanOrEqual(80);
    expect(defender.stats).toMatchObject({ def: 99, phy: 99, pas: 71 });
    expect(getCardTierByOverall(63)).toBe('bronze');
    expect(getCardTierByOverall(74)).toBe('silver');
    expect(getCardTierByOverall(84)).toBe('gold');
    expect(getCardTierByOverall(90)).toBe('premium_gold');
  });
});
