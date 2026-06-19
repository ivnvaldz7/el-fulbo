import { describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service';
import type { EventId } from '@/lib/types';
import type { RPC_CancelEventPayload } from '@/lib/types/events.types';

function mockSupabase(rpcResult: { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  };
}

describe('EventsService.cancelEvent', () => {
  const mockEventId: EventId = '11111111-1111-1111-1111-111111111111';
  const mockPayload: RPC_CancelEventPayload = {
    p_event_id: mockEventId,
    p_motive: 'User requested cancellation',
  };

  it('calls cancel_event RPC with correct payload', async () => {
    const supabase = mockSupabase({ data: null, error: null });
    const service = new EventsService(supabase as never);
    const result = await service.cancelEvent(mockPayload);
    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_event', mockPayload);
  });

  it('returns ok on success', async () => {
    const supabase = mockSupabase({ data: null, error: null });
    const service = new EventsService(supabase as never);
    const result = await service.cancelEvent(mockPayload);
    expect(result.ok).toBe(true);
  });

  it('returns error when RPC fails', async () => {
    const supabase = mockSupabase({
      data: null,
      error: { message: 'Failed to cancel event', code: '400', details: '', hint: '' },
    });
    const service = new EventsService(supabase as never);
    const result = await service.cancelEvent(mockPayload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toBe('Algo salio mal.');
    }
  });
});
