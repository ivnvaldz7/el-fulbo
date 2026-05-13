'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MODALITIES = ['F5', 'F6', 'F7', 'F8', 'F11'];

export interface RecurringSchedule {
  id: string;
  day_of_week: number;
  scheduled_time: string;
  field_name: string;
  field_maps_url: string | null;
  modality: string;
  notes: string | null;
  days_ahead: number;
}

interface Props {
  groupId: string;
  schedules: RecurringSchedule[];
}

const EMPTY_FORM = {
  day_of_week: 1,
  scheduled_time: '21:00',
  field_name: '',
  field_maps_url: '',
  modality: 'F5',
  notes: '',
  days_ahead: 4,
};

export function RecurringClient({ groupId, schedules: initial }: Props) {
  const router = useRouter();
  const [schedules, setSchedules] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/groups/${groupId}/settings/recurring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, days_ahead: Number(form.days_ahead) }),
    });
    const json = await res.json() as { ok: boolean; data?: RecurringSchedule; error?: { message: string } };
    setSaving(false);

    if (!json.ok) {
      setError(json.error?.message ?? 'No se pudo guardar.');
      return;
    }

    setSchedules((prev) => {
      const existing = prev.findIndex((s) => s.day_of_week === json.data!.day_of_week);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = json.data!;
        return next;
      }
      return [...prev, json.data!].sort((a, b) => a.day_of_week - b.day_of_week);
    });
    setShowForm(false);
    setForm(EMPTY_FORM);
    router.refresh();
  }

  async function handleDelete(schedule: RecurringSchedule) {
    const res = await fetch(
      `/api/groups/${groupId}/settings/recurring?scheduleId=${schedule.id}`,
      { method: 'DELETE' },
    );
    const json = await res.json() as { ok: boolean };
    if (json.ok) {
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      router.refresh();
    }
  }

  function handleEdit(schedule: RecurringSchedule) {
    setForm({
      day_of_week: schedule.day_of_week,
      scheduled_time: schedule.scheduled_time.slice(0, 5),
      field_name: schedule.field_name,
      field_maps_url: schedule.field_maps_url ?? '',
      modality: schedule.modality,
      notes: schedule.notes ?? '',
      days_ahead: schedule.days_ahead,
    });
    setShowForm(true);
  }

  return (
    <div className="space-y-4 pb-12">
      {schedules.length > 0 ? (
        <ul className="divide-y divide-white/5 border border-white/10">
          {schedules.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-headline text-lg font-black italic uppercase text-white">
                  {DAYS[s.day_of_week]} · {s.scheduled_time.slice(0, 5)}
                </p>
                <p className="mt-0.5 font-mono text-[10px] font-bold uppercase text-white/50">
                  {s.field_name} · {s.modality}
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase text-pitch-green">
                  Se crea {s.days_ahead} días antes
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleEdit(s)}
                  className="font-mono text-[10px] font-bold uppercase text-white/40 hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => void handleDelete(s)}
                  className="font-mono text-[10px] font-bold uppercase text-red-400 hover:text-red-300"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-[10px] font-bold uppercase text-white/20 italic">
          No hay partidos fijos configurados.
        </p>
      )}

      {showForm ? (
        <form onSubmit={(e) => void handleSave(e)} className="border border-white/10 divide-y divide-white/5">
          <div className="grid grid-cols-2 divide-x divide-white/5">
            <label className="block p-4">
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Día</span>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))}
                className="mt-2 w-full bg-transparent font-headline text-base font-bold text-white outline-none appearance-none"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i} className="bg-zinc-900">{d}</option>
                ))}
              </select>
            </label>
            <label className="block p-4">
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Hora</span>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))}
                className="mt-2 w-full bg-transparent font-headline text-base font-bold text-white outline-none"
              />
            </label>
          </div>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/50">Cancha</span>
            <input
              type="text"
              value={form.field_name}
              onChange={(e) => setForm((f) => ({ ...f, field_name: e.target.value }))}
              placeholder="Club Riachuelo"
              required
              className="mt-2 w-full bg-transparent font-headline text-base font-bold text-white outline-none placeholder:text-white/20"
            />
          </label>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/50">Google Maps (opcional)</span>
            <input
              type="url"
              value={form.field_maps_url}
              onChange={(e) => setForm((f) => ({ ...f, field_maps_url: e.target.value }))}
              placeholder="https://maps.app.goo.gl/..."
              className="mt-2 w-full bg-transparent font-headline text-base font-bold text-white outline-none placeholder:text-white/20"
            />
          </label>

          <div className="grid grid-cols-2 divide-x divide-white/5">
            <label className="block p-4">
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Modalidad</span>
              <select
                value={form.modality}
                onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value }))}
                className="mt-2 w-full bg-transparent font-headline text-base font-bold text-white outline-none appearance-none"
              >
                {MODALITIES.map((m) => (
                  <option key={m} value={m} className="bg-zinc-900">{m}</option>
                ))}
              </select>
            </label>
            <label className="block p-4">
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Días antes</span>
              <input
                type="number"
                min={1}
                max={14}
                value={form.days_ahead}
                onChange={(e) => setForm((f) => ({ ...f, days_ahead: Number(e.target.value) }))}
                className="mt-2 w-full bg-transparent font-headline text-base font-bold text-white outline-none"
              />
            </label>
          </div>

          <label className="block p-4">
            <span className="font-mono text-[10px] font-bold uppercase text-white/50">Notas (opcional)</span>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Cualquier aclaración..."
              className="mt-2 w-full bg-transparent font-headline text-base font-bold text-white outline-none placeholder:text-white/20"
            />
          </label>

          {error ? (
            <p className="px-4 py-2 font-mono text-[10px] font-bold uppercase text-red-500">{error}</p>
          ) : null}

          <div className="flex gap-3 p-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-pitch-green py-3 font-headline text-base font-bold italic uppercase text-black disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 font-mono text-[10px] font-bold uppercase text-white/40 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-white/20 py-4 font-headline text-base font-bold italic uppercase text-white/40 hover:border-white/40 hover:text-white/60 transition-colors"
        >
          + Agregar partido fijo
        </button>
      )}
    </div>
  );
}
