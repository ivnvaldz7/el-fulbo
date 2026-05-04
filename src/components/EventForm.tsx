'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Event, Modality } from '@/lib/types';

interface EventFormProps {
  initialData?: Event;
  onSubmit: (formData: Event) => void | Promise<void>;
  submitButtonText: string;
  readOnly?: boolean;
}

const MODALITIES: Modality[] = ['F5', 'F6', 'F7', 'F8', 'F11'];

function toInputDateTime(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromInputDateTime(value: string) {
  return new Date(value).toISOString();
}

export default function EventForm({
  initialData,
  onSubmit,
  submitButtonText,
  readOnly = false,
}: EventFormProps) {
  const [fieldName, setFieldName] = useState(initialData?.field_name ?? '');
  const [scheduledAt, setScheduledAt] = useState(toInputDateTime(initialData?.scheduled_at));
  const [modality, setModality] = useState<Modality>(initialData?.modality ?? 'F5');
  const [fieldMapsUrl, setFieldMapsUrl] = useState(initialData?.field_maps_url ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setFieldName(initialData.field_name);
    setScheduledAt(toInputDateTime(initialData.scheduled_at));
    setModality(initialData.modality);
    setFieldMapsUrl(initialData.field_maps_url ?? '');
    setNotes(initialData.notes ?? '');
  }, [initialData]);

  const preview = useMemo<Event>(() => {
    const base = initialData ?? {
      id: '',
      group_id: '',
      modality,
      field_name: fieldName,
      field_maps_url: fieldMapsUrl || null,
      scheduled_at: scheduledAt ? fromInputDateTime(scheduledAt) : new Date().toISOString(),
      status: 'scheduled',
      created_by_user_id: '',
    };

    return {
      ...base,
      modality,
      field_name: fieldName,
      field_maps_url: fieldMapsUrl || null,
      scheduled_at: scheduledAt ? fromInputDateTime(scheduledAt) : base.scheduled_at,
      notes: notes || null,
      title: fieldName,
      date_time: scheduledAt ? fromInputDateTime(scheduledAt) : base.scheduled_at,
      location: fieldName,
      google_maps_link: fieldMapsUrl || null,
    };
  }, [fieldMapsUrl, fieldName, initialData, modality, notes, scheduledAt]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void onSubmit(preview);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-white/10 bg-black/40 p-4">
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Cancha</span>
          <input
            type="text"
            value={fieldName}
            onChange={(event) => setFieldName(event.target.value)}
            readOnly={readOnly}
            required
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-pitch-green"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Cuándo</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            readOnly={readOnly}
            required
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-pitch-green"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Modalidad</span>
          <select
            value={modality}
            onChange={(event) => setModality(event.target.value as Modality)}
            disabled={readOnly}
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-pitch-green"
          >
            {MODALITIES.map((option) => (
              <option key={option} value={option} className="bg-zinc-900">
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Google Maps</span>
          <input
            type="url"
            value={fieldMapsUrl}
            onChange={(event) => setFieldMapsUrl(event.target.value)}
            readOnly={readOnly}
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-pitch-green"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Notas</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            readOnly={readOnly}
            rows={4}
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-pitch-green"
          />
        </label>

        {!readOnly ? (
          <button
            type="submit"
            className="w-full rounded-lg bg-pitch-green py-3 font-headline text-xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-[0.98]"
          >
            {submitButtonText}
          </button>
        ) : null}
      </form>

      <aside className="h-fit rounded-lg border border-white/10 bg-black/40 p-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Vista previa
        </p>
        <h3 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
          {preview.field_name || 'Cancha pendiente'}
        </h3>
        <div className="mt-4 space-y-2 text-sm text-white/70">
          <p>Modalidad: {preview.modality}</p>
          <p>Fecha: {scheduledAt ? new Date(fromInputDateTime(scheduledAt)).toLocaleString('es-AR') : '—'}</p>
          {preview.field_maps_url ? <p>Maps: {preview.field_maps_url}</p> : null}
          {preview.notes ? <p>Notas: {preview.notes}</p> : null}
        </div>
      </aside>
    </div>
  );
}
