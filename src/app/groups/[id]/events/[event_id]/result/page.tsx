'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { EventsService, type DrawTeamSummary } from '@/lib/services/events.service';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { EventId, GroupId, PlayerId } from '@/lib/types';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';

type DraftState = {
  teamAScore: number;
  teamBScore: number;
  mvpPlayerId: PlayerId | null;
  notes: string;
};

function getDraftKey(eventId: EventId) {
  return `event-result-draft-${eventId}`;
}

export default function EventResultPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as GroupId;
  const eventId = params.event_id as EventId;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const eventsService = useMemo(() => new EventsService(supabase), [supabase]);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['event-result', eventId],
    queryFn: async () => {
      const eventResult = await eventsService.getEventById(eventId);
      if (!eventResult.ok) throw new Error(eventResult.error.message);
      const nextEvent = eventResult.data;

      const [teamsResult, adminResult] = await Promise.all([
        eventsService.getTeamsSummary(eventId),
        eventsService.isCurrentUserAdminOrOwner(nextEvent.group_id),
      ]);

      if (!teamsResult.ok) throw new Error(teamsResult.error.message);
      if (!adminResult.ok) throw new Error(adminResult.error.message);

      return {
        event: nextEvent,
        teams: teamsResult.data,
        isAdminOrOwner: adminResult.data,
      };
    },
    meta: {
      errorMessage: 'No pudimos cargar el resultado.',
    },
  });

  const event = data?.event ?? null;
  const isAdminOrOwner = data?.isAdminOrOwner ?? false;

  const [draftState] = useState(() => {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(getDraftKey(eventId));
      if (raw) {
        try {
          return { draft: JSON.parse(raw) as DraftState, hasDraft: true };
        } catch {
          window.localStorage.removeItem(getDraftKey(eventId));
        }
      }
    }
    return { hasDraft: false, draft: undefined };
  });

  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [teamAScore, setTeamAScore] = useState(draftState.draft?.teamAScore ?? 0);
  const [teamBScore, setTeamBScore] = useState(draftState.draft?.teamBScore ?? 0);
  const [mvpPlayerId, setMvpPlayerId] = useState<PlayerId | null>(draftState.draft?.mvpPlayerId ?? null);
  const [notes, setNotes] = useState(draftState.draft?.notes ?? '');

  const participants = useMemo(() => {
    const teams = data?.teams ?? [];
    return teams.flatMap((team) =>
      team.players.map((player) => ({
        ...player,
        teamName: team.name,
      })),
    );
  }, [data?.teams]);

  useEffect(() => {
    if (draftState.hasDraft) {
      toast.success('Retomamos el resultado que estabas cargando');
    }
  }, [draftState.hasDraft]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = setTimeout(() => {
      const draft: DraftState = {
        teamAScore,
        teamBScore,
        mvpPlayerId,
        notes,
      };
      window.localStorage.setItem(getDraftKey(eventId), JSON.stringify(draft));
    }, 500);
    return () => clearTimeout(handler);
  }, [eventId, mvpPlayerId, notes, teamAScore, teamBScore]);

  function validateBeforeConfirm() {
    if (teamAScore < 0 || teamAScore > 99 || teamBScore < 0 || teamBScore > 99) {
      toast.error('El score tiene que estar entre 0 y 99.');
      return false;
    }

    if (mvpPlayerId && !participants.some((player) => player.playerId === mvpPlayerId)) {
      toast.error('Elegí un MVP que haya jugado.');
      return false;
    }

    if (notes.trim().length > 300) {
      toast.error('Las notas no pueden superar los 300 caracteres.');
      return false;
    }

    return true;
  }

  async function handleConfirmResult() {
    if (!validateBeforeConfirm()) {
      return;
    }

    setSaving(true);
    try {
      const result = await eventsService.loadMatchResult({
        eventId,
        teamAScore,
        teamBScore,
        mvpPlayerId,
        notes: notes.trim() || null,
      });
      if (!result.ok) throw new Error(result.error.message);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(getDraftKey(eventId));
      }

      toast.success('Resultado cargado.');
      router.push(`/groups/${groupId}/events/${eventId}`);
    } catch (error) {
      console.error(error);
      toast.error('No pudimos cargar el resultado.');
    } finally {
      setSaving(false);
      setShowConfirmModal(false);
    }
  }

  if (loading) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Resultado</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">Cargando datos del partido...</h2>
      </ImmersiveScreen>
    );
  }

  if (!event || event.status !== 'drawn') {
    return (
      <ImmersiveScreen align="center" contentClassName="max-w-md mx-auto text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Sin acceso</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">El partido todavía no está listo para cargar el resultado.</h2>
      </ImmersiveScreen>
    );
  }

  return (
    <ImmersiveScreen contentClassName="max-w-3xl mx-auto space-y-4">
      <PageHeader title="RESULTADO" backHref={`/groups/${groupId}/events/${eventId}`} />
      {showConfirmModal ? (
        <ConfirmationModal
          title="¿Confirmás el resultado?"
          message="Una vez cargado, se van a aplicar los boosts a los jugadores. Esto no se puede deshacer fácilmente."
          onConfirm={() => void handleConfirmResult()}
          onCancel={() => setShowConfirmModal(false)}
          loading={saving}
        />
      ) : null}

      <div className="mt-16 space-y-4">
        <header className="border border-white/10 bg-concrete-overlay p-5">
          <button
            type="button"
            onClick={() => router.push(`/groups/${groupId}/events/${eventId}`)}
            className="text-sm text-white/60 underline"
          >
            Volver
          </button>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-pitch-green">Resultado del partido</p>
          <h1 className="mt-2 font-headline text-3xl font-black italic uppercase">{event.field_name}</h1>
          <p className="mt-2 text-sm text-white/70">{new Date(event.scheduled_at).toLocaleString('es-AR')}</p>
        </header>

        <section className="border border-white/10 bg-concrete-overlay p-5 md:p-8">
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-center md:gap-16">
            <div className="flex flex-col items-center gap-4">
              <p className="font-headline text-2xl font-black italic uppercase text-center text-white max-w-[200px] truncate">{event.team_a_name ?? 'Equipo A'}</p>
              <div className="flex items-center gap-6 border-2 border-white/10 bg-black/40 px-4 py-2 rounded-xl">
                {isAdminOrOwner ? (
                  <button
                    type="button"
                    onClick={() => setTeamAScore(Math.max(0, teamAScore - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl font-bold text-white hover:bg-white/20 active:scale-95 transition-all"
                  >
                    -
                  </button>
                ) : null}
                <span className="w-16 text-center font-headline text-6xl font-black italic text-white">{teamAScore}</span>
                {isAdminOrOwner ? (
                  <button
                    type="button"
                    onClick={() => setTeamAScore(teamAScore + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white hover:bg-white/20 active:scale-95 transition-all"
                  >
                    +
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex justify-center md:block">
              <span className="font-headline text-3xl font-black italic text-white/20">VS</span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <p className="font-headline text-2xl font-black italic uppercase text-center text-white max-w-[200px] truncate">{event.team_b_name ?? 'Equipo B'}</p>
              <div className="flex items-center gap-6 border-2 border-white/10 bg-black/40 px-4 py-2 rounded-xl">
                {isAdminOrOwner ? (
                  <button
                    type="button"
                    onClick={() => setTeamBScore(Math.max(0, teamBScore - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl font-bold text-white hover:bg-white/20 active:scale-95 transition-all"
                  >
                    -
                  </button>
                ) : null}
                <span className="w-16 text-center font-headline text-6xl font-black italic text-white">{teamBScore}</span>
                {isAdminOrOwner ? (
                  <button
                    type="button"
                    onClick={() => setTeamBScore(teamBScore + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white hover:bg-white/20 active:scale-95 transition-all"
                  >
                    +
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {isAdminOrOwner ? (
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => { setTeamAScore(1); setTeamBScore(0); }}
                className="btn-interactive border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white/10"
              >
                Ganó {event.team_a_name ?? 'Equipo A'}
              </button>
              <button
                type="button"
                onClick={() => { setTeamAScore(0); setTeamBScore(0); }}
                className="btn-interactive border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white/10"
              >
                Empate
              </button>
              <button
                type="button"
                onClick={() => { setTeamAScore(0); setTeamBScore(1); }}
                className="btn-interactive border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white/10"
              >
                Ganó {event.team_b_name ?? 'Equipo B'}
              </button>
            </div>
          ) : null}
        </section>

        <section className="border border-white/10 bg-concrete-overlay p-5">
          <h2 className="font-headline text-2xl font-black italic uppercase">¿Quién fue la figura?</h2>
          <p className="mt-1 text-sm text-white/60">
            {isAdminOrOwner
              ? 'Elegí un jugador de cualquier equipo. Si no elegís a nadie, los jugadores podrán votar desde la app.'
              : 'Votá por el jugador que creés que fue la figura del partido.'}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {participants.map((player) => {
              const selected = mvpPlayerId === player.playerId;
              return (
                <button
                  key={player.playerId}
                  type="button"
                  onClick={() => setMvpPlayerId(player.playerId)}
                  className={`border px-4 py-3 text-left ${
                    selected ? 'border-amber-400 bg-amber-400/15' : 'border-white/10 bg-white/[0.04]'
                  }`}
                >
                  <p className="font-semibold text-white break-words">{player.displayName}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    {player.teamName} · {player.assignedPosition ?? 'SIN POS'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {isAdminOrOwner ? (
          <>
            <section className="border border-white/10 bg-concrete-overlay p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-2xl font-black italic uppercase">Notas</h2>
                <span className="text-xs text-white/45">{notes.length}/300</span>
              </div>
              <textarea
                value={notes}
                onChange={(eventChange) => setNotes(eventChange.target.value.slice(0, 300))}
                rows={4}
                placeholder="Algo memorable del partido (opcional)"
                className="mt-3 w-full border border-white/10 bg-white/5 p-3 text-white placeholder-white/30"
              />
            </section>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push(`/groups/${groupId}/events/${eventId}`)}
                className="border border-white/10 bg-white/[0.04] px-4 py-4 font-headline text-xl font-black italic uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={saving}
                className="bg-emerald-500 px-4 py-4 font-headline text-xl font-black italic uppercase text-black disabled:opacity-60"
              >
                Confirmar resultado
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => router.push(`/groups/${groupId}/events/${eventId}`)}
              className="border border-white/10 bg-white/[0.04] px-4 py-4 font-headline text-xl font-black italic uppercase"
            >
              Volver al evento
            </button>
          </div>
        )}
      </div>
    </ImmersiveScreen>
  );
}
