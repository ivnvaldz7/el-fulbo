import type {
  DrawAssignment,
  EventId,
  GroupId,
  Modality,
  PlayerId,
  UserId,
} from '@/lib/types';

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

export interface UpdateCheckInPayload {
  eventId: EventId;
  playerId: PlayerId;
  checkedIn: boolean;
}

export interface ConfirmDrawPayload {
  eventId: EventId;
  seed: string;
  assignments: DrawAssignment[];
  teamAName: string;
  teamBName: string;
}

export interface LoadMatchResultPayload {
  eventId: EventId;
  teamAScore: number;
  teamBScore: number;
  mvpPlayerId: PlayerId;
  notes: string | null;
}
