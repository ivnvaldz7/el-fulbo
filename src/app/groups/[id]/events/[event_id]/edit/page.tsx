'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EventForm from '@/components/EventForm';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Event } from '@/lib/types';
import { EventsService } from '@/lib/services/events.service';

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
        const data = await eventsService.getEventById(eventId);
        setEventData(data);
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
      await eventsService.updateEvent({
        p_event_id: eventId,
        p_field_name: formData.field_name,
        p_field_maps_url: formData.field_maps_url ?? null,
        p_scheduled_at: formData.scheduled_at,
        p_modality: formData.modality,
        p_notes: formData.notes ?? null,
      });

      toast.success('Partido actualizado.');
      router.push(`/groups/${groupId}/events/${eventId}`);
    } catch (error) {
      console.error(error);
      toast.error('No pudimos actualizar el partido.');
    }
  }

  if (loading) {
    return <div className="p-6 text-white">Cargando evento...</div>;
  }

  if (!eventData) {
    return <div className="p-6 text-white">No se encontró el evento.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 font-headline text-3xl font-black italic uppercase tracking-tight">
          Editar partido
        </h1>
        <EventForm
          initialData={eventData}
          onSubmit={handleSubmit}
          submitButtonText="Guardar cambios"
          readOnly={eventData.status === 'checked_in' || eventData.status === 'played'}
        />
      </div>
    </div>
  );
}
