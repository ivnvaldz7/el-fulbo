import { redirect } from 'next/navigation';
import { CentralCardPanel } from '@/components/teams/central-card-panel';
import { TeamsHub } from '@/components/teams/teams-hub';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { TeamsService } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TeamsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const service = new TeamsService(supabase);
  const [teamsResult, cardResult] = await Promise.all([
    service.getTeamsForCurrentUser(),
    service.getCentralCardPanel(user.id),
  ]);

  if (!teamsResult.ok) {
    console.error('[teams] Error fetching teams:', teamsResult.error);
  }

  if (!cardResult.ok) {
    console.error('[teams] Error fetching central card panel:', cardResult.error);
  }

  return (
    <ImmersiveScreen contentClassName="w-full">
      <div className="mx-auto w-full max-w-4xl px-4 pt-10">
        <CentralCardPanel view={cardResult.ok ? cardResult.data : null} />
      </div>
      <TeamsHub teams={teamsResult.ok ? teamsResult.data : []} />
    </ImmersiveScreen>
  );
}
