import { redirect } from 'next/navigation';
import { PlayerProfileTabs } from '@/components/players/player-profile-tabs';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PlayerProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string; player_id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect(`/groups/${params.id}/dashboard`);

  const { data: player } = await supabase
    .from('players')
    .select('display_name')
    .eq('id', params.player_id)
    .eq('group_id', params.id)
    .is('archived_at', null)
    .single();

  if (!player) redirect(`/groups/${params.id}/dashboard`);

  return (
    <ImmersiveScreen contentClassName="max-w-md mx-auto w-full py-2">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-white/5 font-headline text-2xl font-black text-white/20">
          {player.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Jugador</p>
          <h1 className="font-headline text-2xl font-black italic uppercase text-white">{player.display_name}</h1>
        </div>
      </div>
      <PlayerProfileTabs groupId={params.id} playerId={params.player_id} />
      {children}
    </ImmersiveScreen>
  );
}
