import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError } from './errors';

export interface PushSubscriptionData {
  id: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export async function savePushSubscription(
  supabase: SupabaseClient,
  sub: PushSubscriptionJSON,
): Promise<Result<void>> {
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Subscription incompleta.' },
    };
  }

  const { error } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.keys.p256dh,
    p_auth: sub.keys.auth,
    p_user_agent: null,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export async function removePushSubscription(
  supabase: SupabaseClient,
  endpoint: string,
): Promise<Result<void>> {
  const { error } = await supabase.rpc('delete_push_subscription', {
    p_endpoint: endpoint,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export async function getActiveSubscriptions(
  supabase: SupabaseClient,
  userId: string,
): Promise<Result<PushSubscriptionData[]>> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('user_id', userId);

  if (error) return { ok: false, error: mapSupabaseError(error) };

  return {
    ok: true,
    data: (data ?? []).map((s) => ({
      id: s.id as string,
      endpoint: s.endpoint as string,
      p256dhKey: s.p256dh_key as string,
      authKey: s.auth_key as string,
    })),
  };
}
