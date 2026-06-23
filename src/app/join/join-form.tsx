'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    const body = (await response.json()) as {
      ok: boolean;
      error?: { message: string };
      data?: { kind: string; preview?: { groupId: string } };
    };

    if (!response.ok || !body.ok) {
      setError(
        body.error?.message ??
          'Código inválido. Revisá que esté bien escrito.',
      );
      setLoading(false);
      return;
    }

    const kind = body.data?.kind;
    const groupId = body.data?.preview?.groupId;

    // Already a member → directo al dashboard
    if (kind === 'active_member' && groupId) {
      router.push(`/groups/${groupId}/dashboard`);
      return;
    }

    // Usuario logueado sin carta → aceptar invitación e ir a onboarding o dashboard
    if (kind === 'new' && groupId) {
      const acceptRes = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: parsed.data }),
      });
      const acceptBody = (await acceptRes.json()) as {
        ok: boolean;
        data?: { groupId: string; needsOnboarding: boolean };
        error?: { message: string };
      };

      if (!acceptRes.ok || !acceptBody.ok || !acceptBody.data) {
        setError(acceptBody.error?.message ?? 'No pudimos sumarte al grupo.');
        setLoading(false);
        return;
      }

      if (acceptBody.data.needsOnboarding) {
        router.push(`/groups/${acceptBody.data.groupId}/onboarding-stats`);
      } else {
        router.push(`/groups/${acceptBody.data.groupId}/dashboard`);
      }
      return;
    }

    // Para el resto (anonymous, expelled, group_full, etc.) → flujo actual
    router.push(`/invite/${parsed.data}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="border border-white/10 bg-black/40 p-4">
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase text-white/40">Código de invitación</span>
          <input
            value={code}
            onChange={(event) => setCode(formatInviteCode(event.target.value))}
            placeholder="FULBO-XXXXXX"
            className="mt-2 w-full bg-transparent font-headline text-3xl font-black uppercase tracking-widest text-white outline-none placeholder:text-white/10"
          />
        </label>
      </div>

      {error ? (
        <p className="py-2 text-center font-mono text-[10px] font-bold uppercase text-pitch-green italic">
          {error}
        </p>
      ) : null}

      <footer className="pt-6">
        <button
          type="submit"
          disabled={!parsed.success || loading}
          className="flex h-16 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'VALIDANDO...' : 'ENTRAR A LA CANCHA'}
        </button>
      </footer>
    </form>
  );
}
