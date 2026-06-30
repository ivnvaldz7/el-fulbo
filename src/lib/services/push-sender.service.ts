import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getActiveSubscriptions } from './push-subscription.service';
import { mapSupabaseError } from './errors';

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn(
      '[push-sender] VAPID keys no configuradas. Notificaciones push desactivadas. ' +
      'Setear VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en env.',
    );
    return;
  }

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

  const subsResult = await getActiveSubscriptions(supabase, userId);
  if (!subsResult.ok) {
    console.error('[push-sender] Error fetching subscriptions:', subsResult.error.message);
    return;
  }
  if (!subsResult.data.length) return;

  for (const sub of subsResult.data) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
        JSON.stringify(payload),
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        const { error } = await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        if (error) {
          console.error('[push-sender] Error deleting stale subscription:', mapSupabaseError(error));
        }
      }
    }
  }
}


