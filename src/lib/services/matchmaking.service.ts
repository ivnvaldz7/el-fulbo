import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types'; // Assuming this is globally available or generated
import { PlayerId, MatchId, EventId, EventStatus, AttendanceStatus, UserId, Player } from '@/lib/types';
import { mapSupabaseError, validationError } from '@/lib/services/errors'; // Import error utilities

const MINIMUM_PLAYERS_TO_DRAW = 10; // Default minimum players to automatically trigger a draw for an F5 match

// Define custom error messages for specific validation failures
const checkInErrorMessages = {
  AUTHENTICATION_REQUIRED: {
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication required to check in.',
  },
  UNAUTHORIZED_PLAYER: {
    code: 'UNAUTHORIZED_PLAYER',
    message: 'The provided player does not belong to the authenticated user.',
  },
  ATTENDANCE_RECORD_NOT_FOUND: {
    code: 'ATTENDANCE_RECORD_NOT_FOUND',
    message: 'Attendance record or event not found.',
  },
  EVENT_NOT_CONFIRMING: {
    code: 'EVENT_NOT_CONFIRMING',
    message: 'Event is not in a confirming state for check-in.',
  },
  PLAYER_NOT_GOING: {
    code: 'PLAYER_NOT_GOING',
    message: 'Player is not marked as "going" for this event.',
  },
  ALREADY_CHECKED_IN: {
    code: 'ALREADY_CHECKED_IN',
    message: 'Player is already checked in for this event.',
  },
  CHECK_IN_CONFLICT: {
    code: 'CHECK_IN_CONFLICT',
    message: 'Check-in failed due to a conflict. Player might already be checked in or attendance status changed.',
  },
  DATABASE_UPDATE_FAILED: {
    code: 'DATABASE_UPDATE_FAILED',
    message: 'Failed to update check-in status due to a database error.',
  },
  DRAW_TEAMS_FAILED: {
    code: 'DRAW_TEAMS_FAILED',
    message: 'Failed to draw teams after check-in.',
  },
  EVENT_ALREADY_DRAWN: {
    code: 'EVENT_ALREADY_DRAWN',
    message: 'Teams for this event have already been drawn.',
  },
  INSUFFICIENT_PLAYERS_FOR_DRAW: {
    code: 'INSUFFICIENT_PLAYERS_FOR_DRAW',
    message: 'Not enough players checked in to draw teams.',
  },
};


