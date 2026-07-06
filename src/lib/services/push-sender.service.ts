import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getActiveSubscriptions } from './push-subscription.service';
import { mapSupabaseError } from './errors';

let vapidInitialized = false;

export interface PushDeliveryResult {
  sent: number;
  failed: number;
  staleDeleted: number;
  errors: string[];
}

export function hasVapidConfig() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

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
): Promise<PushDeliveryResult> {
  const result: PushDeliveryResult = { sent: 0, failed: 0, staleDeleted: 0, errors: [] };
  ensureVapid();
  if (!vapidInitialized) {
    result.errors.push('VAPID keys no configuradas');
    return result;
  }

  const subsResult = await getActiveSubscriptions(supabase, userId);
  if (!subsResult.ok) {
    console.error('[push-sender] Error fetching subscriptions:', subsResult.error.message);
    result.errors.push(subsResult.error.message);
    return result;
  }
  if (!subsResult.data.length) return result;

  for (const sub of subsResult.data) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
        JSON.stringify(payload),
      );
      result.sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        const { error } = await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        if (error) {
          const mapped = mapSupabaseError(error);
          console.error('[push-sender] Error deleting stale subscription:', mapped);
          result.errors.push(mapped.message);
        }
        result.staleDeleted++;
        continue;
      }
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : 'Error enviando push');
    }
  }

  return result;
}


