import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { assignOwner, getOwnersSettingsData, removeOwner } from './owners.service';

function supabaseWithRpc(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe('owners mutations', () => {
  it('assigns an owner through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await assignOwner(supabase, {
      groupId: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
    });

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('assign_owner', {
      p_group_id: '11111111-1111-4111-8111-111111111111',
      p_user_id: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('removes an owner through the RPC', async () => {
    const supabase = supabaseWithRpc(null);
    const result = await removeOwner(supabase, {
      groupId: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
    });

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('remove_owner', {
      p_group_id: '11111111-1111-4111-8111-111111111111',
      p_user_id: '22222222-2222-4222-8222-222222222222',
    });
  });
});

describe('getOwnersSettingsData', () => {
  it('maps owners and filters out admin/current owners from candidates', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn((table: string) => {
        if (table === 'groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: '11111111-1111-4111-8111-111111111111',
                    name: 'Fulbito',
                    admin_user_id: 'admin-1',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'group_memberships') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        user_id: 'owner-1',
                        assigned_at: '2026-05-06T00:00:00.000Z',
                        users: { display_name: 'Juan', photo_url: null },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        { user_id: 'admin-1', display_name: 'Admin', photo_url: null },
                        { user_id: 'owner-1', display_name: 'Juan', photo_url: null },
                        { user_id: 'player-1', display_name: 'Pedro', photo_url: null },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn>; from: ReturnType<typeof vi.fn> };

    const result = await getOwnersSettingsData(supabase, '11111111-1111-4111-8111-111111111111');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.groupName).toBe('Fulbito');
      expect(result.data.owners).toHaveLength(1);
      expect(result.data.owners[0]?.displayName).toBe('Juan');
      expect(result.data.candidates).toEqual([
        {
          userId: 'player-1',
          displayName: 'Pedro',
          photoUrl: null,
        },
      ]);
    }
  });
});
