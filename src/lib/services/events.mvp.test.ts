import { describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('EventsService - MVP Voting', () => {
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

  it('closeMvpVoting calls rpc successfully', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as SupabaseClient;

    const service = new EventsService(client);
    const result = await service.closeMvpVoting('event-1', 'p1');

    expect(result.ok).toBe(true);
    expect(client.rpc).toHaveBeenCalledWith('close_mvp_voting', {
      p_event_id: 'event-1',
      p_tiebreaker_player_id: 'p1',
    });
  });
});
