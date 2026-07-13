import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';
import { PlayerCardArtwork } from './player-card-artwork';

export function PlayerCardPreview({
  name,
  position,
  stats,
  currentBoost = null,
  pending = false,
  showBoostIndicator = true,
  photoUrl = null,
  size = 'preview',
}: {
  name: string;
  position: PlayerPosition;
  stats: PlayerStats;
  currentBoost?: CurrentBoost | null;
  pending?: boolean;
  showBoostIndicator?: boolean;
  photoUrl?: string | null;
  size?: 'compact' | 'preview';
}) {
  return (
    <PlayerCardArtwork
      name={name}
      position={position}
      stats={stats}
      currentBoost={currentBoost}
      pending={pending}
      showBoostIndicator={showBoostIndicator}
      photoUrl={photoUrl}
      size={size}
    />
  );
}
