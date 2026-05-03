import { redirect } from 'next/navigation';
import { GroupDashboardInitialState } from '@/components/groups/group-dashboard-initial-state';
import { getPendingTasksSummary } from '@/lib/services/admin-tasks.service';
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

  const { data: adminMembership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  const pendingSummary = adminMembership ? await getPendingTasksSummary(supabase, params.id) : null;
  const adminPendingTotal = pendingSummary?.ok ? pendingSummary.data.total : 0;

  return (
    <GroupDashboardInitialState
      groupName={group.name}
      modality={group.default_modality}
      activePlayers={count ?? 0}
      adminPendingTotal={adminPendingTotal}
    />
  );
}
