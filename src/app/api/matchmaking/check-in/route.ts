import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { PlayerId, MatchId, AppError } from '@/lib/types';
import { MatchmakingService } from '@/lib/services/matchmaking.service';
import { getIo } from '@/lib/socket'; // Import getIo

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const matchmakingService = new MatchmakingService(supabase);

  const { playerId, matchId }: { playerId: PlayerId; matchId: MatchId } = await request.json();

  if (!playerId || !matchId) {
    return NextResponse.json({ error: 'Missing playerId or matchId' }, { status: 400 });
  }

  try {
    const success = await matchmakingService.checkInPlayer(playerId, matchId);

    if (success) {
      const io = getIo(); // Get the global Socket.IO instance
      if (io) {
        // Emit an event to all connected clients
        io.emit('playerStatusUpdate', { playerId, matchId, status: 'checked-in' });
        console.log(`Emitted playerStatusUpdate for player ${playerId} in match ${matchId}`);
      } else {
        console.warn('Socket.IO server not initialized. Cannot broadcast player status.');
      }
      return NextResponse.json({ message: 'Player checked in successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to check in player' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error checking in player:', error);

    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const appError = error as AppError;
      let statusCode = 500;

      switch (appError.code) {
        case 'AUTHENTICATION_REQUIRED':
          statusCode = 401;
          break;
        case 'UNAUTHORIZED_PLAYER':
          statusCode = 403;
          break;
        case 'ATTENDANCE_RECORD_NOT_FOUND':
          statusCode = 404;
          break;
        case 'EVENT_NOT_CONFIRMING':
        case 'PLAYER_NOT_GOING':
        case 'ALREADY_CHECKED_IN':
          statusCode = 400;
          break;
        case 'CHECK_IN_CONFLICT':
          statusCode = 409;
          break;
        case 'DATABASE_UPDATE_FAILED':
          statusCode = 500;
          break;
        case 'FORBIDDEN':
          statusCode = 403;
          break;
        case 'UNAUTHORIZED':
          statusCode = 401;
          break;
        case 'CONFLICT':
          statusCode = 409;
          break;
        case 'NOT_FOUND':
          statusCode = 404;
          break;
        case 'VALIDATION_ERROR':
          statusCode = 400;
          break;
        default:
          statusCode = 500;
      }
      return NextResponse.json({ error: appError.message }, { status: statusCode });
    }

    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
