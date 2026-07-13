import { redirect } from 'next/navigation';
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
  const result = await service.getTeamsForCurrentUser();

  if (!result.ok) {
    console.error('[teams] Error fetching teams:', result.error);
  }

  return (
    <ImmersiveScreen contentClassName="w-full">
      <TeamsHub teams={result.ok ? result.data : []} />
    </ImmersiveScreen>
  );
}
