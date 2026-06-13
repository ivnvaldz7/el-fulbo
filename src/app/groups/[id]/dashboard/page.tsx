import { redirect } from 'next/navigation';
import { GroupDashboardInitialState } from '@/components/groups/group-dashboard-initial-state';
import { getPendingTasksSummary } from '@/lib/services/admin-tasks.service';
import { EventsService } from '@/lib/services/events.service';
import { getCurrentUserPlayerInGroup } from '@/lib/services/player.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function GroupDashboardPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const eventsService = new EventsService(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: group } = await supabase
    .from('groups')
    .select('name, default_modality, invite_code')
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

  const currentPlayerResult = await getCurrentUserPlayerInGroup(supabase, params.id);

  const userRole = membership.role;
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, scheduled_at')
    .eq('group_id', params.id)
    .in('status', ['scheduled', 'confirming', 'checked_in', 'drawn'])
    .gte('scheduled_at', startOfToday.toISOString())
    .order('scheduled_at', { ascending: true });

  const { data: playedEvents } = await supabase
    .from('events')
    .select('id, field_name, scheduled_at, played_at, team_a_name, team_b_name, team_a_score, team_b_score, mvp_player_id')
    .eq('group_id', params.id)
    .eq('status', 'played')
    .order('played_at', { ascending: false, nullsFirst: false })
    .order('scheduled_at', { ascending: false })
    .limit(3);

  const pendingSummary = isAdminOrOwner ? await getPendingTasksSummary(supabase, params.id) : null;
  const adminPendingTotal = pendingSummary?.ok ? pendingSummary.data.total : 0;
  const nextEvents = (upcomingEvents ?? []).map((event) => ({
    id: event.id as string,
    scheduledAt: event.scheduled_at as string,
  }));

  const closestMatch = nextEvents[0];
  const otherMatchesToday = nextEvents.filter((event, index) => {
    if (index === 0) {
      return false;
    }

    const eventDate = new Date(event.scheduledAt);
    return (
      eventDate.getFullYear() === startOfToday.getFullYear() &&
      eventDate.getMonth() === startOfToday.getMonth() &&
      eventDate.getDate() === startOfToday.getDate()
    );
  });

  const recentPlayedEvents = await Promise.all(
    (playedEvents ?? []).map(async (event) => {
      const summary = await eventsService.getPlayedMatchSummary(event.id as string);
      const boostsApplied = summary.filter((item) => item.boostApplied);
      const mvp = summary.find((item) => item.isMvp) ?? null;

      return {
        id: event.id as string,
        fieldName: (event.field_name as string) ?? 'Partido',
        teamAName: (event.team_a_name as string) ?? 'Equipo A',
        teamBName: (event.team_b_name as string) ?? 'Equipo B',
        teamAScore: Number(event.team_a_score ?? 0),
        teamBScore: Number(event.team_b_score ?? 0),
        mvpName: mvp?.displayName ?? null,
        boostsLine:
          boostsApplied.length > 0
            ? `Subieron de nivel: ${boostsApplied
                .map((item) =>
                  `${item.displayName} (${Object.entries(item.boostApplied ?? {})
                    .map(([stat, delta]) => `${stat.toUpperCase()} +${delta}`)
                    .join(', ')})`,
                )
                .join(' · ')}`
            : null,
        playedAtLabel: new Date((event.played_at as string) ?? (event.scheduled_at as string)).toLocaleDateString('es-AR'),
      };
    }),
  );

  return (
    <GroupDashboardInitialState
      groupId={params.id}
      groupName={group.name}
      modality={group.default_modality}
      activePlayers={count ?? 0}
      adminPendingTotal={adminPendingTotal}
      userRole={userRole}
      matchesToday={otherMatchesToday}
      closestMatch={closestMatch}
      recentPlayedEvents={recentPlayedEvents}
      inviteCode={group.invite_code as string}
      currentPlayerId={currentPlayerResult.ok ? currentPlayerResult.data.id : null}
      shareablePlayer={
        currentPlayerResult.ok && currentPlayerResult.data.stats
          ? {
              displayName: currentPlayerResult.data.displayName,
              primaryPosition: currentPlayerResult.data.primaryPosition,
              stats: currentPlayerResult.data.stats,
              currentBoost: currentPlayerResult.data.currentBoost ?? null,
              photoUrl: currentPlayerResult.data.photoUrl ?? null,
            }
          : null
      }
    />
  );
}
