'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';

export function AcceptTeamInviteButton({ inviteCode, teamId }: { inviteCode: string; teamId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acceptInvite() {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/invite/accept-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode }),
    });

    const body = (await response.json()) as {
      ok: boolean;
      data?: { teamId: string };
      error?: { message: string };
    };

    if (!response.ok || !body.ok || !body.data) {
      setError(body.error?.message ?? 'No pudimos sumarte al equipo.');
      setLoading(false);
      return;
    }

    router.push(routes.teamDetail(body.data.teamId));
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={acceptInvite}
        disabled={loading}
        className="btn-interactive flex h-16 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Uniéndote...' : 'Unite al equipo'}
      </button>
      {error ? <p className="text-center font-mono text-[10px] font-bold uppercase italic text-pitch-green">{error}</p> : null}
    </div>
  );
}
