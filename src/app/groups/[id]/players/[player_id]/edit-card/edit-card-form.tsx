'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PlayerStats, PlayerPosition } from '@/lib/types';

type EditCardFormProps = {
  groupId: string;
  playerId: string;
  initialName: string;
  initialPosition: PlayerPosition;
  initialStats: PlayerStats;
};

const POSITIONS: PlayerPosition[] = ['ARQ', 'DEF', 'MED', 'DEL'];

export function EditCardForm({
  groupId,
  playerId,
  initialName,
  initialPosition,
  initialStats,
}: EditCardFormProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState(initialName);
  const [position, setPosition] = useState<PlayerPosition>(initialPosition);
  const [stats, setStats] = useState<PlayerStats>(initialStats);

  const handleStatChange = (key: keyof PlayerStats, value: string) => {
    const num = parseInt(value, 10);
    setStats((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : Math.min(99, Math.max(1, num)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('players')
        .update({
          display_name: displayName.trim(),
          primary_position: position,
          stats: stats,
        })
        .eq('id', playerId)
        .eq('group_id', groupId);

      if (error) throw error;

      router.push(`/groups/${groupId}/players/${playerId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Error al guardar los cambios.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6 p-4">
      <div>
        <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-pitch-green">
          Nombre en la Carta / Apodo
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={15}
          className="w-full border border-white/20 bg-black/50 p-4 font-headline text-xl font-bold uppercase italic text-white outline-none focus:border-pitch-green"
        />
        <p className="mt-1 font-mono text-[10px] text-white/40">Máximo 15 caracteres para que entre bien en la carta.</p>
      </div>

      <div>
        <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-pitch-green">
          Posición Principal
        </label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as PlayerPosition)}
          className="w-full appearance-none border border-white/20 bg-black/50 p-4 font-headline text-xl font-bold uppercase italic text-white outline-none focus:border-pitch-green"
        >
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-4 block font-mono text-xs font-bold uppercase tracking-widest text-pitch-green">
          Atributos (1-99)
        </label>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="flex flex-col">
              <label className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
                {key}
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={val}
                onChange={(e) => handleStatChange(key as keyof PlayerStats, e.target.value)}
                className="w-full border border-white/20 bg-black/50 p-3 text-center font-headline text-2xl font-black text-white outline-none focus:border-pitch-green"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-white/20 bg-transparent py-4 font-headline text-sm font-bold uppercase italic text-white transition-colors hover:bg-white/5 active:scale-95"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-pitch-green py-4 font-headline text-sm font-bold uppercase italic text-black transition-transform active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Carta'}
        </button>
      </div>
    </form>
  );
}
