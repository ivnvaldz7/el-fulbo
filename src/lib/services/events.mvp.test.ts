import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/services/push-sender.service', () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

describe('EventsService - MVP Voting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('getMvpVotes returns sorted vote counts', async () => {
    const mockData = [
      { voted_player_id: 'p1' },
      { voted_player_id: 'p2' },
      { voted_player_id: 'p1' },
      { voted_player_id: 'p3' },
    ];

    const client = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as unknown as SupabaseClient;

    const service = new EventsService(client);
    const result = await service.getMvpVotes('event-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        { playerId: 'p1', votes: 2 },
        { playerId: 'p2', votes: 1 },
        { playerId: 'p3', votes: 1 },
      ]);
    }
  });

  it('closeMvpVoting calls rpc and sends push to winner', async () => {
    const { sendPushToUser } = await import('@/lib/services/push-sender.service');

    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    } as unknown as SupabaseClient & { single: ReturnType<typeof vi.fn> };

    vi.mocked(client.single)
      .mockResolvedValueOnce({ data: { mvp_player_id: 'p1', group_id: 'g1' }, error: null })
      .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null });

    const service = new EventsService(client);
    const result = await service.closeMvpVoting('event-1', 'p1');

    expect(result.ok).toBe(true);
    expect(client.rpc).toHaveBeenCalledWith('close_mvp_voting', {
      p_event_id: 'event-1',
      p_tiebreaker_player_id: 'p1',
    });
    expect(sendPushToUser).toHaveBeenCalledWith(client, 'user-1', {
      title: '¡Sos el MVP!',
      body: 'Te votaron como el mejor del partido.',
      url: '/groups/g1/events/event-1',
    });
  });

  it('closeMvpVoting does not push when rpc fails', async () => {
    const { sendPushToUser } = await import('@/lib/services/push-sender.service');

    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('EMPATE') }),
    } as unknown as SupabaseClient;

    const service = new EventsService(client);
    const result = await service.closeMvpVoting('event-1', null);

    expect(result.ok).toBe(false);
    expect(sendPushToUser).not.toHaveBeenCalled();
  });
});
