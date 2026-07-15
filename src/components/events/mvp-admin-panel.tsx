'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EventsService, type PlayedMatchSummaryItem } from '@/lib/services/events.service';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type MvpAdminPanelProps = {
  eventId: string;
  playedSummary: PlayedMatchSummaryItem[];
};

export function MvpAdminPanel({ eventId, playedSummary }: MvpAdminPanelProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tiebreakerId, setTiebreakerId] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const { data: votesData, isLoading } = useQuery({
    queryKey: ['mvpVotes', eventId],
    queryFn: async () => {
      const service = new EventsService(supabase);
      const res = await service.getMvpVotes(eventId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: voterIds } = useQuery({
    queryKey: ['mvpVoters', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_mvp_votes')
        .select('voter_player_id')
        .eq('event_id', eventId);
      return new Set(data?.map(r => r.voter_player_id) ?? []);
    },
  });

  const votes = votesData ?? [];
  const topVoteCount = votes.length > 0 ? (votes[0]?.votes ?? 0) : 0;
  const tiedPlayers = votes.filter(v => v.votes === topVoteCount && topVoteCount > 0);
  const isTie = tiedPlayers.length > 1;

  const missingVoters = voterIds
    ? playedSummary.filter(p => !voterIds.has(p.playerId))
    : [];

  const handleCloseVoting = async () => {
    if (isTie && !tiebreakerId) {
      toast.error('Hay un empate. Debes seleccionar a un jugador para desempatar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/close-mvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiebreakerPlayerId: isTie ? tiebreakerId : null }),
      });
      const json = await res.json() as { ok: boolean; error?: { message: string } };
      if (!json.ok) throw new Error(json.error?.message ?? 'Error al cerrar la votación.');
      toast.success('Votación cerrada y MVP asignado.');
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al cerrar la votación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-pitch-green/40 bg-pitch-green/5 p-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Panel Admin</p>
          <h3 className="font-headline text-xl font-black italic uppercase text-white">Votación MVP</h3>
        </div>
        <button
          onClick={() => void handleCloseVoting()}
          disabled={isSubmitting || (isTie && !tiebreakerId)}
          className="rounded bg-pitch-green px-4 py-2 font-headline text-sm font-black italic uppercase text-black disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isSubmitting ? 'Cerrando...' : 'Cerrar Votación'}
        </button>
      </div>

      {/* Quienes faltan votar */}
      {!isLoading && missingVoters.length > 0 ? (
        <div className="mt-4 rounded border border-amber-400/30 bg-amber-400/5 p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Faltan votar ({missingVoters.length}/{playedSummary.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {missingVoters.map((p) => (
              <span
                key={p.playerId}
                className="rounded-full bg-amber-400/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300"
              >
                {p.displayName}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-4 font-mono text-xs text-white/50">Cargando votos...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {votes.length === 0 ? (
            <p className="font-mono text-xs text-white/50">Nadie votó todavía.</p>
          ) : (
            votes.map((v: { playerId: string; votes: number }, index: number) => {
              const player = playedSummary.find(p => p.playerId === v.playerId);
              return (
                <div key={v.playerId} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white/40">#{index + 1}</span>
                    <span className="font-headline text-sm uppercase text-white">{player?.displayName ?? 'Jugador'}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-pitch-green">{v.votes} votos</span>
                </div>
              );
            })
          )}

          {isTie && (
            <div className="mt-4 rounded border border-amber-400/30 bg-amber-400/5 p-3">
              <p className="font-mono text-xs text-amber-400 uppercase tracking-wider mb-2">Empate detectado. Elegí para desempatar:</p>
              <select
                value={tiebreakerId ?? ''}
                onChange={(e) => setTiebreakerId(e.target.value)}
                className="w-full bg-black/40 border border-white/20 p-2 text-sm text-white font-headline outline-none"
              >
                <option value="" disabled>-- Seleccioná un jugador --</option>
                {tiedPlayers.map((v: { playerId: string; votes: number }) => {
                  const p = playedSummary.find(p => p.playerId === v.playerId);
                  return (
                    <option key={v.playerId} value={v.playerId}>{p?.displayName}</option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
