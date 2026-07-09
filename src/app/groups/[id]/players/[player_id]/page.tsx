import { redirect } from 'next/navigation';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { PhotoUpload } from '@/components/players/photo-upload';
import { ReliabilityBadge } from '@/components/players/reliability-badge';
import { LeaveGroupButton } from '@/components/players/leave-group-button';
import { PlayerCardSharePanel } from '@/components/share/player-card-share-panel';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { fetchPlayerStats } from '@/lib/services/player-stats.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { routes } from '@/lib/routes';

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string; player_id: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { id, player_id } = await params;

  const { data: player } = await supabase
    .from('players')
    .select('user_id, display_name, primary_position, stats, current_boost, stats_status, photo_url')
    .eq('id', player_id)
    .eq('group_id', id)
    .is('archived_at', null)
    .single();

  if (!player) redirect(`/groups/${id}/dashboard`);

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const userRole = membership?.role;
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
  const isSelf = user.id === player.user_id;
  const canUploadPhoto = isAdminOrOwner || isSelf;
  const canManageCard = canUploadPhoto || isAdminOrOwner;

  const statsResult = await fetchPlayerStats(supabase, player_id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <FloatingPanel className="border-2 border-pitch-green/20">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div className="flex justify-center">
            <PlayerCardPreview
              name={player.display_name}
              position={player.primary_position}
              stats={player.stats}
              currentBoost={player.current_boost}
              pending={player.stats_status === 'pending_approval'}
              photoUrl={player.photo_url}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
                Perfil de jugador
              </p>
              {statsResult.ok ? (
                <ReliabilityBadge
                  attendanceRate={statsResult.data.attendanceRate}
                  lateDropouts={statsResult.data.lateDropouts}
                />
              ) : null}
            </div>

            <h1 className="mt-3 text-balance font-headline text-3xl font-black uppercase italic leading-none text-white sm:text-4xl">
              {player.display_name}
            </h1>
            <p className="mt-4 max-w-xl font-headline text-sm font-medium leading-relaxed text-white/60">
              Esta es la carta activa del jugador en el grupo. La foto, los boosts y el estado de aprobación se reflejan acá.
            </p>

            {canManageCard ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <PhotoUpload
                  playerId={player_id}
                  groupId={id}
                  currentPhotoUrl={player.photo_url}
                  canEdit={canUploadPhoto}
                />
                {isAdminOrOwner ? (
                  <a
                    href={routes.groupPlayerEditCard(id, player_id)}
                    className="flex min-h-12 items-center justify-center border border-white/20 px-6 font-headline text-sm font-bold uppercase italic text-white/75 transition-colors hover:border-pitch-green hover:bg-pitch-green/10 hover:text-pitch-green active:scale-95"
                  >
                    Editar stats
                  </a>
                ) : null}
              </div>
            ) : null}

            {isSelf ? (
              <div className="mt-6 border-t border-white/10 pt-6">
                <PlayerCardSharePanel
                  groupName="El Fulbo"
                  player={{
                    displayName: player.display_name,
                    primaryPosition: player.primary_position,
                    stats: player.stats,
                    currentBoost: player.current_boost,
                    photoUrl: player.photo_url,
                  }}
                  showPreview={false}
                />
              </div>
            ) : null}
          </div>
        </div>
      </FloatingPanel>

      {isSelf ? <LeaveGroupButton playerId={player_id} groupId={id} /> : null}
    </div>
  );
}
