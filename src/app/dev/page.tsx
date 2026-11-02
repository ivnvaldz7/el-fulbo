import { notFound, redirect } from 'next/navigation';
import { DevDashboard, type DevDashboardData } from '@/components/dev/dev-dashboard';
import { routes } from '@/lib/routes';
import { TeamsService, calculateCardOverall } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DevPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/dev-login');
  }

  const service = new TeamsService(supabase);
  const [cardResult, teamsResult, legacyCardsResult] = await Promise.all([
    service.getOwnCard(),
    service.getTeamsForCurrentUser(),
    supabase
      .from('players')
      .select('display_name,primary_position,stats_status')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('joined_at', { ascending: true }),
  ]);

  if (!cardResult.ok) throw new Error(cardResult.error.message);
  if (!teamsResult.ok) throw new Error(teamsResult.error.message);
  if (legacyCardsResult.error) throw new Error(legacyCardsResult.error.message);

  const card = cardResult.data;
  const data: DevDashboardData = {
    user: { id: user.id, email: user.email ?? 'sin email' },
    globalCard: {
      exists: Boolean(card),
      position: card?.primaryPosition ?? null,
      overall: card ? calculateCardOverall(card.stats) : null,
      locked: Boolean(card?.positionsLockedAt),
    },
    legacyCards: (legacyCardsResult.data ?? []).map((row) => ({
      name: row.display_name,
      position: row.primary_position,
      status: row.stats_status,
    })),
    teams: teamsResult.data.map((team) => ({
      id: team.id,
      name: team.name,
      role: team.role,
      memberCount: team.memberCount,
    })),
  };

  return <DevDashboard data={data} />;
}
