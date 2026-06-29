import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AttendanceStatus,
  DrawAssignment,
  Event,
  EventId,
  EventStatus,
  GroupId,
  PlayerId,
  PlayerForDraw,
  PlayerStatsStatus,
  Result,
  UserId,
} from '@/lib/types';
import type {
  ConfirmDrawPayload,
  LoadMatchResultPayload,
  RPC_CancelEventPayload,
  RPC_CreateEventPayload,
  RPC_UpdateEventPayload,
  UpdateCheckInPayload,
} from '@/lib/types/events.types';
import { mapSupabaseError } from '@/lib/services/errors';
import {
  createEventRpcSchema,
  updateEventRpcSchema,
  cancelEventRpcSchema,
  updateAttendanceSchema,
  updateCheckInSchema,
  loadMatchResultSchema,
} from '@/lib/validations/events-rpc';

export interface EventAttendee {
  playerId: PlayerId;
  userId: UserId | null;
  displayName: string;
  photoUrl: string | null;
  joinedAt: string | null;
  primaryPosition: string | null;
  status: AttendanceStatus;
  checkedIn: boolean;
  checkedInAt: string | null;
  statsStatus: PlayerStatsStatus;
  isPhantom: boolean;
}

export interface CurrentPlayerAttendanceContext {
  userId: UserId;
  playerId: PlayerId;
  displayName: string;
  statsStatus: PlayerStatsStatus;
  attendanceStatus: AttendanceStatus | null;
}

export interface DrawTeamSummary {
  name: string;
  overallAvg: number;
  players: Array<{
    playerId: PlayerId;
    displayName: string;
    assignedPosition: string | null;
    playedPrimaryPosition: boolean;
  }>;
}

export interface PlayedMatchSummaryItem {
  playerId: PlayerId;
  displayName: string;
  team: 'A' | 'B';
  assignedPosition: string | null;
  playedPrimaryPosition: boolean;
  boostApplied: Record<string, number> | null;
  boostReason: string | null;
  isMvp: boolean;
}

