import { redirect } from 'next/navigation';
import { GroupDashboardInitialState } from '@/components/groups/group-dashboard-initial-state';
import { getPendingTasksSummary } from '@/lib/services/admin-tasks.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

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

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/join');
  }

  const userRole = membership.role;
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('group_id', params.id)
    .gte('date', new Date().toISOString().split('T')[0]) // Solo partidos futuros o de hoy
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  const pendingSummary = isAdminOrOwner ? await getPendingTasksSummary(supabase, params.id) : null;
  const adminPendingTotal = pendingSummary?.ok ? pendingSummary.data.total : 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingMatches = matches ?? [];

  const closestMatch = upcomingMatches.find((match) => match.date === today);
  const otherMatchesToday = upcomingMatches.filter(
    (match) => match.date === today && match.id !== closestMatch?.id,
  );

  return (
    <GroupDashboardInitialState
      groupName={group.name}
      modality={group.default_modality}
      activePlayers={count ?? 0}
      adminPendingTotal={adminPendingTotal}
      userRole={userRole}
      matchesToday={otherMatchesToday}
      closestMatch={closestMatch}
    />
  );
}
