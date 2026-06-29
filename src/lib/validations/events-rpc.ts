import { z } from 'zod';

export const createEventRpcSchema = z.object({
  p_group_id: z.string().uuid(),
  p_modality: z.enum(['F5', 'F6', 'F7', 'F8', 'F9', 'F11']),
  p_field_name: z.string().optional(),
  p_location: z.string().optional(),
  p_title: z.string().optional(),
  p_field_maps_url: z.string().url().optional().nullable(),
  p_scheduled_at: z.string().optional(),
  p_date_time: z.string().optional(),
  p_notes: z.string().max(1000).optional().nullable(),
});

export const updateEventRpcSchema = z.object({
  p_event_id: z.string().uuid(),
  p_modality: z.enum(['F5', 'F6', 'F7', 'F8', 'F9', 'F11']).optional().nullable(),
  p_field_name: z.string().optional().nullable(),
  p_location: z.string().optional().nullable(),
  p_title: z.string().optional().nullable(),
  p_field_maps_url: z.string().url().optional().nullable(),
  p_scheduled_at: z.string().optional().nullable(),
  p_date_time: z.string().optional().nullable(),
  p_notes: z.string().max(1000).optional().nullable(),
});

export const cancelEventRpcSchema = z.object({
  p_event_id: z.string().uuid(),
  p_motive: z.string().max(500).optional().nullable(),
});

export const updateAttendanceSchema = z.object({
  p_event_id: z.string().uuid(),
  p_status: z.enum(['going', 'not_going', 'pending']),
});

export const updateCheckInSchema = z.object({
  eventId: z.string().uuid(),
  playerId: z.string().uuid(),
  checkedIn: z.boolean(),
});

export const loadMatchResultSchema = z.object({
  eventId: z.string().uuid(),
  teamAScore: z.number().min(0).max(100),
  teamBScore: z.number().min(0).max(100),
  mvpPlayerId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
