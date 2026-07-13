import { TeamCardArtwork, type TeamCardData } from '@/components/teams/team-card-artwork';

export function TeamShareableCard({ team }: { team: TeamCardData }) {
  return (
    <div className="bg-[#040806] p-10">
      <p className="sr-only">Public-safe team card</p>
      <TeamCardArtwork team={team} size="share" />
    </div>
  );
}
