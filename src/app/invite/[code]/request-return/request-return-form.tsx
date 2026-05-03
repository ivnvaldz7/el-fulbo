'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RequestReturnForm({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/invite/request-return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, message }),
    });

    const body = (await response.json()) as {
      ok: boolean;
      error?: { message: string };
    };

    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? 'No pudimos mandar tu solicitud.');
      setLoading(false);
      return;
    }

    router.push(`/invite/${inviteCode}/request-sent`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-noche">Contale algo al admin si querés</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={200}
          placeholder="Un mensaje para el admin (opcional)"
          className="min-h-32 w-full rounded-card border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-cancha"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="min-h-12 w-full rounded-card bg-noche px-5 py-3 text-sm font-black text-cal disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Mandando...' : 'Mandar solicitud'}
      </button>
      {error ? <p className="text-sm font-bold text-derrota">{error}</p> : null}
    </form>
  );
}
