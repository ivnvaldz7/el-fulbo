'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { CalendarClock, CheckCircle2, CircleX, Users } from 'lucide-react';
import type { PlayerPosition } from '@/lib/types';
import type { TeamId, TeamMatchId, TeamMatchSignupStatus, TeamMatchView, TeamStatKind } from '@/lib/types/teams.types';
import type { CreateTeamMatchData } from '@/lib/validations/teams';
import { TeamMatchCreateForm } from './team-match-create-form';
import { TeamMatchShareButton } from './team-match-share-button';
import { TeamMatchResultForm } from './team-match-result-form';

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

interface TeamMatchesPanelProps {
  teamId: TeamId;
  matches: TeamMatchView[];
  members?: Array<{ userId: string; displayName: string }>;
  onSignup?: (payload: { teamId: TeamId; matchId: TeamMatchId; status: TeamMatchSignupStatus }) => void;
  onSubmitStat?: (payload: { teamId: TeamId; matchId: TeamMatchId; statKind: TeamStatKind; value: number }) => void;
  onSetMvp?: (payload: { teamId: TeamId; matchId: TeamMatchId; mvpUserId: string | null }) => void;
  onVoteMvp?: (payload: { teamId: TeamId; matchId: TeamMatchId; votedPlayerId: string }) => void;
  onResolveMvp?: (payload: { teamId: TeamId; matchId: TeamMatchId }) => void;
  canManage?: boolean;
  onCreateMatch?: (payload: CreateTeamMatchData) => Promise<void>;
  onCompleteMatch?: (payload: { teamId: TeamId; matchId: TeamMatchId; teamScore: number; opponentScore: number }) => Promise<void>;
  highlightedMatchId?: TeamMatchId | null;
  currentUserPositions?: PlayerPosition[];
}

function getMatchLabel(match: TeamMatchView) {
  return match.opponentName ?? 'Partido cerrado';
}

