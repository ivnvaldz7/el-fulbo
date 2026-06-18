'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { type EventId, type GroupId } from '@/lib/types';
import { EventsService, type DrawTeamSummary } from '@/lib/services/events.service';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';

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
      .then((result) => {
        if (!result.ok) {
          throw new Error(result.error.message);
        }
        setTeams(result.data);
      })
      .catch((error) => {
        console.error(error);
        toast.error('No pudimos cargar los equipos.');
      })
      .finally(() => setLoading(false));
  }, [eventId, eventsService]);

  if (loading) {
    return (
      <ImmersiveScreen align="center" contentClassName="text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Equipos</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">Cargando equipos...</h2>
      </ImmersiveScreen>
    );
  }

  return (
    <ImmersiveScreen contentClassName="max-w-5xl mx-auto space-y-4">
      <PageHeader title="EQUIPOS" backHref={`/groups/${groupId}/events/${eventId}`} />
      <div className="mt-16 space-y-4">
        <header className="border border-white/10 bg-concrete-overlay p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pitch-green">Equipos confirmados</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <section key={team.name} className="border border-white/10 bg-concrete-overlay p-5">
              <h2 className="font-headline text-2xl font-black italic uppercase">{team.name}</h2>
              <ul className="mt-4 space-y-3">
                {team.players.map((player) => (
                  <li key={player.playerId} className="border border-white/10 px-3 py-2">
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
          className="border border-white/10 bg-white/[0.06] px-4 py-3 font-headline text-lg font-black italic uppercase"
        >
          Volver al evento
        </button>
      </div>
    </ImmersiveScreen>
  );
}

