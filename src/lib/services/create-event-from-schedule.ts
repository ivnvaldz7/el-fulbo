import type { SupabaseClient } from '@supabase/supabase-js';

export interface ScheduleData {
  id: string;
  group_id: string;
  day_of_week: number;
  scheduled_time: string;
  field_name: string;
  field_maps_url: string | null;
  modality: string;
  notes: string | null;
  days_ahead: number;
}

export interface TryCreateEventResult {
  created: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Calcula la próxima ocurrencia de un schedule recurrente.
 *
 * scheduled_time y day_of_week están en hora Argentina (UTC-3).
 * La función devuelve la ocurrencia como Date (en UTC) y cuántos días
 * faltan desde `now` hasta esa ocurrencia.
 *
 * ⚠️ REGLA DE ORO: todo el cálculo se hace en hora Argentina (restamos 3h
 * a `now`), y al final se convierte a UTC sumando 3h a la hora resultante.
 * Esto evita bugs cuando Argentina y UTC están en distinto día (entre las
 * 21:00 y 23:59 Arg, UTC ya es el día siguiente).
 */
export function computeNextOccurrence(
  dayOfWeek: number,
  scheduledTime: string,
  now: Date,
): { date: Date; daysUntilEvent: number } {
  const [schedHour = 0, schedMin = 0] = scheduledTime.split(':').map(Number);

  // 1. Hora actual en Argentina (restamos 3h a now)
  const argNow = new Date(now.getTime() - 3 * 3600_000);
  const argYear = argNow.getUTCFullYear();
  const argMonth = argNow.getUTCMonth();
  const argDay = argNow.getUTCDate();
  const argCurrDayOfWeek = argNow.getUTCDay();
  const argCurrTotalMin = argNow.getUTCHours() * 60 + argNow.getUTCMinutes();

  // 2. Días hasta el próximo día objetivo
  let daysUntil = (dayOfWeek - argCurrDayOfWeek + 7) % 7;

  // 3. Si es hoy, verificar si la hora ya pasó
  if (daysUntil === 0) {
    const schedTotalMin = schedHour * 60 + schedMin;
    if (schedTotalMin < argCurrTotalMin) {
      daysUntil = 7; // Ya pasó → próxima semana
    }
  }

  // 4. Construir la fecha en UTC directo: Argentina → UTC = hora + 3
  //    Date.UTC auto-normaliza horas > 23 al día siguiente.
  const nextUtcDate = new Date(
    Date.UTC(argYear, argMonth, argDay + daysUntil, schedHour + 3, schedMin, 0),
  );

  const daysUntilEvent = (nextUtcDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return { date: nextUtcDate, daysUntilEvent };
}

/**
 * Intenta crear un evento a partir de un schedule recurrente si está dentro
 * de la ventana de days_ahead y no existe un evento duplicado.
 *
 * Usa un supabase client con service_role (bypass RLS).
 */
export async function tryCreateEventFromSchedule(
  supabase: SupabaseClient,
  schedule: ScheduleData,
  adminUserId: string,
  now: Date = new Date(),
): Promise<TryCreateEventResult> {
  const { date: nextOccurrence, daysUntilEvent } = computeNextOccurrence(
    schedule.day_of_week,
    schedule.scheduled_time,
    now,
  );

  // Si el evento está más allá de days_ahead, saltear
  if (daysUntilEvent > schedule.days_ahead) {
    return { created: false };
  }

  // Verificar duplicados en ventana de ±2 horas
  const windowStart = new Date(nextOccurrence.getTime() - 2 * 3600_000).toISOString();
  const windowEnd = new Date(nextOccurrence.getTime() + 2 * 3600_000).toISOString();

  const { count, error: countError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', schedule.group_id)
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
    .neq('status', 'cancelled');

  if (countError) {
    return { created: false, error: `Count query failed: ${countError.message}` };
  }

  if ((count ?? 0) > 0) {
    return { created: false };
  }

  // Crear el evento
  const { data: eventRow, error: insertError } = await supabase
    .from('events')
    .insert({
      group_id: schedule.group_id,
      modality: schedule.modality,
      field_name: schedule.field_name,
      field_maps_url: schedule.field_maps_url ?? null,
      scheduled_at: nextOccurrence.toISOString(),
      notes: schedule.notes ?? null,
      status: 'scheduled',
      created_by_user_id: adminUserId,
      team_a_name: 'Equipo A',
      team_b_name: 'Equipo B',
    })
    .select('id')
    .single();

  if (insertError || !eventRow) {
    return { created: false, error: insertError?.message ?? 'Insert failed' };
  }

  // Notificar a jugadores aprobados
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('user_id')
    .eq('group_id', schedule.group_id)
    .eq('stats_status', 'approved')
    .is('archived_at', null)
    .not('user_id', 'is', null);

  if (playersError) {
    return { created: false, error: `Players query failed: ${playersError.message}` };
  }

  if (players?.length) {
    const { error: notifError } = await supabase.from('notifications').insert(
      players.map((p) => ({
        user_id: p.user_id,
        type: 'event_created',
        payload: {
          event_id: eventRow.id,
          group_id: schedule.group_id,
          field_name: schedule.field_name,
          scheduled_at: nextOccurrence.toISOString(),
          is_recurring: true,
        },
      })),
    );

    if (notifError) {
      return { created: false, error: `Notification insert failed: ${notifError.message}` };
    }
  }

  return { created: true, eventId: eventRow.id };
}
