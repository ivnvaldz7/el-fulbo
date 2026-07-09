'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { routes } from '@/lib/routes';

export function PlayerProfileTabs({
  groupId,
  playerId,
}: {
  groupId: string;
  playerId: string;
}) {
  const pathname = usePathname();

  const tabs = [
    { label: 'Carta', href: routes.groupPlayer(groupId, playerId) },
    { label: 'Estadísticas', href: routes.groupPlayerStats(groupId, playerId) },
  ];

  return (
    <div className="mb-6 flex border-b border-white/10">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 font-mono text-sm font-bold uppercase transition-colors ${
              isActive
                ? 'border-b-2 border-[#D4AF37] text-[#D4AF37]'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
