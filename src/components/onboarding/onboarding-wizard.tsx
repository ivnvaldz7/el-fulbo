'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Goal, Footprints, Dumbbell } from 'lucide-react';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import type { FieldStats, GoalkeeperStats, GroupId, PlayerPosition, PlayerStats } from '@/lib/types';
import {
  defaultFieldStats,
  defaultGoalkeeperStats,
  submitOnboardingStatsSchema,
} from '@/lib/validations/onboarding';
import { getOnboardingDraftKey } from '@/lib/services/onboarding.service';

type Draft = {
  step: 1 | 2;
  primaryPosition: PlayerPosition | null;
  secondaryPosition: PlayerPosition | null;
  stats: PlayerStats;
};

const positions: Array<{ value: PlayerPosition; label: string; icon: typeof Shield }> = [
  { value: 'ARQ', label: 'Arquero', icon: Goal },
  { value: 'DEF', label: 'Defensor', icon: Shield },
  { value: 'MED', label: 'Mediocampista', icon: Footprints },
  { value: 'DEL', label: 'Delantero', icon: Dumbbell },
];

const fieldLabels: Record<keyof FieldStats, string> = {
  pac: 'Velocidad',
  sho: 'Tiro',
  pas: 'Pase',
  dri: 'Regate',
  def: 'Defensa',
  phy: 'Fisico',
};

const goalkeeperLabels: Record<keyof GoalkeeperStats, string> = {
  div: 'Estirada',
  han: 'Manos',
  kic: 'Saque',
  ref: 'Reflejos',
  spd: 'Velocidad',
  pos: 'Colocacion',
};

function initialDraft(): Draft {
  return {
    step: 1,
    primaryPosition: null,
    secondaryPosition: null,
    stats: defaultFieldStats,
  };
}

export function selectPrimaryPositionDraft(current: Draft, position: PlayerPosition): Draft {
  const wasGoalkeeper = current.primaryPosition === 'ARQ';
  const nextIsGoalkeeper = position === 'ARQ';
  const changedStatFamily = current.primaryPosition === null || wasGoalkeeper !== nextIsGoalkeeper;

  return {
    ...current,
    primaryPosition: position,
    secondaryPosition: current.secondaryPosition === position ? null : current.secondaryPosition,
    stats: changedStatFamily
      ? nextIsGoalkeeper
        ? defaultGoalkeeperStats
        : defaultFieldStats
      : current.stats,
  };
}

export function OnboardingWizard({
  groupId,
  displayName,
}: {
  groupId: GroupId;
  displayName: string;
}) {
  const router = useRouter();
  const storageKey = getOnboardingDraftKey(groupId);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Draft;
      setDraft(parsed);
      setShowSecondary(Boolean(parsed.secondaryPosition));
      setMessage('Retomamos donde te quedaste');
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  const statLabels = draft.primaryPosition === 'ARQ' ? goalkeeperLabels : fieldLabels;
  const stats = draft.stats;

  const canContinue = Boolean(draft.primaryPosition);
  const parsed = useMemo(() => {
    if (!draft.primaryPosition) return null;
    return submitOnboardingStatsSchema.safeParse({
      groupId,
      primaryPosition: draft.primaryPosition,
      secondaryPosition: draft.secondaryPosition,
      stats: draft.stats,
    });
  }, [draft, groupId]);

  function selectPrimary(position: PlayerPosition) {
    setDraft((current) => selectPrimaryPositionDraft(current, position));
  }

  function updateStat(key: string, value: number) {
    const clamped = Math.max(1, Math.min(8, value));
    if (value > 8) {
      setMessage('Para desbloquear 9 y 10, el admin te tiene que ajustar o ganas partidos.');
    }
    setDraft((current) => ({
      ...current,
      stats: {
        ...current.stats,
        [key]: clamped,
      } as PlayerStats,
    }));
  }

  async function submit() {
    if (!parsed?.success) {
      setMessage('Revisa los valores y reintenta.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/onboarding/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    const body = (await response.json()) as { ok: boolean; error?: { message: string } };

    if (!response.ok || !body.ok) {
      setMessage(body.error?.message ?? 'Problemas de conexion. Reintenta.');
      setSubmitting(false);
      return;
    }

    window.localStorage.removeItem(storageKey);
    router.push(`/groups/${groupId}/pending`);
  }

  if (draft.step === 1) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-5 py-10">
        <p className="text-sm font-black uppercase text-cancha">Paso 1 de 2</p>
        <h1 className="mt-3 text-4xl font-black text-noche">En que posicion jugas?</h1>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {positions.map(({ value, label, icon: Icon }) => {
            const selected = draft.primaryPosition === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => selectPrimary(value)}
                className={`rounded-card border p-5 text-left transition ${
                  selected ? 'border-cancha bg-cancha text-white' : 'border-black/10 bg-white/80'
                }`}
              >
                <Icon className="mb-5 h-7 w-7" aria-hidden="true" />
                <span className="text-2xl font-black">{value}</span>
                <span className="ml-3 text-sm font-bold">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowSecondary((value) => !value)}
          className="mt-6 text-left text-sm font-black text-cancha"
        >
          Tenes segunda posicion?
        </button>

        {showSecondary ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {positions.map(({ value }) => (
              <button
                key={value}
                type="button"
                disabled={draft.primaryPosition === value}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    secondaryPosition: current.secondaryPosition === value ? null : value,
                  }))
                }
                className={`rounded-card border px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-30 ${
                  draft.secondaryPosition === value
                    ? 'border-cancha bg-cancha text-white'
                    : 'border-black/10 bg-white/80'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!canContinue}
          onClick={() => setDraft((current) => ({ ...current, step: 2 }))}
          className="mt-8 min-h-12 rounded-card bg-noche px-6 py-3 font-black text-cal disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-8 lg:grid-cols-2">
      <section className="sticky top-4 self-start">
        <button
          type="button"
          onClick={() => setDraft((current) => ({ ...current, step: 1 }))}
          className="mb-5 inline-flex items-center gap-2 text-sm font-black text-cancha"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Atras
        </button>
        <PlayerCardPreview
          name={displayName}
          position={draft.primaryPosition ?? 'MED'}
          stats={stats}
          pending
        />
      </section>

      <section>
        <p className="text-sm font-black uppercase text-cancha">Paso 2 de 2</p>
        <h1 className="mt-3 text-4xl font-black text-noche">Arma tu carta</h1>
        <div className="mt-7 space-y-5">
          {Object.entries(statLabels).map(([key, label]) => (
            <label key={key} className="block rounded-card border border-black/10 bg-white/80 p-4">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="text-sm font-black uppercase text-noche">{key}</span>
                  <span className="ml-3 text-sm font-semibold text-neutral-600">{label}</span>
                </span>
                <span className="text-xl font-black text-cancha">
                  {stats[key as keyof PlayerStats]}
                </span>
              </span>
              <input
                className="mt-4 w-full accent-cancha"
                type="range"
                min={1}
                max={8}
                step={1}
                value={Number(stats[key as keyof PlayerStats])}
                onChange={(event) => updateStat(key, Number(event.target.value))}
              />
            </label>
          ))}
        </div>

        {message ? <p className="mt-5 text-sm font-bold text-cancha">{message}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-8 min-h-12 w-full rounded-card bg-noche px-6 py-3 font-black text-cal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Mandando...' : 'Mandar al admin'}
        </button>
      </section>
    </div>
  );
}
