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
  
  const { data: votesData, isLoading } = useQuery({
    queryKey: ['mvpVotes', eventId],
    queryFn: async () => {
      const service = new EventsService(createBrowserSupabaseClient());
      const res = await service.getMvpVotes(eventId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  });

  const votes = votesData ?? [];
  const topVoteCount = votes.length > 0 ? (votes[0]?.votes ?? 0) : 0;
  const tiedPlayers = votes.filter(v => v.votes === topVoteCount && topVoteCount > 0);
  const isTie = tiedPlayers.length > 1;

  const handleCloseVoting = async () => {
    if (isTie && !tiebreakerId) {
      toast.error('Hay un empate. Debes seleccionar a un jugador para desempatar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const service = new EventsService(createBrowserSupabaseClient());
      const res = await service.closeMvpVoting(eventId, isTie ? tiebreakerId : null);
      if (!res.ok) throw new Error(res.error.message);
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
