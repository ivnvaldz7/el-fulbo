'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { PlayerPosition } from '@/lib/types';

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'ARQ', label: 'ARQ' },
  { value: 'DEF', label: 'DEF' },
  { value: 'MED', label: 'MED' },
  { value: 'DEL', label: 'DEL' },
];

interface Props {
  groupId: string;
  eventId: string;
  onClose: () => void;
  onCreated: (playerId: string) => void;
}

export function AddPhantomModal({ groupId, eventId, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('MED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/phantom-players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name: name.trim(), primaryPosition: position }),
      });

      const json = await res.json() as { ok: boolean; data?: string; error?: { message: string } };

      if (!json.ok) {
        setError(json.error?.message ?? 'No pudimos agregar el fantasma.');
        return;
      }

      onCreated(json.data!);
    } catch {
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-[#0e1a2e] p-6 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Agregar jugador fantasma</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-xs text-white/50">
          Creamos una ficha temporal para completar el equipo. Después del partido decidís qué
          hacer con ella.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/60">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan, Juan Gómez"
              maxLength={40}
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-white/60">
              Posición (opcional)
            </label>
            <div className="flex gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => setPosition(pos.value)}
                  className={[
                    'flex-1 rounded-lg py-2 text-xs font-bold transition-colors',
                    position === pos.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-white/50 hover:bg-white/20',
                  ].join(' ')}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white/60 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
