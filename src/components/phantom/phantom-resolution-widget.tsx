'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PendingPhantom } from '@/lib/services/phantom-player.service';

interface Props {
  groupId: string;
  phantoms: PendingPhantom[];
  onResolved?: () => void;
}

interface ConvertFormProps {
  phantom: PendingPhantom;
  groupId: string;
  onDone: () => void;
  onCancel: () => void;
}

function ConvertForm({ phantom, groupId, onDone, onCancel }: ConvertFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(
      `/api/groups/${groupId}/phantom-players/${phantom.id}/convert`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      },
    );
    const json = await res.json() as { ok: boolean; error?: { message: string } };
    setLoading(false);

    if (!json.ok) {
      setError(json.error?.message ?? 'No pudimos enviar la invitación.');
      return;
    }

    setSent(true);
    setTimeout(onDone, 1500);
  }

  if (sent) {
    return <p className="text-sm text-emerald-400">¡Invitación enviada!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-white/60">
        Convertir a {phantom.displayName} en jugador real
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@email.com"
          className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!email || loading}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          Enviar
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-white/40 hover:text-white">
          ✕
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

interface PhantomRowProps {
  phantom: PendingPhantom;
  groupId: string;
  onResolved?: () => void;
}

function PhantomRow({ phantom, groupId, onResolved }: PhantomRowProps) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleResolved() {
    router.refresh();
    onResolved?.();
  }

  async function handleArchive() {
    setLoading(true);
    await fetch(`/api/groups/${groupId}/phantom-players/${phantom.id}/archive`, {
      method: 'POST',
    });
    handleResolved();
  }

  async function handleDelete() {
    setLoading(true);
    setDeleteError(null);
    const res = await fetch(`/api/groups/${groupId}/phantom-players/${phantom.id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setDeleteError(json?.error?.message ?? 'No se pudo eliminar el jugador fantasma.');
      setLoading(false);
      return;
    }

    handleResolved();
  }

  if (converting) {
    return (
      <ConvertForm
        phantom={phantom}
        groupId={groupId}
        onDone={handleResolved}
        onCancel={() => setConverting(false)}
      />
    );
  }

  if (confirmDelete) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/70">¿Seguro que querés eliminar a {phantom.displayName}?</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="rounded-lg bg-red-500/80 px-3 py-1.5 text-xs font-bold text-white"
            >
              {loading ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={loading}
              className="text-xs text-white/40 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
        {deleteError && (
          <p className="text-xs text-red-400">{deleteError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{phantom.displayName}</p>
          <p className="text-xs text-white/40">{phantom.primaryPosition} · FANTASMA</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setConverting(true)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
        >
          Convertir en real
        </button>
        <button
          onClick={handleArchive}
          disabled={loading}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/20"
        >
          Archivar
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export function PhantomResolutionWidget({ groupId, phantoms, onResolved }: Props) {
  if (!phantoms.length) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">
        Jugadores fantasma pendientes ({phantoms.length})
      </p>
      <div className="space-y-4 divide-y divide-white/5">
        {phantoms.map((p) => (
          <div key={p.id} className="pt-4 first:pt-0">
            <PhantomRow phantom={p} groupId={groupId} onResolved={onResolved} />
          </div>
        ))}
      </div>
    </div>
  );
}
