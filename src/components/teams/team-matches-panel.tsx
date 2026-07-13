'use client';

import type { FormEvent } from 'react';
import type { TeamId, TeamMatchId, TeamMatchSignupStatus, TeamMatchView, TeamStatKind } from '@/lib/types/teams.types';

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

interface TeamMatchesPanelProps {
  teamId: TeamId;
  matches: TeamMatchView[];
  onSignup?: (payload: { teamId: TeamId; matchId: TeamMatchId; status: TeamMatchSignupStatus }) => void;
  onSubmitStat?: (payload: { teamId: TeamId; matchId: TeamMatchId; statKind: TeamStatKind; value: number }) => void;
}

function getMatchLabel(match: TeamMatchView) {
  return match.opponentName ?? 'Partido cerrado';
}

export function TeamMatchesPanel({ teamId, matches, onSignup, onSubmitStat }: TeamMatchesPanelProps) {
  function submitStat(event: FormEvent<HTMLFormElement>, matchId: TeamMatchId) {
    event.preventDefault();

    if (!onSubmitStat) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const statKind = formData.get('statKind') as TeamStatKind;
    const value = Number(formData.get('value'));

    onSubmitStat({ teamId, matchId, statKind, value });
  }

  return (
    <section aria-labelledby="matches-heading" className="space-y-4">
      <header>
        <h2 id="matches-heading" className="font-headline text-3xl font-black italic uppercase text-white">Matches</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">La inscripción se habilita desde el contrato de partido. Esta vista no finge mutaciones.</p>
      </header>
      <div className="grid gap-3">
        {matches.length > 0 ? matches.map((match) => (
          <article key={match.id} className="rounded-[1.35rem] bg-white/7 p-4 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-black uppercase text-white">{match.opponentName ?? 'Rival a definir'}</h3>
                <p className="mt-1 text-sm font-semibold text-white/55">{match.fieldName ?? 'Cancha a confirmar'} · {formatMatchDate(match.scheduledAt)}</p>
              </div>
              <span className="rounded-full bg-black/40 px-3 py-1 font-mono text-[10px] font-black uppercase text-white/60">{match.status}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green">{match.signupCount} anotados</span>
              {match.status === 'played' ? (
                <span className="font-headline text-2xl font-black text-white">{match.teamScore ?? 0} - {match.opponentScore ?? 0}</span>
              ) : null}
            </div>
            {match.status === 'scheduled' ? (
              <div className="mt-4">
                {onSignup ? (
                  <button
                    type="button"
                    className="rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black"
                    onClick={() => onSignup({ teamId, matchId: match.id, status: 'going' })}
                  >
                    Anotarme contra {match.opponentName ?? 'rival a definir'}
                  </button>
                ) : (
                  <p className="text-xs font-semibold text-white/45">Inscripción pendiente: falta conectar callback seguro.</p>
                )}
              </div>
            ) : null}
            {match.status === 'played' ? (
              <div className="mt-4">
                {onSubmitStat ? (
                  <form className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]" onSubmit={(event) => submitStat(event, match.id)}>
                    <label className="grid gap-1 text-xs font-bold uppercase text-white/55" htmlFor={`stat-kind-${match.id}`}>
                      Stat para {getMatchLabel(match)}
                      <select id={`stat-kind-${match.id}`} name="statKind" className="rounded-xl bg-black/60 px-3 py-2 text-white">
                        <option value="goals">goals</option>
                        <option value="assists">assists</option>
                        <option value="tackles">tackles</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase text-white/55" htmlFor={`stat-value-${match.id}`}>
                      Valor para {getMatchLabel(match)}
                      <input id={`stat-value-${match.id}`} name="value" type="number" min="0" defaultValue="1" className="rounded-xl bg-black/60 px-3 py-2 text-white" />
                    </label>
                    <button type="submit" className="self-end rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">
                      Cargar stat de {getMatchLabel(match)}
                    </button>
                  </form>
                ) : (
                  <p className="text-xs font-semibold text-white/45">Carga de stats pendiente: falta conectar callback seguro.</p>
                )}
              </div>
            ) : null}
          </article>
        )) : (
          <p className="rounded-[1.35rem] border border-dashed border-white/15 p-6 text-sm font-semibold text-white/55">No scheduled matches yet.</p>
        )}
      </div>
    </section>
  );
}
