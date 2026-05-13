'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TemporaryOwnerClient({
  eventId,
  groupId,
  groupName,
  scheduledAt,
  fieldName,
}: {
  eventId: string;
  groupId: string;
  groupName: string;
  scheduledAt: string;
  fieldName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setLoading(accept ? 'accept' : 'reject');
    setError(null);

    const response = await fetch(`/api/temporary-owner/${eventId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });

    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? 'No pudimos responder la designación.');
      setLoading(null);
      return;
    }

    router.push(`/groups/${groupId}/events/${eventId}`);
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="border border-white/10 bg-concrete-overlay p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Owner temporal
        </p>
        <h2 className="mt-2 font-headline text-3xl font-black italic uppercase text-white">
          Te designaron como owner temporal
        </h2>
        <p className="mt-3 text-sm text-white/70">
          Del partido de {groupName} en {fieldName} el{' '}
          {new Date(scheduledAt).toLocaleDateString('es-AR')} a las{' '}
          {new Date(scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.
        </p>
        <p className="mt-4 text-sm text-white/65">
          Si aceptás, vas a poder hacer check-in, sortear, cargar resultado y elegir MVP. Tus poderes duran 24 horas después del partido.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void respond(true)}
          disabled={loading !== null}
          className="h-14 bg-pitch-green font-headline text-lg font-bold italic uppercase text-black disabled:opacity-50"
        >
          {loading === 'accept' ? 'Aceptando...' : 'Acepto'}
        </button>
        <button
          type="button"
          onClick={() => void respond(false)}
          disabled={loading !== null}
          className="h-14 border border-white/20 bg-black/40 font-headline text-lg font-bold italic uppercase text-white disabled:opacity-50"
        >
          {loading === 'reject' ? '...' : 'No puedo'}
        </button>
      </div>

      {error ? (
        <p className="font-mono text-[10px] font-bold uppercase text-pitch-green italic text-center">{error}</p>
      ) : null}
    </div>
  );
}
