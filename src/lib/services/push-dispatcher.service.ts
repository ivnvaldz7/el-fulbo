import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationPayload, NotificationType } from '@/lib/notifications-deeplink';
import { getNotificationCopy, getNotificationDeepLink } from '@/lib/notifications-deeplink';
import { hasVapidConfig, sendPushToUser } from './push-sender.service';
import { mapSupabaseError } from './errors';

interface ClaimedPushNotification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  payload: NotificationPayload;
}

export interface PushDispatcherResult {
  claimed: number;
  sent: number;
  failed: number;
  staleDeleted: number;
  skipped: boolean;
  errors: string[];
}

export interface PushDispatcherOptions {
  limit?: number;
  maxAttempts?: number;
}

export async function dispatchEventCreatedPushes(
  supabase: SupabaseClient,
  options: PushDispatcherOptions = {},
): Promise<PushDispatcherResult> {
  const result: PushDispatcherResult = {
    claimed: 0,
    sent: 0,
    failed: 0,
    staleDeleted: 0,
    skipped: false,
    errors: [],
  };

  if (!hasVapidConfig()) {
    return {
      ...result,
      skipped: true,
      errors: ['VAPID keys no configuradas'],
    };
  }

  const { data, error } = await supabase.rpc('claim_event_created_push_notifications', {
    p_limit: options.limit ?? 50,
    p_max_attempts: options.maxAttempts ?? 3,
  });

  if (error) {
    return { ...result, errors: [mapSupabaseError(error).message] };
  }

  const notifications = ((data ?? []) as ClaimedPushNotification[]).filter((notification) => (
    notification.type === 'event_created'
  ));

  result.claimed = notifications.length;

  for (const notification of notifications) {
    const copy = getNotificationCopy(notification.type, notification.payload);
    const delivery = await sendPushToUser(supabase, notification.user_id, {
      ...copy,
      url: getNotificationDeepLink(notification.type, notification.payload),
    });

    result.sent += delivery.sent;
    result.failed += delivery.failed;
    result.staleDeleted += delivery.staleDeleted;
    result.errors.push(...delivery.errors);

    if (delivery.sent > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          pushed_at: new Date().toISOString(),
          push_last_error: null,
        })
        .eq('id', notification.notification_id);

      if (updateError) result.errors.push(mapSupabaseError(updateError).message);
      continue;
    }

    const message = delivery.errors[0] ?? 'No se entregó push en ningún dispositivo';
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ push_last_error: message })
      .eq('id', notification.notification_id);

    if (updateError) result.errors.push(mapSupabaseError(updateError).message);
  }

  return result;
}
