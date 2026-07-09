'use client';

import Link from 'next/link';
import { Edit2 } from 'lucide-react';
import { RemovePlayerButton } from '@/app/groups/[id]/players/remove-player-button';
import { getCardTier, getTierStyles } from '@/lib/utils/card-tiers';
import type { PlayerPosition } from '@/lib/types';
import { routes } from '@/lib/routes';

type PlayerCarouselCardProps = {
  id: string;
  displayName: string;
  primaryPosition: PlayerPosition;
  overall: number;
  groupId: string;
  isSelected: boolean;
  onSelect: () => void;
};

function avatarGradient(tier: 'bronce' | 'plata' | 'oro' | 'oro_premium'): string {
  switch (tier) {
    case 'bronce': return 'from-[#CD7F32]/30 to-[#CD7F32]/10';
    case 'plata': return 'from-[#C0C0C0]/30 to-[#C0C0C0]/10';
    case 'oro': return 'from-[#FFD700]/30 to-[#FFD700]/10';
    case 'oro_premium': return 'from-[#FFDF00]/40 to-[#FFDF00]/15';
  }
}

function avatarBorder(tier: 'bronce' | 'plata' | 'oro' | 'oro_premium'): string {
  switch (tier) {
    case 'bronce': return 'border-[#CD7F32]/50';
    case 'plata': return 'border-[#C0C0C0]/50';
    case 'oro': return 'border-[#FFD700]/50';
    case 'oro_premium': return 'border-[#FFDF00]/60';
  }
}

export function PlayerCarouselCard({
  id,
  displayName,
  primaryPosition,
  overall,
  groupId,
  isSelected,
  onSelect,
}: PlayerCarouselCardProps) {
  const tier = getCardTier(overall);
  const styles = getTierStyles(tier);
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div
      data-player-id={id}
      className={`relative shrink-0 w-full snap-center rounded-2xl border-2 p-8 select-none transition-all duration-200 ${styles.borderColor} ${styles.shadow} ${isSelected ? 'ring-2 ring-white/20' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      role="button"
      tabIndex={0}
      aria-label={`${displayName}, ${primaryPosition}, overall ${overall}`}
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.5) 100%)`,
      }}
    >
      <div className={`absolute inset-0 rounded-2xl ${styles.bgGlow} pointer-events-none`} />

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className={`flex h-24 w-24 items-center justify-center rounded-full border-2 bg-gradient-to-br ${avatarGradient(tier)} ${avatarBorder(tier)}`}>
          <span className={`font-headline text-4xl font-black italic uppercase ${styles.textColor}`}>
            {initial}
          </span>
        </div>

        <div className="text-center">
          <p className={`font-headline text-6xl font-black italic uppercase leading-none drop-shadow-lg ${styles.textColor}`}>
            {overall}
          </p>
          <span className={`mt-2 inline-block rounded-full border px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${styles.borderColor} ${styles.textColor}`}>
            {primaryPosition}
          </span>
        </div>

        <p className="w-full text-center font-headline text-2xl font-black italic uppercase leading-tight text-white text-balance">
          {displayName}
        </p>

        <div className={`flex items-center gap-4 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-60'}`}>
          <Link
            href={routes.groupPlayerEditCard(groupId, id)}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
            title="Editar carta"
          >
            <Edit2 className="h-5 w-5" />
          </Link>
          <RemovePlayerButton playerId={id} playerName={displayName} groupId={groupId} />
        </div>
      </div>
    </div>
  );
}