export class MatchmakingService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  // Generic transaction wrapper
  private async withTransaction<T>(
    operation: (transactionalSupabase: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    // Note: Supabase client itself doesn't directly expose transaction methods.
    // We're simulating transactions using custom RPC functions (start_transaction, commit_transaction, rollback_transaction)
    // which need to be defined in your Supabase database as PostgreSQL functions.
    // This approach assumes these functions exist and manage the session's transaction state.
    // For more robust transaction management in a Node.js environment with Supabase,
    // you might typically use a direct pg client or a library that offers connection pooling
    // and explicit transaction control, rather than relying solely on RPCs for transaction state.
    // However, for simplicity and adherence to the Supabase client structure, we proceed with RPCs.
    
    let result: T;
    try {
      // Start transaction
      const { data: startTxData, error: startTxError } = await this.supabase.rpc('start_transaction');
      if (startTxError) {
        console.error('Error starting transaction:', startTxError);
        throw mapSupabaseError(startTxError);
      }
      
      // Execute the operation
      result = await operation(this.supabase);

      // Commit transaction
      const { data: commitTxData, error: commitTxError } = await this.supabase.rpc('commit_transaction');
      if (commitTxError) {
        console.error('Error committing transaction:', commitTxError);
        throw mapSupabaseError(commitTxError);
      }
    } catch (error) {
      // Rollback transaction on error
      const { data: rollbackTxData, error: rollbackTxError } = await this.supabase.rpc('rollback_transaction');
      if (rollbackTxError) {
        console.error('Error rolling back transaction:', rollbackTxError);
        // At this point, the original error is more important, but we log the rollback error
      }
      throw error; // Re-throw the original error
    }
    return result;
  }

  async checkInPlayer(playerId: PlayerId, matchId: MatchId): Promise<boolean> {
    return this.withTransaction(async (transactionalSupabase) => {
      const eventId: EventId = matchId; // MatchId is EventId

      // 1. Retrieve User ID from session
      const { data: { user } } = await transactionalSupabase.auth.getUser();
      if (!user) {
        throw checkInErrorMessages.AUTHENTICATION_REQUIRED;
      }
      const userId: UserId = user.id;

      // 2. Validate playerId belongs to the authenticated user
      const { data: player, error: playerError } = await transactionalSupabase
        .from('players')
        .select('user_id')
        .eq('id', playerId)
        .single();

      if (playerError || !player || player.user_id !== userId) {
        throw checkInErrorMessages.UNAUTHORIZED_PLAYER;
      }

      // 3. Fetch Event and Attendance Data in a single query
      const { data: eventAndAttendance, error: fetchError } = await transactionalSupabase
        .from('event_attendances')
        .select(`
          *,
          events (status)
        `)
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .single();

      if (fetchError || !eventAndAttendance) {
        throw checkInErrorMessages.ATTENDANCE_RECORD_NOT_FOUND;
      }

      const eventStatus: EventStatus = eventAndAttendance.events?.status as EventStatus;
      const attendanceStatus: AttendanceStatus = eventAndAttendance.status as AttendanceStatus;
      const alreadyCheckedIn: boolean = eventAndAttendance.checked_in;

      // 4. Implement Validation Logic
      if (eventStatus !== 'confirming') {
        throw checkInErrorMessages.EVENT_NOT_CONFIRMING;
      }

      if (attendanceStatus !== 'going') {
        throw checkInErrorMessages.PLAYER_NOT_GOING;
      }

      if (alreadyCheckedIn) {
        throw checkInErrorMessages.ALREADY_CHECKED_IN;
      }

      // 5. Atomic Update with Concurrency Handling
      const { data, error } = await transactionalSupabase
        .from('event_attendances')
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .eq('checked_in', false) // Crucial for concurrency control
        .eq('status', 'going') // Another concurrency/validation control
        .select();

      if (error) {
        console.error('Error checking in player:', error);
        throw mapSupabaseError(error); // Map Supabase errors to AppError
      }

      if (!data || data.length === 0) {
        // This means a race condition occurred, or state changed after initial fetch
        throw checkInErrorMessages.CHECK_IN_CONFLICT;
      }

      if (data.length === 0) {
        throw checkInErrorMessages.CHECK_IN_CONFLICT;
      }

      // After successful check-in, check if conditions for drawing teams are met
      const eventDetails = await this.getEventDetails(eventId);

      if (eventDetails.eventStatus === 'drawn') {
        console.log(`Event ${eventId} already drawn. Skipping redraw.`);
        return true; // Already drawn, no need to proceed
      }

      // Trigger draw if enough players checked in and event is in 'confirming' state
      if (
        eventDetails.eventStatus === 'confirming' &&
        eventDetails.checkedInCount >= MINIMUM_PLAYERS_TO_DRAW
      ) {
        console.log(`Enough players (${eventDetails.checkedInCount}/${eventDetails.totalGoingPlayers}) checked in for event ${eventId}. Triggering draw.`);
        try {
          await this.drawTeams(eventId, transactionalSupabase);
          console.log(`Teams successfully drawn for event ${eventId}.`);
          // TODO: Emit a WebSocket event MATCH_TEAMS_ASSIGNED here
        } catch (drawError) {
          console.error(`Error drawing teams for event ${eventId}:`, drawError);
          throw checkInErrorMessages.DRAW_TEAMS_FAILED;
        }
      } else {
        console.log(`Event ${eventId} not ready for draw. Status: ${eventDetails.eventStatus}, Checked-in: ${eventDetails.checkedInCount}/${eventDetails.totalGoingPlayers}.`);
      }

      return true;
    });
  }

  // Helper to get comprehensive event details for matchmaking decisions
  private async getEventDetails(eventId: EventId, transactionalSupabase: SupabaseClient<Database>): Promise<{
    eventStatus: EventStatus;
    checkedInCount: number;
    totalGoingPlayers: number;
    modality: string; // Add modality to determine team size if needed later
  }> {
    const { data: event, error: eventError } = await transactionalSupabase
      .from('events')
      .select('status, modality')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw validationError('EVENT_NOT_FOUND', 'Event not found for details retrieval.');
    }

    const { count: checkedInCount, error: checkedInError } = await transactionalSupabase
      .from('event_attendances')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('checked_in', true);

    if (checkedInError) {
      throw mapSupabaseError(checkedInError);
    }

    const { count: totalGoingPlayers, error: goingPlayersError } = await transactionalSupabase
      .from('event_attendances')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('status', 'going'); // Only count players who committed to going

    if (goingPlayersError) {
      throw mapSupabaseError(goingPlayersError);
    }

    return {
      eventStatus: event.status as EventStatus,
      checkedInCount: checkedInCount ?? 0,
      totalGoingPlayers: totalGoingPlayers ?? 0,
      modality: event.modality // Pass modality for potential dynamic thresholding
    };
  }


  // Helper to get comprehensive event details for matchmaking decisions
  private async getEventDetails(eventId: EventId, transactionalSupabase: SupabaseClient<Database>): Promise<{
    eventStatus: EventStatus;
    checkedInCount: number;
    totalGoingPlayers: number;
    modality: string; // Add modality to determine team size if needed later
  }> {
    const { data: event, error: eventError } = await transactionalSupabase
      .from('events')
      .select('status, modality')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw validationError('EVENT_NOT_FOUND', 'Event not found for details retrieval.');
    }

    const { count: checkedInCount, error: checkedInError } = await transactionalSupabase
      .from('event_attendances')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('checked_in', true);

    if (checkedInError) {
      throw mapSupabaseError(checkedInError);
    }

    const { count: totalGoingPlayers, error: goingPlayersError } = await transactionalSupabase
      .from('event_attendances')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('status', 'going'); // Only count players who committed to going

    if (goingPlayersError) {
      throw mapSupabaseError(goingPlayersError);
    }

    return {
      eventStatus: event.status as EventStatus,
      checkedInCount: checkedInCount ?? 0,
      totalGoingPlayers: totalGoingPlayers ?? 0,
      modality: event.modality // Pass modality for potential dynamic thresholding
    };
  }


  async getCheckedInPlayers(eventId: EventId, transactionalSupabase: SupabaseClient<Database>): Promise<Player[]> {
    const { data, error } = await transactionalSupabase
      .from('event_attendances')
      .select(`
        player_id,
        players (
          id,
          user_id,
          group_id,
          display_name,
          photo_url,
          stats_status,
          primary_position, // Include primary_position
          secondary_position // Include secondary_position
        )
      `)
      .eq('event_id', eventId)
      .eq('checked_in', true);

    if (error) {
      console.error('Error fetching checked-in players:', error);
      throw mapSupabaseError(error);
    }

    if (!data) {
      return [];
    }

    // Filter out null players and map to Player interface
    const players: Player[] = data
      .map(attendance => attendance.players)
      .filter((player): player is Player => player !== null);

    return players;
  }

  async drawTeams(eventId: EventId, transactionalSupabase: SupabaseClient<Database>): Promise<{ team1: Player[], team2: Player[], substitutes: Player[] }> {
    const checkedInPlayers = await this.getCheckedInPlayers(eventId, transactionalSupabase);

    if (checkedInPlayers.length < 2) {
      throw validationError('INSUFFICIENT_PLAYERS', 'Not enough players checked in to draw teams.');
    }

    // Shuffle players randomly
    const shuffledPlayers = [...checkedInPlayers].sort(() => Math.random() - 0.5);

    const team1: Player[] = [];
    const team2: Player[] = [];
    const substitutes: Player[] = [];

    // Distribute players into two teams
    shuffledPlayers.forEach((player, index) => {
      if (index % 2 === 0) {
        team1.push(player);
      } else {
        team2.push(player);
      }
    });

    // Handle odd number of players
    if (team1.length > team2.length + 1) {
      // This case should ideally not happen with the current logic, but as a safeguard
      substitutes.push(team1.pop()!);
    } else if (team2.length > team1.length + 1) {
      // This case should ideally not happen with the current logic, but as a safeguard
      substitutes.push(team2.pop()!);
    }
    
    // If one team has one more player than the other, move the extra player to substitutes
    // This handles the case of an odd number of players
    if (Math.abs(team1.length - team2.length) === 1) {
        if (team1.length > team2.length) {
            substitutes.push(team1.pop()!);
        } else {
            substitutes.push(team2.pop()!);
        }
    }


    const drawnTeams = {
      team1: team1.map(p => ({ id: p.id, display_name: p.display_name, primary_position: p.primary_position })),
      team2: team2.map(p => ({ id: p.id, display_name: p.display_name, primary_position: p.primary_position })),
      substitutes: substitutes.map(p => ({ id: p.id, display_name: p.display_name, primary_position: p.primary_position })),
    };

    // 1. Update event status to 'drawn' and store team assignments
    const { error: updateEventError } = await transactionalSupabase
      .from('events')
      .update({ status: 'drawn', team_assignments: drawnTeams })
      .eq('id', eventId);

    if (updateEventError) {
      console.error('Error updating event status and team assignments:', updateEventError);
      throw mapSupabaseError(updateEventError);
    }

    // 2. Insert into match_participations table
    const participationsToInsert = [
      ...team1.map(player => ({
        event_id: eventId,
        player_id: player.id,
        team: 'A' as public.participation_team,
        assigned_position: player.primary_position || 'MED' as public.player_position, // Default to MED if not available
      })),
      ...team2.map(player => ({
        event_id: eventId,
        player_id: player.id,
        team: 'B' as public.participation_team,
        assigned_position: player.primary_position || 'MED' as public.player_position, // Default to MED if not available
      })),
      ...substitutes.map(player => ({
        event_id: eventId,
        player_id: player.id,
        team: 'substitute' as public.participation_team,
        assigned_position: null, // Substitutes don't have an assigned position initially
      })),
    ];

    const { error: insertParticipationsError } = await transactionalSupabase
      .from('match_participations')
      .insert(participationsToInsert);

    if (insertParticipationsError) {
      console.error('Error inserting match participations:', insertParticipationsError);
      throw mapSupabaseError(insertParticipationsError);
    }

    return { team1, team2, substitutes };
  }
}

