import { redirect } from 'next/navigation';
import { GroupDashboardInitialState } from '@/components/groups/group-dashboard-initial-state';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function GroupDashboardPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: group } = await supabase
    .from('groups')
    .select('name, default_modality')
    .eq('id', params.id)
    .single();

  if (!group) {
    redirect('/join');
  }

  const { count } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', params.id)
    .eq('is_expelled', false)
    .is('archived_at', null);

  return (
    <GroupDashboardInitialState
      groupName={group.name}
      modality={group.default_modality}
      activePlayers={count ?? 0}
    />
  );
}
