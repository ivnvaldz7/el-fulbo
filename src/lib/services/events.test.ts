
import { SupabaseClient } from '@supabase/supabase-js';
import { EventsService, RPC_CancelEventPayload } from './events.service'; // Adjust path if needed
import { EventId } from '@/lib/types';

describe('EventsService', () => {
  let supabase: jest.Mocked<SupabaseClient>;
  let eventsService: EventsService;

  beforeEach(() => {
    supabase = {
      rpc: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient>;
    eventsService = new EventsService(supabase);
  });

  describe('cancelEvent', () => {
    const mockEventId: EventId = 'some-event-id-123';
    const mockPayload: RPC_CancelEventPayload = {
      p_event_id: mockEventId,
      p_motive: 'User requested cancellation',
    };

    it('should call the cancel_event RPC with the correct payload', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await eventsService.cancelEvent(mockPayload);

      expect(supabase.rpc).toHaveBeenCalledWith('cancel_event', mockPayload);
    });

    it('should not throw an error if the RPC call is successful', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await expect(eventsService.cancelEvent(mockPayload)).resolves.toBeUndefined();
    });

    it('should throw an error if the RPC call fails', async () => {
      const mockError = new Error('Failed to cancel event');
      supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: mockError.message, code: '400', details: 'test', hint: 'test' } });

      await expect(eventsService.cancelEvent(mockPayload)).rejects.toThrow(mockError.message);
    });

    // In a real scenario, the status change and notification trigger would be handled by the 'cancel_event' RPC function in Supabase.
    // For unit tests of the service layer, we are primarily concerned with ensuring the correct interaction with Supabase.
    // Integration tests would verify the actual database state changes and notification system.
  });
});
