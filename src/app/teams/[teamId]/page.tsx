import { notFound, redirect } from 'next/navigation';
import { TeamCardPanel } from '@/components/teams/team-card-panel';
import { TeamDetailTabs } from '@/components/teams/team-detail-tabs';
import { TeamMatchesPanel } from '@/components/teams/team-matches-panel';
import { TeamModerationPanel } from '@/components/teams/team-moderation-panel';
import { TeamRosterPanel } from '@/components/teams/team-roster-panel';
import { TeamStatsPanel } from '@/components/teams/team-stats-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { TeamsService } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { TeamDetailTab } from '@/lib/types/teams.types';

const tabs: TeamDetailTab[] = ['members', 'matches', 'stats', 'card', 'moderation'];

function parseTab(value: string | string[] | undefined): TeamDetailTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return tabs.includes(tab as TeamDetailTab) ? (tab as TeamDetailTab) : 'members';
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const activeTab = parseTab(query.tab);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const service = new TeamsService(supabase);
  const result = await service.getTeamDetail(teamId);

  if (!result.ok) {
    console.error('[teams] Error fetching team detail:', result.error);
    notFound();
  }

  if (!result.data) {
    notFound();
  }

  const team = result.data;
  const canManage = team.role === 'admin';

  return (
    <ImmersiveScreen contentClassName="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <header className="mb-8 rounded-[2rem] bg-white/7 p-6 ring-1 ring-white/10">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">Equipo</p>
          <h1 className="mt-3 font-headline text-5xl font-black italic uppercase leading-none text-white">{team.name}</h1>
          <p className="mt-3 text-sm font-semibold text-white/55">{team.memberCount} miembros · {team.matchesPlayed} partidos con stats aprobadas</p>
        </header>

        <TeamDetailTabs teamId={team.id} activeTab={activeTab} />

        <div className="mt-8 rounded-[2rem] bg-black/45 p-5 ring-1 ring-white/10">
          {activeTab === 'members' ? <TeamRosterPanel teamId={team.id} members={team.members} canManage={canManage} /> : null}
          {activeTab === 'matches' ? <TeamMatchesPanel teamId={team.id} matches={team.matches} /> : null}
          {activeTab === 'stats' ? <TeamStatsPanel totals={team} /> : null}
          {activeTab === 'card' ? <TeamCardPanel team={team} /> : null}
          {activeTab === 'moderation' ? <TeamModerationPanel submissions={team.submissions} canModerate={canManage} /> : null}
        </div>
      </div>
    </ImmersiveScreen>
  );
}
