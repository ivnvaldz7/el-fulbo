'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getTeamSize, type Event, type EventId, type GroupId } from '@/lib/types';
import { EventsService, type EventAttendee } from '@/lib/services/events.service';

function canOpenCheckIn(event: Event) {
  const hoursToEvent = (new Date(event.scheduled_at).getTime() - Date.now()) / 36e5;
  return ['scheduled', 'confirming', 'checked_in'].includes(event.status) && hoursToEvent <= 4;
}

export default function EventCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as GroupId;
  const eventId = params.event_id as EventId;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const eventsService = useMemo(() => new EventsService(supabase), [supabase]);

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextEvent = await eventsService.getEventById(eventId);
      const [nextAttendees, nextIsAdminOrOwner] = await Promise.all([
        eventsService.getEventAttendees(eventId),
        eventsService.isCurrentUserAdminOrOwner(nextEvent.group_id),
      ]);

      setEvent(nextEvent);
      setAttendees(nextAttendees.filter((attendee) => attendee.status !== 'not_going'));
      setIsAdminOrOwner(nextIsAdminOrOwner);
    } catch (error) {
      console.error(error);
      toast.error('No pudimos cargar el check-in.');
    } finally {
      setLoading(false);
    }
  }, [eventId, eventsService]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`event-checkin:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendances', filter: `event_id=eq.${eventId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, load, supabase]);

  const checkedCount = attendees.filter((attendee) => attendee.checkedIn).length;
  const minimumPlayers = event ? getTeamSize(event.modality) * 2 : 0;
  const canProceed = Boolean(event) && checkedCount >= minimumPlayers;

  async function handleToggle(attendee: EventAttendee, checkedIn: boolean) {
    setSaving(true);
    try {
      await eventsService.updateCheckIn({
        eventId,
        playerId: attendee.playerId,
        checkedIn,
      });
      await load();
    } catch (error) {
      console.error(error);
      toast.error('No pudimos actualizar el check-in.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAll() {
    setSaving(true);
    try {
      await eventsService.markAllGoingCheckedIn(eventId);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("No pudimos marcar todos los 'voy'.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGoToDraw() {
    if (!event) return;

    setSaving(true);
    try {
      if (event.status !== 'checked_in') {
        await eventsService.updateEventStatus(event.id, 'checked_in');
      }
      router.push(`/groups/${groupId}/events/${eventId}/draw`);
    } catch (error) {
      console.error(error);
      toast.error('No pudimos abrir el sorteo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-white">Cargando check-in...</div>;
  }

  if (!event || !isAdminOrOwner || !canOpenCheckIn(event)) {
    return (
      <div className="p-6 text-white">
        <p>No tenés acceso a este check-in o todavía no está habilitado.</p>
      </div>
    );
  }

  const going = attendees.filter((attendee) => attendee.status === 'going');
  const maybe = attendees.filter((attendee) => attendee.status === 'maybe');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 text-white">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rounded-lg border border-white/10 bg-black/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pitch-green">Check-in</p>
          <h1 className="mt-2 font-headline text-3xl font-black italic uppercase">{event.field_name}</h1>
          <p className="mt-3 text-sm text-white/70">
            {checkedCount} checkeados / {minimumPlayers} necesarios
          </p>
        </header>

        <section className="rounded-lg border border-white/10 bg-black/40 p-4">
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            disabled={saving}
            className="w-full rounded-lg bg-pitch-green px-4 py-3 font-headline text-lg font-bold italic uppercase text-black disabled:opacity-60"
          >
            Marcar todos los &quot;voy&quot;
          </button>
        </section>

        {[{ title: 'Van', items: going }, { title: 'Tal vez', items: maybe }].map((section) => (
          <section key={section.title} className="rounded-lg border border-white/10 bg-black/40 p-4">
            <h2 className="font-headline text-2xl font-black italic uppercase">{section.title}</h2>
            <div className="mt-4 space-y-3">
              {section.items.length === 0 ? (
                <p className="text-sm text-white/60">No hay jugadores en esta lista.</p>
              ) : (
                section.items.map((attendee) => (
                  <div
                    key={attendee.playerId}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{attendee.displayName}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                        {attendee.primaryPosition ?? 'SIN POS'}
                      </p>
                    </div>

                    <label className="flex items-center gap-3">
                      <span className="text-sm text-white/60">{attendee.checkedIn ? 'Presente' : 'Pendiente'}</span>
                      <input
                        type="checkbox"
                        checked={attendee.checkedIn}
                        disabled={saving}
                        onChange={(eventChange) => void handleToggle(attendee, eventChange.target.checked)}
                        className="h-5 w-5 rounded border-white/20 bg-transparent"
                      />
                    </label>
                  </div>
                ))
              )}
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={() => void handleGoToDraw()}
          disabled={!canProceed || saving}
          className="w-full rounded-lg bg-emerald-500 px-4 py-4 font-headline text-xl font-black italic uppercase text-black disabled:opacity-50"
        >
          {canProceed ? 'Ir al sorteo' : `Faltan ${Math.max(minimumPlayers - checkedCount, 0)} jugadores`}
        </button>
      </div>
    </div>
  );
}
