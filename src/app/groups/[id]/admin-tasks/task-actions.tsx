'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TaskActions({
  taskType,
  itemId,
}: {
  taskType: 'cards_new' | 'revisions' | 'reintegrations';
  itemId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(decision: 'approve' | 'reject') {
    const note =
      decision === 'reject' ? window.prompt('Mensaje opcional para el jugador:', '')?.trim() ?? '' : '';

    setLoading(decision);
    setError(null);

    const response = await fetch('/api/admin-tasks/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskType,
        decision,
        id: itemId,
        note: note || null,
      }),
    });

    const body = (await response.json()) as { ok: boolean; error?: { message: string } };

    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? 'No pudimos resolver el pendiente.');
      setLoading(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => resolve('approve')}
          disabled={loading !== null}
          className="flex h-12 flex-grow items-center justify-center bg-pitch-green px-4 font-headline text-xs font-bold uppercase italic tracking-wider text-black transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {loading === 'approve' ? 'APROBANDO...' : 'APROBAR'}
        </button>
        <button
          type="button"
          onClick={() => resolve('reject')}
          disabled={loading !== null}
          className="flex h-12 w-1/3 items-center justify-center border border-white/20 bg-black/40 px-4 font-headline text-xs font-bold uppercase italic tracking-wider text-white transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {loading === 'reject' ? '...' : 'RECHAZAR'}
        </button>
      </div>
      {error ? (
        <p className="font-mono text-[10px] font-bold uppercase text-pitch-green italic text-center">
          {error}
        </p>
      ) : null}
    </div>
  );
}
