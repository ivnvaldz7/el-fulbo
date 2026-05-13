'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { drawTeams } from '@/lib/draw';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { type DrawResult, type Event, type EventId, type GroupId } from '@/lib/types';
import { EventsService } from '@/lib/services/events.service';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';

function buildSeed() {
  return crypto.randomUUID();
}

export default function EventDrawPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as GroupId;
  const eventId = params.event_id as EventId;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const eventsService = useMemo(() => new EventsService(supabase), [supabase]);

  const [event, setEvent] = useState<Event | null>(null);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamAName, setTeamAName] = useState('Equipo A');
  const [teamBName, setTeamBName] = useState('Equipo B');
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  async function runDraw(nextSeed = buildSeed()) {
    const [nextEvent, players] = await Promise.all([
      eventsService.getEventById(eventId),
      eventsService.getDrawPlayers(eventId),
    ]);

    const nextResult = drawTeams({
      modality: nextEvent.modality,
      players,
      seed: nextSeed,
    });

    setEvent(nextEvent);
    setSeed(nextSeed);
    setResult(nextResult);
    setPlayerNames(
      Object.fromEntries(players.map((player) => [player.id, player.display_name])),
    );
    setLoading(false);
  }

  useEffect(() => {
    void runDraw().catch((error) => {
      console.error(error);
      toast.error('No pudimos preparar el sorteo.');
      setLoading(false);
    });
  }, [eventId, eventsService]);

  async function handleConfirm() {
    if (!result) {
      return;
    }

    setSaving(true);
    try {
      await eventsService.confirmDraw({
        eventId,
        seed,
        assignments: result.assignments,
        teamAName,
        teamBName,
      });
      router.push(`/groups/${groupId}/events/${eventId}/teams`);
    } catch (error) {
      console.error(error);
      toast.error('No pudimos confirmar el sorteo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ImmersiveScreen align="center" contentClassName="text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Sorteo</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">Preparando equipos...</h2>
      </ImmersiveScreen>
    );
  }

  if (!event || !result || result.assignments.length === 0) {
    return (
      <ImmersiveScreen align="center" contentClassName="max-w-md mx-auto text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Sorteo no disponible</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">No hay suficientes jugadores para sortear.</h2>
      </ImmersiveScreen>
    );
  }

  const teamA = result.assignments.filter((assignment) => assignment.team === 'A');
  const teamB = result.assignments.filter((assignment) => assignment.team === 'B');
  const substitutes = result.assignments.filter((assignment) => assignment.team === 'substitute');

  return (
    <ImmersiveScreen contentClassName="max-w-5xl mx-auto space-y-4">
      <PageHeader title="SORTEO" backHref={`/groups/${groupId}/events/${eventId}`} />
      <div className="mt-16 space-y-4">
        <header className="border border-white/10 bg-concrete-overlay p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pitch-green">Sorteo</p>
          <h1 className="mt-2 font-headline text-3xl font-black italic uppercase">{event.field_name}</h1>
          <p className="mt-2 text-sm text-white/70">
            Diff actual: {result.ratingDiff} · seed {seed.slice(0, 8)}
          </p>
          {result.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-amber-300">
              {result.warnings.map((warning, index) => (
                <li key={`${warning.kind}-${index}`}>
                  {warning.kind === 'imbalance'
                    ? `Diferencia de nivel: ${warning.diff}`
                    : warning.kind === 'out_of_position'
                    ? 'Algunos jugadores juegan fuera de posición'
                    : warning.kind}
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="border border-white/10 bg-concrete-overlay p-5">
            <input
              value={teamAName}
              onChange={(eventChange) => setTeamAName(eventChange.target.value)}
              className="w-full bg-transparent font-headline text-2xl font-black italic uppercase outline-none"
            />
            <p className="mt-1 text-sm text-white/60">Overall {result.teamAOverallAvg}</p>
            <ul className="mt-4 space-y-3">
              {teamA.map((assignment) => (
                <li key={assignment.playerId} className="border border-white/10 px-3 py-2">
                  <p>{playerNames[assignment.playerId] ?? assignment.playerId}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">{assignment.assignedPosition}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-white/10 bg-concrete-overlay p-5">
            <input
              value={teamBName}
              onChange={(eventChange) => setTeamBName(eventChange.target.value)}
              className="w-full bg-transparent font-headline text-2xl font-black italic uppercase outline-none"
            />
            <p className="mt-1 text-sm text-white/60">Overall {result.teamBOverallAvg}</p>
            <ul className="mt-4 space-y-3">
              {teamB.map((assignment) => (
                <li key={assignment.playerId} className="border border-white/10 px-3 py-2">
                  <p>{playerNames[assignment.playerId] ?? assignment.playerId}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">{assignment.assignedPosition}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {substitutes.length > 0 ? (
          <section className="border border-white/10 bg-concrete-overlay p-5">
            <h2 className="font-headline text-2xl font-black italic uppercase">Suplentes</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {substitutes.map((assignment) => (
                <li key={assignment.playerId}>{playerNames[assignment.playerId] ?? assignment.playerId}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void runDraw()}
            disabled={saving}
            className="border border-white/10 bg-white/[0.06] px-4 py-4 font-headline text-xl font-black italic uppercase"
          >
            Re-sortear
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving}
            className="bg-emerald-500 px-4 py-4 font-headline text-xl font-black italic uppercase text-black"
          >
            Confirmar sorteo
          </button>
        </div>
      </div>
    </ImmersiveScreen>
  );
}
