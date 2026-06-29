import { redirect } from 'next/navigation';
import { PlayerProfileTabs } from '@/components/players/player-profile-tabs';
import { PageContent } from '@/components/ui/page-content';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PlayerProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; player_id: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { id, player_id } = await params;

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: player } = await supabase
    .from('players')
    .select('display_name, user_id')
    .eq('id', player_id)
    .eq('group_id', id)
    .is('archived_at', null)
    .single();

  if (!player) redirect(`/groups/${id}/dashboard`);

  const isAdminOrOwner = membership && (membership.role === 'admin' || membership.role === 'owner');
  const isSelf = player.user_id === user.id;

  if (!isAdminOrOwner && !isSelf) redirect(`/groups/${id}/dashboard`);

  return (
    <ImmersiveScreen>
      <PageContent className="max-w-md">
        <PageHeader title="JUGADOR" backHref={`/groups/${id}/dashboard`} />
        <div className="mb-6 flex items-center gap-3 px-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-white/5 font-headline text-2xl font-black text-white/20">
          {player.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Jugador</p>
          <h1 className="font-headline text-2xl font-black italic uppercase text-white">{player.display_name}</h1>
        </div>
      </div>
      <PlayerProfileTabs groupId={id} playerId={player_id} />
      {children}
    </PageContent>
    </ImmersiveScreen>
  );
}
