'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { EventsService, type DrawTeamSummary } from '@/lib/services/events.service';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Event, EventId, GroupId, PlayerId } from '@/lib/types';
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

  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<DrawTeamSummary[]>([]);
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [mvpPlayerId, setMvpPlayerId] = useState<PlayerId | null>(null);
  const [notes, setNotes] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  const participants = useMemo(
    () =>
      teams.flatMap((team) =>
        team.players.map((player) => ({
          ...player,
          teamName: team.name,
        })),
      ),
    [teams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextEvent = await eventsService.getEventById(eventId);
      const [nextTeams, nextIsAdminOrOwner] = await Promise.all([
        eventsService.getTeamsSummary(eventId),
        eventsService.isCurrentUserAdminOrOwner(nextEvent.group_id),
      ]);

      setEvent(nextEvent);
      setTeams(nextTeams);
      setIsAdminOrOwner(nextIsAdminOrOwner);
    } catch (error) {
      console.error(error);
      toast.error('No pudimos cargar el resultado.');
    } finally {
      setLoading(false);
    }
  }, [eventId, eventsService]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (draftLoaded || typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(getDraftKey(eventId));
    if (!raw) {
      setDraftLoaded(true);
      return;
    }

    try {
      const draft = JSON.parse(raw) as DraftState;
      setTeamAScore(draft.teamAScore ?? 0);
      setTeamBScore(draft.teamBScore ?? 0);
      setMvpPlayerId(draft.mvpPlayerId ?? null);
      setNotes(draft.notes ?? '');
      toast.success('Retomamos el resultado que estabas cargando');
    } catch (error) {
      console.error(error);
    } finally {
      setDraftLoaded(true);
    }
  }, [draftLoaded, eventId]);

  useEffect(() => {
    if (!draftLoaded || typeof window === 'undefined') {
      return;
    }

    const draft: DraftState = {
      teamAScore,
      teamBScore,
      mvpPlayerId,
      notes,
    };

    window.localStorage.setItem(getDraftKey(eventId), JSON.stringify(draft));
  }, [draftLoaded, eventId, mvpPlayerId, notes, teamAScore, teamBScore]);

  function validateBeforeConfirm() {
    if (teamAScore < 0 || teamAScore > 99 || teamBScore < 0 || teamBScore > 99) {
      toast.error('El score tiene que estar entre 0 y 99.');
      return false;
    }

    if (!mvpPlayerId || !participants.some((player) => player.playerId === mvpPlayerId)) {
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
    if (!validateBeforeConfirm() || !mvpPlayerId) {
      return;
    }

    setSaving(true);
    try {
      await eventsService.loadMatchResult({
        eventId,
        teamAScore,
        teamBScore,
        mvpPlayerId,
        notes: notes.trim() || null,
      });

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
      <ImmersiveScreen align="center" contentClassName="text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Resultado</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">Cargando datos del partido...</h2>
      </ImmersiveScreen>
    );
  }

  if (!event || !isAdminOrOwner || event.status !== 'drawn') {
    return (
      <ImmersiveScreen align="center" contentClassName="max-w-md mx-auto text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Sin acceso</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">No tenés acceso o el partido todavía no está listo para resultado.</h2>
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

        <section className="border border-white/10 bg-concrete-overlay p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div>
              <p className="font-headline text-xl font-black italic uppercase">{event.team_a_name ?? 'Equipo A'}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={99}
                value={teamAScore}
                onChange={(eventChange) => setTeamAScore(Number(eventChange.target.value || 0))}
                className="w-20 border border-white/10 bg-white/5 p-3 text-center text-3xl font-black text-white"
              />
              <span className="text-2xl font-black text-white/70">-</span>
              <input
                type="number"
                min={0}
                max={99}
                value={teamBScore}
                onChange={(eventChange) => setTeamBScore(Number(eventChange.target.value || 0))}
                className="w-20 border border-white/10 bg-white/5 p-3 text-center text-3xl font-black text-white"
              />
            </div>
            <div className="text-right">
              <p className="font-headline text-xl font-black italic uppercase">{event.team_b_name ?? 'Equipo B'}</p>
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-concrete-overlay p-5">
          <h2 className="font-headline text-2xl font-black italic uppercase">¿Quién fue la figura?</h2>
          <p className="mt-1 text-sm text-white/60">Elegí un jugador de cualquier equipo.</p>

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
                  <p className="font-semibold text-white">{player.displayName}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    {player.teamName} · {player.assignedPosition ?? 'SIN POS'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

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
      </div>
    </ImmersiveScreen>
  );
}
