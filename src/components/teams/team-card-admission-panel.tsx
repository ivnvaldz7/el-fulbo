'use client';

import { useState } from 'react';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { TeamCardAdmissionView, TeamCardSnapshotStatus } from '@/lib/types/teams.types';

const statusLabels: Record<TeamCardSnapshotStatus, string> = {
  draft: 'Falta card',
  pending: 'Pendiente',
  approved: 'Admitido',
  rejected: 'Rechazado',
};

const positionLabels = { ARQ: 'Arquero', DEF: 'Defensor', MED: 'Mediocampista', DEL: 'Delantero' } as const;

export function TeamCardAdmissionPanel({
  admissions,
  currentUserId,
  canManage,
  onReviewAdmission,
  onResubmitAdmission,
}: {
  admissions: TeamCardAdmissionView[];
  currentUserId: string | null;
  canManage: boolean;
  onReviewAdmission?: (payload: {
    userId: string;
    status: Extract<TeamCardSnapshotStatus, 'approved' | 'rejected'>;
    rejectionReason?: string | null;
  }) => void;
  onResubmitAdmission?: () => void;
}) {
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const ownAdmission = admissions.find((admission) => admission.userId === currentUserId) ?? null;

  function confirmRejection(userId: string) {
    const reason = rejectionReason.trim();
    if (!reason) return;
    onReviewAdmission?.({ userId, status: 'rejected', rejectionReason: reason });
    setRejectingUserId(null);
    setRejectionReason('');
  }

  if (!canManage) {
    return (
      <section aria-labelledby="admission-heading" className="space-y-4">
        <header>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Admisión al equipo</p>
          <h2 id="admission-heading" className="mt-2 font-headline text-3xl font-black italic uppercase text-white">Tu estado</h2>
        </header>
        {ownAdmission ? <AdmissionCard admission={ownAdmission} /> : (
          <div className="rounded-[1.35rem] border border-dashed border-white/15 p-5">
            <p className="text-sm font-semibold leading-6 text-white/55">Todavía no tenés una card asociada a este equipo.</p>
            <Link href={routes.teamCard} className="mt-4 inline-flex rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">Crear card</Link>
          </div>
        )}
        {ownAdmission?.status === 'rejected' && onResubmitAdmission ? (
          <button type="button" onClick={onResubmitAdmission} className="rounded-full bg-pitch-green px-5 py-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Reenviar card para revisión
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="admission-heading" className="space-y-5">
      <header>
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Control de acceso</p>
        <h2 id="admission-heading" className="mt-2 font-headline text-3xl font-black italic uppercase text-white">Admisiones de cards</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/55">Revisá la card global antes de admitir al jugador en este equipo.</p>
      </header>
      <div className="grid gap-3">
        {admissions.length > 0 ? admissions.map((admission) => (
          <article key={admission.userId} className="rounded-[1.35rem] bg-white/7 p-4 ring-1 ring-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-headline text-xl font-black uppercase text-white">{admission.playerName}</h3>
                <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{formatPositions(admission)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.14em] ${admission.status === 'approved' ? 'bg-pitch-green/15 text-pitch-green' : admission.status === 'rejected' ? 'bg-red-500/15 text-red-300' : 'bg-black/35 text-white/65'}`}>
                {statusLabels[admission.status]}
              </span>
            </div>
            {admission.cardStats ? <StatsSummary stats={admission.cardStats} /> : <p className="mt-4 text-sm font-semibold text-white/45">El jugador todavía no creó su card global.</p>}
            {admission.rejectionReason ? <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-3 text-xs font-semibold leading-5 text-red-200">Motivo: {admission.rejectionReason}</p> : null}
            {admission.status === 'pending' && onReviewAdmission ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onReviewAdmission({ userId: admission.userId, status: 'approved' })} className="rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-black">Admitir</button>
                  {rejectingUserId !== admission.userId ? <button type="button" onClick={() => { setRejectingUserId(admission.userId); setRejectionReason(''); }} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Rechazar</button> : null}
                </div>
                {rejectingUserId === admission.userId ? (
                  <div className="space-y-3 rounded-xl bg-red-500/10 p-3 ring-1 ring-red-400/20">
                    <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={2} placeholder="Motivo del rechazo..." className="w-full resize-none rounded-lg bg-black/50 px-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-red-400/50" />
                    <div className="flex gap-2">
                      <button type="button" disabled={!rejectionReason.trim()} onClick={() => confirmRejection(admission.userId)} className="rounded-full bg-red-400 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-black disabled:opacity-50">Confirmar</button>
                      <button type="button" onClick={() => { setRejectingUserId(null); setRejectionReason(''); }} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Cancelar</button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        )) : <p className="rounded-[1.35rem] border border-dashed border-white/15 p-5 text-sm font-semibold text-white/45">No hay admisiones registradas todavía.</p>}
      </div>
    </section>
  );
}

function AdmissionCard({ admission }: { admission: TeamCardAdmissionView }) {
  return (
    <div className="rounded-[1.35rem] bg-white/7 p-5 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Estado actual</span>
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-pitch-green">{statusLabels[admission.status]}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/60">{statusCopy[admission.status]}</p>
      {formatPositions(admission) ? <p className="mt-4 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{formatPositions(admission)}</p> : null}
      {admission.rejectionReason ? <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-3 text-xs font-semibold leading-5 text-red-200">Motivo: {admission.rejectionReason}</p> : null}
    </div>
  );
}

const statusCopy: Record<TeamCardSnapshotStatus, string> = {
  draft: 'Creá tu card global para poder enviarla a revisión.',
  pending: 'Un admin del equipo tiene que revisar tu card antes de admitirte.',
  approved: 'Tu card fue aprobada y ya podés participar del progreso del equipo.',
  rejected: 'Corregí tu card si hace falta y reenviála para que el admin la vuelva a revisar.',
};

function formatPositions(admission: TeamCardAdmissionView) {
  if (!admission.positions) return '';
  return `${positionLabels[admission.positions.primary]} / ${positionLabels[admission.positions.secondary]}`;
}

function StatsSummary({ stats }: { stats: NonNullable<TeamCardAdmissionView['cardStats']> }) {
  return <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{Object.entries(stats).map(([key, value]) => <div key={key} className="rounded-lg bg-black/25 px-2 py-2 text-center"><dt className="font-headline text-lg font-black text-white">{value}</dt><dd className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white/35">{key}</dd></div>)}</dl>;
}
