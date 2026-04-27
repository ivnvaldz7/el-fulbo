'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { inviteCodeSchema } from '@/lib/validations/onboarding';

function formatInviteCode(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('FULBO')) {
    return `FULBO-${cleaned.slice(5, 11)}`;
  }
  return cleaned.slice(0, 12);
}

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const parsed = inviteCodeSchema.safeParse(code);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.success) return;

    setLoading(true);
    setError(null);

    const response = await fetch('/api/invite/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: parsed.data }),
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };

    if (!response.ok || !body.ok) {
      setError(
        body.error?.message ??
          'No encontramos ese codigo. Revisa que este bien escrito, o pedile el link a quien te invito.',
      );
      setLoading(false);
      return;
    }

    router.push(`/invite/${parsed.data}`);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="sr-only">Codigo de invitacion</span>
        <input
          value={code}
          onChange={(event) => setCode(formatInviteCode(event.target.value))}
          placeholder="FULBO-XXXXXX"
          className="min-h-14 w-full rounded-card border border-black/15 bg-white px-4 text-2xl font-black uppercase tracking-wide outline-none focus:border-cancha"
        />
      </label>
      {error ? <p className="text-sm font-bold text-derrota">{error}</p> : null}
      <button
        type="submit"
        disabled={!parsed.success || loading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-noche px-5 py-3 text-sm font-black text-cal disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Validando...' : 'Continuar'}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
