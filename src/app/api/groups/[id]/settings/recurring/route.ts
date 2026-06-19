import { createServerSupabaseClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import {
  getRecurringSchedules,
  createRecurringSchedule,
  deleteRecurringSchedule,
} from '@/lib/services/recurring-schedules.service';
import { computeNextOccurrence } from '@/lib/services/create-event-from-schedule';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const result = await getRecurringSchedules(supabase, params.id);

    if (!result.ok) return errorResponse(result.error, 400);
    return successResponse(result.data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await req.json();

    const result = await createRecurringSchedule(supabase, params.id, body);

    if (!result.ok) return errorResponse(result.error, 400);

    // Crear el evento inmediatamente usando el session del usuario autenticado
    // (que ya es admin/owner, verificado por la page de settings).
    // Usamos el RPC create_event que maneja permisos, inserción y notificaciones.
    let eventCreated = false;
    let eventError: string | null = null;

    if (result.data) {
      try {
        const { date: nextOccurrence, daysUntilEvent } = computeNextOccurrence(
          result.data.day_of_week,
          result.data.scheduled_time,
          new Date(),
        );

        if (daysUntilEvent <= result.data.days_ahead) {
          // Verificar duplicados en ventana de ±2 horas
          const windowStart = new Date(nextOccurrence.getTime() - 2 * 3600_000).toISOString();
          const windowEnd = new Date(nextOccurrence.getTime() + 2 * 3600_000).toISOString();

          const { count, error: countError } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', params.id)
            .gte('scheduled_at', windowStart)
            .lte('scheduled_at', windowEnd)
            .neq('status', 'cancelled');

          if (countError) {
            eventError = `Duplicate check failed: ${countError.message}`;
          } else if ((count ?? 0) === 0) {
            // Usar create_event RPC que:
            //   - Verifica is_group_admin OR is_group_owner
            //   - Valida scheduled_at >= now + 1h
            //   - Inserta el evento con auth.uid() como creador
            //   - Notifica a todos los jugadores aprobados
            const { error: rpcError } = await supabase.rpc('create_event', {
              p_group_id: params.id,
              p_modality: result.data.modality,
              p_field_name: result.data.field_name,
              p_field_maps_url: result.data.field_maps_url ?? null,
              p_scheduled_at: nextOccurrence.toISOString(),
              p_notes: result.data.notes ?? null,
            });

            if (rpcError) {
              eventError = `create_event RPC failed: ${rpcError.message}`;
            } else {
              eventCreated = true;
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        eventError = msg;
      }
    }

    return successResponse({ ...result.data, _eventCreated: eventCreated, _eventError: eventError });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('scheduleId');

    const result = await deleteRecurringSchedule(supabase, params.id, scheduleId ?? '');

    if (!result.ok) return errorResponse(result.error, 400);
    return successResponse({});
  } catch (err) {
    return handleApiError(err);
  }
}
