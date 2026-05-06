import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EventsService } from './events.service';
import type { LoadMatchResultPayload } from '../types/events.types';

describe('EventsService.loadMatchResult', () => {
  it('calls load_match_result RPC with correct payload', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    const payload: LoadMatchResultPayload = {
      eventId: 'event-888',
      teamAScore: 4,
      teamBScore: 2,
      mvpPlayerId: 'player-999',
      notes: 'Partidazo.',
    };

    await new EventsService(supabase).loadMatchResult(payload);

    expect(rpc).toHaveBeenCalledWith('load_match_result', {
      p_event_id: 'event-888',
      p_team_a_score: 4,
      p_team_b_score: 2,
      p_mvp_player_id: 'player-999',
      p_notes: 'Partidazo.',
    });
  });
});
