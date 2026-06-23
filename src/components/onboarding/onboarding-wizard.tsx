'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Goal, Footprints, Dumbbell } from 'lucide-react';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
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
  asAdmin = false,
}: {
  groupId: GroupId;
  displayName: string;
  asAdmin?: boolean;
}) {
  const router = useRouter();
  const storageKey = getOnboardingDraftKey(groupId);

  const [draftState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Draft;
          return { draft: parsed, hasDraft: true };
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
    }
    return { draft: initialDraft(), hasDraft: false };
  });

  const [draft, setDraft] = useState<Draft>(draftState.draft);
  const [message, setMessage] = useState<string | null>(
    draftState.hasDraft ? 'Retomamos donde te quedaste' : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [showSecondary, setShowSecondary] = useState(Boolean(draftState.draft.secondaryPosition));



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
      setMessage('Para desbloquear 9 y 10, el admin te tiene que ajustar.');
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
      body: JSON.stringify(asAdmin ? { ...parsed.data, asAdmin: true } : parsed.data),
    });

    const body = (await response.json()) as { ok: boolean; error?: { message: string } };

    if (!response.ok || !body.ok) {
      setMessage(body.error?.message ?? 'Problemas de conexion. Reintenta.');
      setSubmitting(false);
      return;
    }

    window.localStorage.removeItem(storageKey);
    router.push(asAdmin ? `/groups/${groupId}/dashboard` : `/groups/${groupId}/pending`);
  }

  if (draft.step === 1) {
    return (
      <ImmersiveScreen align="center" className="flex-col">
        <header className="fixed left-1/2 top-0 z-30 flex h-16 w-full max-w-[390px] lg:max-w-[480px] -translate-x-1/2 items-center justify-between border-b-2 border-white/10 bg-absolute-dark px-4">
          <button className="text-white active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-pitch-green">person</span>
          </button>
          <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">EL FULBO</h1>
          <div className="w-6"></div>
        </header>

        <main className="mt-16 flex w-full max-w-[390px] lg:max-w-[480px] flex-col px-6">
          <section className="py-6">
            <h2 className="font-headline text-3xl font-bold uppercase italic leading-none text-white">CREÁ TU JUGADOR</h2>
            <p className="font-mono text-[10px] uppercase text-pitch-green mt-1">Paso 1: Tu posición</p>
          </section>

          <div className="grid gap-3">
            {positions.map(({ value, label, icon: Icon }) => {
              const selected = draft.primaryPosition === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectPrimary(value)}
                  className={`flex items-center gap-4 border p-4 text-left transition ${
                    selected ? 'border-pitch-green bg-pitch-green text-black' : 'border-white/10 bg-concrete-overlay text-white'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${selected ? 'text-black' : 'text-pitch-green'}`} aria-hidden="true" />
                  <div>
                    <span className="block font-headline text-lg font-black italic uppercase leading-none">{label}</span>
                    <span className="font-mono text-[10px] uppercase opacity-60">{value}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowSecondary((value) => !value)}
            className="mt-6 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green"
          >
            {showSecondary ? '— QUITAR SEGUNDA POSICIÓN' : '+ AGREGAR SEGUNDA POSICIÓN'}
          </button>

          {showSecondary ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
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
                  className={`border py-2 font-mono text-[10px] font-bold uppercase disabled:cursor-not-allowed disabled:opacity-20 ${
                    draft.secondaryPosition === value
                      ? 'border-pitch-green bg-pitch-green text-black'
                      : 'border-white/10 bg-concrete-overlay text-white'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}

          <footer className="mt-10">
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setDraft((current) => ({ ...current, step: 2 }))}
              className="w-full bg-pitch-green py-4 font-headline text-xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              SIGUIENTE →
            </button>
          </footer>
        </main>
      </ImmersiveScreen>
    );
  }

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <header className="fixed left-1/2 top-0 z-30 flex h-16 w-full max-w-[390px] lg:max-w-[480px] -translate-x-1/2 items-center justify-between border-b-2 border-white/10 bg-absolute-dark px-4">
        <button 
          onClick={() => setDraft((current) => ({ ...current, step: 1 }))}
          className="text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-6 w-6 text-pitch-green" aria-hidden="true" />
        </button>
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">EL FULBO</h1>
        <div className="w-6"></div>
      </header>

      <main className="mt-16 flex w-full max-w-[390px] lg:max-w-[480px] flex-col px-6">
        <section className="py-6">
          <h2 className="font-headline text-3xl font-bold uppercase italic leading-none text-white">ARMÁ TU CARTA</h2>
          <p className="font-mono text-[10px] uppercase text-pitch-green mt-1">Paso 2: Tus habilidades</p>
        </section>

        <section className="mb-6 flex justify-center">
          <PlayerCardPreview
            name={displayName}
            position={draft.primaryPosition ?? 'MED'}
            stats={stats}
            pending
          />
        </section>

        <section className="space-y-3">
          <div className="border border-white/10 bg-concrete-overlay divide-y divide-white/5">
            {Object.entries(statLabels).map(([key, label]) => (
              <div key={key} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold uppercase text-white/60">{label}</span>
                  <span className="font-headline text-lg font-black italic text-pitch-green">{stats[key as keyof PlayerStats] * 10}</span>
                </div>
                <input
                  className="h-1 w-full cursor-pointer appearance-none bg-white/10 accent-pitch-green [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-pitch-green"
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={Number(stats[key as keyof PlayerStats])}
                  onChange={(event) => updateStat(key, Number(event.target.value))}
                />
              </div>
            ))}
          </div>
        </section>

        {message ? (
          <p className="mt-4 font-mono text-[10px] font-bold uppercase text-pitch-green text-center">
            {message}
          </p>
        ) : null}

        <footer className="mt-8 pb-10">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full bg-pitch-green py-4 font-headline text-xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'MANDANDO...' : asAdmin ? 'CREAR JUGADOR' : 'GUARDAR JUGADOR'}
          </button>
        </footer>
      </main>
    </ImmersiveScreen>
  );
}
