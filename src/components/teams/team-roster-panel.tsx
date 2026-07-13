'use client';

import type { TeamId, TeamMemberId, TeamRosterMemberView } from '@/lib/types/teams.types';

interface TeamRosterPanelProps {
  teamId?: TeamId;
  members: TeamRosterMemberView[];
  canManage: boolean;
  onInviteMember?: (payload: { teamId: TeamId }) => void;
  onRemoveMember?: (payload: { teamId: TeamId; memberId: TeamMemberId }) => void;
}

export function TeamRosterPanel({ teamId, members, canManage, onInviteMember, onRemoveMember }: TeamRosterPanelProps) {
  const canUseRosterActions = Boolean(teamId && onInviteMember && onRemoveMember);

  return (
    <section aria-labelledby="roster-heading" className="space-y-4">
      <header>
        <h2 id="roster-heading" className="font-headline text-3xl font-black italic uppercase text-white">Members</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">
          {canManage ? 'Los cambios de roster se gestionan con invitaciones y permisos admin.' : 'Roster fijo del equipo.'}
        </p>
        {canManage ? (
          <div className="mt-4">
            {canUseRosterActions && teamId && onInviteMember ? (
              <button
                type="button"
                className="rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black"
                onClick={() => onInviteMember({ teamId })}
              >
                Invitar miembro
              </button>
            ) : (
              <p className="text-xs font-semibold text-white/45">Acciones de roster pendientes: falta conectar callbacks seguros.</p>
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
                {canManage && member.role !== 'admin' && canUseRosterActions && teamId && onRemoveMember ? (
                  <button
                    type="button"
                    className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] font-black uppercase text-white/70"
                    onClick={() => onRemoveMember({ teamId, memberId: member.id })}
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
