'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getTeamSize, type Event, type EventId, type GroupId } from '@/lib/types';
import { EventsService, type EventAttendee } from '@/lib/services/events.service';
import { AddPhantomModal } from '@/components/phantom/add-phantom-modal';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';

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

  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['event-checkin', eventId],
    queryFn: async () => {
      const eventResult = await eventsService.getEventById(eventId);
      if (!eventResult.ok) throw new Error(eventResult.error.message);
      const nextEvent = eventResult.data;

      const [attendeesResult, adminResult] = await Promise.all([
        eventsService.getEventAttendees(eventId),
        eventsService.isCurrentUserAdminOrOwner(nextEvent.group_id),
      ]);

      if (!attendeesResult.ok) throw new Error(attendeesResult.error.message);
      if (!adminResult.ok) throw new Error(adminResult.error.message);

      return {
        event: nextEvent,
        attendees: attendeesResult.data.filter((attendee) => attendee.status !== 'not_going'),
        isAdminOrOwner: adminResult.data,
      };
    },
  });

  const event = data?.event ?? null;
  const attendees = data?.attendees ?? [];
  const isAdminOrOwner = data?.isAdminOrOwner ?? false;

  const [saving, setSaving] = useState(false);
  const [showPhantomModal, setShowPhantomModal] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`event-checkin:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendances', filter: `event_id=eq.${eventId}` },
        () => void queryClient.invalidateQueries({ queryKey: ['event-checkin', eventId] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, queryClient, supabase]);

  const checkedCount = attendees.filter((attendee) => attendee.checkedIn).length;
  const minimumPlayers = event ? getTeamSize(event.modality) * 2 : 0;
  const canProceed = Boolean(event) && checkedCount >= minimumPlayers;

  async function handleToggle(attendee: EventAttendee, checkedIn: boolean) {
    setSaving(true);
    try {
      const result = await eventsService.updateCheckIn({
        eventId,
        playerId: attendee.playerId,
        checkedIn,
      });
      if (!result.ok) throw new Error(result.error.message);
      await queryClient.invalidateQueries({ queryKey: ['event-checkin', eventId] });
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
      const result = await eventsService.markAllGoingCheckedIn(eventId);
      if (!result.ok) throw new Error(result.error.message);
      await queryClient.invalidateQueries({ queryKey: ['event-checkin', eventId] });
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
        const statusResult = await eventsService.updateEventStatus(event.id, 'checked_in');
        if (!statusResult.ok) throw new Error(statusResult.error.message);
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
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Check-in</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">Cargando jugadores...</h2>
      </ImmersiveScreen>
    );
  }

  if (!event || !isAdminOrOwner || !canOpenCheckIn(event)) {
    return (
      <ImmersiveScreen align="center" contentClassName="max-w-md mx-auto text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Check-in no disponible</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">No tenés acceso o todavía no está habilitado.</h2>
      </ImmersiveScreen>
    );
  }

  const going = attendees.filter((attendee) => attendee.status === 'going');
  const maybe = attendees.filter((attendee) => attendee.status === 'maybe');

  return (
    <ImmersiveScreen contentClassName="max-w-2xl mx-auto space-y-4">
      <PageHeader title="CHECK-IN" backHref={`/groups/${groupId}/events/${eventId}`} />
      <div className="mt-16 space-y-4">
        <header className="border border-white/10 bg-concrete-overlay p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pitch-green">Check-in</p>
          <h1 className="mt-2 font-headline text-3xl font-black italic uppercase">{event.field_name}</h1>
          <p className="mt-3 text-sm text-white/70">
            {checkedCount} checkeados / {minimumPlayers} necesarios
          </p>
        </header>

        <section className="border border-white/10 bg-concrete-overlay p-5 space-y-3">
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            disabled={saving}
            className="w-full rounded-lg bg-pitch-green px-4 py-3 font-headline text-lg font-bold italic uppercase text-black disabled:opacity-60"
          >
            Marcar todos los &quot;voy&quot;
          </button>
          {isAdminOrOwner && (
            <button
              type="button"
              onClick={() => setShowPhantomModal(true)}
              className="w-full rounded-lg border border-dashed border-white/20 px-4 py-2.5 text-sm font-semibold text-white/60 hover:border-white/40 hover:text-white"
            >
              + Agregar jugador fantasma
            </button>
          )}
        </section>

        {showPhantomModal && event && (
          <AddPhantomModal
            groupId={groupId}
            eventId={eventId}
            onClose={() => setShowPhantomModal(false)}
            onCreated={() => { setShowPhantomModal(false); void queryClient.invalidateQueries({ queryKey: ['event-checkin', eventId] }); }}
          />
        )}

        {[{ title: 'Van', items: going }, { title: 'Tal vez', items: maybe }].map((section) => (
          <section key={section.title} className="border border-white/10 bg-concrete-overlay p-5">
            <h2 className="font-headline text-2xl font-black italic uppercase">{section.title}</h2>
            <div className="mt-4 space-y-3">
              {section.items.length === 0 ? (
                <p className="text-sm text-white/60">No hay jugadores en esta lista.</p>
              ) : (
                section.items.map((attendee) => (
                  <div
                    key={attendee.playerId}
                    className="flex items-center justify-between border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{attendee.displayName}</p>
                        {attendee.isPhantom && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            FANTASMA
                          </span>
                        )}
                      </div>
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
    </ImmersiveScreen>
  );
}
