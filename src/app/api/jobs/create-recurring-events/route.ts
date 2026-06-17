import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { successResponse, cronAuthError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  const supabase = createServiceSupabaseClient();
  const now = new Date();
  const errors: { scheduleId: string; error: string }[] = [];
  let created = 0;

  const { data: schedules, error: scheduleError } = await supabase
    .from('group_recurring_schedules')
    .select('*, groups(admin_user_id)')
    .eq('active', true);

  if (scheduleError) {
    return NextResponse.json(
      { ok: false, error: { code: 'DB_ERROR', message: scheduleError.message }, errors: [] },
      { status: 500 }
    );
  }

  if (!schedules?.length) {
    return successResponse({ created: 0, errors: [] });
  }

  for (const schedule of schedules) {
    try {
      const dayOfWeek = schedule.day_of_week as number;
      const parts = (schedule.scheduled_time as string).split(':').map(Number);
      const argHours = parts[0] ?? 0;
      const minutes = parts[1] ?? 0;

      // scheduled_time se guarda en hora Argentina (UTC-3).
      // El cron corre en UTC, así que convertimos sumando 3h.
      const utcHours = (argHours + 3) % 24;
      const extraDays = argHours + 3 >= 24 ? 1 : 0;

      const daysUntil = (dayOfWeek - now.getUTCDay() + 7) % 7 || 7;

      const nextOccurrence = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + daysUntil + extraDays,
          utcHours,
          minutes,
          0,
        ),
      );

      const daysUntilEvent = (nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilEvent > (schedule.days_ahead as number)) continue;

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
        errors.push({ scheduleId: schedule.id, error: `Count query failed: ${countError.message}` });
        continue;
      }

      if ((count ?? 0) > 0) continue;

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
          created_by_user_id: (schedule as any).groups.admin_user_id,
          team_a_name: 'Equipo A',
          team_b_name: 'Equipo B',
        })
        .select('id')
        .single();

      if (insertError || !eventRow) {
        errors.push({ scheduleId: schedule.id, error: insertError?.message ?? 'Insert failed' });
        continue;
      }

      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('user_id')
        .eq('group_id', schedule.group_id)
        .eq('stats_status', 'approved')
        .is('archived_at', null)
        .not('user_id', 'is', null);

      if (playersError) {
        errors.push({ scheduleId: schedule.id, error: `Players query failed: ${playersError.message}` });
        continue;
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
          errors.push({ scheduleId: schedule.id, error: `Notification insert failed: ${notifError.message}` });
          continue;
        }
      }

      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ scheduleId: schedule.id, error: message });
    }
  }

  return successResponse({ created, errors, total_schedules: schedules.length });
}
