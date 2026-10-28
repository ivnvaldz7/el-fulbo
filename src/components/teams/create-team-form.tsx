'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { TeamsService } from '@/lib/services/teams.service';
import { createTeamSchema } from '@/lib/validations/teams';
import { routes } from '@/lib/routes';
import type { Modality } from '@/lib/types';

const modalityOptions: Array<{ value: Modality; label: string }> = [
  { value: 'F5', label: 'Fútbol 5' },
  { value: 'F6', label: 'Fútbol 6' },
  { value: 'F7', label: 'Fútbol 7' },
  { value: 'F8', label: 'Fútbol 8' },
  { value: 'F9', label: 'Fútbol 9' },
  { value: 'F11', label: 'Fútbol 11' },
];

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [modality, setModality] = useState<Modality>('F5');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const parsed = createTeamSchema.safeParse({ name, modality });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Algunos datos no son válidos.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const service = new TeamsService(supabase);
      const result = await service.createTeam(parsed.data);

      if (!result.ok) {
        setSubmitting(false);
        setError(result.error.message);
        return;
      }

      router.push(routes.teamDetail(result.data.teamId));
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Error inesperado al crear el equipo.');
    }
  }

  if (submitting) {
    return (
      <div className="flex min-h-[300px] flex-col justify-center text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Armando equipo</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">Preparando el vestuario...</h2>
        <ul className="mt-8 space-y-2 font-mono text-[10px] font-bold uppercase text-white/40">
          <li className="text-pitch-green">[X] Definiendo identidad</li>
          <li className="text-pitch-green">[X] Cargando roster</li>
          <li className="animate-pulse">[ ] Abriendo la cancha</li>
        </ul>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="divide-y divide-white/5 border border-white/10 bg-black/40">
        <label className="block p-4">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Nombre del equipo</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Los Merengues"
            aria-describedby={error ? 'create-team-error' : undefined}
            className="mt-2 w-full bg-transparent font-headline text-lg font-bold text-white outline-none placeholder:text-white/20"
          />
        </label>

        <label className="block p-4">
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Formato del equipo</span>
          <select
            value={modality}
            onChange={(event) => setModality(event.target.value as Modality)}
            className="mt-2 w-full cursor-pointer appearance-none bg-transparent font-headline text-lg font-bold text-white outline-none"
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
        <p id="create-team-error" className="py-2 text-center font-mono text-[10px] font-bold uppercase text-pitch-green">
          {error}
        </p>
      ) : null}

      <footer className="pt-6">
        <button
          type="submit"
          aria-busy={submitting}
          className="flex h-16 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95"
        >
          {submitting ? 'CREANDO...' : 'CREAR EQUIPO'}
        </button>
      </footer>
    </form>
  );
}
