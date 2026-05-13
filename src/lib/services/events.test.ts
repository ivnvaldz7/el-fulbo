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
  const mockEventId: EventId = 'some-event-id-123';
  const mockPayload: RPC_CancelEventPayload = {
    p_event_id: mockEventId,
    p_motive: 'User requested cancellation',
  };

  it('calls cancel_event RPC with correct payload', async () => {
    const supabase = mockSupabase({ data: null, error: null });
    const service = new EventsService(supabase as never);
    await service.cancelEvent(mockPayload);
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_event', mockPayload);
  });

  it('resolves without throwing on success', async () => {
    const supabase = mockSupabase({ data: null, error: null });
    const service = new EventsService(supabase as never);
    await expect(service.cancelEvent(mockPayload)).resolves.toBeUndefined();
  });

  it('throws when RPC returns an error', async () => {
    const supabase = mockSupabase({
      data: null,
      error: { message: 'Failed to cancel event', code: '400', details: '', hint: '' },
    });
    const service = new EventsService(supabase as never);
    await expect(service.cancelEvent(mockPayload)).rejects.toThrow('Failed to cancel event');
  });
});
