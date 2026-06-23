'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OwnerCandidate, OwnerMember } from '@/lib/services/owners.service';

export function OwnersSettingsClient({
  groupId,
  owners,
  candidates,
}: {
  groupId: string;
  owners: OwnerMember[];
  candidates: OwnerCandidate[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return candidates;
    }

    return candidates.filter((candidate) => candidate.displayName.toLowerCase().includes(normalized));
  }, [candidates, query]);

  async function submit(action: 'assign' | 'remove', userId: string) {
    setLoadingUserId(userId);
    setError(null);

    const response = await fetch(`/api/groups/${groupId}/owners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userId }),
    });

    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? 'No pudimos actualizar los owners.');
      setLoadingUserId(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="border border-white/10 bg-concrete-overlay p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Owners</p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">Owners actuales</h2>
        <p className="mt-2 text-sm text-white/65">
          Los owners pueden sortear, cargar resultados y elegir MVP. No editan stats.
        </p>

        {owners.length === 0 ? (
          <p className="mt-5 font-mono text-[10px] font-bold uppercase text-white/30">Todavía no hay owners.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {owners.map((owner) => (
              <li key={owner.userId} className="flex items-center justify-between gap-3 border border-white/10 px-4 py-3">
                <div>
                  <p className="font-headline text-lg font-black italic uppercase text-white">{owner.displayName}</p>
                  <p className="font-mono text-[10px] font-bold uppercase text-white/40">
                    Desde {new Date(owner.assignedAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void submit('remove', owner.userId)}
                  disabled={loadingUserId !== null}
                  className="h-11 border border-white/20 bg-black/40 px-4 font-headline text-xs font-bold uppercase italic text-white disabled:opacity-50"
                >
                  {loadingUserId === owner.userId ? '...' : 'Remover'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {owners.length < 2 ? (
        <section className="border border-white/10 bg-concrete-overlay p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Agregar owner</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre"
            className="mt-4 h-12 w-full border border-white/10 bg-black/30 px-4 font-headline text-white outline-none"
          />

          {filteredCandidates.length === 0 ? (
            <p className="mt-4 font-mono text-[10px] font-bold uppercase text-white/30">
              No encontramos candidatos con ese filtro.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {filteredCandidates.map((candidate) => (
                <li key={candidate.userId} className="flex items-center justify-between gap-3 border border-white/10 px-4 py-3">
                  <p className="font-headline text-lg font-black italic uppercase text-white">{candidate.displayName}</p>
                  <button
                    type="button"
                    onClick={() => void submit('assign', candidate.userId)}
                    disabled={loadingUserId !== null}
                    className="h-11 bg-pitch-green px-4 font-headline text-xs font-bold uppercase italic text-black disabled:opacity-50"
                  >
                    {loadingUserId === candidate.userId ? '...' : 'Agregar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {error ? (
        <p className="font-mono text-[10px] font-bold uppercase text-pitch-green italic text-center">{error}</p>
      ) : null}
    </div>
  );
}
