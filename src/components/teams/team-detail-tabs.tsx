import Link from 'next/link';
import { ChartNoAxesCombined, ClipboardList, ShieldCheck, Swords, UsersRound, type LucideIcon } from 'lucide-react';
import { routes } from '@/lib/routes';
import type { TeamDetailTab } from '@/lib/types/teams.types';

const tabs: { id: TeamDetailTab; label: string; icon: LucideIcon }[] = [
  { id: 'members', label: 'Members', icon: UsersRound },
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'stats', label: 'Stats', icon: ChartNoAxesCombined },
  { id: 'card', label: 'Card', icon: ClipboardList },
  { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
];

export function TeamDetailTabs({ teamId, activeTab, canManage = false }: { teamId: string; activeTab: TeamDetailTab; canManage?: boolean }) {
  return (
    <nav aria-label="Team sections" className="flex gap-2 overflow-x-auto pb-2">
      {tabs.filter((tab) => canManage || tab.id !== 'moderation').map((tab) => (
        <Link
          key={tab.id}
          href={routes.teamDetail(teamId, tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          aria-label={tab.label}
          title={tab.label}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/65 transition duration-300 hover:border-pitch-green hover:text-pitch-green aria-[current=page]:border-pitch-green aria-[current=page]:bg-pitch-green aria-[current=page]:text-black"
        >
          <tab.icon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
