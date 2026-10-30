import { getTeamBadgePath } from '@/lib/team-badges';

export function TeamBadge({ badgeUrl, name, className = '' }: { badgeUrl?: string | null; name: string; className?: string }) {
  return <img src={getTeamBadgePath(badgeUrl)} alt={`Escudo de ${name}`} width={120} height={120} className={`aspect-square object-contain ${className}`} />;
}
