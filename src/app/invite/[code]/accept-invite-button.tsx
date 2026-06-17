'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AcceptInviteButton({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acceptInvite() {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode }),
    });
    const body = (await response.json()) as {
      ok: boolean;
      data?: { groupId: string; alreadyMember: boolean; needsOnboarding: boolean };
      error?: { message: string };
    };

    if (!response.ok || !body.ok || !body.data) {
      setError(body.error?.message ?? 'No pudimos sumarte al grupo.');
      setLoading(false);
      return;
    }

    if (body.data.needsOnboarding) {
      router.push(`/groups/${body.data.groupId}/onboarding-stats`);
    } else {
      router.push(`/groups/${body.data.groupId}/dashboard`);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={acceptInvite}
        disabled={loading}
        className="btn-interactive flex h-16 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Uniéndote...' : 'Unite al fulbito'}
      </button>
      {error ? <p className="text-center font-mono text-[10px] font-bold uppercase text-pitch-green italic">{error}</p> : null}
    </div>
  );
}
