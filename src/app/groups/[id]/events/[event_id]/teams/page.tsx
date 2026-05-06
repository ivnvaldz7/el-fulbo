'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { type EventId, type GroupId } from '@/lib/types';
import { EventsService, type DrawTeamSummary } from '@/lib/services/events.service';

export default function EventTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.event_id as EventId;
  const groupId = params.id as GroupId;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const eventsService = useMemo(() => new EventsService(supabase), [supabase]);
  const [teams, setTeams] = useState<DrawTeamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsService
      .getTeamsSummary(eventId)
      .then((value) => setTeams(value))
      .catch((error) => {
        console.error(error);
        toast.error('No pudimos cargar los equipos.');
      })
      .finally(() => setLoading(false));
  }, [eventId, eventsService]);

  if (loading) {
    return <div className="p-6 text-white">Cargando equipos...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-lg border border-white/10 bg-black/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pitch-green">Equipos confirmados</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <section key={team.name} className="rounded-lg border border-white/10 bg-black/40 p-4">
              <h2 className="font-headline text-2xl font-black italic uppercase">{team.name}</h2>
              <ul className="mt-4 space-y-3">
                {team.players.map((player) => (
                  <li key={player.playerId} className="rounded-lg border border-white/10 px-3 py-2">
                    <p>{player.displayName}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                      {player.assignedPosition ?? 'SUP'} {player.playedPrimaryPosition ? '' : '· Fuera de posición'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={() => router.push(`/groups/${groupId}/events/${eventId}`)}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 font-headline text-lg font-black italic uppercase"
        >
          Volver al evento
        </button>
      </div>
    </div>
  );
}

