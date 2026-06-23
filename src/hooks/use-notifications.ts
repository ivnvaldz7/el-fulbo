'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/lib/services/notifications.service';

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=30');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const json = await res.json() as { ok: boolean; data?: { notifications: AppNotification[]; unreadCount: number } };
      if (!json.ok || !json.data) throw new Error('Invalid response');
      return json.data;
    },
  });

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    queryClient.setQueryData(['notifications'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        notifications: old.notifications.map((n: AppNotification) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, old.unreadCount - 1),
      };
    });
    void queryClient.invalidateQueries({ queryKey: ['unread-count'] });
  }, [queryClient]);

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    queryClient.setQueryData(['notifications'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        notifications: old.notifications.map((n: AppNotification) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString()
        })),
        unreadCount: 0,
      };
    });
    void queryClient.invalidateQueries({ queryKey: ['unread-count'] });
  }, [queryClient]);

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    markRead,
    markAllRead,
    refetch,
  };
}

export function useUnreadCount() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const r = await fetch('/api/notifications?limit=1');
      if (!r.ok) throw new Error('Failed to fetch unread count');
      const json = await r.json() as { ok: boolean; data?: { unreadCount: number } };
      if (!json.ok || !json.data) throw new Error('Invalid response');
      return json.data.unreadCount;
    },
  });

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel('unread-count-standalone')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return data ?? 0;
}
