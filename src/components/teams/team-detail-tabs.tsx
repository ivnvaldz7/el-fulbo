import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { TeamDetailTab } from '@/lib/types/teams.types';

const tabs: { id: TeamDetailTab; label: string }[] = [
  { id: 'members', label: 'Members' },
  { id: 'matches', label: 'Matches' },
  { id: 'stats', label: 'Stats' },
  { id: 'card', label: 'Card' },
  { id: 'moderation', label: 'Moderation' },
];

export function TeamDetailTabs({ teamId, activeTab }: { teamId: string; activeTab: TeamDetailTab }) {
  return (
    <nav aria-label="Team sections" className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={routes.teamDetail(teamId, tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-pitch-green hover:text-pitch-green aria-[current=page]:border-pitch-green aria-[current=page]:bg-pitch-green aria-[current=page]:text-black"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
