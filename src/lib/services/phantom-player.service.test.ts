import { describe, it, expect, vi } from 'vitest';
import {
  createPhantomPlayer,
  getPendingPhantoms,
  archivePhantomPlayer,
  deletePhantomPlayer,
  initiateConversion,
  completeConversion,
} from './phantom-player.service';

function makeRpc(data: unknown = null, error: unknown = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

function makeFrom(data: unknown[] = [], error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error }),
    single: vi.fn().mockResolvedValue({ data: null, error }),
  };
  chain.order = vi.fn().mockResolvedValue({ data, error });
  return vi.fn(() => chain);
}

describe('createPhantomPlayer', () => {
  it('calls create_phantom_player rpc and returns player id', async () => {
    const rpc = makeRpc('player-uuid-123');
    const supabase = { rpc };

    const result = await createPhantomPlayer(supabase as never, {
      groupId: 'g1',
      eventId: 'e1',
      name: 'Juan',
      primaryPosition: 'MED',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('player-uuid-123');
    expect(rpc).toHaveBeenCalledWith('create_phantom_player', {
      p_group_id: 'g1',
      p_event_id: 'e1',
      p_name: 'Juan',
      p_primary_position: 'MED',
    });
  });

  it('returns error when rpc fails (e.g. FORBIDDEN)', async () => {
    const rpc = makeRpc(null, { message: 'FORBIDDEN', code: '42501' });
    const supabase = { rpc };
    const result = await createPhantomPlayer(supabase as never, {
      groupId: 'g1',
      eventId: 'e1',
      name: 'Juan',
      primaryPosition: 'DEF',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('returns error when player group limit reached', async () => {
    const rpc = makeRpc(null, { message: 'PLAYER_GROUP_LIMIT_REACHED', code: '23514' });
    const supabase = { rpc };
    const result = await createPhantomPlayer(supabase as never, {
      groupId: 'g1',
      eventId: 'e1',
      name: 'Juan',
      primaryPosition: 'ARQ',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PLAYER_GROUP_LIMIT_REACHED');
  });
});

describe('getPendingPhantoms', () => {
  it('returns empty array when no phantoms', async () => {
    const from = makeFrom([]);
    const result = await getPendingPhantoms({ from } as never, 'g1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it('maps phantom rows correctly', async () => {
    const rows = [
      { id: 'p1', display_name: 'Toto', primary_position: 'DEL', joined_at: '2026-05-01T00:00:00Z', group_id: 'g1' },
    ];
    const from = makeFrom(rows);
    const result = await getPendingPhantoms({ from } as never, 'g1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0]!.displayName).toBe('Toto');
      expect(result.data[0]!.primaryPosition).toBe('DEL');
    }
  });
});

describe('archivePhantomPlayer', () => {
  it('calls archive_phantom_player rpc', async () => {
    const rpc = makeRpc();
    await archivePhantomPlayer({ rpc } as never, 'p1');
    expect(rpc).toHaveBeenCalledWith('archive_phantom_player', { p_player_id: 'p1' });
  });

  it('returns error when rpc fails', async () => {
    const rpc = makeRpc(null, { message: 'FORBIDDEN', code: '42501' });
    const result = await archivePhantomPlayer({ rpc } as never, 'p1');
    expect(result.ok).toBe(false);
  });
});

describe('deletePhantomPlayer', () => {
  it('calls delete_phantom_player rpc', async () => {
    const rpc = makeRpc();
    await deletePhantomPlayer({ rpc } as never, 'p1');
    expect(rpc).toHaveBeenCalledWith('delete_phantom_player', { p_player_id: 'p1' });
  });
});

describe('initiateConversion', () => {
  it('calls initiate_phantom_conversion rpc and returns token', async () => {
    const rpc = makeRpc('abc123token');
    const result = await initiateConversion({ rpc } as never, {
      playerId: 'p1',
      email: 'test@example.com',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.token).toBe('abc123token');
  });

  it('returns error when player not found', async () => {
    const rpc = makeRpc(null, { message: 'NOT_FOUND', code: 'PGRST116' });
    const result = await initiateConversion({ rpc } as never, {
      playerId: 'p1',
      email: 'test@example.com',
    });
    expect(result.ok).toBe(false);
  });
});

describe('completeConversion', () => {
  it('calls complete_phantom_conversion rpc', async () => {
    const rpc = makeRpc();
    const result = await completeConversion({ rpc } as never, 'token-abc');
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('complete_phantom_conversion', { p_token: 'token-abc' });
  });

  it('returns TOKEN_INVALID_OR_EXPIRED when rpc raises that error', async () => {
    const rpc = makeRpc(null, { message: 'TOKEN_INVALID_OR_EXPIRED', code: 'P0001' });
    const result = await completeConversion({ rpc } as never, 'bad-token');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('TOKEN_INVALID_OR_EXPIRED');
  });
});