export class EventsService {
  constructor(private supabase: SupabaseClient) {}

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
      primaryPosition: player.primary_position ?? null,
      status: row.status as AttendanceStatus,
      checkedIn: Boolean(row.checked_in),
      checkedInAt: row.checked_in_at ?? null,
      statsStatus: player.stats_status as PlayerStatsStatus,
      isPhantom: Boolean(player.is_phantom),
    };
  }

  async createEvent(payload: RPC_CreateEventPayload): Promise<Result<EventId>> {
    const parsed = createEventRpcSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos de evento inválidos' } };

    const rpcPayload = {
      p_group_id: payload.p_group_id,
      p_modality: payload.p_modality,
      p_field_name: payload.p_field_name ?? payload.p_location ?? payload.p_title ?? '',
      p_field_maps_url: payload.p_field_maps_url ?? null,
      p_scheduled_at: payload.p_scheduled_at ?? payload.p_date_time ?? '',
      p_notes: payload.p_notes ?? null,
    };

    const { data, error } = await this.supabase.rpc('create_event', rpcPayload);
    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: data as EventId };
  }

  async updateEvent(payload: RPC_UpdateEventPayload): Promise<Result<void>> {
    const parsed = updateEventRpcSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos de evento inválidos' } };

    const rpcPayload = {
      p_event_id: payload.p_event_id,
      p_modality: payload.p_modality ?? null,
      p_field_name: payload.p_field_name ?? payload.p_location ?? payload.p_title ?? null,
      p_field_maps_url: payload.p_field_maps_url ?? null,
      p_scheduled_at: payload.p_scheduled_at ?? payload.p_date_time ?? null,
      p_notes: payload.p_notes ?? null,
    };

    const { error } = await this.supabase.rpc('update_event', rpcPayload);
    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async cancelEvent(payload: RPC_CancelEventPayload): Promise<Result<void>> {
    const parsed = cancelEventRpcSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' } };

    const { error } = await this.supabase.rpc('cancel_event', {
      p_event_id: payload.p_event_id,
      p_motive: payload.p_motive ?? null,
    });
    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async getEventById(eventId: EventId): Promise<Result<Event>> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: this.normalizeEvent(data) };
  }

  async getEventAttendees(eventId: EventId): Promise<Result<EventAttendee[]>> {
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
            primary_position,
            stats_status,
            is_phantom
          )
        `,
      )
      .eq('event_id', eventId);

    if (error) return { ok: false, error: mapSupabaseError(error) };

    const attendees = (data ?? [])
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

    return { ok: true, data: attendees };
  }

  async getDrawPlayers(eventId: EventId): Promise<Result<PlayerForDraw[]>> {
    const { data, error } = await this.supabase
      .from('event_attendances')
      .select(
        `
          checked_in,
          checked_in_at,
          players!inner(
            id,
            display_name,
            primary_position,
            secondary_position,
            stats,
            current_boost,
            is_phantom,
            joined_at,
            stats_status
          )
        `,
      )
      .eq('event_id', eventId)
      .eq('checked_in', true);

    if (error) return { ok: false, error: mapSupabaseError(error) };

    const players = (data ?? [])
      .map((row) => {
        const player = Array.isArray(row.players) ? row.players[0] : row.players;
        if (!player || player.stats_status !== 'approved') {
          return null;
        }

        return {
          id: player.id,
          display_name: player.display_name,
          primary_position: player.primary_position,
          secondary_position: player.secondary_position ?? null,
          stats: player.stats,
          current_boost: player.current_boost ?? null,
          is_phantom: Boolean(player.is_phantom),
          joined_at: player.joined_at ?? null,
        } as PlayerForDraw;
      })
      .filter(Boolean) as PlayerForDraw[];

    return { ok: true, data: players };
  }

  async getCurrentPlayerAttendanceContext(
    groupId: GroupId,
    eventId: EventId,
  ): Promise<Result<CurrentPlayerAttendanceContext | null>> {
    const {
      data: { user },
      error: userError,
    } = await this.supabase.auth.getUser();

    if (userError) return { ok: false, error: mapSupabaseError(userError) };
    if (!user) return { ok: true, data: null };

    const { data: player, error: playerError } = await this.supabase
      .from('players')
      .select('id, user_id, display_name, stats_status')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle();

    if (playerError) {
      if (playerError.code === 'PGRST116') {
        return { ok: true, data: null };
      }
      return { ok: false, error: mapSupabaseError(playerError) };
    }

    if (!player) return { ok: true, data: null };

    const { data: attendance, error: attendanceError } = await this.supabase
      .from('event_attendances')
      .select('status')
      .eq('event_id', eventId)
      .eq('player_id', player.id)
      .maybeSingle();

    if (attendanceError) return { ok: false, error: mapSupabaseError(attendanceError) };

    return {
      ok: true,
      data: {
        userId: player.user_id,
        playerId: player.id,
        displayName: player.display_name,
        statsStatus: player.stats_status as PlayerStatsStatus,
        attendanceStatus: (attendance?.status as AttendanceStatus | null) ?? null,
      },
    };
  }

  async isCurrentUserAdminOrOwner(groupId: GroupId): Promise<Result<boolean>> {
    const { data, error } = await this.supabase.rpc('is_group_admin_or_owner', {
      gid: groupId,
    });

    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: Boolean(data) };
  }

  async updateAttendance(input: { p_event_id: EventId; p_status: AttendanceStatus }): Promise<Result<void>> {
    const parsed = updateAttendanceSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' } };

    const { error } = await this.supabase.rpc('update_attendance', {
      p_event_id: input.p_event_id,
      p_status: input.p_status,
    });

    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async updateCheckIn(input: UpdateCheckInPayload): Promise<Result<void>> {
    const parsed = updateCheckInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' } };

    const payload = {
      checked_in: input.checkedIn,
      checked_in_at: input.checkedIn ? new Date().toISOString() : null,
    };

    const { error } = await this.supabase
      .from('event_attendances')
      .update(payload)
      .eq('event_id', input.eventId)
      .eq('player_id', input.playerId)
      .eq('status', 'going');

    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async markAllGoingCheckedIn(eventId: EventId): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('event_attendances')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('status', 'going')
      .eq('checked_in', false);

    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async updateEventStatus(eventId: EventId, status: EventStatus): Promise<Result<void>> {
    const { error } = await this.supabase.from('events').update({ status }).eq('id', eventId);
    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async confirmDraw(payload: ConfirmDrawPayload): Promise<Result<void>> {
    const { error } = await this.supabase.rpc('confirm_draw', {
      p_event_id: payload.eventId,
      p_seed: payload.seed,
      p_assignments: payload.assignments as unknown as DrawAssignment[],
      p_team_a_name: payload.teamAName,
      p_team_b_name: payload.teamBName,
    });

    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async loadMatchResult(payload: LoadMatchResultPayload): Promise<Result<void>> {
    const parsed = loadMatchResultSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' } };

    const { error } = await this.supabase.rpc('load_match_result', {
      p_event_id: payload.eventId,
      p_team_a_score: payload.teamAScore,
      p_team_b_score: payload.teamBScore,
      p_mvp_player_id: payload.mvpPlayerId,
      p_notes: payload.notes,
    });

    if (error) return { ok: false, error: mapSupabaseError(error) };

    return { ok: true, data: undefined };
  }

  async getTeamsSummary(eventId: EventId): Promise<Result<DrawTeamSummary[]>> {
    const eventResult = await this.getEventById(eventId);
    if (!eventResult.ok) return eventResult;

    const event = eventResult.data;

    const { data, error } = await this.supabase
      .from('match_participations')
      .select(
        `
          player_id,
          team,
          assigned_position,
          played_primary_position,
          players!inner(display_name)
        `,
      )
      .eq('event_id', eventId)
      .neq('team', 'substitute');

    if (error) return { ok: false, error: mapSupabaseError(error) };

    const teams = new Map<'A' | 'B', DrawTeamSummary>([
      [
        'A',
        {
          name: event.team_a_name ?? 'Equipo A',
          overallAvg: 0,
          players: [],
        },
      ],
      [
        'B',
        {
          name: event.team_b_name ?? 'Equipo B',
          overallAvg: 0,
          players: [],
        },
      ],
    ]);

    (data ?? []).forEach((row: any) => {
      if (row.team !== 'A' && row.team !== 'B') {
        return;
      }

      const target = teams.get(row.team);
      if (!target) {
        return;
      }

      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      target.players.push({
        playerId: row.player_id,
        displayName: player?.display_name ?? 'Jugador',
        assignedPosition: row.assigned_position ?? null,
        playedPrimaryPosition: Boolean(row.played_primary_position),
      });
    });

    return { ok: true, data: [...teams.values()] };
  }

  async getPlayedMatchSummary(eventId: EventId): Promise<Result<PlayedMatchSummaryItem[]>> {
    const eventResult = await this.getEventById(eventId);
    if (!eventResult.ok) return eventResult;

    const event = eventResult.data;

    const { data, error } = await this.supabase
      .from('match_participations')
      .select(
        `
          player_id,
          team,
          assigned_position,
          played_primary_position,
          boost_applied,
          players!inner(display_name)
        `,
      )
      .eq('event_id', eventId)
      .in('team', ['A', 'B']);

    if (error) return { ok: false, error: mapSupabaseError(error) };

    const summary = (data ?? []).map((row: any) => {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      const boostApplied = row.boost_applied ?? null;

      return {
        playerId: row.player_id,
        displayName: player?.display_name ?? 'Jugador',
        team: row.team,
        assignedPosition: row.assigned_position ?? null,
        playedPrimaryPosition: Boolean(row.played_primary_position),
        boostApplied: boostApplied?.modifiers ?? null,
        boostReason: boostApplied?.reason ?? null,
        isMvp: row.player_id === event.mvp_player_id,
      } satisfies PlayedMatchSummaryItem;
    });

    return { ok: true, data: summary };
  }

  async getMvpVotes(eventId: string): Promise<Result<{ playerId: string; votes: number }[]>> {
    const { data, error } = await this.supabase
      .from('event_mvp_votes')
      .select('voted_player_id')
      .eq('event_id', eventId);

    if (error) return { ok: false, error: mapSupabaseError(error) };

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.voted_player_id] = (counts[row.voted_player_id] || 0) + 1;
    }

    const summary = Object.entries(counts).map(([playerId, votes]) => ({ playerId, votes }));
    summary.sort((a, b) => b.votes - a.votes);

    return { ok: true, data: summary };
  }

  async closeMvpVoting(eventId: string, tiebreakerPlayerId: string | null = null): Promise<Result<void>> {
    const { error } = await this.supabase.rpc('close_mvp_voting', {
      p_event_id: eventId,
      p_tiebreaker_player_id: tiebreakerPlayerId,
    });

    if (error) return { ok: false, error: mapSupabaseError(error) };
    return { ok: true, data: undefined };
  }
}
