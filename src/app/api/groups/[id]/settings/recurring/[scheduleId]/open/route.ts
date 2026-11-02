import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { tryCreateEventFromSchedule } from '@/lib/services/create-event-from-schedule';
import { errorResponse, successResponse } from '@/lib/api-helpers';

const paramsSchema = z.object({ groupId: z.string().uuid(), scheduleId: z.string().uuid() });

export async function POST(_: Request, props: { params: Promise<{ id: string; scheduleId: string }> }) {
  const rawParams = await props.params;
  const params = paramsSchema.safeParse({ groupId: rawParams.id, scheduleId: rawParams.scheduleId });
  if (!params.success) return errorResponse({ code: 'VALIDATION_ERROR', message: 'Datos inválidos.' }, 400);

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse({ code: 'UNAUTHORIZED', message: 'Necesitás iniciar sesión.' }, 401);

  const { data: authorized } = await supabase.rpc('is_group_admin_or_owner', { gid: params.data.groupId });
  if (!authorized) return errorResponse({ code: 'FORBIDDEN', message: 'No tenés permisos para abrir la convocatoria.' }, 403);

  const { data: schedule, error: scheduleError } = await supabase
    .from('group_recurring_schedules')
    .select('*')
    .eq('id', params.data.scheduleId)
    .eq('group_id', params.data.groupId)
    .eq('active', true)
    .maybeSingle();

  if (scheduleError || !schedule) {
    return errorResponse({ code: 'NOT_FOUND', message: 'No encontramos ese partido fijo.' }, 404);
  }

  const result = await tryCreateEventFromSchedule(createServiceSupabaseClient(), schedule, new Date(), true);
  if (result.error || !result.eventId) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: result.error ?? 'No pudimos abrir la convocatoria.' }, 500);
  }

  return successResponse({ eventId: result.eventId, created: result.created });
}
