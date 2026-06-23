import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { successResponse, cronAuthError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  const supabase = createServiceSupabaseClient();
  const errors: string[] = [];
  let sent = 0;

  const { data: eligiblePrefs, error: prefsError } = await supabase
    .from('user_notification_preferences')
    .select('user_id')
    .eq('digest_enabled', true)
    .in('digest_frequency', ['weekly']);

  if (prefsError) {
    return NextResponse.json(
      { ok: false, error: { code: 'DB_ERROR', message: prefsError.message }, errors: [] },
      { status: 500 }
    );
  }

  if (!eligiblePrefs?.length) {
    return successResponse({ sent: 0, errors: [] });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const since = weekAgo.toISOString();

  for (const pref of eligiblePrefs) {
    try {
      const userId = pref.user_id as string;

      // Get groups where this user is a player or admin
      const { data: userGroups, error: groupsError } = await supabase
        .from('players')
        .select('group_id')
        .eq('user_id', userId)
        .is('archived_at', null);

      if (groupsError) {
        errors.push(`Failed to fetch groups for user ${userId}: ${groupsError.message}`);
        continue;
      }

      if (!userGroups?.length) continue;

      const groupIds = [...new Set(userGroups.map((g) => g.group_id))];

      // Get player IDs for this user in their groups
      const { data: userPlayers, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', userId)
        .in('group_id', groupIds)
        .is('archived_at', null);

      if (playersError) {
        errors.push(`Failed to fetch players for user ${userId}: ${playersError.message}`);
        continue;
      }

      if (!userPlayers?.length) continue;

      const playerIds = userPlayers.map((p) => p.id);

      const { data: recentEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, group_id, scheduled_at, team_a_score, team_b_score, mvp_player_id')
        .in('group_id', groupIds)
        .eq('status', 'played')
        .gte('played_at', since)
        .order('played_at', { ascending: false })
        .limit(10);

      if (eventsError) {
        errors.push(`Failed to fetch events for user ${userId}: ${eventsError.message}`);
        continue;
      }

      if (!recentEvents?.length) continue;

      const { data: participation, error: partError } = await supabase
        .from('match_participations')
        .select('event_id')
        .in('event_id', recentEvents.map((e) => e.id as string))
        .in('player_id', playerIds);

      if (partError) {
        errors.push(`Failed to fetch participations for user ${userId}: ${partError.message}`);
        continue;
      }

      if (!participation?.length) continue;

      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'weekly_digest',
        payload: {
          events_played: recentEvents.length,
          digest_type: 'weekly',
          groups_count: groupIds.length,
        },
      });

      if (insertError) {
        errors.push(`Failed to insert notification for user ${userId}: ${insertError.message}`);
        continue;
      }

      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(message);
    }
  }

  return successResponse({ sent, errors, total_users: eligiblePrefs.length });
}
