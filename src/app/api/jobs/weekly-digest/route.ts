import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'No tenés permisos.' } }, { status: 403 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: eligiblePrefs } = await supabase
    .from('user_notification_preferences')
    .select('user_id')
    .eq('digest_enabled', true)
    .in('digest_frequency', ['weekly']);

  if (!eligiblePrefs?.length) {
    return NextResponse.json({ ok: true, data: { sent: 0 } });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const since = weekAgo.toISOString();

  const { data: recentEvents } = await supabase
    .from('events')
    .select('id, group_id, scheduled_at, team_a_score, team_b_score, mvp_player_id')
    .eq('status', 'played')
    .gte('played_at', since)
    .order('played_at', { ascending: false })
    .limit(10);

  let sent = 0;

  for (const pref of eligiblePrefs) {
    const userId = pref.user_id as string;

    const { data: participation } = await supabase
      .from('match_participations')
      .select('event_id')
      .in('event_id', (recentEvents ?? []).map((e) => e.id as string));

    if (!participation?.length && !recentEvents?.length) continue;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'weekly_digest',
      payload: {
        events_played: recentEvents?.length ?? 0,
        digest_type: 'weekly',
      },
    });

    sent++;
  }

  return NextResponse.json({ ok: true, data: { sent } });
}
