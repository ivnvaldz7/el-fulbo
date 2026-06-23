'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReactivateButton({
  playerId,
  fallbackGroupId,
}: {
  playerId: string;
  fallbackGroupId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReactivate() {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/invite/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });

    const body = (await response.json()) as {
      ok: boolean;
      data?: { groupId: string };
      error?: { message: string };
    };

    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? 'No pudimos reactivarte en el grupo.');
      setLoading(false);
      return;
    }

    router.push(`/groups/${body.data?.groupId ?? fallbackGroupId}/dashboard`);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleReactivate}
        disabled={loading}
        className="btn-interactive flex h-14 w-full items-center justify-center bg-pitch-green font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Volviendo...' : 'Volver al grupo'}
      </button>
      {error ? <p className="text-center font-mono text-[10px] font-bold uppercase text-pitch-green italic">{error}</p> : null}
    </div>
  );
}
