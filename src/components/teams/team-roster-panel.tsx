'use client';

import { useState } from 'react';
import type { TeamId, TeamMemberId, TeamRosterMemberView } from '@/lib/types/teams.types';
import { TeamsService } from '@/lib/services/teams.service';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface TeamRosterPanelProps {
  teamId?: TeamId;
  members: TeamRosterMemberView[];
  canManage: boolean;
  onInviteMember?: (payload: { teamId: TeamId }) => void;
  onRemoveMember?: (payload: { teamId: TeamId; memberId: TeamMemberId }) => void;
}

export function TeamRosterPanel({ teamId, members, canManage, onInviteMember, onRemoveMember }: TeamRosterPanelProps) {
  const canUseRosterActions = Boolean(teamId);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);

  async function handleInvite() {
    if (!teamId) return;

    if (onInviteMember) {
      onInviteMember({ teamId });
      return;
    }

    setCreatingInvite(true);

    const supabase = createBrowserSupabaseClient();
    const service = new TeamsService(supabase);
    const result = await service.createTeamInvitation({ teamId });

    if (!result.ok) {
      toast.error('No pudimos generar el código de invitación.');
      setCreatingInvite(false);
      return;
    }

    setInviteCode(result.data.code);
    setCreatingInvite(false);
  }

  function copyInviteCode() {
    if (!inviteCode) return;
    void navigator.clipboard.writeText(inviteCode);
    toast.success('Código copiado', { duration: 2000 });
  }

  function dismissInviteCode() {
    setInviteCode(null);
  }

  return (
    <section aria-labelledby="roster-heading" className="space-y-4">
      <header>
        <h2 id="roster-heading" className="font-headline text-3xl font-black italic uppercase text-white">Members</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">
          {canManage ? 'Los cambios de roster se gestionan con invitaciones y permisos admin.' : 'Roster fijo del equipo.'}
        </p>
        {canManage && teamId ? (
          <div className="mt-4">
            {inviteCode ? (
              <div className="rounded-[1.35rem] border border-pitch-green/40 bg-pitch-green/10 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-pitch-green">
                  Código de invitación
                </p>
                <p className="mt-2 font-headline text-2xl font-black italic uppercase tracking-wider text-white select-all">
                  {inviteCode}
                </p>
                <p className="mt-1 text-xs font-semibold text-white/55">
                  Compartí este código con quien quieras invitar.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black"
                  >
                    Copiar código
                  </button>
                  <button
                    type="button"
                    onClick={dismissInviteCode}
                    className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={creatingInvite}
                className="rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black disabled:opacity-50"
                onClick={handleInvite}
              >
                {creatingInvite ? 'Generando...' : 'Invitar miembro'}
              </button>
            )}
          </div>
        ) : null}
      </header>
      <div className="grid gap-3">
        {members.length > 0 ? members.map((member) => (
          <article key={member.id} className="rounded-[1.35rem] bg-white/7 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-black uppercase text-white">{member.displayName}</h3>
                <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green">
                  {member.primaryPosition}{member.secondaryPosition ? ` / ${member.secondaryPosition}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-black/40 px-3 py-1 font-mono text-[10px] font-black uppercase text-white/60">{member.role}</span>
                {canManage && member.role !== 'admin' && onRemoveMember ? (
                  <button
                    type="button"
                    className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] font-black uppercase text-white/70"
                    onClick={() => onRemoveMember({ teamId: teamId!, memberId: member.id })}
                  >
                    Quitar a {member.displayName}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        )) : (
          <p className="rounded-[1.35rem] border border-dashed border-white/15 p-6 text-sm font-semibold text-white/55">No members are visible yet.</p>
        )}
      </div>
    </section>
  );
}
