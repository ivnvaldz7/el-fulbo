import { redirect } from 'next/navigation';
import { PlayerStatsView } from '@/components/players/player-stats-view';
import { fetchPlayerStats } from '@/lib/services/player-stats.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PlayerStatsPage({
  params,
}: {
  params: { id: string; player_id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const result = await fetchPlayerStats(supabase, params.player_id);

  if (!result.ok) {
    redirect(`/groups/${params.id}/dashboard`);
  }

  return <PlayerStatsView stats={result.data} />;
}
