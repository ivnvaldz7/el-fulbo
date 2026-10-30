'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { FieldStats, GoalkeeperStats, PlayerPosition, PlayerStats } from '@/lib/types';
import { routes } from '@/lib/routes';
import type { TeamCard } from '@/lib/types/teams.types';
import { TeamsService } from '@/lib/services/teams.service';
import { teamCardSchema } from '@/lib/validations/teams';

const positions: Array<{ value: PlayerPosition; label: string }> = [
  { value: 'ARQ', label: 'Arquero' },
  { value: 'DEF', label: 'Defensor' },
  { value: 'MED', label: 'Mediocampista' },
  { value: 'DEL', label: 'Delantero' },
];

const fieldStats = [
  ['pac', 'Velocidad'],
  ['sho', 'Tiro'],
  ['pas', 'Pase'],
  ['dri', 'Regate'],
  ['def', 'Defensa'],
  ['phy', 'Físico'],
] as const;

const goalkeeperStats = [
  ['div', 'Estirada'],
  ['han', 'Manos'],
  ['kic', 'Saque'],
  ['ref', 'Reflejos'],
  ['spd', 'Velocidad'],
  ['pos', 'Colocación'],
] as const;

const defaultFieldStats: FieldStats = { pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 };
const defaultGoalkeeperStats: GoalkeeperStats = { div: 70, han: 70, kic: 70, ref: 70, spd: 70, pos: 70 };

function initialDraft(card: TeamCard | null) {
  return {
    stats: card?.stats ?? defaultFieldStats,
    primaryPosition: card?.primaryPosition ?? 'MED',
    secondaryPosition: card?.secondaryPosition ?? 'DEL',
  } satisfies { stats: PlayerStats; primaryPosition: PlayerPosition; secondaryPosition: PlayerPosition };
}

export function TeamCardEditor({
  card,
  playerName,
  photoUrl,
  backHref = routes.teamProfile,
}: {
  card: TeamCard | null;
  playerName: string;
  photoUrl: string | null;
  backHref?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const service = useMemo(() => new TeamsService(supabase), [supabase]);
  const [draft, setDraft] = useState(() => initialDraft(card));
  const [saving, setSaving] = useState(false);
  const locked = Boolean(card?.positionsLockedAt);
  const statEntries = draft.primaryPosition === 'ARQ' ? goalkeeperStats : fieldStats;

  function selectPrimaryPosition(primaryPosition: PlayerPosition) {
    if (locked) return;

    setDraft((current) => ({
      ...current,
      primaryPosition,
      secondaryPosition: current.secondaryPosition === primaryPosition
        ? positions.find((position) => position.value !== primaryPosition)?.value ?? 'MED'
        : current.secondaryPosition,
      stats: current.primaryPosition === 'ARQ' === (primaryPosition === 'ARQ')
        ? current.stats
        : primaryPosition === 'ARQ'
          ? defaultGoalkeeperStats
          : defaultFieldStats,
    }));
  }

  function updateStat(key: string, value: number) {
    if (locked) return;

    setDraft((current) => ({
      ...current,
      stats: { ...current.stats, [key]: value } as PlayerStats,
    }));
  }

  async function handleSubmit() {
    const parsed = teamCardSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error('Revisá la posición y las aptitudes antes de guardar.');
      return;
    }

    setSaving(true);
    try {
      const result = card ? await service.updateCard(parsed.data) : await service.createCard(parsed.data);
      if (!result.ok) throw new Error(result.error.message);
      toast.success(card ? 'Card actualizada.' : 'Card creada.');
      router.push(backHref);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar la card.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start">
      <div className="mx-auto w-full max-w-[300px]">
        <div className="rounded-[2rem] bg-white/5 p-2 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
          <div className="overflow-hidden rounded-[1.65rem] bg-black/40">
            <PlayerCardPreview
              name={playerName}
              position={draft.primaryPosition}
              stats={draft.stats}
              photoUrl={photoUrl}
              showBoostIndicator={false}
            />
          </div>
          <p className="px-3 pb-2 pt-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            Base inicial · 55 a 75 por aptitud
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green">Posición principal</span>
            <select
              value={draft.primaryPosition}
              onChange={(event) => selectPrimaryPosition(event.target.value as PlayerPosition)}
              disabled={locked}
              className="h-12 rounded-xl bg-black/50 px-4 text-sm font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {positions.map((position) => <option key={position.value} value={position.value}>{position.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green">Posición secundaria</span>
            <select
              value={draft.secondaryPosition}
              onChange={(event) => setDraft((current) => ({ ...current, secondaryPosition: event.target.value as PlayerPosition }))}
              disabled={locked}
              className="h-12 rounded-xl bg-black/50 px-4 text-sm font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-pitch-green/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {positions.filter((position) => position.value !== draft.primaryPosition).map((position) => <option key={position.value} value={position.value}>{position.label}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-[1.5rem] bg-black/30 p-5 ring-1 ring-white/10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green">Aptitudes iniciales</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/45">La progresión se gana con partidos válidos y méritos aprobados.</p>
            </div>
            <span className="font-headline text-2xl font-black text-white">{Math.round(Object.values(draft.stats).reduce((sum, value) => sum + value, 0) / 6)}</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {statEntries.map(([key, label]) => {
              const value = Number((draft.stats as unknown as Record<string, number>)[key]);
              return (
                <label key={key} className="grid gap-2">
                  <span className="flex items-center justify-between font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white/60">
                    {label}
                    <output className="text-pitch-green">{value}</output>
                  </span>
                  <input
                    aria-label={label}
                    type="range"
                    min="55"
                    max="75"
                    value={value}
                    onChange={(event) => updateStat(key, Number(event.target.value))}
                    disabled={locked}
                    className="accent-pitch-green disabled:opacity-50"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {locked ? (
          <p className="rounded-[1.35rem] bg-pitch-green/10 px-5 py-4 text-xs font-semibold leading-5 text-pitch-green ring-1 ring-pitch-green/20">
            Tus posiciones ya fueron aprobadas por un equipo y están bloqueadas. La card mejora únicamente por la progresión de Equipos.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={backHref} className="text-center font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/45 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white">
            Volver a mi perfil
          </Link>
          {!locked ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="btn-interactive rounded-full bg-pitch-green px-6 py-3 font-headline text-sm font-black uppercase text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando...' : card ? 'Guardar cambios' : 'Crear mi card'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
