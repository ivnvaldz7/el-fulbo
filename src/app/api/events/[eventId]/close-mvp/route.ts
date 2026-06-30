import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { sendPushToUser } from '@/lib/services/push-sender.service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const CloseMvpSchema = z.object({
  tiebreakerPlayerId: z.string().nullable(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ eventId: string }> },
) {
  try {
    const params = await props.params;
    const body = await request.json();
    const parsed = CloseMvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const supabase = createServiceSupabaseClient();

    const { error: rpcError } = await supabase.rpc('close_mvp_voting', {
      p_event_id: params.eventId,
      p_tiebreaker_player_id: parsed.data.tiebreakerPlayerId,
    });

    if (rpcError) {
      return errorResponse(
        { code: 'RPC_ERROR', message: rpcError.message },
        400,
      );
    }

    const { data: event } = await supabase
      .from('events')
      .select('mvp_player_id, group_id')
      .eq('id', params.eventId)
      .single();

    if (event?.mvp_player_id && event?.group_id) {
      const { data: player } = await supabase
        .from('players')
        .select('user_id')
        .eq('id', event.mvp_player_id)
        .single();

      if (player?.user_id) {
        await sendPushToUser(supabase, player.user_id, {
          title: '¡Sos el MVP!',
          body: 'Te votaron como el mejor del partido.',
          url: `/groups/${event.group_id}/events/${params.eventId}`,
        });
      }
    }

    return successResponse({ closed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
