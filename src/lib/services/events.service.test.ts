import { describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { RPC_CreateEventPayload, RPC_UpdateEventPayload } from '../types/events.types';
import { Modality, UserId } from '../types';

describe('EventsService', () => {
  const mockRpc = vi.fn();
  const mockSupabase = {
    rpc: mockRpc,
  } as unknown as SupabaseClient;

  it('calls create_event RPC with correct payload and returns event ID', async () => {
    mockRpc.mockResolvedValueOnce({ data: '11111111-1111-1111-1111-111111111111', error: null });

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent({
      p_group_id: '22222222-2222-2222-2222-222222222222',
      p_date_time: '2026-05-10T20:00:00Z',
      p_location: 'Cancha 1',
      p_modality: 'F5',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_event', {
      p_group_id: '22222222-2222-2222-2222-222222222222',
      p_modality: 'F5',
      p_field_name: 'Cancha 1',
      p_field_maps_url: null,
      p_scheduled_at: '2026-05-10T20:00:00Z',
      p_notes: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('handles optional notes in create_event RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: '11111111-1111-1111-1111-111111111112', error: null });

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent({
      p_group_id: '22222222-2222-2222-2222-222222222222',
      p_date_time: '2026-06-01T10:00:00Z',
      p_location: 'Online',
      p_modality: 'F11',
      p_notes: 'Some additional notes for the event.',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_event', {
      p_group_id: '22222222-2222-2222-2222-222222222222',
      p_modality: 'F11',
      p_field_name: 'Online',
      p_field_maps_url: null,
      p_scheduled_at: '2026-06-01T10:00:00Z',
      p_notes: 'Some additional notes for the event.',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('11111111-1111-1111-1111-111111111112');
  });

  it('returns error when p_title is empty', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'P_TITLE_EMPTY: Title cannot be empty' } });

    const payload: RPC_CreateEventPayload = {
      p_group_id: '22222222-2222-2222-2222-222222222223',
      p_title: '',
      p_date_time: '2026-07-01T15:00:00Z',
      p_location: 'Some Location',
      p_modality: 'F7' as Modality,
      p_created_by: '44444444-4444-4444-4444-444444444443' as UserId,
    };

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Algo salio mal.');
  });

  it('returns error when p_date_time is in the past', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'P_DATE_TIME_PAST: Event date cannot be in the past' } });

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const payload: RPC_CreateEventPayload = {
      p_group_id: '22222222-2222-2222-2222-222222222224',
      p_title: 'Event in the Past',
      p_date_time: pastDate.toISOString(),
      p_location: 'Historic Venue',
      p_modality: 'F11' as Modality,
      p_created_by: '44444444-4444-4444-4444-444444444444' as UserId,
    };

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Algo salio mal.');
  });

  it('successfully creates an event with a future p_date_time', async () => {
    mockRpc.mockResolvedValueOnce({ data: '11111111-1111-1111-1111-111111111113', error: null });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent({
      p_group_id: '55555555-5555-5555-5555-555555555555',
      p_date_time: futureDate.toISOString(),
      p_location: 'Future Stadium',
      p_modality: 'F8',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_event', {
      p_group_id: '55555555-5555-5555-5555-555555555555',
      p_modality: 'F8',
      p_field_name: 'Future Stadium',
      p_field_maps_url: null,
      p_scheduled_at: futureDate.toISOString(),
      p_notes: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('11111111-1111-1111-1111-111111111113');
  });

  it('returns error when p_google_maps_link is malformed', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'P_GOOGLE_MAPS_LINK_INVALID: Google Maps link is malformed' } });

    const payload: RPC_CreateEventPayload = {
      p_group_id: '22222222-2222-2222-2222-222222222226',
      p_title: 'Event with Bad Map Link',
      p_date_time: '2026-08-01T18:00:00Z',
      p_location: 'Invalid Link Location',
      p_modality: 'F8' as Modality,
      p_created_by: '44444444-4444-4444-4444-444444444446' as UserId,
      p_field_maps_url: 'not-a-valid-url',
    };

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Datos de evento inválidos');
  });

  it('returns error when create_event RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    const payload: RPC_CreateEventPayload = {
      p_group_id: '22222222-2222-2222-2222-222222222222',
      p_title: 'Test Event',
      p_date_time: '2026-05-10T20:00:00Z',
      p_location: 'Cancha 1',
      p_modality: 'F5',
      p_created_by: '44444444-4444-4444-4444-444444444441',
    };

    const service = new EventsService(mockSupabase);
    const result = await service.createEvent(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Algo salio mal.');
  });

  it('calls update_event RPC with correct transformed payload', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const service = new EventsService(mockSupabase);
    await service.updateEvent({
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_date_time: '2026-05-11T20:00:00Z',
      p_location: 'Cancha 2',
      p_modality: 'F5',
    });

    expect(mockRpc).toHaveBeenCalledWith('update_event', {
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_modality: 'F5',
      p_field_name: 'Cancha 2',
      p_field_maps_url: null,
      p_scheduled_at: '2026-05-11T20:00:00Z',
      p_notes: null,
    });
  });

  it('updates only field_name when other fields are omitted', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const service = new EventsService(mockSupabase);
    await service.updateEvent({
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_field_name: 'Updated Title Only',
    });

    expect(mockRpc).toHaveBeenCalledWith('update_event', {
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_modality: null,
      p_field_name: 'Updated Title Only',
      p_field_maps_url: null,
      p_scheduled_at: null,
      p_notes: null,
    });
  });

  it('updates field_name with p_location when p_field_name is omitted', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const service = new EventsService(mockSupabase);
    await service.updateEvent({
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_location: 'New Location Address',
    });

    expect(mockRpc).toHaveBeenCalledWith('update_event', {
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_modality: null,
      p_field_name: 'New Location Address',
      p_field_maps_url: null,
      p_scheduled_at: null,
      p_notes: null,
    });
  });

  it('accepts maybe as an attendance status', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const service = new EventsService(mockSupabase);
    const result = await service.updateAttendance({
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_status: 'maybe',
    });

    expect(mockRpc).toHaveBeenLastCalledWith('update_attendance', {
      p_event_id: '11111111-1111-1111-1111-111111111111',
      p_status: 'maybe',
    });
    expect(result.ok).toBe(true);
  });

  // Note on delivery_strategy and local database environment verification:
  // The 'delivery_strategy: auto-chain' and skipping of local database environment verification
  // are concerns handled by the 'update_event' RPC function definition on the Supabase database side,
  // not directly by the EventsService.updateEvent method or its payload in this application layer.
  // Therefore, these aspects are not directly testable in these unit tests, which focus
  // on the correct payload being sent to the RPC.

});
