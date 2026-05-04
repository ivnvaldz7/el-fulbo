import { describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { RPC_CreateEventPayload, RPC_UpdateEventPayload, RPC_CancelEventPayload } from '../types/events.types';
import { Modality, UserId } from '../types';

describe('EventsService', () => {
  const mockRpc = vi.fn();
  const mockSupabase = {
    rpc: mockRpc,
  } as unknown as SupabaseClient;

  it('calls create_event RPC with correct payload and returns event ID', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'event-123', error: null });

    const payload: RPC_CreateEventPayload = {
      p_group_id: 'group-1',
      p_title: 'Test Event',
      p_date_time: '2026-05-10T20:00:00Z',
      p_location: 'Cancha 1',
      p_modality: 'F5',
      p_created_by: 'user-1',
    };

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent(payload);

    expect(mockRpc).toHaveBeenCalledWith('create_event', payload);
    expect(result).toBe('event-123');
  });

  it('handles optional google_maps_link and notes in create_event RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'event-456', error: null });

    const payload: RPC_CreateEventPayload = {
      p_group_id: 'group-2',
      p_title: 'Event with Optional Fields',
      p_date_time: '2026-06-01T10:00:00Z',
      p_location: 'Online',
      p_modality: 'Virtual' as Modality,
      p_created_by: 'user-2' as UserId,
      p_google_maps_link: 'https://maps.app.goo.gl/abcdefg',
      p_notes: 'Some additional notes for the event.',
    };

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent(payload);

    expect(mockRpc).toHaveBeenCalledWith('create_event', payload);
    expect(result).toBe('event-456');
  });

  it('throws an error if p_title is empty when creating an event', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'P_TITLE_EMPTY: Title cannot be empty' } });

    const payload: RPC_CreateEventPayload = {
      p_group_id: 'group-3',
      p_title: '',
      p_date_time: '2026-07-01T15:00:00Z',
      p_location: 'Some Location',
      p_modality: 'F7' as Modality,
      p_created_by: 'user-3' as UserId,
    };

    const service = new EventsService(mockSupabase);
    await expect(service.createEvent(payload)).rejects.toThrow('P_TITLE_EMPTY: Title cannot be empty');
  });

  it('throws an error if p_date_time is in the past when creating an event', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'P_DATE_TIME_PAST: Event date cannot be in the past' } });

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1); // Set to one year ago

    const payload: RPC_CreateEventPayload = {
      p_group_id: 'group-4',
      p_title: 'Event in the Past',
      p_date_time: pastDate.toISOString(),
      p_location: 'Historic Venue',
      p_modality: 'F11' as Modality,
      p_created_by: 'user-4' as UserId,
    };

    const service = new EventsService(mockSupabase);
    await expect(service.createEvent(payload)).rejects.toThrow('P_DATE_TIME_PAST: Event date cannot be in the past');
  });

  it('successfully creates an event with a future p_date_time', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'event-789', error: null });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // Set to one year from now

    const payload: RPC_CreateEventPayload = {
      p_group_id: 'group-5',
      p_title: 'Future Event',
      p_date_time: futureDate.toISOString(),
      p_location: 'Future Stadium',
      p_modality: 'Indoor' as Modality,
      p_created_by: 'user-5' as UserId,
    };

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent(payload);

    expect(mockRpc).toHaveBeenCalledWith('create_event', payload);
    expect(result).toBe('event-789');
  });

  it('throws an error if p_google_maps_link is malformed', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'P_GOOGLE_MAPS_LINK_INVALID: Google Maps link is malformed' } });

    const payload: RPC_CreateEventPayload = {
      p_group_id: 'group-6',
      p_title: 'Event with Bad Map Link',
      p_date_time: '2026-08-01T18:00:00Z',
      p_location: 'Invalid Link Location',
      p_modality: 'Beach' as Modality,
      p_created_by: 'user-6' as UserId,
      p_google_maps_link: 'not-a-valid-url',
    };

    const service = new EventsService(mockSupabase);
    await expect(service.createEvent(payload)).rejects.toThrow('P_GOOGLE_MAPS_LINK_INVALID: Google Maps link is malformed');
  });

  it('throws error if create_event RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    const payload: RPC_CreateEventPayload = {
      p_group_id: 'group-1',
      p_title: 'Test Event',
      p_date_time: '2026-05-10T20:00:00Z',
      p_location: 'Cancha 1',
      p_modality: 'F5',
      p_created_by: 'user-1',
    };

    const service = new EventsService(mockSupabase);
    await expect(service.createEvent(payload)).rejects.toThrow('Database error');
  });

  it('calls update_event RPC with correct payload', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const payload: RPC_UpdateEventPayload = {
      p_event_id: 'event-123',
      p_title: 'Updated Event',
      p_date_time: '2026-05-11T20:00:00Z',
      p_location: 'Cancha 2',
      p_modality: 'F5',
    };

    const service = new EventsService(mockSupabase);
    await service.updateEvent(payload);

    expect(mockRpc).toHaveBeenCalledWith('update_event', payload);
  });

  it('updates only p_title when other fields are omitted', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const payload: RPC_UpdateEventPayload = {
      p_event_id: 'event-123',
      p_title: 'Updated Title Only',
    };

    const service = new EventsService(mockSupabase);
    await service.updateEvent(payload);

    expect(mockRpc).toHaveBeenCalledWith('update_event', payload);
  });

  it('updates p_title and p_location when other fields are omitted', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const payload: RPC_UpdateEventPayload = {
      p_event_id: 'event-123',
      p_title: 'Updated Title and Location',
      p_location: 'New Location Address',
    };

    const service = new EventsService(mockSupabase);
    await service.updateEvent(payload);

    expect(mockRpc).toHaveBeenCalledWith('update_event', payload);
  });

  // Note on delivery_strategy and local database environment verification:
  // The 'delivery_strategy: auto-chain' and skipping of local database environment verification
  // are concerns handled by the 'update_event' RPC function definition on the Supabase database side,
  // not directly by the EventsService.updateEvent method or its payload in this application layer.
  // Therefore, these aspects are not directly testable in these unit tests, which focus
  // on the correct payload being sent to the RPC.

});
