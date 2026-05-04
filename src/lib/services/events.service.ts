import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  AttendanceStatus,
  Event,
  EventId,
  EventStatus,
  GroupId,
  PlayerId,
  PlayerStatsStatus,
  UserId,
} from '@/lib/types';
import type {
  RPC_CancelEventPayload,
  RPC_CreateEventPayload,
  RPC_UpdateEventPayload,
} from '@/lib/types/events.types';

export interface EventAttendee {
  playerId: PlayerId;
  userId: UserId | null;
  displayName: string;
  photoUrl: string | null;
  joinedAt: string | null;
  status: AttendanceStatus;
  checkedIn: boolean;
  checkedInAt: string | null;
  statsStatus: PlayerStatsStatus;
}

export interface CurrentPlayerAttendanceContext {
  userId: UserId;
  playerId: PlayerId;
  displayName: string;
  statsStatus: PlayerStatsStatus;
  attendanceStatus: AttendanceStatus | null;
}

export class EventsService {
  constructor(private supabase: SupabaseClient) {}

  private throwIfError(error: { message?: string } | null) {
    if (error) {
      throw new Error(error.message ?? 'Algo salio mal.');
    }
  }

  private normalizeEvent(row: any): Event {
    return {
      id: row.id,
      group_id: row.group_id,
      modality: row.modality,
      field_name: row.field_name,
      field_maps_url: row.field_maps_url ?? null,
      scheduled_at: row.scheduled_at,
      status: row.status as EventStatus,
      team_a_name: row.team_a_name ?? 'Equipo A',
      team_b_name: row.team_b_name ?? 'Equipo B',
      team_a_score: row.team_a_score ?? null,
      team_b_score: row.team_b_score ?? null,
      mvp_player_id: row.mvp_player_id ?? null,
      draw_seed: row.draw_seed ?? null,
      created_by_user_id: row.created_by_user_id,
      drawn_by_user_id: row.drawn_by_user_id ?? null,
      played_at: row.played_at ?? null,
      notes: row.notes ?? null,
      cancellation_motive: row.cancellation_motive ?? null,
      cancelled_at: row.cancelled_at ?? null,
      team_assignments: row.team_assignments ?? null,
      title: row.field_name,
      date_time: row.scheduled_at,
      location: row.field_name,
      google_maps_link: row.field_maps_url ?? null,
    };
  }

  private normalizeAttendee(row: any): EventAttendee {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;

    return {
      playerId: player.id,
      userId: player.user_id ?? null,
      displayName: player.display_name,
      photoUrl: player.photo_url ?? null,
      joinedAt: player.joined_at ?? null,
      status: row.status as AttendanceStatus,
      checkedIn: Boolean(row.checked_in),
      checkedInAt: row.checked_in_at ?? null,
      statsStatus: player.stats_status as PlayerStatsStatus,
    };
  }

  private async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    this.throwIfError(error);
    return user;
  }

  async createEvent(payload: RPC_CreateEventPayload): Promise<EventId> {
    const rpcPayload = {
      p_group_id: payload.p_group_id,
      p_modality: payload.p_modality,
      p_field_name: payload.p_field_name ?? payload.p_location ?? payload.p_title ?? '',
      p_field_maps_url: payload.p_field_maps_url ?? null,
      p_scheduled_at: payload.p_scheduled_at ?? payload.p_date_time ?? '',
      p_notes: payload.p_notes ?? null,
    };

    const { data, error } = await this.supabase.rpc('create_event', rpcPayload);
    this.throwIfError(error);

    return data as EventId;
  }

  async updateEvent(payload: RPC_UpdateEventPayload): Promise<void> {
    const rpcPayload = {
      p_event_id: payload.p_event_id,
      p_modality: payload.p_modality ?? null,
      p_field_name: payload.p_field_name ?? payload.p_location ?? payload.p_title ?? null,
      p_field_maps_url: payload.p_field_maps_url ?? null,
      p_scheduled_at: payload.p_scheduled_at ?? payload.p_date_time ?? null,
      p_notes: payload.p_notes ?? null,
    };

    const { error } = await this.supabase.rpc('update_event', rpcPayload);
    this.throwIfError(error);
  }

  async cancelEvent(payload: RPC_CancelEventPayload): Promise<void> {
    const { error } = await this.supabase.rpc('cancel_event', {
      p_event_id: payload.p_event_id,
      p_motive: payload.p_motive ?? null,
    });
    this.throwIfError(error);
  }

  async getEventById(eventId: EventId): Promise<Event> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    this.throwIfError(error);
    return this.normalizeEvent(data);
  }

  async getEventAttendees(eventId: EventId): Promise<EventAttendee[]> {
    const { data, error } = await this.supabase
      .from('event_attendances')
      .select(
        `
          status,
          checked_in,
          checked_in_at,
          players!inner(
            id,
            user_id,
            display_name,
            photo_url,
            joined_at,
            stats_status
          )
        `,
      )
      .eq('event_id', eventId);

    this.throwIfError(error);

    return (data ?? [])
      .map((row) => this.normalizeAttendee(row))
      .filter((attendee) => attendee.statsStatus === 'approved')
      .sort((left, right) => {
        const byJoinedAt =
          (left.joinedAt ? Date.parse(left.joinedAt) : 0) -
          (right.joinedAt ? Date.parse(right.joinedAt) : 0);

        if (byJoinedAt !== 0) {
          return byJoinedAt;
        }

        return left.displayName.localeCompare(right.displayName, 'es');
      });
  }

  async getCurrentPlayerAttendanceContext(
    groupId: GroupId,
    eventId: EventId,
  ): Promise<CurrentPlayerAttendanceContext | null> {
    const user = await this.getCurrentUser();
    if (!user) {
      return null;
    }

    const { data: player, error: playerError } = await this.supabase
      .from('players')
      .select('id, user_id, display_name, stats_status')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .is('archived_at', null)
      .single();

    if (playerError) {
      if (playerError.code === 'PGRST116') {
        return null;
      }
      this.throwIfError(playerError);
    }

    const { data: attendance, error: attendanceError } = await this.supabase
      .from('event_attendances')
      .select('status')
      .eq('event_id', eventId)
      .eq('player_id', player.id)
      .maybeSingle();

    this.throwIfError(attendanceError);

    return {
      userId: player.user_id,
      playerId: player.id,
      displayName: player.display_name,
      statsStatus: player.stats_status as PlayerStatsStatus,
      attendanceStatus: (attendance?.status as AttendanceStatus | null) ?? null,
    };
  }

  async isCurrentUserAdminOrOwner(groupId: GroupId): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('is_group_admin_or_owner', {
      gid: groupId,
    });

    this.throwIfError(error);
    return Boolean(data);
  }

  async updateAttendance(input: { p_event_id: EventId; p_status: AttendanceStatus }): Promise<void> {
    const { error } = await this.supabase.rpc('update_attendance', {
      p_event_id: input.p_event_id,
      p_status: input.p_status,
    });

    this.throwIfError(error);
  }
}
