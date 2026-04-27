import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createGroup } from './groups.service';

function supabaseWithRpc(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe('createGroup', () => {
  it('creates a group through the RPC', async () => {
    const supabase = supabaseWithRpc([{ group_id: '11111111-1111-4111-8111-111111111111' }]);

    const result = await createGroup(supabase, { name: ' Fulbito ', modality: 'F5' });

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('create_group', {
      p_name: 'Fulbito',
      p_modality: 'F5',
    });
  });

  it('returns validation error when name is empty', async () => {
    const result = await createGroup(supabaseWithRpc([]), { name: '   ', modality: 'F5' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error when name is longer than 40 chars', async () => {
    const result = await createGroup(supabaseWithRpc([]), {
      name: 'a'.repeat(41),
      modality: 'F5',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps admin group limit errors', async () => {
    const result = await createGroup(
      supabaseWithRpc(null, { message: 'ADMIN_GROUP_LIMIT_REACHED', code: '23514' }),
      { name: 'Fulbito', modality: 'F5' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ADMIN_GROUP_LIMIT_REACHED');
  });
});
