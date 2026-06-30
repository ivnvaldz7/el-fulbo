'use client';

import { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { PlayerCarouselCard } from './player-carousel-card';
import type { PlayerPosition } from '@/lib/types';

type PlayerData = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  primaryPosition: PlayerPosition;
  overall: number;
};

type PlayerCarouselProps = {
  players: PlayerData[];
  groupId: string;
};

export function PlayerCarousel({ players, groupId }: PlayerCarouselProps) {
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = query
    ? players.filter((p) => p.displayName.toLowerCase().includes(query.toLowerCase()))
    : players;

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleClear() {
    setQuery('');
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }

  return (
    <div className="mt-8">
      <div className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
            }}
            placeholder="Buscar jugador..."
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-10 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-pitch-green/50 transition-colors"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {players.length > 0 && (
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            {players.length} jugador{players.length !== 1 ? 'es' : ''}
            {query ? ` · ${filtered.length} coinciden` : ''}
          </p>
        )}
      </div>

      {filtered.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4"
        >
          {filtered.map((player) => (
            <PlayerCarouselCard
              key={player.id}
              id={player.id}
              displayName={player.displayName}
              primaryPosition={player.primaryPosition}
              overall={player.overall}
              groupId={groupId}
              isSelected={selectedId === player.id}
              onSelect={() => handleSelect(player.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 border border-dashed border-white/10 bg-white/[0.02] py-10 text-center transition-opacity duration-300">
          <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/5">
            <span className="font-headline text-lg font-black italic text-white/30">!</span>
          </div>
          <p className="font-headline text-lg font-black italic uppercase text-white/40">
            {query ? 'No se encontraron jugadores' : 'No hay jugadores en el grupo'}
          </p>
        </div>
      )}
    </div>
  );
}
