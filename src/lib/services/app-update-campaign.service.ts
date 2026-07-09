import type { SupabaseClient } from '@supabase/supabase-js';
import { getNotificationCopy } from '@/lib/notifications-deeplink';
import { createNotificationOnce } from './notifications.service';
import { sendPushToUser } from './push-sender.service';
import { mapSupabaseError } from './errors';

const APP_UPDATE_VERSION = 'card-refresh-icon-v2';
const APP_UPDATE_DEDUPE_PREFIX = `app_update:${APP_UPDATE_VERSION}`;

export interface AppUpdateCampaignResult {
  candidates: number;
  enabledUsers: number;
  notificationsCreated: number;
  duplicates: number;
  pushSent: number;
  pushFailed: number;
  staleDeleted: number;
  errors: string[];
}

export async function runAppUpdateCampaign(
  supabase: SupabaseClient,
): Promise<AppUpdateCampaignResult> {
  const result: AppUpdateCampaignResult = {
    candidates: 0,
    enabledUsers: 0,
    notificationsCreated: 0,
    duplicates: 0,
    pushSent: 0,
    pushFailed: 0,
    staleDeleted: 0,
    errors: [],
  };

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('push_subscriptions')
    .select('user_id');

  if (subscriptionsError) {
    result.errors.push(mapSupabaseError(subscriptionsError).message);
    return result;
  }

  const userIds = Array.from(new Set((subscriptions ?? [])
    .map((subscription) => subscription.user_id as string | null)
    .filter(Boolean) as string[]));

  result.candidates = userIds.length;
  if (!userIds.length) return result;

  const { data: preferences, error: preferencesError } = await supabase
    .from('user_notification_preferences')
    .select('user_id, push_enabled')
    .in('user_id', userIds)
    .eq('push_enabled', true);

  if (preferencesError) {
    result.errors.push(mapSupabaseError(preferencesError).message);
    return result;
  }

  const enabledUserIds = Array.from(new Set((preferences ?? [])
    .map((preference) => preference.user_id as string | null)
    .filter(Boolean) as string[]));

  result.enabledUsers = enabledUserIds.length;
  if (!enabledUserIds.length) return result;

  const copy = getNotificationCopy('app_update', {});

  for (const userId of enabledUserIds) {
    const notificationResult = await createNotificationOnce(
      supabase,
      userId,
      'app_update',
      { version: APP_UPDATE_VERSION },
      `${APP_UPDATE_DEDUPE_PREFIX}:${userId}`,
    );

    if (!notificationResult.ok) {
      result.errors.push(notificationResult.error.message);
      continue;
    }

    if (!notificationResult.data) {
      result.duplicates++;
      continue;
    }

    result.notificationsCreated++;

    const delivery = await sendPushToUser(supabase, userId, {
      ...copy,
      url: '/',
    });

    result.pushSent += delivery.sent;
    result.pushFailed += delivery.failed;
    result.staleDeleted += delivery.staleDeleted;
    result.errors.push(...delivery.errors);

    if (delivery.sent > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          pushed_at: new Date().toISOString(),
          push_last_error: null,
        })
        .eq('id', notificationResult.data);

      if (updateError) result.errors.push(mapSupabaseError(updateError).message);
      continue;
    }

    const message = delivery.errors[0] ?? 'No se entregó push en ningún dispositivo';
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ push_last_error: message })
      .eq('id', notificationResult.data);

    if (updateError) result.errors.push(mapSupabaseError(updateError).message);
  }

  return result;
}
