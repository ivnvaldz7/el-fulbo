'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { TeamsService } from '@/lib/services/teams.service';
import { createTeamSchema } from '@/lib/validations/teams';
import { routes } from '@/lib/routes';
import type { PlayerPosition } from '@/lib/types';

const positionOptions: Array<{ value: PlayerPosition; label: string }> = [
  { value: 'ARQ', label: 'ARQ — Arquero' },
  { value: 'DEF', label: 'DEF — Defensor' },
  { value: 'MED', label: 'MED — Mediocampista' },
  { value: 'DEL', label: 'DEL — Delantero' },
];

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition>('MED');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const parsed = createTeamSchema.safeParse({ name, primaryPosition });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Algunos datos no son válidos.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const service = new TeamsService(supabase);
    const result = await service.createTeam(parsed.data);

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error.message);
      return;
    }

    router.push(routes.teamDetail(result.data.teamId));
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
          <span className="font-mono text-[10px] font-bold uppercase text-white/60">Tu posición</span>
          <select
            value={primaryPosition}
            onChange={(event) => setPrimaryPosition(event.target.value as PlayerPosition)}
            className="mt-2 w-full cursor-pointer appearance-none bg-transparent font-headline text-lg font-bold text-white outline-none"
          >
            {positionOptions.map((option) => (
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
