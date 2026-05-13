import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getActiveSubscriptions,
  archiveStaleSubscription,
  touchSubscription,
} from './push-subscription.service';
import {
  getNotificationCopy,
  getNotificationDeepLink,
  type NotificationPayload,
  type NotificationType,
} from '@/lib/notifications-deeplink';
import { markNotificationPushed } from './notifications.service';

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  webpush.setVapidDetails('mailto:ivnvldz7@gmail.com', publicKey, privateKey);
  vapidInitialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  ensureVapid();
  if (!vapidInitialized) return;

  const subscriptions = await getActiveSubscriptions(supabase, userId);
  if (!subscriptions.length) return;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
        JSON.stringify(payload),
      );
      await touchSubscription(supabase, sub.id);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await archiveStaleSubscription(supabase, sub.id);
      }
    }
  }
}

export async function sendNotificationPush(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string,
  type: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  const copy = getNotificationCopy(type, payload);
  const url = getNotificationDeepLink(type, payload);

  await sendPushToUser(supabase, userId, {
    ...copy,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    url,
  });

  await markNotificationPushed(supabase, notificationId);
}

export async function deliverPendingPushes(supabase: SupabaseClient): Promise<number> {
  const { data: pending } = await supabase
    .from('notifications')
    .select('id, user_id, type, payload')
    .is('pushed_at', null)
    .order('created_at', { ascending: true })
    .limit(100);

  if (!pending?.length) return 0;

  const userIds = [...new Set(pending.map((n) => n.user_id as string))];

  const { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('user_id, push_enabled')
    .in('user_id', userIds)
    .eq('push_enabled', true);

  const enabledUsers = new Set((prefs ?? []).map((p) => p.user_id as string));

  let sent = 0;
  for (const n of pending) {
    const userId = n.user_id as string;
    if (!enabledUsers.has(userId)) {
      await markNotificationPushed(supabase, n.id as string);
      continue;
    }

    await sendNotificationPush(
      supabase,
      n.id as string,
      userId,
      n.type as NotificationType,
      (n.payload ?? {}) as NotificationPayload,
    );
    sent++;
  }

  return sent;
}
