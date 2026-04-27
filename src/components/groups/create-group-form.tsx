'use client';

import { useEffect, useState } from 'react';
import type { Modality } from '@/lib/types';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { createGroup, CREATE_GROUP_DRAFT_KEY } from '@/lib/services/groups.service';
import { createGroupSchema } from '@/lib/validations/group';

const modalityOptions: Array<{ value: Modality; label: string }> = [
  { value: 'F5', label: 'F5 - 5 vs 5' },
  { value: 'F6', label: 'F6 - 6 vs 6' },
  { value: 'F8', label: 'F8 - 8 vs 8' },
  { value: 'F11', label: 'F11 - 11 vs 11' },
];

export function CreateGroupForm() {
  const [name, setName] = useState('');
  const [modality, setModality] = useState<Modality>('F5');
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CREATE_GROUP_DRAFT_KEY);
    if (!stored) return;

    try {
      const draft = JSON.parse(stored) as { name?: string; modality?: Modality };
      setName(draft.name ?? '');
      setModality(draft.modality ?? 'F5');
    } catch {
      window.localStorage.removeItem(CREATE_GROUP_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CREATE_GROUP_DRAFT_KEY, JSON.stringify({ name, modality }));
  }, [name, modality]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = createGroupSchema.safeParse({ name, modality });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Algunos datos no son validos.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setGroupId(null);

    const result = await createGroup(createBrowserSupabaseClient(), parsed.data);

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setGroupId(result.data.groupId);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-black text-noche">Nombre del grupo</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Fulbito de los jueves"
          aria-describedby={error ? 'create-group-error' : undefined}
          className="mt-2 min-h-14 w-full rounded-card border border-black/15 bg-white px-4 text-base font-bold text-noche outline-none focus:border-cancha"
        />
      </label>

      <label className="block">
        <span className="text-sm font-black text-noche">Modalidad</span>
        <select
          value={modality}
          onChange={(event) => setModality(event.target.value as Modality)}
          className="mt-2 min-h-14 w-full rounded-card border border-black/15 bg-white px-4 text-base font-bold text-noche outline-none focus:border-cancha"
        >
          {modalityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p id="create-group-error" className="text-sm font-bold text-derrota">
          {error}
        </p>
      ) : null}

      {groupId ? (
        <p className="text-sm font-bold text-cancha">Grupo creado: {groupId}</p>
      ) : null}

      <button
        type="submit"
        aria-busy={submitting}
        className="min-h-12 w-full rounded-card bg-noche px-6 py-3 text-sm font-black text-cal"
      >
        {submitting ? 'Creando...' : 'Crear grupo'}
      </button>
    </form>
  );
}
