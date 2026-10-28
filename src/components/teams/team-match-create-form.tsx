'use client';

import { useState, type FormEvent } from 'react';
import { CalendarPlus, MapPin, Swords } from 'lucide-react';
import type { CreateTeamMatchData } from '@/lib/validations/teams';
import { createTeamMatchSchema } from '@/lib/validations/teams';
import type { TeamId } from '@/lib/types/teams.types';

interface TeamMatchCreateFormProps {
  teamId: TeamId;
  onCreateMatch: (payload: CreateTeamMatchData) => Promise<void>;
}

function getDefaultDateTime() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  value.setMinutes(Math.ceil(value.getMinutes() / 15) * 15, 0, 0);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function TeamMatchCreateForm({ teamId, onCreateMatch }: TeamMatchCreateFormProps) {
  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTime);
  const [opponentName, setOpponentName] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldMapsUrl, setFieldMapsUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createTeamMatchSchema.safeParse({
      teamId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      opponentName: opponentName.trim() || null,
      fieldName: fieldName.trim() || null,
      fieldMapsUrl: fieldMapsUrl.trim() || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá los datos del partido.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreateMatch(parsed.data);
      setOpponentName('');
      setFieldName('');
      setFieldMapsUrl('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos organizar el partido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="organize-match-heading" className="rounded-[1.5rem] border border-pitch-green/25 bg-pitch-green/[0.07] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pitch-green text-black" aria-hidden="true">
          <CalendarPlus className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Admin del equipo</p>
          <h3 id="organize-match-heading" className="mt-1 font-headline text-2xl font-black italic uppercase text-white">Organizar partido</h3>
          <p className="mt-1 text-sm font-semibold text-white/55">Publicá la convocatoria y compartila para que el plantel confirme.</p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-1 sm:col-span-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Fecha y hora</span>
          <input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="rounded-xl bg-black/40 px-3 py-3 text-white ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green" />
        </label>
        <label className="grid gap-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Rival</span>
          <span className="relative">
            <Swords className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" aria-hidden="true" />
            <input value={opponentName} onChange={(event) => setOpponentName(event.target.value)} placeholder="Ej. Los Pibes" className="w-full rounded-xl bg-black/40 py-3 pl-10 pr-3 text-white placeholder:text-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green" />
          </span>
        </label>
        <label className="grid gap-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Cancha</span>
          <span className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" aria-hidden="true" />
            <input value={fieldName} onChange={(event) => setFieldName(event.target.value)} placeholder="Ej. Palermo" className="w-full rounded-xl bg-black/40 py-3 pl-10 pr-3 text-white placeholder:text-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green" />
          </span>
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Link de ubicación <span className="text-white/35">(opcional)</span></span>
          <input type="url" value={fieldMapsUrl} onChange={(event) => setFieldMapsUrl(event.target.value)} placeholder="https://maps.app.goo.gl/..." className="rounded-xl bg-black/40 px-3 py-3 text-white placeholder:text-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green" />
        </label>
        {error ? <p role="alert" className="sm:col-span-2 font-mono text-[10px] font-bold uppercase text-red-300">{error}</p> : null}
        <button type="submit" disabled={submitting} className="sm:col-span-2 rounded-full bg-pitch-green px-5 py-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Publicando...' : 'Publicar convocatoria'}
        </button>
      </form>
    </section>
  );
}
