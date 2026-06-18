'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/lib/services/notifications.service';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications?limit=30');
    if (!res.ok) return;
    const json = await res.json() as { ok: boolean; data?: { notifications: AppNotification[]; unreadCount: number } };
    if (!json.ok || !json.data) return;
    setNotifications(json.data.notifications);
    setUnreadCount(json.data.unreadCount);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications().finally(() => setIsLoading(false));
  }, [fetchNotifications]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => { fetchNotifications(); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => { fetchNotifications(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, isLoading, markRead, markAllRead, refetch: fetchNotifications };
}

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('/api/notifications?limit=1')
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: { unreadCount: number } }) => {
        if (json.ok && json.data) setCount(json.data.unreadCount);
      })
      .catch((err) => console.error('[useUnreadCount] Error fetching unread count:', err));
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel('unread-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetch('/api/notifications?limit=1')
            .then((r) => r.json())
            .then((json: { ok: boolean; data?: { unreadCount: number } }) => {
              if (json.ok && json.data) setCount(json.data.unreadCount);
            })
            .catch((err) => console.error('[useUnreadCount] Error re-fetching after change:', err));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}
