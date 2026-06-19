import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { getCurrentUserPlayerInGroup } from '@/lib/services/player.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GroupId } from '@/lib/types';

export default async function OnboardingStatsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { as?: string };
}) {
  const supabase = createServerSupabaseClient();
  const player = await getCurrentUserPlayerInGroup(supabase, params.id);

  if (player.ok && player.data.statsStatus === 'approved') {
    redirect(`/groups/${params.id}/dashboard`);
  }

  let displayName = '';
  if (player.ok) {
    displayName = player.data.displayName;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const { data: userData } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single();
      
    displayName = userData?.display_name || user.user_metadata?.full_name || 'Jugador';
  }

  return (
    <OnboardingWizard
      groupId={params.id as GroupId}
      displayName={displayName}
      asAdmin={searchParams?.as === 'admin'}
    />
  );
}
