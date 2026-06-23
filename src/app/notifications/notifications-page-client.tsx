'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notifications/notification-item';

export function NotificationsPageClient() {
  const { notifications, isLoading, markRead, markAllRead } = useNotifications();
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="min-h-screen bg-absolute-dark text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-absolute-dark/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 transition-colors hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-headline text-xl font-black italic uppercase tracking-tight text-white">
            Notificaciones
          </h1>
        </div>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green transition-opacity hover:opacity-70"
          >
            Marcar todas
          </button>
        )}
      </header>

      <div className="divide-y divide-white/5">
        {isLoading && (
          <div className="py-16 text-center">
            <p className="font-mono text-xs text-white/30">Cargando...</p>
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="px-6 py-20 text-center">
            <p className="font-headline text-lg font-black italic uppercase text-white/20">
              Todo tranquilo
            </p>
            <p className="mt-2 font-mono text-xs text-white/30">
              Acá aparecen los partidos, aprobaciones y novedades del grupo.
            </p>
          </div>
        )}

        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onRead={markRead} />
        ))}
      </div>
    </div>
  );
}