export function TeamMatchesPanel({ teamId, matches, members, onSignup, onSubmitStat, onSetMvp, onVoteMvp, onResolveMvp, canManage, onCreateMatch, onCompleteMatch, highlightedMatchId, currentUserPositions }: TeamMatchesPanelProps) {
  const [mvpSelectId, setMvpSelectId] = useState<TeamMatchId | null>(null);
  const upcomingMatches = matches.filter((match) => match.status === 'scheduled');
  const finishedMatches = matches.filter((match) => match.status !== 'scheduled');

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
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/55">Las convocatorias aparecen acá. Confirmá tu asistencia en los próximos partidos y, después del cierre, cargá tu stat para sumar al historial.</p>
      </header>
      {canManage && onCreateMatch ? <TeamMatchCreateForm teamId={teamId} onCreateMatch={onCreateMatch} /> : null}
      <MatchGroup heading="Próximas convocatorias" matches={upcomingMatches}>
        {upcomingMatches.map((match) => (
          <article key={match.id} id={`team-match-${match.id}`} className={`rounded-[1.35rem] bg-white/7 p-4 ring-1 transition ${highlightedMatchId === match.id ? 'ring-pitch-green shadow-[0_0_0_3px_rgba(34,197,94,0.16)]' : 'ring-white/10'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-black uppercase text-white">{match.opponentName ?? 'Rival a definir'}</h3>
                <p className="mt-1 text-sm font-semibold text-white/55">{match.fieldName ?? 'Cancha a confirmar'} · {formatMatchDate(match.scheduledAt)}</p>
              </div>
              <MatchStatusBadge status={match.status} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green"><Users className="h-4 w-4" aria-hidden="true" />{match.signupCount} anotados</span>
              {canManage ? <TeamMatchShareButton teamId={teamId} matchId={match.id} matchLabel={match.opponentName ?? 'rival a definir'} /> : null}
            </div>
            {canManage && onCompleteMatch ? <TeamMatchResultForm teamId={teamId} matchId={match.id} onCompleteMatch={onCompleteMatch} /> : null}
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
              <>
                {match.mvpUserName ? (
                  <div className="mt-4 rounded-[1.35rem] bg-yellow-500/10 p-3 ring-1 ring-yellow-500/30">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">
                      MVP: {match.mvpUserName}
                    </span>
                  </div>
                ) : null}

                {onSetMvp && mvpSelectId !== match.id ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70"
                      onClick={() => setMvpSelectId(match.id)}
                    >
                      {match.mvpUserName ? 'Cambiar MVP' : 'Elegir MVP manual'}
                    </button>
                    {!match.mvpUserName && onResolveMvp ? (
                      <button
                        type="button"
                        className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-yellow-500"
                        onClick={() => onResolveMvp({ teamId, matchId: match.id })}
                      >
                        Resolver MVP (Votos)
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {!match.mvpUserName && !match.hasVotedForMvp && onVoteMvp ? (
                  <div className="mt-4 space-y-3 rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                    <label className="grid gap-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                        Votar por el MVP:
                      </span>
                      <select
                        className="w-full rounded-xl bg-black/60 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none"
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          onVoteMvp({ teamId, matchId: match.id, votedPlayerId: e.target.value });
                        }}
                      >
                        <option value="">Elegir compañero</option>
                        {(members ?? []).map((m) => (
                          <option key={m.userId} value={m.userId}>{m.displayName}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                {!match.mvpUserName && match.hasVotedForMvp ? (
                  <div className="mt-4 rounded-[1.35rem] bg-white/5 p-3 ring-1 ring-white/10">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                      Ya votaste al MVP
                    </span>
                  </div>
                ) : null}

                {onSetMvp && mvpSelectId === match.id ? (
                  <div className="mt-4 space-y-3 rounded-[1.35rem] border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <label className="grid gap-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">
                        {match.mvpUserName ? 'Cambiar MVP:' : 'MVP del partido:'}
                      </span>
                      <select
                        className="w-full rounded-xl bg-black/60 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-yellow-500/50"
                        defaultValue={match.mvpUserId ?? ''}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          onSetMvp({ teamId, matchId: match.id, mvpUserId: e.target.value || null });
                          setMvpSelectId(null);
                        }}
                      >
                        <option value="">Sin MVP</option>
                        {(members ?? []).map((m) => (
                          <option key={m.userId} value={m.userId}>{m.displayName}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70"
                      onClick={() => setMvpSelectId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : null}

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
              </>
            ) : null}
          </article>
        ))}
      </MatchGroup>
      {finishedMatches.length > 0 ? <MatchGroup heading="Historial" matches={finishedMatches}>
        {finishedMatches.map((match) => (
          <article key={match.id} id={`team-match-${match.id}`} className="rounded-[1.35rem] bg-white/7 p-4 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-black uppercase text-white">{match.opponentName ?? 'Rival a definir'}</h3>
                <p className="mt-1 text-sm font-semibold text-white/55">{match.fieldName ?? 'Cancha a confirmar'} · {formatMatchDate(match.scheduledAt)}</p>
              </div>
              <MatchStatusBadge status={match.status} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/55"><Users className="h-4 w-4" aria-hidden="true" />{match.signupCount} anotados</span>
              {match.status === 'played' ? <span className="font-headline text-2xl font-black text-white">{match.teamScore ?? 0} - {match.opponentScore ?? 0}</span> : null}
            </div>
            {match.status === 'played' ? (
              <PlayedMatchDetails
                match={match}
                teamId={teamId}
                members={members}
                mvpSelectId={mvpSelectId}
                setMvpSelectId={setMvpSelectId}
                onSetMvp={onSetMvp}
                onVoteMvp={onVoteMvp}
                onResolveMvp={onResolveMvp}
                onSubmitStat={onSubmitStat}
                submitStat={submitStat}
                currentUserPositions={currentUserPositions}
              />
            ) : null}
          </article>
        ))}
      </MatchGroup> : null}
    </section>
  );
}

function MatchGroup({ heading, matches, children }: { heading: string; matches: TeamMatchView[]; children: ReactNode }) {
  return (
    <section aria-label={heading} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-headline text-xl font-black italic uppercase text-white">{heading}</h3>
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{matches.length}</span>
      </div>
      <div className="grid gap-3">
        {matches.length > 0 ? children : <p className="rounded-[1.35rem] border border-dashed border-white/15 p-6 text-sm font-semibold text-white/45">Todavía no hay partidos en esta sección.</p>}
      </div>
    </section>
  );
}

function PlayedMatchDetails({
  match,
  teamId,
  members,
  mvpSelectId,
  setMvpSelectId,
  onSetMvp,
  onVoteMvp,
  onResolveMvp,
  onSubmitStat,
  submitStat,
  currentUserPositions,
}: {
  match: TeamMatchView;
  teamId: TeamId;
  members?: Array<{ userId: string; displayName: string }>;
  mvpSelectId: TeamMatchId | null;
  setMvpSelectId: (matchId: TeamMatchId | null) => void;
  onSetMvp?: (payload: { teamId: TeamId; matchId: TeamMatchId; mvpUserId: string | null }) => void;
  onVoteMvp?: (payload: { teamId: TeamId; matchId: TeamMatchId; votedPlayerId: string }) => void;
  onResolveMvp?: (payload: { teamId: TeamId; matchId: TeamMatchId }) => void;
  onSubmitStat?: (payload: { teamId: TeamId; matchId: TeamMatchId; statKind: TeamStatKind; value: number }) => void;
  submitStat: (event: FormEvent<HTMLFormElement>, matchId: TeamMatchId) => void;
  currentUserPositions?: PlayerPosition[];
}) {
  return (
    <>
      {match.mvpUserName ? <div className="mt-4 rounded-[1.35rem] bg-yellow-500/10 p-3 ring-1 ring-yellow-500/30"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">MVP: {match.mvpUserName}</span></div> : null}
      {onSetMvp && mvpSelectId !== match.id ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70" onClick={() => setMvpSelectId(match.id)}>
            {match.mvpUserName ? 'Cambiar MVP' : 'Elegir MVP manual'}
          </button>
          {!match.mvpUserName && onResolveMvp ? <button type="button" className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-yellow-500" onClick={() => onResolveMvp({ teamId, matchId: match.id })}>Resolver MVP (Votos)</button> : null}
        </div>
      ) : null}
      {!match.mvpUserName && !match.hasVotedForMvp && onVoteMvp ? (
        <div className="mt-4 space-y-3 rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
          <label className="grid gap-1"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Votar por el MVP:</span><select className="w-full rounded-xl bg-black/60 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none" defaultValue="" onChange={(event) => { if (event.target.value) onVoteMvp({ teamId, matchId: match.id, votedPlayerId: event.target.value }); }}><option value="">Elegir compañero</option>{(members ?? []).map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></label>
        </div>
      ) : null}
      {!match.mvpUserName && match.hasVotedForMvp ? <div className="mt-4 rounded-[1.35rem] bg-white/5 p-3 ring-1 ring-white/10"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Ya votaste al MVP</span></div> : null}
      {onSetMvp && mvpSelectId === match.id ? (
        <div className="mt-4 space-y-3 rounded-[1.35rem] border border-yellow-500/30 bg-yellow-500/10 p-4">
          <label className="grid gap-1"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">{match.mvpUserName ? 'Cambiar MVP:' : 'MVP del partido:'}</span><select className="w-full rounded-xl bg-black/60 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-yellow-500/50" defaultValue={match.mvpUserId ?? ''} onChange={(event) => { if (event.target.value) { onSetMvp({ teamId, matchId: match.id, mvpUserId: event.target.value }); setMvpSelectId(null); } }}><option value="">Sin MVP</option>{(members ?? []).map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></label>
          <button type="button" className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/70" onClick={() => setMvpSelectId(null)}>Cancelar</button>
        </div>
      ) : null}
      {onSubmitStat ? <PlayerAchievementPrompt match={match} teamId={teamId} currentUserPositions={currentUserPositions} onSubmitStat={onSubmitStat} /> : <p className="mt-4 text-xs font-semibold text-white/45">Carga de stats pendiente: falta conectar callback seguro.</p>}
    </>
  );
}

function PlayerAchievementPrompt({
  match,
  teamId,
  currentUserPositions,
  onSubmitStat,
}: {
  match: TeamMatchView;
  teamId: TeamId;
  currentUserPositions?: PlayerPosition[];
  onSubmitStat: (payload: { teamId: TeamId; matchId: TeamMatchId; statKind: TeamStatKind; value: number }) => void;
}) {
  const allowedKinds = getAllowedStatKinds(currentUserPositions);
  const [statKind, setStatKind] = useState<TeamStatKind>(allowedKinds[0] ?? 'goals');
  const [value, setValue] = useState('1');
  const submitted = match.submittedStats?.find((entry) => entry.statKind === statKind);

  if (submitted?.status === 'approved') {
    return <p className="mt-4 rounded-xl bg-pitch-green/10 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-pitch-green">Logro registrado y aprobado: {statKindLabel(statKind)}</p>;
  }

  return (
    <div className="mt-4 rounded-[1.25rem] border border-pitch-green/20 bg-pitch-green/[0.06] p-4">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-pitch-green">Después del partido</p>
      <h4 className="mt-1 font-headline text-xl font-black italic uppercase text-white">¿Qué lograste?</h4>
      <p className="mt-1 text-xs font-semibold leading-5 text-white/50">Elegí un logro compatible con tu posición y cargá la cantidad.</p>
      {allowedKinds.length > 0 ? (
        <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_auto]" onSubmit={(event) => { event.preventDefault(); onSubmitStat({ teamId, matchId: match.id, statKind, value: Number(value) }); }}>
          <label className="grid gap-1 text-xs font-bold uppercase text-white/55" htmlFor={`achievement-kind-${match.id}`}>Logro<select id={`achievement-kind-${match.id}`} value={statKind} onChange={(event) => setStatKind(event.target.value as TeamStatKind)} className="rounded-xl bg-black/60 px-3 py-2 text-white">{allowedKinds.map((kind) => <option key={kind} value={kind}>{statKindLabel(kind)}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold uppercase text-white/55" htmlFor={`achievement-value-${match.id}`}>Cantidad<input id={`achievement-value-${match.id}`} type="number" min="0" max="99" value={value} onChange={(event) => setValue(event.target.value)} className="rounded-xl bg-black/60 px-3 py-2 text-white" /></label>
          <button type="submit" className="self-end rounded-full bg-pitch-green px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">{submitted?.status === 'pending' ? 'Actualizar logro' : 'Guardar logro'}</button>
        </form>
      ) : <p className="mt-3 text-xs font-semibold text-white/45">Tu Card Global todavía no tiene una posición compatible para cargar este logro.</p>}
    </div>
  );
}

function getAllowedStatKinds(positions?: PlayerPosition[]): TeamStatKind[] {
  if (!positions) return ['goals', 'assists', 'tackles'];
  const allowed: TeamStatKind[] = [];
  if (positions.includes('DEL')) allowed.push('goals');
  if (positions.includes('MED')) allowed.push('assists');
  if (positions.includes('DEF') || positions.includes('ARQ')) allowed.push('tackles');
  return allowed;
}

function statKindLabel(statKind: TeamStatKind) {
  return { goals: 'Goles', assists: 'Asistencias', tackles: 'Quites' }[statKind];
}

function MatchStatusBadge({ status }: { status: TeamMatchView['status'] }) {
  const metadata = {
    scheduled: { label: 'Próximo', icon: CalendarClock, className: 'text-pitch-green' },
    played: { label: 'Jugado', icon: CheckCircle2, className: 'text-white/60' },
    cancelled: { label: 'Cancelado', icon: CircleX, className: 'text-red-300' },
  }[status];
  const Icon = metadata.icon;

  return (
    <span title={metadata.label} aria-label={metadata.label} className={`flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 ${metadata.className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{metadata.label}</span>
    </span>
  );
}
