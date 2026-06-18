import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError } from './errors';
import type { NotificationPayload, NotificationType } from '@/lib/notifications-deeplink';

export interface AppNotification {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  readAt: string | null;
  pushedAt: string | null;
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
      .select('id, type, payload, read_at, pushed_at, created_at')
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
    readAt: n.read_at as string | null,
    pushedAt: n.pushed_at as string | null,
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
  matchReminders: boolean;
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'disabled';
  timezone: string;
}

export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<Result<NotificationPreferences>> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('push_enabled, match_reminders, digest_enabled, digest_frequency, timezone')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false, error: mapSupabaseError(error) };

  if (!data) {
    return {
      ok: true,
      data: {
        pushEnabled: false,
        matchReminders: true,
        digestEnabled: false,
        digestFrequency: 'disabled',
        timezone: 'UTC',
      },
    };
  }

  return {
    ok: true,
    data: {
      pushEnabled: data.push_enabled as boolean,
      matchReminders: data.match_reminders as boolean,
      digestEnabled: data.digest_enabled as boolean,
      digestFrequency: data.digest_frequency as 'daily' | 'weekly' | 'disabled',
      timezone: data.timezone as string,
    },
  };
}

export async function saveNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<Result<void>> {
  const payload: Record<string, unknown> = { user_id: userId };
  if (prefs.pushEnabled !== undefined) payload.push_enabled = prefs.pushEnabled;
  if (prefs.matchReminders !== undefined) payload.match_reminders = prefs.matchReminders;
  if (prefs.digestEnabled !== undefined) payload.digest_enabled = prefs.digestEnabled;
  if (prefs.digestFrequency !== undefined) payload.digest_frequency = prefs.digestFrequency;
  if (prefs.timezone !== undefined) payload.timezone = prefs.timezone;

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
    .single();

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: data.id as string };
}

export async function markNotificationPushed(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export async function getPendingPushNotifications(
  supabase: SupabaseClient,
  limit = 100,
): Promise<Result<Array<{ id: string; userId: string; type: NotificationType; payload: NotificationPayload }>>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, payload')
    .is('pushed_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return { ok: false, error: mapSupabaseError(error) };

  return {
    ok: true,
    data: (data ?? []).map((n) => ({
      id: n.id as string,
      userId: n.user_id as string,
      type: n.type as NotificationType,
      payload: (n.payload ?? {}) as NotificationPayload,
    })),
  };
}
