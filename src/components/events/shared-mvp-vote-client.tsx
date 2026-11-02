'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { routes } from '@/lib/routes';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { useSharedGuestKey } from './shared-guest-key';

type VotePlayer = { playerId: string; displayName: string; votes: number };

type SharedMvpVote = {
  groupId: string;
  groupName: string;
  fieldName: string;
  playedAt: string | null;
  isClosed: boolean;
  guestPlayerId: string | null;
  hasVoted: boolean;
  players: VotePlayer[];
};

export function SharedMvpVoteClient({
  shareToken,
  eventId,
}: {
  shareToken: string;
  eventId: string | null;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const guestKey = useSharedGuestKey(shareToken);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ['shared-mvp-vote', shareToken, eventId, guestKey],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const { data: result, error: rpcError } = await supabase.rpc('get_shared_mvp_vote', {
        p_share_token: shareToken,
        p_event_id: eventId!,
        p_guest_key: guestKey,
      });
      if (rpcError) throw new Error(rpcError.message);
      return result as SharedMvpVote;
    },
  });

  async function vote() {
    if (!data || !eventId || !guestKey || !selectedPlayerId) return;
    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('submit_shared_guest_mvp_vote', {
        p_share_token: shareToken,
        p_event_id: eventId,
        p_guest_key: guestKey,
        p_voted_player_id: selectedPlayerId,
      });
      if (rpcError) throw new Error(rpcError.message);
      toast.success('Tu voto quedó guardado.');
      await queryClient.invalidateQueries({ queryKey: ['shared-mvp-vote', shareToken, eventId] });
    } catch (voteError) {
      toast.error(voteError instanceof Error ? voteError.message : 'No pudimos guardar tu voto.');
    } finally {
      setSaving(false);
    }
  }

  if (!eventId) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel>No encontramos el partido para votar.</FloatingPanel>
      </ImmersiveScreen>
    );
  }

  if (isPending) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel>Abriendo votación...</FloatingPanel>
      </ImmersiveScreen>
    );
  }

  if (error || !data) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel>No pudimos abrir la votación.</FloatingPanel>
      </ImmersiveScreen>
    );
  }

  const candidates = data.players.filter((player) => player.playerId !== data.guestPlayerId);

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md py-6">
      <div className="rounded-[2rem] bg-amber-300/10 p-1.5 ring-1 ring-amber-300/25">
        <FloatingPanel className="bg-[#17120a] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
            {data.groupName} · {data.fieldName}
          </p>
          <h1 className="mt-3 font-headline text-3xl font-black italic uppercase leading-none text-white">
            ¿Quién fue el MVP?
          </h1>

          {!data.guestPlayerId ? (
            <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <p className="text-sm leading-6 text-white/65">
                Abrí este link desde el navegador con el que te anotaste. Si ya tenés cuenta en el
                grupo, podés votar desde El Fulbo.
              </p>
              <Link
                href={routes.groupEventMvpVote(data.groupId, eventId)}
                className="mt-4 block min-h-11 rounded-full bg-white px-4 py-3 text-center font-headline text-sm font-black uppercase text-black"
              >
                Abrir votación en El Fulbo
              </Link>
            </div>
          ) : data.isClosed ? (
            <p className="mt-6 text-sm text-white/60">La votación ya cerró.</p>
          ) : data.hasVoted ? (
            <p className="mt-6 text-sm font-semibold text-amber-300">
              Tu voto ya quedó registrado.
            </p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {candidates.map((player) => (
                  <button
                    key={player.playerId}
                    type="button"
                    onClick={() => setSelectedPlayerId(player.playerId)}
                    className={`rounded-2xl p-3 text-left font-headline text-sm font-black uppercase transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${selectedPlayerId === player.playerId ? 'bg-amber-300 text-black' : 'bg-white/7 text-white ring-1 ring-white/10 hover:bg-white/12'}`}
                  >
                    {player.displayName}
                    {player.votes ? (
                      <span className="mt-1 block font-mono text-[10px] font-bold opacity-60">
                        {player.votes} voto{player.votes === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void vote()}
                disabled={!selectedPlayerId || saving}
                className="mt-5 min-h-12 w-full rounded-full bg-amber-300 px-5 font-headline text-base font-black uppercase text-black transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Votar MVP'}
              </button>
            </>
          )}
        </FloatingPanel>
      </div>
    </ImmersiveScreen>
  );
}
