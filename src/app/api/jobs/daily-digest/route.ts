import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { successResponse, cronAuthError } from '@/lib/api-helpers';
import { createNotification } from '@/lib/services/notifications.service';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  const supabase = createServiceSupabaseClient();
  const errors: string[] = [];
  let sent = 0;

  const { data: adminPrefs, error: prefsError } = await supabase
    .from('user_notification_preferences')
    .select('user_id, timezone')
    .eq('digest_enabled', true)
    .in('digest_frequency', ['daily']);

  if (prefsError) {
    return NextResponse.json(
      { ok: false, error: { code: 'DB_ERROR', message: prefsError.message }, errors: [] },
      { status: 500 }
    );
  }

  if (!adminPrefs?.length) {
    return successResponse({ sent: 0, errors: [] });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const since = yesterday.toISOString();

  for (const pref of adminPrefs) {
    try {
      const userId = pref.user_id as string;

      // Get groups where this user is admin
      const { data: adminGroups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('admin_user_id', userId);

      if (groupsError) {
        errors.push(`Failed to fetch groups for user ${userId}: ${groupsError.message}`);
        continue;
      }

      if (!adminGroups?.length) continue;

      const groupIds = adminGroups.map((g) => g.id);

      // Get all player IDs in groups
      const { data: groupPlayers, error: playersError } = await supabase
        .from('players')
        .select('id')
        .in('group_id', groupIds)
        .is('archived_at', null);

      if (playersError) {
        errors.push(`Failed to fetch players for user ${userId}: ${playersError.message}`);
        continue;
      }

      const groupPlayerIds = groupPlayers?.map((p) => p.id) ?? [];

      const [pendingStats, pendingRevisions, pendingReintegrations, upcomingEvents] =
        await Promise.all([
          groupPlayerIds.length
            ? supabase
                .from('stat_revision_requests')
                .select('id', { count: 'exact', head: true })
                .in('player_id', groupPlayerIds)
                .eq('status', 'pending')
                .gte('created_at', since)
            : Promise.resolve({ count: 0, data: null, error: null }),
          groupPlayerIds.length
            ? supabase
                .from('stat_revision_requests')
                .select('id', { count: 'exact', head: true })
                .in('player_id', groupPlayerIds)
                .eq('status', 'pending')
                .gte('updated_at', since)
            : Promise.resolve({ count: 0, data: null, error: null }),
          supabase
            .from('reintegration_requests')
            .select('id', { count: 'exact', head: true })
            .in('group_id', groupIds)
            .eq('status', 'pending')
            .gte('created_at', since),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .in('group_id', groupIds)
            .in('status', ['scheduled', 'confirming'])
            .gte('scheduled_at', new Date().toISOString()),
        ]);

      const hasActivity =
        (pendingStats.count ?? 0) > 0 ||
        (pendingRevisions.count ?? 0) > 0 ||
        (pendingReintegrations.count ?? 0) > 0 ||
        (upcomingEvents.count ?? 0) > 0;

      if (!hasActivity) continue;

      const res = await createNotification(supabase, userId, 'weekly_digest', {
        pending_stats: pendingStats.count ?? 0,
        pending_revisions: pendingRevisions.count ?? 0,
        pending_reintegrations: pendingReintegrations.count ?? 0,
        upcoming_events: upcomingEvents.count ?? 0,
        digest_type: 'daily',
        groups_count: groupIds.length,
      });

      if (!res.ok) {
        errors.push(`Failed to insert notification for user ${userId}: ${res.error.message}`);
        continue;
      }

      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(message);
    }
  }

  return successResponse({ sent, errors, total_admins: adminPrefs.length });
}
