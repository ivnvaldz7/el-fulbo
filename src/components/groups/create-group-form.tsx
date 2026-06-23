'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Modality } from '@/lib/types';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { createGroup, CREATE_GROUP_DRAFT_KEY } from '@/lib/services/groups.service';
import { createGroupSchema } from '@/lib/validations/group';

const modalityOptions: Array<{ value: Modality; label: string }> = [
  { value: 'F5', label: 'F5 - 5 vs 5' },
  { value: 'F6', label: 'F6 - 6 vs 6' },
  { value: 'F7', label: 'F7 - 7 vs 7' },
  { value: 'F8', label: 'F8 - 8 vs 8' },
  { value: 'F9', label: 'F9 - 9 vs 9' },
  { value: 'F11', label: 'F11 - 11 vs 11' },
];

export function CreateGroupForm() {
  const router = useRouter();
  const getDraft = () => {
    if (typeof window === 'undefined') return { name: '', modality: 'F5' as Modality };
    const stored = window.localStorage.getItem(CREATE_GROUP_DRAFT_KEY);
    if (!stored) return { name: '', modality: 'F5' as Modality };
    try {
      const draft = JSON.parse(stored) as { name?: string; modality?: Modality };
      return { name: draft.name ?? '', modality: draft.modality ?? ('F5' as Modality) };
    } catch {
      window.localStorage.removeItem(CREATE_GROUP_DRAFT_KEY);
      return { name: '', modality: 'F5' as Modality };
    }
  };

  const draft = useMemo(() => getDraft(), []);
  const [name, setName] = useState(draft.name);
  const [modality, setModality] = useState<Modality>(draft.modality);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(CREATE_GROUP_DRAFT_KEY, JSON.stringify({ name, modality }));
  }, [name, modality]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = createGroupSchema.safeParse({ name, modality });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Algunos datos no son válidos.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await createGroup(createBrowserSupabaseClient(), parsed.data);

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error.message);
      return;
    }

    router.push(`/groups/${result.data.groupId}/onboarding-stats?as=admin`);
  }

  if (submitting) {
    return <CreateGroupLoadingScreen />;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="border border-white/10 bg-black/40 divide-y divide-white/5">
        <label className="block p-4">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Nombre del grupo</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Fulbito de los jueves"
            aria-describedby={error ? 'create-group-error' : undefined}
            className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none placeholder:text-white/20"
          />
        </label>

        <label className="block p-4">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Modalidad default</span>
          <select
            value={modality}
            onChange={(event) => setModality(event.target.value as Modality)}
            className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none appearance-none cursor-pointer"
          >
            {modalityOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-concrete-overlay">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p id="create-group-error" className="py-2 text-center font-mono text-[10px] font-bold uppercase text-pitch-green">
          {error}
        </p>
      ) : null}

      <footer className="pt-6">
        <button
          type="submit"
          aria-busy={submitting}
          className="flex h-16 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95"
        >
          {submitting ? 'CREANDO...' : 'CREAR GRUPO ⚽'}
        </button>
      </footer>
    </form>
  );
}

function CreateGroupLoadingScreen() {
  return (
    <div className="flex min-h-[300px] flex-col justify-center text-center">
      <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
      <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Fundando grupo</p>
      <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white tracking-tight">Un toque más y entramos...</h2>
      <ul className="mt-8 space-y-2 font-mono text-[10px] font-bold uppercase text-white/40">
        <li className="text-pitch-green">[X] Armando vestuario</li>
        <li className="text-pitch-green">[X] Preparando tu carnet</li>
        <li className="animate-pulse">[ ] Abriendo la cancha</li>
      </ul>
    </div>
  );
}
