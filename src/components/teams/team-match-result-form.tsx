'use client';

import { useState, type FormEvent } from 'react';
import { Flag } from 'lucide-react';
import type { CompleteTeamMatchData } from '@/lib/validations/teams';
import { completeTeamMatchSchema } from '@/lib/validations/teams';
import type { TeamId, TeamMatchId } from '@/lib/types/teams.types';

interface TeamMatchResultFormProps {
  teamId: TeamId;
  matchId: TeamMatchId;
  onCompleteMatch: (payload: CompleteTeamMatchData) => Promise<void>;
}

export function TeamMatchResultForm({ teamId, matchId, onCompleteMatch }: TeamMatchResultFormProps) {
  const [teamScore, setTeamScore] = useState('0');
  const [opponentScore, setOpponentScore] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = completeTeamMatchSchema.safeParse({
      teamId,
      matchId,
      teamScore: Number(teamScore),
      opponentScore: Number(opponentScore),
    });

    if (!parsed.success) {
      setError('Ingresá un resultado válido.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCompleteMatch(parsed.data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos cerrar el partido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-pitch-green" aria-hidden="true" />
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-pitch-green">Cerrar partido</p>
      </div>
      <p className="mt-2 text-xs font-semibold text-white/50">Cargá el resultado para habilitar los logros de los jugadores.</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-center">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">Tu equipo</span>
          <input aria-label="Goles de tu equipo" type="number" min="0" max="99" value={teamScore} onChange={(event) => setTeamScore(event.target.value)} className="rounded-xl bg-black/50 px-3 py-3 text-center font-headline text-2xl font-black text-white ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green" />
        </label>
        <label className="grid gap-1 text-center">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">Rival</span>
          <input aria-label="Goles del rival" type="number" min="0" max="99" value={opponentScore} onChange={(event) => setOpponentScore(event.target.value)} className="rounded-xl bg-black/50 px-3 py-3 text-center font-headline text-2xl font-black text-white ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green" />
        </label>
      </div>
      {error ? <p role="alert" className="mt-3 font-mono text-[10px] font-bold uppercase text-red-300">{error}</p> : null}
      <button type="submit" disabled={submitting} className="mt-4 w-full rounded-full bg-white/10 px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-pitch-green hover:text-black disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? 'Guardando resultado...' : 'Finalizar partido'}
      </button>
    </form>
  );
}
