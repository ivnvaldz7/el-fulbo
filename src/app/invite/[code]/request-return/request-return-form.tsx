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
        <span className="mb-2 block font-mono text-[10px] font-bold uppercase text-white/40">Contale algo al admin si querés</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={200}
          placeholder="Un mensaje para el admin (opcional)"
          className="min-h-32 w-full border border-white/10 bg-black/30 px-4 py-3 font-headline text-base font-medium text-white outline-none placeholder:text-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="btn-interactive flex h-14 w-full items-center justify-center bg-pitch-green font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Mandando...' : 'Mandar solicitud'}
      </button>
      {error ? <p className="text-center font-mono text-[10px] font-bold uppercase text-pitch-green italic">{error}</p> : null}
    </form>
  );
}
