import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { successResponse, cronAuthError } from '@/lib/api-helpers';
import { tryCreateEventFromSchedule } from '@/lib/services/create-event-from-schedule';

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
    .select('*, groups!inner(admin_user_id, archived_at)')
    .eq('active', true)
    .is('groups.archived_at', null);

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
      const adminUserId = (schedule as any).groups?.admin_user_id as string;
      if (!adminUserId) {
        errors.push({ scheduleId: schedule.id, error: 'admin_user_id not found' });
        continue;
      }

      const result = await tryCreateEventFromSchedule(supabase, schedule, adminUserId, now);

      if (result.error) {
        errors.push({ scheduleId: schedule.id, error: result.error });
        continue;
      }

      if (result.created) {
        created++;
      }

      if (result.created) {
        created++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ scheduleId: schedule.id, error: message });
    }
  }

  return successResponse({ created, errors, total_schedules: schedules.length });
}
