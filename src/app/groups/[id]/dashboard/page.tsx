import { redirect } from 'next/navigation';
import { GroupDashboardInitialState } from '@/components/groups/group-dashboard-initial-state';
import { getPendingTasksSummary } from '@/lib/services/admin-tasks.service';
import { getCurrentUserPlayerInGroup } from '@/lib/services/player.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';

export default async function GroupDashboardPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // 1. Group query must go first — redirect if not found
  const { data: group } = await supabase
    .from('groups')
    .select('name, default_modality, invite_code')
    .eq('id', params.id)
    .single();

  if (!group) {
    redirect('/join');
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // 2. Everything else runs in parallel — 5 queries, 1 RTT
  const [
    { count },
    { data: membership },
    currentPlayerResult,
    { data: upcomingEvents },
    { data: playedEvents },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', params.id)
      .eq('is_expelled', false)
      .is('archived_at', null),
    supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle(),
    getCurrentUserPlayerInGroup(supabase, params.id),
    supabase
      .from('events')
      .select('id, scheduled_at')
      .eq('group_id', params.id)
      .in('status', ['scheduled', 'confirming', 'checked_in', 'drawn'])
      .gte('scheduled_at', startOfToday.toISOString())
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('events')
      .select('id, field_name, scheduled_at, played_at, team_a_name, team_b_name, team_a_score, team_b_score, mvp_player_id')
      .eq('group_id', params.id)
      .eq('status', 'played')
      .order('played_at', { ascending: false, nullsFirst: false })
      .order('scheduled_at', { ascending: false })
      .limit(3),
  ]);

  if (!membership && !currentPlayerResult.ok) {
    redirect('/join');
  }

  // Si no tiene membership (admin/owner) pero es jugador, su rol es 'player'
  const userRole = membership ? membership.role : 'player';
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

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

  // 3. Current MVP — last played event with an MVP
  const { data: currentMvpRaw } = await supabase
    .from('events')
    .select(`
      id,
      field_name,
      played_at,
      team_a_name,
      team_b_name,
      team_a_score,
      team_b_score,
      mvp_player:players!events_mvp_player_id_fkey(
        id,
        display_name,
        primary_position,
        stats,
        current_boost,
        photo_url
      )
    `)
    .eq('group_id', params.id)
    .eq('status', 'played')
    .not('mvp_player_id', 'is', null)
    .order('played_at', { ascending: false, nullsFirst: false })
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentMvp = currentMvpRaw
    ? {
        eventId: currentMvpRaw.id as string,
        fieldName: (currentMvpRaw.field_name as string) ?? 'Partido',
        playedAt: (currentMvpRaw.played_at as string) ?? '',
        teamAName: (currentMvpRaw.team_a_name as string) ?? 'Equipo A',
        teamBName: (currentMvpRaw.team_b_name as string) ?? 'Equipo B',
        teamAScore: Number(currentMvpRaw.team_a_score ?? 0),
        teamBScore: Number(currentMvpRaw.team_b_score ?? 0),
        mvpPlayer: (() => {
          const p = currentMvpRaw.mvp_player as any;
          if (!p) return null;
          return {
            id: p.id as string,
            displayName: p.display_name as string,
            primaryPosition: p.primary_position as PlayerPosition,
            stats: p.stats as PlayerStats,
            currentBoost: p.current_boost as CurrentBoost | null,
            photoUrl: (p.photo_url as string | null) ?? null,
          };
        })(),
      }
    : null;

  // 4. Recent matches — batch query instead of N individual queries
  const recentPlayedEvents = playedEvents?.length
    ? await getBatchRecentEvents(supabase, playedEvents)
    : [];

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
      currentMvp={currentMvp}
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

/**
 * Batch version of getPlayedMatchSummary.
 *
 * Instead of N individual queries (one per event), does a SINGLE
 * participations query for all event IDs, then groups by event.
 * Also uses the already-fetched mvp_player_id to skip re-fetching events.
 */
async function getBatchRecentEvents(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  playedEvents: {
    id: string | number;
    field_name: string | number | null;
    scheduled_at: string | number | null;
    played_at: string | number | null;
    team_a_name: string | number | null;
    team_b_name: string | number | null;
    team_a_score: string | number | null;
    team_b_score: string | number | null;
    mvp_player_id: string | number | null;
  }[],
): Promise<{
  id: string;
  fieldName: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  mvpName: string | null;
  boostsLine: string | null;
  playedAtLabel: string;
}[]> {
  const eventIds = playedEvents.map((e) => String(e.id));

  // Build a map of eventId → mvp_player_id from already-fetched data
  const mvpMap = new Map<string, string | null>();
  for (const event of playedEvents) {
    mvpMap.set(String(event.id), event.mvp_player_id ? String(event.mvp_player_id) : null);
  }

  // Single participations query for ALL events
  const { data: allParticipations, error } = await supabase
    .from('match_participations')
    .select(
      `
        event_id,
        player_id,
        team,
        assigned_position,
        played_primary_position,
        boost_applied,
        players!inner(display_name)
      `,
    )
    .in('event_id', eventIds)
    .in('team', ['A', 'B']);

  if (error) {
    throw new Error(error.message ?? 'Algo salio mal al cargar los resumenes.');
  }

  // Group participations by event_id
  const participationsByEvent = new Map<string, any[]>();
  for (const row of allParticipations ?? []) {
    const eid = String(row.event_id);
    if (!participationsByEvent.has(eid)) {
      participationsByEvent.set(eid, []);
    }
    participationsByEvent.get(eid)!.push(row);
  }

  return playedEvents.map((event) => {
    const eid = String(event.id);
    const mvpPlayerId = mvpMap.get(eid) ?? null;
    const rows = participationsByEvent.get(eid) ?? [];

    const boostsApplied: { displayName: string; boostApplied: Record<string, number> | null }[] = [];
    let mvpName: string | null = null;

    for (const row of rows) {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      const displayName = player?.display_name ?? 'Jugador';
      const boostApplied = row.boost_applied ?? null;
      const isMvp = String(row.player_id) === mvpPlayerId;

      if (isMvp) {
        mvpName = displayName;
      }
      if (boostApplied?.modifiers) {
        boostsApplied.push({ displayName, boostApplied: boostApplied.modifiers });
      }
    }

    return {
      id: eid,
      fieldName: (event.field_name as string) ?? 'Partido',
      teamAName: (event.team_a_name as string) ?? 'Equipo A',
      teamBName: (event.team_b_name as string) ?? 'Equipo B',
      teamAScore: Number(event.team_a_score ?? 0),
      teamBScore: Number(event.team_b_score ?? 0),
      mvpName,
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
      playedAtLabel: new Date(
        (event.played_at as string) ?? (event.scheduled_at as string),
      ).toLocaleDateString('es-AR'),
    };
  });
}
