'use client';

import { useState } from 'react';
import type { TeamStatSubmissionId, TeamSubmissionStatus, TeamSubmissionView } from '@/lib/types/teams.types';

const statusLabel = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' } as const;

interface TeamModerationPanelProps {
  submissions: TeamSubmissionView[];
  canModerate: boolean;
  onReviewSubmission?: (payload: {
    submissionId: TeamStatSubmissionId;
    status: Extract<TeamSubmissionStatus, 'approved' | 'rejected'>;
    rejectionReason?: string | null;
  }) => void;
}

export function TeamModerationPanel({ submissions, canModerate, onReviewSubmission }: TeamModerationPanelProps) {
  const [rejectingId, setRejectingId] = useState<TeamStatSubmissionId | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  function handleConfirmReject(submissionId: TeamStatSubmissionId) {
    if (!rejectionReason.trim()) return;
    onReviewSubmission?.({ submissionId, status: 'rejected', rejectionReason: rejectionReason.trim() });
    setRejectingId(null);
    setRejectionReason('');
  }

  function handleCancelReject() {
    setRejectingId(null);
    setRejectionReason('');
  }

  if (!canModerate) {
    return (
      <section aria-labelledby="moderation-heading" className="space-y-4">
        <header>
          <h2 id="moderation-heading" className="font-headline text-3xl font-black italic uppercase text-white">Moderation</h2>
          <p className="mt-2 text-sm font-semibold text-white/55">Solo admins pueden revisar stats pendientes.</p>
        </header>
        <p className="rounded-[1.35rem] border border-dashed border-white/15 p-6 text-sm font-semibold text-white/55">
          Pedile a un admin del equipo que revise la cola de moderación.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="moderation-heading" className="space-y-4">
      <header>
        <h2 id="moderation-heading" className="font-headline text-3xl font-black italic uppercase text-white">Moderation</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">
          La aprobación y rechazo usan RPCs del servicio.
        </p>
        {!onReviewSubmission ? (
          <p className="mt-2 text-xs font-semibold text-white/45">Moderación pendiente: falta conectar callback seguro.</p>
        ) : null}
      </header>
      <div className="grid gap-3">
        {submissions.length > 0 ? submissions.map((submission) => (
          <article key={submission.id} className="rounded-[1.35rem] bg-white/7 p-4 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-black uppercase text-white">{submission.playerName}</h3>
                <p className="mt-1 text-sm font-semibold text-white/55">{submission.matchLabel}</p>
              </div>
              <span className="rounded-full bg-black/40 px-3 py-1 font-mono text-[10px] font-black uppercase text-white/70">{statusLabel[submission.status]}</span>
            </div>
            <p className="mt-4 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green">{submission.value} {submission.statKind}</p>

            {submission.status === 'pending' && onReviewSubmission ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black"
                    onClick={() => onReviewSubmission({ submissionId: submission.id, status: 'approved' })}
                  >
                    Aprobar stat de {submission.playerName}
                  </button>
                  {rejectingId === submission.id ? null : (
                    <button
                      type="button"
                      className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70"
                      onClick={() => { setRejectingId(submission.id); setRejectionReason(''); }}
                    >
                      Rechazar stat de {submission.playerName}
                    </button>
                  )}
                </div>

                {rejectingId === submission.id ? (
                  <div className="space-y-3 rounded-[1.35rem] border border-red-500/30 bg-red-500/10 p-4">
                    <label className="grid gap-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
                        Motivo del rechazo
                      </span>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explicá por qué se rechaza esta stat..."
                        rows={2}
                        className="w-full resize-none rounded-xl bg-black/60 px-3 py-2 text-sm text-white placeholder-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-red-500/50"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!rejectionReason.trim()}
                        className="rounded-full bg-red-500 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black disabled:opacity-50"
                        onClick={() => handleConfirmReject(submission.id)}
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70"
                        onClick={handleCancelReject}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        )) : (
          <p className="rounded-[1.35rem] border border-dashed border-white/15 p-6 text-sm font-semibold text-white/55">No submissions to moderate.</p>
        )}
      </div>
    </section>
  );
}
