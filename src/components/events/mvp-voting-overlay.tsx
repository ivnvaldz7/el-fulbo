'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PlayedMatchSummaryItem } from '@/lib/services/events.service';

interface MvpVotingOverlayProps {
  eventId: string;
  currentPlayerId: string | null;
  playedSummary: PlayedMatchSummaryItem[];
  hasVoted: boolean;
  isVotingClosed: boolean;
  homeHref: string;
  onClose: () => void;
  onVoteSubmitted: () => void;
}

export function MvpVotingOverlay({
  eventId,
  currentPlayerId,
  playedSummary,
  hasVoted,
  isVotingClosed,
  homeHref,
  onClose,
  onVoteSubmitted,
}: MvpVotingOverlayProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createBrowserSupabaseClient();

  async function handleVote() {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No pudimos registrar tu voto.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const eligiblePlayers = playedSummary.filter((p) => p.playerId !== currentPlayerId);
  const didNotPlay = !currentPlayerId || !playedSummary.some((p) => p.playerId === currentPlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm border border-white/10 bg-absolute-dark p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
          Votación MVP
        </p>

        {isVotingClosed ? (
          <>
            <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
              Votación cerrada
            </h2>
            <p className="mt-2 text-sm text-white/60">
              El MVP ya fue elegido. Gracias por participar.
            </p>
          </>
        ) : hasVoted ? (
          <>
            <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
              Voto registrado
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Tu voto ya quedó guardado. Cuando se cierre la votación vas a poder ver el resultado.
            </p>
            <Link
              href={homeHref}
              className="mt-4 block w-full bg-amber-400 py-3 text-center font-headline text-lg font-black italic uppercase text-black transition-transform active:scale-[0.98]"
            >
              Volver al inicio
            </Link>
          </>
        ) : didNotPlay ? (
          <>
            <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
              Votación abierta
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Los jugadores que participaron están eligiendo a la figura del partido.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
              ¿Quién fue el MVP?
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {eligiblePlayers.map((player) => (
                <button
                  key={player.playerId}
                  type="button"
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
              type="button"
              onClick={() => void handleVote()}
              disabled={!selectedPlayer || isSubmitting}
              className="mt-4 w-full bg-amber-400 py-3 font-headline text-lg font-black italic uppercase text-black transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Votar MVP'}
            </button>
          </>
        )}

        {!hasVoted ? (
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="mt-4 w-full py-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            Cerrar
          </button>
        ) : null}
      </div>
    </div>
  );
}
