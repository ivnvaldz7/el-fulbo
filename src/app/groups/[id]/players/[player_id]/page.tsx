import { redirect } from 'next/navigation';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PlayerProfilePage({
  params,
}: {
  params: { id: string; player_id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: player } = await supabase
    .from('players')
    .select('display_name, primary_position, stats, current_boost, stats_status')
    .eq('id', params.player_id)
    .eq('group_id', params.id)
    .is('archived_at', null)
    .single();

  if (!player) redirect(`/groups/${params.id}/dashboard`);

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <PageHeader title="JUGADOR" backHref={`/groups/${params.id}/dashboard`} />
      <main className="mt-16 flex w-full max-w-[390px] flex-col items-center px-6 py-8">
        <PlayerCardPreview
          name={player.display_name}
          position={player.primary_position}
          stats={player.stats}
          currentBoost={player.current_boost}
          pending={player.stats_status === 'pending_approval'}
        />
      </main>
    </ImmersiveScreen>
  );
}
