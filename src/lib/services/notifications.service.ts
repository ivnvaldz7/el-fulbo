import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError } from './errors';
import type { NotificationPayload, NotificationType } from '@/lib/notifications-deeplink';
import { z } from 'zod';

const prefsSchema = z.object({
  pushEnabled: z.boolean().optional(),
});

export interface AppNotification {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  dedupeKey: string | null;
  readAt: string | null;
  pushedAt: string | null;
  pushAttemptedAt: string | null;
  pushAttemptCount: number;
  pushLastError: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: AppNotification[];
  unreadCount: number;
}

export async function getNotifications(
  supabase: SupabaseClient,
  limit = 30,
  offset = 0,
): Promise<Result<NotificationsPage>> {
  const [listResult, countResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, payload, dedupe_key, read_at, pushed_at, push_attempted_at, push_attempt_count, push_last_error, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase.rpc('get_unread_notification_count'),
  ]);

  if (listResult.error) {
    return { ok: false, error: mapSupabaseError(listResult.error) };
  }

  if (countResult.error) {
    return { ok: false, error: mapSupabaseError(countResult.error) };
  }

  const notifications: AppNotification[] = (listResult.data ?? []).map((n) => ({
    id: n.id as string,
    type: n.type as NotificationType,
    payload: (n.payload ?? {}) as NotificationPayload,
    dedupeKey: (n.dedupe_key as string | null) ?? null,
    readAt: n.read_at as string | null,
    pushedAt: n.pushed_at as string | null,
    pushAttemptedAt: n.push_attempted_at as string | null,
    pushAttemptCount: (n.push_attempt_count as number) ?? 0,
    pushLastError: n.push_last_error as string | null,
    createdAt: n.created_at as string,
  }));

  return {
    ok: true,
    data: {
      notifications,
      unreadCount: (countResult.data as number) ?? 0,
    },
  };
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<Result<void>> {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export async function markAllNotificationsRead(supabase: SupabaseClient): Promise<Result<void>> {
  const { error } = await supabase.rpc('mark_all_notifications_read');

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export interface NotificationPreferences {
  pushEnabled: boolean;
}

export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<Result<NotificationPreferences>> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('push_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false, error: mapSupabaseError(error) };

  if (!data) {
    return {
      ok: true,
      data: { pushEnabled: false },
    };
  }

  return {
    ok: true,
    data: { pushEnabled: data.push_enabled as boolean },
  };
}

export async function saveNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<Result<void>> {
  const parsed = prefsSchema.safeParse(prefs);
  if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Preferencias inválidas' } };

  const payload: Record<string, unknown> = { user_id: userId };
  if (prefs.pushEnabled !== undefined) payload.push_enabled = prefs.pushEnabled;

  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  payload: NotificationPayload,
): Promise<Result<string>> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, payload })
    .select('id')
    .maybeSingle();

  if (error || !data) return { ok: false, error: mapSupabaseError(error ?? new Error('No data returned from insert')) };
  return { ok: true, data: data.id };
}

export async function createNotificationOnce(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  payload: NotificationPayload,
  dedupeKey: string,
): Promise<Result<string | null>> {
  const { data, error } = await supabase.rpc('create_notification_once', {
    p_user_id: userId,
    p_type: type,
    p_payload: payload,
    p_dedupe_key: dedupeKey,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: (data as string | null) ?? null };
}


