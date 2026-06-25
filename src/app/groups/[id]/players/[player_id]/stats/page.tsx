import { redirect } from 'next/navigation';
import { PlayerStatsView } from '@/components/players/player-stats-view';
import { fetchPlayerStats } from '@/lib/services/player-stats.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PlayerStatsPage({
  params,
}: {
  params: Promise<{ id: string; player_id: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { id, player_id } = await params;

  const result = await fetchPlayerStats(supabase, player_id);

  if (!result.ok) {
    redirect(`/groups/${id}/dashboard`);
  }

  return <PlayerStatsView stats={result.data} />;
}
