'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '@/hooks/use-notifications';

export function NotificationBadge() {
  const count = useUnreadCount();

  return (
    <Link href="/notifications" className="relative inline-flex items-center p-2">
      <Bell className="h-6 w-6 text-white" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
