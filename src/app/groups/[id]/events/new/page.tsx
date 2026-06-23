'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { EventModality } from '@/lib/types/events.types';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { EventsService } from '@/lib/services/events.service';
import { createEventSchema, CreateEventData } from '@/lib/validations/event';
import toast from 'react-hot-toast';
import { showEventNotification } from '@/lib/notifications';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';

const modalityOptions: Array<{ value: EventModality; label: string }> = [
  { value: 'F5', label: 'F5 - 5 vs 5' },
  { value: 'F6', label: 'F6 - 6 vs 6' },
  { value: 'F7', label: 'F7 - 7 vs 7' },
  { value: 'F8', label: 'F8 - 8 vs 8' },
  { value: 'F9', label: 'F9 - 9 vs 9' },
  { value: 'F11', label: 'F11 - 11 vs 11' },
];

function getNextSaturday20h() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  let daysUntilSaturday = 6 - dayOfWeek;
  if (daysUntilSaturday <= 0) { // If today is Saturday or Sunday, get next Saturday
    daysUntilSaturday += 7;
  }

  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(20, 0, 0, 0); // Set time to 20:00:00.000

  const year = nextSaturday.getFullYear();
  const month = String(nextSaturday.getMonth() + 1).padStart(2, '0');
  const day = String(nextSaturday.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  const timeString = '20:00';

  return { dateString, timeString };
}

export default function NewEventPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const CREATE_EVENT_DRAFT_KEY = `event-draft-${groupId}`;
  const { dateString: defaultDate, timeString: defaultTime } = getNextSaturday20h();

  const [draftState] = useState(() => {
    if (typeof window !== 'undefined' && groupId) {
      const stored = window.localStorage.getItem(`event-draft-${groupId}`);
      if (stored) {
        try {
          return JSON.parse(stored) as CreateEventData;
        } catch {
          window.localStorage.removeItem(`event-draft-${groupId}`);
        }
      }
    }
    return {} as Partial<CreateEventData>;
  });

  const [date, setDate] = useState(draftState.date ?? defaultDate);
  const [time, setTime] = useState(draftState.time ?? defaultTime);
  const [modality, setModality] = useState<EventModality>(draftState.modality ?? 'F5');
  const [locationName, setLocationName] = useState(draftState.locationName ?? '');
  const [googleMapsLink, setGoogleMapsLink] = useState(draftState.googleMapsLink ?? '');
  const [notes, setNotes] = useState(draftState.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!groupId) return; // Wait until groupId is available

    const handler = setTimeout(() => {
      window.localStorage.setItem(
        CREATE_EVENT_DRAFT_KEY,
        JSON.stringify({ date, time, modality, locationName, googleMapsLink, notes })
      );
    }, 500); // Debounce to avoid excessive writes

    return () => clearTimeout(handler);
  }, [date, time, modality, locationName, googleMapsLink, notes, groupId, CREATE_EVENT_DRAFT_KEY]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formData: CreateEventData = { date, time, modality, locationName, googleMapsLink, notes };
    const parsed = createEventSchema.safeParse(formData);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Algunos datos no son válidos.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const eventsService = new EventsService(supabase);

    try {
      // Concatenate date and time to form a valid ISO 8601 string for Supabase
      const dateTime = new Date(`${parsed.data.date}T${parsed.data.time}:00`).toISOString();

      const result = await eventsService.createEvent({
        p_group_id: groupId,
        p_title: `Partido en ${parsed.data.locationName}`,
        p_date_time: dateTime,
        p_location: parsed.data.locationName,
        p_modality: parsed.data.modality,
        p_created_by: (await supabase.auth.getUser()).data.user?.id || '',
      });
      if (!result.ok) throw new Error(result.error.message);

      window.localStorage.removeItem(CREATE_EVENT_DRAFT_KEY);
      showEventNotification('event_created', { eventName: parsed.data.locationName });
      router.push(`/groups/${groupId}/dashboard`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message === 'Network Error' ? 'Error de conexión. Intenta de nuevo.' : 'Ocurrió un error. Verifica los permisos o intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitting) {
    return <CreateEventLoadingScreen />;
  }

  return (
    <ImmersiveScreen align="center" contentClassName="max-w-md mx-auto w-full">
      <PageHeader title="NUEVO PARTIDO" backHref={`/groups/${groupId}/dashboard`} />
      <div className="mt-16">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green mb-2">Nuevo Partido</p>
      <h1 className="font-headline text-3xl font-black italic uppercase text-white mb-6">¿Cuándo jugamos?</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="border border-white/10 bg-concrete-overlay divide-y divide-white/5">
          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/60">Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none placeholder:text-white/20"
            />
          </label>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/60">Hora</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none placeholder:text-white/20"
            />
          </label>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/60">Modalidad</span>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as EventModality)}
              className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none appearance-none cursor-pointer"
            >
              {modalityOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-concrete-overlay">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/60">Nombre de la cancha</span>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ej: Cancha de 5 - Palermo"
              className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none placeholder:text-white/20"
            />
          </label>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/60">Link de Google Maps (opcional)</span>
            <input
              type="url"
              value={googleMapsLink}
              onChange={(e) => setGoogleMapsLink(e.target.value)}
              placeholder="Ej: https://maps.app.goo.gl/abcdef123"
              className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none placeholder:text-white/20"
            />
          </label>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/60">Notas (opcional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cualquier aclaración sobre el partido..."
              rows={3}
              className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none placeholder:text-white/20"
            ></textarea>
          </label>
        </div>

        {error ? (
          <p id="create-event-error" className="py-2 text-center font-mono text-[10px] font-bold uppercase text-red-500">
            {error}
          </p>
        ) : null}

        <footer className="pt-6">
          <button
            type="submit"
            aria-busy={submitting}
            className="flex h-16 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95"
            disabled={submitting}
          >
            {submitting ? 'CREANDO PARTIDO...' : 'CREAR PARTIDO ⚽'}
          </button>
        </footer>
      </form>
      </div>
    </ImmersiveScreen>
  );
}

function CreateEventLoadingScreen() {
  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto text-center">
      <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
      <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Organizando partido</p>
      <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white tracking-tight">Cargando los jugadores...</h2>
      <ul className="mt-8 space-y-2 font-mono text-[10px] font-bold uppercase text-white/40">
        <li className="text-pitch-green">[X] Reservando cancha</li>
        <li className="text-pitch-green">[X] Confirmando horario</li>
        <li className="animate-pulse">[ ] Armado de equipos</li>
      </ul>
    </ImmersiveScreen>
  );
}
