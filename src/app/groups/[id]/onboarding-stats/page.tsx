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

  if (!player.ok) {
    redirect('/join');
  }

  if (player.data.statsStatus === 'approved') {
    redirect(`/groups/${params.id}/dashboard`);
  }

  return (
    <OnboardingWizard
      groupId={params.id as GroupId}
      displayName={player.data.displayName}
      asAdmin={searchParams?.as === 'admin'}
    />
  );
}
