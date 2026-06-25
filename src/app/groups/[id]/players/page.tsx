import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Edit2 } from 'lucide-react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPlayersInGroup } from '@/lib/services/player.service';
import { RemovePlayerButton } from './remove-player-button';

export default async function GroupPlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }
  const { id } = await params;

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdminOrOwner = membership && (membership.role === 'admin' || membership.role === 'owner');

  if (!isAdminOrOwner) {
    redirect(`/groups/${id}/dashboard`);
  }

  const playersResult = await getPlayersInGroup(supabase, id);
  const players = playersResult.ok ? playersResult.data : [];

  return (
    <ImmersiveScreen contentClassName="mx-auto max-w-xl">
      <FloatingPanel className="w-full border-2 border-white/10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/groups/${id}/dashboard`}
            className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </Link>
        </div>

        <h1 className="mt-2 font-headline text-4xl font-black italic uppercase leading-none text-white">Jugadores</h1>
        <p className="mt-3 font-headline text-base font-medium leading-relaxed text-white/60">
          Listado de todos los jugadores que se sumaron al grupo.
        </p>

        <div className="mt-8 space-y-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between border border-white/10 bg-black/30 p-4 transition-colors"
            >
              <Link
                href={`/groups/${id}/players/${player.id}`}
                className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
              >
                <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-white/10">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-white/50" />
                  )}
                </div>
                <div>
                  <p className="font-headline text-lg font-bold uppercase italic text-white">{player.displayName}</p>
                  <p className="font-mono text-[10px] uppercase text-white/50">
                    {player.primaryPosition} {player.isPhantom ? '(Invitado)' : ''}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href={`/groups/${id}/players/${player.id}/edit-card`}
                  className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black/40 text-white/50 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
                  title="Editar carta"
                >
                  <Edit2 className="h-4 w-4" />
                </Link>
                <RemovePlayerButton playerId={player.id} playerName={player.displayName} groupId={id} />
              </div>
            </div>
          ))}

          {players.length === 0 && (
            <p className="mt-4 font-mono text-xs text-white/50 text-center py-8">No hay jugadores en el grupo.</p>
          )}
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
