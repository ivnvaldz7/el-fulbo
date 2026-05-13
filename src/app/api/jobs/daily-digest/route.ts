import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'No tenés permisos.' } }, { status: 403 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: adminPrefs } = await supabase
    .from('user_notification_preferences')
    .select('user_id, timezone')
    .eq('digest_enabled', true)
    .in('digest_frequency', ['daily']);

  if (!adminPrefs?.length) {
    return NextResponse.json({ ok: true, data: { sent: 0 } });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const since = yesterday.toISOString();

  let sent = 0;

  for (const pref of adminPrefs) {
    const userId = pref.user_id as string;

    const [pendingStats, pendingRevisions, pendingReintegrations, upcomingEvents] =
      await Promise.all([
        supabase
          .from('stat_revision_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('created_at', since),
        supabase
          .from('stat_revision_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('updated_at', since),
        supabase
          .from('reintegration_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('created_at', since),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .in('status', ['scheduled', 'confirming'])
          .gte('scheduled_at', new Date().toISOString()),
      ]);

    const hasActivity =
      (pendingStats.count ?? 0) > 0 ||
      (pendingRevisions.count ?? 0) > 0 ||
      (pendingReintegrations.count ?? 0) > 0 ||
      (upcomingEvents.count ?? 0) > 0;

    if (!hasActivity) continue;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'weekly_digest',
      payload: {
        pending_stats: pendingStats.count ?? 0,
        pending_revisions: pendingRevisions.count ?? 0,
        pending_reintegrations: pendingReintegrations.count ?? 0,
        upcoming_events: upcomingEvents.count ?? 0,
        digest_type: 'daily',
      },
    });

    sent++;
  }

  return NextResponse.json({ ok: true, data: { sent } });
}
