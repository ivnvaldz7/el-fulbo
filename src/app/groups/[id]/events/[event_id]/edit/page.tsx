'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EventForm from '@/components/EventForm';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Event } from '@/lib/types';
import { EventsService } from '@/lib/services/events.service';
import { PageContent } from '@/components/ui/page-content';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const eventId = params.event_id as string;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const eventsService = useMemo(() => new EventsService(supabase), [supabase]);

  const [eventData, setEventData] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const result = await eventsService.getEventById(eventId);
        if (!result.ok) throw new Error(result.error.message);
        setEventData(result.data);
      } catch (error) {
        console.error(error);
        toast.error('No pudimos cargar el partido.');
      } finally {
        setLoading(false);
      }
    }

    void loadEvent();
  }, [eventId, eventsService]);

  async function handleSubmit(formData: Event) {
    try {
      const result = await eventsService.updateEvent({
        p_event_id: eventId,
        p_field_name: formData.field_name,
        p_field_maps_url: formData.field_maps_url ?? null,
        p_scheduled_at: formData.scheduled_at,
        p_modality: formData.modality,
        p_notes: formData.notes ?? null,
      });

      if (!result.ok) throw new Error(result.error.message);
      toast.success('Partido actualizado.');
      router.push(`/groups/${groupId}/events/${eventId}`);
    } catch (error) {
      console.error(error);
      toast.error('No pudimos actualizar el partido.');
    }
  }

  if (loading) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Editar partido</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">Cargando evento...</h2>
      </ImmersiveScreen>
    );
  }

  if (!eventData) {
    return (
      <ImmersiveScreen align="center" contentClassName="max-w-md mx-auto text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Error</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">No se encontró el evento.</h2>
      </ImmersiveScreen>
    );
  }

  return (
    <ImmersiveScreen>
      <PageContent className="max-w-3xl">
        <PageHeader title="EDITAR" backHref={`/groups/${groupId}/events/${eventId}`} />
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green mb-2">Editar partido</p>
      <h1 className="mb-6 font-headline text-3xl font-black italic uppercase tracking-tight text-white">
        ¿Qué cambió?
      </h1>
      <EventForm
        initialData={eventData}
        onSubmit={handleSubmit}
        submitButtonText="Guardar cambios"
        readOnly={eventData.status === 'checked_in' || eventData.status === 'played'}
      />
      </PageContent>
    </ImmersiveScreen>
  );
}
