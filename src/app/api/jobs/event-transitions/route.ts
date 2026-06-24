import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { successResponse, cronAuthError } from '@/lib/api-helpers';
import { createNotification } from '@/lib/services/notifications.service';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  try {
    const supabase = createServiceSupabaseClient();
    const result = await processEventTransitions(supabase);
    return successResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: { code: 'EVENT_TRANSITIONS_ERROR', message } },
      { status: 500 },
    );
  }
}

interface TransitionResult {
  eventsTransitioned: number;
  remindersSent: number;
}

async function processEventTransitions(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
): Promise<TransitionResult> {
  // Find events that should transition from 'scheduled' to 'confirming'
  // Those within the next 24 hours that haven't transitioned yet
  const { data: events, error: fetchError } = await supabase
    .from('events')
    .select('id, group_id, field_name')
    .eq('status', 'scheduled')
    .lt('scheduled_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

  if (fetchError) {
    throw new Error(`Failed to fetch events: ${fetchError.message}`);
  }

  if (!events?.length) {
    return { eventsTransitioned: 0, remindersSent: 0 };
  }

  let eventsTransitioned = 0;
  let remindersSent = 0;

  for (const event of events) {
    // Transition event to confirming
    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'confirming' })
      .eq('id', event.id);

    if (updateError) {
      console.error(`[event-transitions] Failed to transition event ${event.id}: ${updateError.message}`);
      continue;
    }

    eventsTransitioned++;

    // Send attendance_reminder to all approved players in the group
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('user_id')
      .eq('group_id', event.group_id)
      .eq('stats_status', 'approved')
      .is('archived_at', null)
      .not('user_id', 'is', null);

    if (playersError) {
      console.error(`[event-transitions] Failed to fetch players for group ${event.group_id}: ${playersError.message}`);
      continue;
    }

    if (players?.length) {
      const results = await Promise.all(
        players.map((p) =>
          createNotification(supabase, p.user_id!, 'attendance_reminder', {
            event_id: event.id,
            group_id: event.group_id,
            field_name: event.field_name,
          })
        )
      );

      const firstError = results.find((r) => !r.ok)?.error;
      if (firstError) {
        console.error(`[event-transitions] Failed to insert notifications for event ${event.id}: ${firstError.message}`);
        continue;
      }

      remindersSent += players.length;
    }
  }

  return { eventsTransitioned, remindersSent };
}
