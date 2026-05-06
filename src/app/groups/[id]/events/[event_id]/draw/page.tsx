'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { drawTeams } from '@/lib/draw';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { type DrawResult, type Event, type EventId, type GroupId } from '@/lib/types';
import { EventsService } from '@/lib/services/events.service';

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
    return <div className="p-6 text-white">Preparando sorteo...</div>;
  }

  if (!event || !result || result.assignments.length === 0) {
    return (
      <div className="p-6 text-white">
        <p>No hay suficientes jugadores checkeados para sortear.</p>
      </div>
    );
  }

  const teamA = result.assignments.filter((assignment) => assignment.team === 'A');
  const teamB = result.assignments.filter((assignment) => assignment.team === 'B');
  const substitutes = result.assignments.filter((assignment) => assignment.team === 'substitute');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-lg border border-white/10 bg-black/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pitch-green">Sorteo</p>
          <h1 className="mt-2 font-headline text-3xl font-black italic uppercase">{event.field_name}</h1>
          <p className="mt-2 text-sm text-white/70">
            Diff actual: {result.ratingDiff} · seed {seed.slice(0, 8)}
          </p>
          {result.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-amber-300">
              {result.warnings.map((warning, index) => (
                <li key={`${warning.kind}-${index}`}>{warning.kind === 'imbalance' ? `Imbalance ${warning.diff}` : warning.kind}</li>
              ))}
            </ul>
          ) : null}
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-white/10 bg-black/40 p-4">
            <input
              value={teamAName}
              onChange={(eventChange) => setTeamAName(eventChange.target.value)}
              className="w-full bg-transparent font-headline text-2xl font-black italic uppercase outline-none"
            />
            <p className="mt-1 text-sm text-white/60">Overall {result.teamAOverallAvg}</p>
            <ul className="mt-4 space-y-3">
              {teamA.map((assignment) => (
                <li key={assignment.playerId} className="rounded-lg border border-white/10 px-3 py-2">
                  <p>{playerNames[assignment.playerId] ?? assignment.playerId}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">{assignment.assignedPosition}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-white/10 bg-black/40 p-4">
            <input
              value={teamBName}
              onChange={(eventChange) => setTeamBName(eventChange.target.value)}
              className="w-full bg-transparent font-headline text-2xl font-black italic uppercase outline-none"
            />
            <p className="mt-1 text-sm text-white/60">Overall {result.teamBOverallAvg}</p>
            <ul className="mt-4 space-y-3">
              {teamB.map((assignment) => (
                <li key={assignment.playerId} className="rounded-lg border border-white/10 px-3 py-2">
                  <p>{playerNames[assignment.playerId] ?? assignment.playerId}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">{assignment.assignedPosition}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {substitutes.length > 0 ? (
          <section className="rounded-lg border border-white/10 bg-black/40 p-4">
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
            className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-4 font-headline text-xl font-black italic uppercase"
          >
            Re-sortear
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-4 py-4 font-headline text-xl font-black italic uppercase text-black"
          >
            Confirmar sorteo
          </button>
        </div>
      </div>
    </div>
  );
}
