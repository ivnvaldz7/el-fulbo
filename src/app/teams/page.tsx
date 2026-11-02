import { redirect } from 'next/navigation';
import { AppSectionNav } from '@/components/home/app-section-nav';
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
  const teamsResult = await service.getTeamsForCurrentUser(user.id);

  if (!teamsResult.ok) {
    console.error('[teams] Error fetching teams:', teamsResult.error);
  }

  return (
    <ImmersiveScreen animated contentClassName="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8">
        <AppSectionNav active="teams" />
      </div>
      <TeamsHub teams={teamsResult.ok ? teamsResult.data : []} />
    </ImmersiveScreen>
  );
}
