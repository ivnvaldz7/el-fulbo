import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { submitOnboardingStats } from './onboarding.service';

function supabaseWithRpc(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe('submitOnboardingStats', () => {
  const groupId = '11111111-1111-4111-8111-111111111111';

  it('submits field stats through the RPC', async () => {
    const supabase = supabaseWithRpc([
      { player_id: '00000000-0000-0000-0000-000000000010', status: 'pending_approval' },
    ]);

    const result = await submitOnboardingStats(supabase, {
      groupId,
      primaryPosition: 'MED',
      secondaryPosition: 'DEL',
      stats: { pac: 5, sho: 6, pas: 7, dri: 8, def: 4, phy: 5 },
    });

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('submit_onboarding_stats', {
      p_group_id: groupId,
      p_primary_position: 'MED',
      p_secondary_position: 'DEL',
      p_stats: { pac: 5, sho: 6, pas: 7, dri: 8, def: 4, phy: 5 },
    });
  });

  it('submits goalkeeper stats through the RPC', async () => {
    const supabase = supabaseWithRpc([
      { player_id: '00000000-0000-0000-0000-000000000010', status: 'pending_approval' },
    ]);

    const result = await submitOnboardingStats(supabase, {
      groupId,
      primaryPosition: 'ARQ',
      secondaryPosition: null,
      stats: { div: 5, han: 6, kic: 5, ref: 8, spd: 4, pos: 7 },
    });

    expect(result.ok).toBe(true);
  });

  it('returns validation error when ARQ receives field stats', async () => {
    const result = await submitOnboardingStats(supabaseWithRpc([]), {
      groupId,
      primaryPosition: 'ARQ',
      secondaryPosition: null,
      stats: { pac: 5, sho: 6, pas: 7, dri: 8, def: 4, phy: 5 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error when a stat exceeds max 99', async () => {
    const result = await submitOnboardingStats(supabaseWithRpc([]), {
      groupId,
      primaryPosition: 'MED',
      secondaryPosition: null,
      stats: { pac: 100, sho: 6, pas: 7, dri: 8, def: 4, phy: 5 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error when secondary equals primary', async () => {
    const result = await submitOnboardingStats(supabaseWithRpc([]), {
      groupId,
      primaryPosition: 'MED',
      secondaryPosition: 'MED',
      stats: { pac: 5, sho: 6, pas: 7, dri: 8, def: 4, phy: 5 },
    });

    expect(result.ok).toBe(false);
  });
});
