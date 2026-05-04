import type { EventId, GroupId, Modality, UserId } from '@/lib/types';

export type EventModality = Modality;

export interface RPC_CreateEventPayload {
  p_group_id: GroupId;
  p_modality: EventModality;
  p_field_name?: string;
  p_field_maps_url?: string | null;
  p_scheduled_at?: string;
  p_notes?: string | null;
  p_title?: string;
  p_date_time?: string;
  p_location?: string;
  p_created_by?: UserId;
}

export interface RPC_UpdateEventPayload {
  p_event_id: EventId;
  p_modality?: EventModality | null;
  p_field_name?: string | null;
  p_field_maps_url?: string | null;
  p_scheduled_at?: string | null;
  p_notes?: string | null;
  p_title?: string | null;
  p_date_time?: string | null;
  p_location?: string | null;
}

export interface RPC_CancelEventPayload {
  p_event_id: EventId;
  p_motive?: string | null;
}
