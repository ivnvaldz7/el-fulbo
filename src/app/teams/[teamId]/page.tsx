'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound, redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TeamCardPanel } from '@/components/teams/team-card-panel';
import { TeamDetailTabs } from '@/components/teams/team-detail-tabs';
import { TeamMatchesPanel } from '@/components/teams/team-matches-panel';
import { TeamModerationPanel } from '@/components/teams/team-moderation-panel';
import { TeamRosterPanel } from '@/components/teams/team-roster-panel';
import { TeamStatsPanel } from '@/components/teams/team-stats-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { TeamsService } from '@/lib/services/teams.service';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { TeamDetailTab, TeamMatchSignupStatus, TeamStatKind, TeamSubmissionStatus } from '@/lib/types/teams.types';
import { routes } from '@/lib/routes';

const tabs: TeamDetailTab[] = ['members', 'matches', 'stats', 'card', 'moderation'];

function parseTab(value: string | string[] | undefined): TeamDetailTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return tabs.includes(tab as TeamDetailTab) ? (tab as TeamDetailTab) : 'members';
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab') ?? undefined);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const service = useMemo(() => new TeamsService(supabase), [supabase]);
  const queryClient = useQueryClient();

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const result = await service.getTeamDetail(teamId);
      if (!result.ok) throw new Error(result.error.message);
      if (!result.data) throw new Error('Team not found');
      return result.data;
    },
  });

  // Real-time subscription for team changes
  useEffect(() => {
    const channel = supabase
      .channel(`team-detail:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_matches',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_match_signups',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_stat_submissions',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [teamId, queryClient, supabase]);

  if (loading) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Cargando equipo
        </p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
          Recuperando detalle...
        </h2>
      </ImmersiveScreen>
    );
  }

  if (error || !data) {
    notFound();
  }

  const team = data;
  const canManage = team.role === 'admin';

  // Mutation handlers
  async function handleInviteMember() {
    try {
      const result = await service.createTeamInvitation({ teamId });
      if (!result.ok) throw new Error(result.error.message);
      toast.success('Código de invitación generado');
      void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err: any) {
      toast.error(err.message ?? 'No pudimos generar la invitación');
    }
  }

  async function handleRemoveMember(memberId: string) {
    // Use userId from member (now available in TeamRosterMemberView)
    const member = team.members.find((m) => m.id === memberId);
    if (!member || !member.userId) {
      toast.error('No se encontró el miembro');
      return;
    }

    try {
      const result = await service.removeTeamMember({ teamId, userId: member.userId });
      if (!result.ok) throw new Error(result.error.message);
      toast.success('Miembro quitado del equipo');
      void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err: any) {
      toast.error(err.message ?? 'No pudimos quitar al miembro');
    }
  }

  async function handleSignup(matchId: string, status: TeamMatchSignupStatus) {
    try {
      const result = await service.signUpForTeamMatch({ teamId, matchId });
      if (!result.ok) throw new Error(result.error.message);
      toast.success(status === 'going' ? '¡Anotado al partido!' : 'Inscripción cancelada');
      void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err: any) {
      toast.error(err.message ?? 'No pudimos procesar la inscripción');
    }
  }

  async function handleSubmitStat(matchId: string, statKind: TeamStatKind, value: number) {
    try {
      const result = await service.submitTeamStat({ teamId, matchId, statKind, value });
      if (!result.ok) throw new Error(result.error.message);
      toast.success('Stat cargada, pendiente de aprobación');
      void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err: any) {
      toast.error(err.message ?? 'No pudimos cargar la stat');
    }
  }

  async function handleSetMvp(matchId: string, mvpUserId: string | null) {
    try {
      const result = await service.setTeamMatchMvp({ teamId, matchId, mvpUserId });
      if (!result.ok) throw new Error(result.error.message);
      toast.success(mvpUserId ? 'MVP elegido' : 'MVP removido');
      void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err: any) {
      toast.error(err.message ?? 'No pudimos guardar el MVP');
    }
  }

  async function handleReviewSubmission(
    submissionId: string,
    status: Extract<TeamSubmissionStatus, 'approved' | 'rejected'>,
    rejectionReason?: string | null,
  ) {
    try {
      const result = await service.reviewTeamStatSubmission({ submissionId, decision: status, rejectionReason });
      if (!result.ok) throw new Error(result.error.message);
      toast.success(status === 'approved' ? 'Stat aprobada' : 'Stat rechazada');

      // Trigger progression when a stat is approved
      if (status === 'approved') {
        const submission = team.submissions.find((s) => s.id === submissionId);
        if (submission?.userId) {
          const progResult = await service.processTeamPlayerProgression({ userId: submission.userId });
          if (progResult.ok) {
            const tierLabels = { bronze: 'bronce', silver: 'plata', gold: 'oro', premium_gold: 'oro premium' };
            toast.success(
              `¡${submission.playerName} mejoró su carta! (${tierLabels[progResult.data.cardTier]})`,
              { duration: 4000 },
            );
          }
        }
      }

      void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err: any) {
      toast.error(err.message ?? 'No pudimos procesar la revisión');
    }
  }

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
          {activeTab === 'members' ? (
            <TeamRosterPanel
              teamId={team.id}
              members={team.members}
              canManage={canManage}
              onInviteMember={handleInviteMember}
              onRemoveMember={({ memberId }) => handleRemoveMember(memberId)}
            />
          ) : null}
          {activeTab === 'matches' ? (
            <TeamMatchesPanel
              teamId={team.id}
              matches={team.matches}
              members={team.members.map((m) => ({ userId: m.userId, displayName: m.displayName }))}
              onSignup={({ matchId, status }) => handleSignup(matchId, status)}
              onSubmitStat={({ matchId, statKind, value }) => handleSubmitStat(matchId, statKind, value)}
              onSetMvp={canManage ? ({ matchId, mvpUserId }) => handleSetMvp(matchId, mvpUserId) : undefined}
            />
          ) : null}
          {activeTab === 'stats' ? <TeamStatsPanel totals={team} /> : null}
          {activeTab === 'card' ? <TeamCardPanel team={team} /> : null}
          {activeTab === 'moderation' ? (
            <TeamModerationPanel
              submissions={team.submissions}
              canModerate={canManage}
              onReviewSubmission={({ submissionId, status, rejectionReason }) => handleReviewSubmission(submissionId, status, rejectionReason)}
            />
          ) : null}
        </div>
      </div>
    </ImmersiveScreen>
  );
}