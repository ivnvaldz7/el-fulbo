import { describe, it, expect, vi } from 'vitest';
import {
  syncPlayerStatsPropagation,
  syncAllPendingStats,
} from './player.service';

function makeRpc(data: unknown = null, error: unknown = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

describe('syncPlayerStatsPropagation', () => {
  it('calls propagate_player_stats rpc and returns success', async () => {
    const rpc = makeRpc();
    const supabase = { rpc };

    const result = await syncPlayerStatsPropagation(
      supabase as never,
      '33333333-3333-3333-3333-333333333333',
    );

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('propagate_player_stats', {
      p_player_id: '33333333-3333-3333-3333-333333333333',
    });
  });

  it('returns error when rpc fails', async () => {
    const rpc = makeRpc(null, { message: 'GROUP_NOT_LEGITIMATE', code: '23514' });
    const supabase = { rpc };

    const result = await syncPlayerStatsPropagation(
      supabase as never,
      '33333333-3333-3333-3333-333333333333',
    );

    expect(result.ok).toBe(false);
  });
});

describe('syncAllPendingStats', () => {
  it('calls sync_pending_stats_propagation rpc and returns success', async () => {
    const rpc = makeRpc();
    const supabase = { rpc };

    const result = await syncAllPendingStats(supabase as never);

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('sync_pending_stats_propagation');
  });

  it('returns error when rpc fails', async () => {
    const rpc = makeRpc(null, { message: 'DB error', code: 'XX000' });
    const supabase = { rpc };

    const result = await syncAllPendingStats(supabase as never);

    expect(result.ok).toBe(false);
  });
});
