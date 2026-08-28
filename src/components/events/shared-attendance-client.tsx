'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { EventsService } from '@/lib/services/events.service';
import type { AttendanceStatus, EventId } from '@/lib/types';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { SharedAttendancePanel } from './shared-attendance-panel';

export function SharedAttendanceClient({ eventId }: { eventId: EventId }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const eventsService = useMemo(() => new EventsService(supabase), [supabase]);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ['shared-attendance', eventId],
    queryFn: async () => {
      const eventResult = await eventsService.getEventById(eventId);
      if (!eventResult.ok) throw new Error(eventResult.error.message);

      const [attendeesResult, pendingResult, playerResult, groupResult] = await Promise.all([
        eventsService.getEventAttendees(eventId),
        eventsService.getPendingConfirmationPlayers(eventResult.data.group_id, eventId),
        eventsService.getCurrentPlayerAttendanceContext(eventResult.data.group_id, eventId),
        supabase.from('groups').select('name').eq('id', eventResult.data.group_id).single(),
      ]);

      if (!attendeesResult.ok) throw new Error(attendeesResult.error.message);
      if (!pendingResult.ok) throw new Error(pendingResult.error.message);
      if (!playerResult.ok) throw new Error(playerResult.error.message);
      if (!playerResult.data) throw new Error('No tenés acceso a la convocatoria de este grupo.');

      return {
        event: eventResult.data,
        groupName: groupResult.data?.name ?? 'El Fulbo',
        attendees: attendeesResult.data,
        pendingConfirmationPlayers: pendingResult.data,
        currentPlayer: playerResult.data,
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`shared-attendance:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendances',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['shared-attendance', eventId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, queryClient, supabase]);

  async function handleAttendanceChange(status: AttendanceStatus) {
    setSaving(true);
    try {
      const result = await eventsService.updateAttendance({ p_event_id: eventId, p_status: status });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Guardamos tu respuesta.');
      await queryClient.invalidateQueries({ queryKey: ['shared-attendance', eventId] });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar tu respuesta.');
    } finally {
      setSaving(false);
    }
  }

  if (isPending) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin border-4 border-pitch-green border-t-transparent" />
          <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            Cargando convocatoria
          </p>
        </FloatingPanel>
      </ImmersiveScreen>
    );
  }

  if (error || !data) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel className="text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">
            Acceso no disponible
          </p>
          <h1 className="mt-3 font-headline text-2xl font-black italic uppercase text-white">
            No pudimos cargar el partido
          </h1>
          <p className="mt-3 text-sm text-white/60">
            {error instanceof Error ? error.message : 'Revisá el enlace e intentá nuevamente.'}
          </p>
        </FloatingPanel>
      </ImmersiveScreen>
    );
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md py-6">
      <FloatingPanel className="p-4 sm:p-5">
        <SharedAttendancePanel
          event={data.event}
          groupName={data.groupName}
          attendees={data.attendees}
          pendingConfirmationPlayers={data.pendingConfirmationPlayers}
          currentPlayer={data.currentPlayer}
          saving={saving}
          onAttendanceChange={(status) => void handleAttendanceChange(status)}
        />
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
