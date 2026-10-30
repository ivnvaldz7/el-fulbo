export const teamBadges = [
  { path: '/team-badges/pitch.svg', label: 'Cancha' },
  { path: '/team-badges/bolt.svg', label: 'Rayo' },
  { path: '/team-badges/star.svg', label: 'Estrella' },
  { path: '/team-badges/stripes.svg', label: 'Bastones' },
] as const;

export type TeamBadgePath = (typeof teamBadges)[number]['path'];

export function getTeamBadgePath(value: string | null | undefined): TeamBadgePath {
  return teamBadges.find((badge) => badge.path === value)?.path ?? teamBadges[0].path;
}
