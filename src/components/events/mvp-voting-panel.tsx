'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PlayedMatchSummaryItem } from '@/lib/services/events.service';

type MvpVotingPanelProps = {
  eventId: string;
  currentPlayerId: string | null;
  playedSummary: PlayedMatchSummaryItem[];
  onVoteSubmitted: () => void;
};

export function MvpVotingPanel({ eventId, currentPlayerId, playedSummary, onVoteSubmitted }: MvpVotingPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const handleVote = async () => {
    if (!selectedPlayer) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_mvp_vote', {
        p_event_id: eventId,
        p_voted_player_id: selectedPlayer,
      });
      if (error) throw error;
      toast.success('¡Voto registrado!');
      onVoteSubmitted();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'No pudimos registrar tu voto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const eligiblePlayers = playedSummary.filter(p => p.playerId !== currentPlayerId);

  // If the current player didn't play, they shouldn't see the voting panel
  if (!currentPlayerId || !playedSummary.find(p => p.playerId === currentPlayerId)) {
    return (
      <div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-4 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Votación de MVP Abierta</p>
        <p className="mt-2 text-sm text-white/60">Los jugadores que participaron están eligiendo a la figura del partido.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
        Elegí a la figura
      </p>
      <h3 className="mt-1 font-headline text-xl font-black italic uppercase text-white">¿Quién fue el MVP?</h3>
      
      <div className="mt-4 grid grid-cols-2 gap-2">
        {eligiblePlayers.map((player) => (
          <button
            key={player.playerId}
            onClick={() => setSelectedPlayer(player.playerId)}
            className={`rounded border p-2 text-left font-headline text-sm font-bold uppercase italic transition-colors ${
              selectedPlayer === player.playerId
                ? 'border-amber-400 bg-amber-400 text-black'
                : 'border-white/10 bg-white/5 text-white hover:border-amber-400/50 hover:bg-amber-400/10'
            }`}
          >
            {player.displayName}
            <span className="block font-mono text-[10px] font-normal tracking-widest text-current opacity-70">
              {player.team === 'A' ? 'Eq A' : 'Eq B'} · {player.assignedPosition ?? 'SIN POS'}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => void handleVote()}
        disabled={!selectedPlayer || isSubmitting}
        className="mt-4 w-full bg-amber-400 py-3 font-headline text-lg font-black italic uppercase text-black disabled:opacity-50 active:scale-95 transition-transform"
      >
        {isSubmitting ? 'Enviando...' : 'Votar MVP'}
      </button>
    </div>
  );
}
