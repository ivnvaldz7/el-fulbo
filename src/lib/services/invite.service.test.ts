import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createReintegrationRequest, reactivatePlayer, resolveInviteState } from './invite.service';

function supabaseWithRpc(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe('resolveInviteState', () => {
  it('maps anonymous invite preview', async () => {
    const supabase = supabaseWithRpc({
      valid: true,
      group: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Fulbo del martes',
        default_modality: 'F5',
        logo_url: null,
        admin_name: 'Iván',
        active_players_count: 8,
      },
      user_status: 'anonymous',
    });

    const result = await resolveInviteState(supabase, 'FULBO-ABC123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        kind: 'anonymous',
        preview: {
          groupName: 'Fulbo del martes',
          adminName: 'Iván',
          activePlayers: 8,
        },
      });
    }
  });

  it('maps archived invite state', async () => {
    const supabase = supabaseWithRpc({
      valid: false,
      reason: 'archived',
      group: { name: 'Grupo viejo' },
    });

    const result = await resolveInviteState(supabase, 'FULBO-ABC123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        kind: 'archived',
        groupName: 'Grupo viejo',
      });
    }
  });

  it('maps active members to a redirectable state', async () => {
    const supabase = supabaseWithRpc({
      valid: true,
      group: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Fulbo del martes',
        default_modality: 'F5',
        logo_url: null,
        admin_name: 'Iván',
        active_players_count: 8,
      },
      user_status: 'active_member',
    });

    const result = await resolveInviteState(supabase, 'FULBO-ABC123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        kind: 'active_member',
        groupId: '11111111-1111-4111-8111-111111111111',
      });
    }
  });

  it('maps invalid invite codes returned by the RPC', async () => {
    const supabase = supabaseWithRpc({
      valid: false,
      reason: 'not_found',
    });

    const result = await resolveInviteState(supabase, 'FULBO-ABC123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ kind: 'invalid' });
    }
  });

  it('maps voluntary returners with archived player preview', async () => {
    const supabase = supabaseWithRpc({
      valid: true,
      group: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Fulbo del martes',
        default_modality: 'F5',
        logo_url: null,
        admin_name: 'Iván',
        active_players_count: 8,
      },
      user_status: 'voluntary_returner',
      extras: {
        archived_player: {
          id: '22222222-2222-4222-8222-222222222222',
          display_name: 'Tomi',
          primary_position: 'MED',
          secondary_position: 'DEF',
          stats: { pac: 6, sho: 5, pas: 7, dri: 6, def: 5, phy: 5 },
          stats_status: 'approved',
          archived_at: '2026-04-01T12:00:00.000Z',
        },
      },
    });

    const result = await resolveInviteState(supabase, 'FULBO-ABC123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        kind: 'voluntary_returner',
        archivedPlayer: {
          displayName: 'Tomi',
          primaryPosition: 'MED',
        },
      });
    }
  });

  it('maps expelled cooldown state', async () => {
    const supabase = supabaseWithRpc({
      valid: true,
      group: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Fulbo del martes',
        default_modality: 'F5',
        logo_url: null,
        admin_name: 'Iván',
        active_players_count: 8,
      },
      user_status: 'expelled_cooldown',
      extras: {
        cooldown_expires_at: '2026-05-30T12:00:00.000Z',
        last_rejection_at: '2026-04-30T12:00:00.000Z',
        last_rejection_note: 'Todavía no.',
      },
    });

    const result = await resolveInviteState(supabase, 'FULBO-ABC123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        kind: 'expelled_cooldown',
        cooldown: {
          lastRejectionNote: 'Todavía no.',
        },
      });
    }
  });
});

describe('reactivatePlayer', () => {
  it('calls the reactivation RPC', async () => {
    const supabase = supabaseWithRpc('11111111-1111-4111-8111-111111111111');

    const result = await reactivatePlayer(supabase, '22222222-2222-4222-8222-222222222222');

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('reactivate_player', {
      p_player_id: '22222222-2222-4222-8222-222222222222',
    });
  });
});

describe('createReintegrationRequest', () => {
  it('calls the reintegration RPC with sanitized payload', async () => {
    const supabase = supabaseWithRpc('33333333-3333-4333-8333-333333333333');

    const result = await createReintegrationRequest(supabase, {
      inviteCode: 'FULBO-ABC123',
      message: '  Quiero volver  ',
    });

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('create_reintegration_request', {
      p_invite_code: 'FULBO-ABC123',
      p_message: 'Quiero volver',
    });
  });

  it('returns validation error when the message is too long', async () => {
    const result = await createReintegrationRequest(supabaseWithRpc(null), {
      inviteCode: 'FULBO-ABC123',
      message: 'a'.repeat(201),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});
