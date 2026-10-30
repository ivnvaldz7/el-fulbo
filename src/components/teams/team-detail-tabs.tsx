import Link from 'next/link';
import { ChartNoAxesCombined, ClipboardList, ShieldCheck, Swords, UsersRound, type LucideIcon } from 'lucide-react';
import { routes } from '@/lib/routes';
import type { TeamDetailTab } from '@/lib/types/teams.types';

const tabs: { id: TeamDetailTab; label: string; icon: LucideIcon }[] = [
  { id: 'members', label: 'Plantel', icon: UsersRound },
  { id: 'matches', label: 'Partidos', icon: Swords },
  { id: 'stats', label: 'Estadísticas', icon: ChartNoAxesCombined },
  { id: 'card', label: 'Card del equipo', icon: ClipboardList },
  { id: 'moderation', label: 'Moderación', icon: ShieldCheck },
];

export function TeamDetailTabs({ teamId, activeTab, canManage = false }: { teamId: string; activeTab: TeamDetailTab; canManage?: boolean }) {
  return (
    <nav aria-label="Secciones del equipo" className={`grid w-full gap-2 ${canManage ? 'grid-cols-5' : 'grid-cols-4'}`}>
      {tabs.filter((tab) => canManage || tab.id !== 'moderation').map((tab) => (
        <Link
          key={tab.id}
          href={routes.teamDetail(teamId, tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          aria-label={tab.label}
          title={tab.label}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/65 transition duration-300 hover:border-pitch-green hover:text-pitch-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-green aria-[current=page]:border-pitch-green aria-[current=page]:bg-pitch-green aria-[current=page]:text-black"
        >
          <tab.icon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
