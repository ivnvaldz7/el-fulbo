'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { EventsService, type PlayedMatchSummaryItem } from '@/lib/services/events.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

function VotingPanel({
  eventId,
  currentPlayerId,
  playedSummary,
  hasVoted,
  isVotingClosed,
  onVoteSubmitted,
}: Omit<MvpVotingOverlayProps, 'homeHref' | 'onClose'>) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createBrowserSupabaseClient();

  const { data: votesData } = useQuery({
    queryKey: ['mvpVotes', eventId],
    queryFn: async () => {
      const service = new EventsService(createBrowserSupabaseClient());
      const res = await service.getMvpVotes(eventId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    refetchInterval: isVotingClosed ? false : 5000,
  });

  const votes = votesData ?? [];
  const votesMap = new Map(votes.map(v => [v.playerId, v.votes]));

  const userVotedPlayer = playedSummary.find(p => votes.find(v => v.playerId === p.playerId && v.votes > 0));
  const currentUserVote = hasVoted && userVotedPlayer?.playerId;

  const eligiblePlayers = playedSummary.filter((p) => p.playerId !== currentPlayerId);

  async function handleVote() {
    if (!selectedPlayer || hasVoted) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_mvp_vote', {
        p_event_id: eventId,
        p_voted_player_id: selectedPlayer,
      });
      if (error) throw error;
      toast.success('¡Voto registrado!');
      onVoteSubmitted();
      void queryClient.invalidateQueries({ queryKey: ['mvpVotes', eventId] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No pudimos registrar tu voto.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
        {isVotingClosed ? 'Votación cerrada' : hasVoted ? 'Voto registrado' : '¿Quién fue el MVP?'}
      </h2>

      {hasVoted && currentUserVote && (
        <p className="mt-2 text-sm text-amber-300 font-mono">
          Tu voto: {playedSummary.find(p => p.playerId === currentUserVote)?.displayName}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {eligiblePlayers.map((player) => {
          const voteCount = votesMap.get(player.playerId) ?? 0;
          const isCurrentUserVote = player.playerId === currentUserVote;
          const isDisabled = hasVoted || isVotingClosed || isCurrentUserVote;

          return (
            <button
              key={player.playerId}
              type="button"
              onClick={() => !isDisabled && setSelectedPlayer(player.playerId)}
              disabled={isDisabled}
              className={`rounded border p-2 text-left font-headline text-sm font-bold uppercase italic transition-colors ${
                isCurrentUserVote
                  ? 'border-amber-400 bg-amber-400/20 text-amber-300 cursor-default'
                  : selectedPlayer === player.playerId
                  ? 'border-amber-400 bg-amber-400 text-black'
                  : isDisabled
                  ? 'border-white/10 bg-white/5 text-white/50 cursor-not-allowed'
                  : 'border-white/10 bg-white/5 text-white hover:border-amber-400/50 hover:bg-amber-400/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{player.displayName}</span>
                {voteCount > 0 && (
                  <span className="font-mono text-xs font-bold text-pitch-green ml-2">
                    {voteCount} voto{voteCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="block font-mono text-[10px] font-normal tracking-widest text-current opacity-70">
                {player.team === 'A' ? 'Eq A' : 'Eq B'} · {player.assignedPosition ?? 'SIN POS'}
              </span>
              {isCurrentUserVote && (
                <span className="block mt-1 font-mono text-[10px] text-amber-300">✓ Tu voto</span>
              )}
            </button>
          );
        })}
      </div>

      {!hasVoted && !isVotingClosed && (
        <button
          type="button"
          onClick={() => void handleVote()}
          disabled={!selectedPlayer || isSubmitting}
          className="mt-4 w-full bg-amber-400 py-3 font-headline text-lg font-black italic uppercase text-black transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Votar MVP'}
        </button>
      )}

      {hasVoted && !isVotingClosed && (
        <p className="mt-3 text-sm text-white/60 text-center">
          Tu voto ya quedó guardado. La votación sigue abierta — podés ver cómo va la cuenta.
        </p>
      )}

      {isVotingClosed && votes.length === 0 && (
        <p className="mt-4 text-sm text-white/60 text-center">Nadie votó todavía.</p>
      )}
    </>
  );
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
          <VotingPanel
            eventId={eventId}
            currentPlayerId={currentPlayerId}
            playedSummary={playedSummary}
            hasVoted={hasVoted}
            isVotingClosed={isVotingClosed}
            onVoteSubmitted={onVoteSubmitted}
          />
        )}

        {!isVotingClosed ? (
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="mt-4 w-full py-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            Cerrar
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full py-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white/70"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
