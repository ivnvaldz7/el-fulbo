import { PlayerCardArtwork } from '@/components/cards/player-card-artwork';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';

export function ShareableCard({
  name,
  position,
  stats,
  currentBoost,
  photoUrl,
  groupName,
}: {
  name: string;
  position: PlayerPosition;
  stats: PlayerStats;
  currentBoost?: CurrentBoost | null;
  photoUrl?: string | null;
  groupName: string;
}) {
  return (
    <PlayerCardArtwork
      name={name}
      position={position}
      stats={stats}
      currentBoost={currentBoost}
      photoUrl={photoUrl}
      groupName={groupName}
      size="share"
    />
  );
}
