'use client';

import { useRouter } from 'next/navigation';
import { getNotificationDeepLink, getNotificationCopy } from '@/lib/notifications-deeplink';
import type { AppNotification } from '@/lib/services/notifications.service';

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

interface Props {
  notification: AppNotification;
  onRead: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: Props) {
  const router = useRouter();
  const { title, body } = getNotificationCopy(notification.type, notification.payload);
  const url = getNotificationDeepLink(notification.type, notification.payload);
  const isUnread = !notification.readAt;

  function handleClick() {
    if (isUnread) onRead(notification.id);
    router.push(url);
  }

  return (
    <button
      onClick={handleClick}
      className={[
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
        isUnread ? 'bg-white/5' : 'bg-transparent',
        'hover:bg-white/10',
      ].join(' ')}
    >
      {isUnread && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
      )}
      {!isUnread && <span className="mt-1.5 h-2 w-2 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-sm text-white/60">{body}</p>
      </div>
      <span className="shrink-0 text-xs text-white/40">
        {formatRelativeTime(notification.createdAt)}
      </span>
    </button>
  );
}
