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
      data?: { groupId: string; alreadyMember: boolean };
      error?: { message: string };
    };

    if (!response.ok || !body.ok || !body.data) {
      setError(body.error?.message ?? 'No pudimos sumarte al grupo.');
      setLoading(false);
      return;
    }

    router.push(
      body.data.alreadyMember
        ? `/groups/${body.data.groupId}/dashboard`
        : `/groups/${body.data.groupId}/onboarding-stats`,
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={acceptInvite}
        disabled={loading}
        className="min-h-12 w-full rounded-card bg-noche px-5 py-3 text-sm font-black text-cal disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Uniéndote...' : 'Unite al fulbito'}
      </button>
      {error ? <p className="text-sm font-bold text-derrota">{error}</p> : null}
    </div>
  );
}
