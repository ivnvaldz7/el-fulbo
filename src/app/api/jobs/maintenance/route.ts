import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { successResponse, cronAuthError } from '@/lib/api-helpers';
import { tryCreateEventFromSchedule } from '@/lib/services/create-event-from-schedule';
import { sendPushToUser } from '@/lib/services/push-sender.service';
import { dispatchAttendanceChangedPushes, dispatchEventCreatedPushes } from '@/lib/services/push-dispatcher.service';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  const supabase = createServiceSupabaseClient();
  const now = new Date();
  const errors: string[] = [];

  // Phase 1: Create events from recurring schedules
  const createdResult = await createFromSchedules(supabase, now, errors);

  // Phase 2: Transition scheduled to confirming (24-48h window)
  const transitionResult = await transitionEvents(supabase, now, errors);

  // Phase 3: Send push reminders to unconfirmed players (0-24h window)
  const reminderResult = await sendReminders(supabase, now, errors);
  const pushDispatchResult = await dispatchEventCreatedPushesSafely(supabase, errors);
  const attendanceChangedPushDispatchResult = await dispatchAttendanceChangedPushesSafely(supabase, errors);

  return successResponse({
    eventsCreated: createdResult,
    eventsTransitioned: transitionResult,
    remindersSent: reminderResult,
    eventCreatedPushDispatch: pushDispatchResult,
    attendanceChangedPushDispatch: attendanceChangedPushDispatchResult,
    errors,
  });
}

async function dispatchEventCreatedPushesSafely(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  errors: string[],
) {
  try {
    return await dispatchEventCreatedPushes(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en dispatcher event_created';
    console.error('[maintenance] event_created push dispatcher failed:', error);
    errors.push(`event_created dispatcher failed: ${message}`);

    return {
      claimed: 0,
      sent: 0,
      failed: 0,
      staleDeleted: 0,
      skipped: true,
      errors: [message],
    };
  }
}

async function dispatchAttendanceChangedPushesSafely(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  errors: string[],
) {
  try {
    return await dispatchAttendanceChangedPushes(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en dispatcher attendance_changed';
    console.error('[maintenance] attendance_changed push dispatcher failed:', error);
    errors.push(`attendance_changed dispatcher failed: ${message}`);

    return {
      claimed: 0,
      sent: 0,
      failed: 0,
      staleDeleted: 0,
      skipped: true,
      errors: [message],
    };
  }
}

async function createFromSchedules(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  now: Date,
  errors: string[],
): Promise<number> {
  const { data: schedules, error: scheduleError } = await supabase
    .from('group_recurring_schedules')
    .select('*, groups!inner(admin_user_id, archived_at)')
    .eq('active', true)
    .is('groups.archived_at', null);

  if (scheduleError) {
    errors.push(`Failed to fetch schedules: ${scheduleError.message}`);
    return 0;
  }

  if (!schedules?.length) return 0;

  let created = 0;

  for (const schedule of schedules) {
    const adminUserId = (schedule as { groups?: { admin_user_id?: string } }).groups?.admin_user_id;
    if (!adminUserId) {
      errors.push(`Schedule ${schedule.id}: admin_user_id not found`);
      continue;
    }

    const result = await tryCreateEventFromSchedule(supabase, schedule, adminUserId, now);
    if (result.error) {
      errors.push(`Schedule ${schedule.id}: ${result.error}`);
      continue;
    }

    if (result.created) created++;
  }

  return created;
}

async function transitionEvents(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  now: Date,
  errors: string[],
): Promise<number> {
  const { data: events, error: fetchError } = await supabase
    .from('events')
    .select('id')
    .eq('status', 'scheduled')
    .lt('scheduled_at', new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString())
    .gt('scheduled_at', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (fetchError) {
    errors.push(`Failed to fetch events for transition: ${fetchError.message}`);
    return 0;
  }

  if (!events?.length) return 0;

  const { error: updateError } = await supabase
    .from('events')
    .update({ status: 'confirming' })
    .in(
      'id',
      events.map((e) => e.id),
    );

  if (updateError) {
    errors.push(`Failed to transition events: ${updateError.message}`);
    return 0;
  }

  return events.length;
}

async function sendReminders(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  now: Date,
  errors: string[],
): Promise<number> {
  const { data: events, error: fetchError } = await supabase
    .from('events')
    .select('id, group_id')
    .eq('status', 'confirming')
    .lt('scheduled_at', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString())
    .gt('scheduled_at', now.toISOString());

  if (fetchError) {
    errors.push(`Failed to fetch events for reminders: ${fetchError.message}`);
    return 0;
  }

  if (!events?.length) return 0;

  let sent = 0;

  for (const event of events) {
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, user_id')
      .eq('group_id', event.group_id)
      .eq('stats_status', 'approved')
      .is('archived_at', null)
      .not('user_id', 'is', null);

    if (playersError || !players?.length) continue;

    const { data: attendances } = await supabase
      .from('event_attendances')
      .select('player_id')
      .eq('event_id', event.id)
      .eq('status', 'going');

    const goingPlayerIds = new Set(attendances?.map((a) => a.player_id) ?? []);

    for (const player of players) {
      if (!player.user_id || goingPlayerIds.has(player.id)) continue;

      await sendPushToUser(supabase, player.user_id, {
        title: '¡Partido pendiente!',
        body: 'Faltan menos de 24hs para el partido. Confirmá tu asistencia.',
        url: `/groups/${event.group_id}/events/${event.id}`,
      });

      sent++;
    }
  }

  return sent;
}
