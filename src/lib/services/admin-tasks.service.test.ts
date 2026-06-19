import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  approveInitialStats,
  approveReintegrationRequest,
  approveStatRevision,
  getAdminTasksDetail,
  getPendingTasksSummary,
  rejectInitialStats,
  rejectReintegrationRequest,
  rejectStatRevision,
} from './admin-tasks.service';

function supabaseWithRpc(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe('getPendingTasksSummary', () => {
  it('maps the admin summary from the RPC', async () => {
    const supabase = supabaseWithRpc([
      {
        cards_new: 2,
        revisions: 1,
        reintegrations: 3,
        total: 6,
      },
    ]);

    const result = await getPendingTasksSummary(supabase, '11111111-1111-4111-8111-111111111111');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        cardsNew: 2,
        revisions: 1,
        reintegrations: 3,
        total: 6,
      });
    }
  });
});

describe('getAdminTasksDetail', () => {
  it('maps the admin tasks detail payload', async () => {
    const supabase = supabaseWithRpc({
      cards_new: [
        {
          player_id: '111',
          player_name: 'Tomi',
          created_at: '2026-05-01T10:00:00.000Z',
          overdue: false,
        },
      ],
      revisions: [
        {
          request_id: '222',
          player_id: '111',
          player_name: 'Tomi',
          created_at: '2026-04-20T10:00:00.000Z',
          overdue: true,
        },
      ],
      reintegrations: [],
    });

    const result = await getAdminTasksDetail(supabase, '11111111-1111-4111-8111-111111111111');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cardsNew[0]).toEqual({
        id: '111',
        playerId: '111',
        playerName: 'Tomi',
        createdAt: '2026-05-01T10:00:00.000Z',
        overdue: false,
      });
      expect(result.data.revisions[0]).toEqual({
        id: '222',
        playerId: '111',
        playerName: 'Tomi',
        createdAt: '2026-04-20T10:00:00.000Z',
        overdue: true,
      });
    }
  });
});

describe('admin task mutations', () => {
  it('approves initial stats through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await approveInitialStats(supabase, '33333333-3333-3333-3333-333333333333');

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('approve_initial_stats', { p_player_id: '33333333-3333-3333-3333-333333333333' });
  });

  it('rejects initial stats through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await rejectInitialStats(supabase, '33333333-3333-3333-3333-333333333333', 'Volvé a cargarla');

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('reject_initial_stats', {
      p_player_id: '33333333-3333-3333-3333-333333333333',
      p_note: 'Volvé a cargarla',
    });
  });

  it('approves revisions through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await approveStatRevision(supabase, '11111111-1111-1111-1111-111111111111');

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('approve_stat_revision', { p_request_id: '11111111-1111-1111-1111-111111111111' });
  });

  it('rejects revisions through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await rejectStatRevision(supabase, '11111111-1111-1111-1111-111111111111', null);

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('reject_stat_revision', {
      p_request_id: '11111111-1111-1111-1111-111111111111',
      p_note: null,
    });
  });

  it('approves reintegrations through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await approveReintegrationRequest(supabase, '99999999-9999-9999-9999-999999999991');

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('approve_reintegration_request', {
      p_request_id: '99999999-9999-9999-9999-999999999991',
    });
  });

  it('rejects reintegrations through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await rejectReintegrationRequest(supabase, '99999999-9999-9999-9999-999999999991', 'Esperá un poco');

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('reject_reintegration_request', {
      p_request_id: '99999999-9999-9999-9999-999999999991',
      p_note: 'Esperá un poco',
    });
  });
});
