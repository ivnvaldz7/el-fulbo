import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { sendPushToUser } from '@/lib/services/push-sender.service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const EventIdSchema = z.string().uuid();

const CloseMvpSchema = z.object({
  tiebreakerPlayerId: z.string().uuid().nullable(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ eventId: string }> },
) {
  try {
    const params = await props.params;
    const eventIdResult = EventIdSchema.safeParse(params.eventId);

    if (!eventIdResult.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: 'eventId inválido.' },
        400,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: 'JSON malformado.' },
        400,
      );
    }

    const parsed = CloseMvpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.message },
        400,
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse(
        { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' },
        401,
      );
    }

    const eventId = eventIdResult.data;

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, group_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      return errorResponse(
        { code: 'EVENT_LOOKUP_FAILED', message: 'No se pudo obtener el evento.' },
        500,
      );
    }

    if (!event) {
      return errorResponse(
        { code: 'NOT_FOUND', message: 'El evento no existe.' },
        404,
      );
    }

    const { data: isAuthorized, error: authorizationError } = await supabase.rpc(
      'is_group_admin_or_owner',
      { gid: event.group_id },
    );

    if (authorizationError || !isAuthorized) {
      return errorResponse(
        { code: 'FORBIDDEN', message: 'No tenés permisos para cerrar la votación MVP.' },
        403,
      );
    }

    const { error: rpcError } = await supabase.rpc('close_mvp_voting', {
      p_event_id: eventId,
      p_tiebreaker_player_id: parsed.data.tiebreakerPlayerId,
    });

    if (rpcError) {
      return errorResponse(
        { code: 'RPC_ERROR', message: rpcError.message },
        rpcError.message === 'FORBIDDEN' ? 403 : 400,
      );
    }

    const { data: closedEvent } = await supabase
      .from('events')
      .select('mvp_player_id, group_id')
      .eq('id', eventId)
      .maybeSingle();

    if (closedEvent?.mvp_player_id && closedEvent?.group_id) {
      const { data: player } = await supabase
        .from('players')
        .select('user_id')
        .eq('id', closedEvent.mvp_player_id)
        .maybeSingle();

      if (player?.user_id) {
        const serviceSupabase = createServiceSupabaseClient();
        await sendPushToUser(serviceSupabase, player.user_id, {
          title: '¡Sos el MVP!',
          body: 'Te votaron como el mejor del partido.',
          url: `/groups/${closedEvent.group_id}/events/${eventId}`,
        });
      }
    }

    return successResponse({ closed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
