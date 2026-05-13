import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { respondTemporaryOwnerInvite, runTemporaryOwnerJobs } from './temporary-owners.service';

function supabaseWithRpc(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe('temporary owner jobs', () => {
  it('runs automation through the RPC', async () => {
    const supabase = supabaseWithRpc({ designated: 2, expired: 1 });
    const result = await runTemporaryOwnerJobs(supabase);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ designated: 2, expired: 1 });
    }
    expect(supabase.rpc).toHaveBeenCalledWith('process_temporary_owner_jobs');
  });

  it('responds to a temporary owner invite through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await respondTemporaryOwnerInvite(supabase, {
      eventId: '11111111-1111-4111-8111-111111111111',
      accept: true,
    });

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('respond_temporary_owner_invite', {
      p_event_id: '11111111-1111-4111-8111-111111111111',
      p_accept: true,
    });
  });
});
