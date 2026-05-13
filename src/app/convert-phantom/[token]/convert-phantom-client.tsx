'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  token: string;
  playerName: string;
  groupName: string;
}

export function ConvertPhantomClient({ token, playerName, groupName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/convert-phantom/${token}`, { method: 'POST' });
    const json = await res.json() as { ok: boolean; error?: { message: string } };

    if (!json.ok) {
      setError(json.error?.message ?? 'No pudimos completar la conversión.');
      setLoading(false);
      return;
    }

    router.push('/groups');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-absolute-dark px-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          {groupName}
        </p>
        <h1 className="mt-2 font-headline text-3xl font-black italic uppercase text-white">
          ¡Jugador real!
        </h1>
        <p className="mt-3 font-mono text-sm text-white/60">
          Tu ficha de <span className="font-bold text-white">{playerName}</span> y todo el historial de partidos pasan a tu cuenta.
        </p>

        {error && (
          <div className="mt-4 border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="font-mono text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={loading}
          className="mt-6 flex h-14 w-full items-center justify-center bg-pitch-green font-headline text-xl font-bold italic uppercase text-black disabled:opacity-60"
        >
          {loading ? 'Aceptando...' : 'Aceptar y jugar'}
        </button>
      </div>
    </div>
  );
}
