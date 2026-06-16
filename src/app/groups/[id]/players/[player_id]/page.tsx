import { redirect } from 'next/navigation';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { PhotoUpload } from '@/components/players/photo-upload';
import { ReliabilityBadge } from '@/components/players/reliability-badge';
import { fetchPlayerStats } from '@/lib/services/player-stats.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PlayerProfilePage({
  params,
}: {
  params: { id: string; player_id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: player } = await supabase
    .from('players')
    .select('user_id, display_name, primary_position, stats, current_boost, stats_status, photo_url')
    .eq('id', params.player_id)
    .eq('group_id', params.id)
    .is('archived_at', null)
    .single();

  if (!player) redirect(`/groups/${params.id}/dashboard`);

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const userRole = membership?.role;
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
  const canEdit = isAdminOrOwner || user.id === player.user_id;

  const statsResult = await fetchPlayerStats(supabase, params.player_id);

  return (
    <div className="flex w-full flex-col items-center py-8">
      {statsResult.ok && (
        <div className="mb-4 flex w-full max-w-[280px] justify-end">
          <ReliabilityBadge
            attendanceRate={statsResult.data.attendanceRate}
            lateDropouts={statsResult.data.lateDropouts}
          />
        </div>
      )}
      <PlayerCardPreview
        name={player.display_name}
        position={player.primary_position}
        stats={player.stats}
        currentBoost={player.current_boost}
        pending={player.stats_status === 'pending_approval'}
        photoUrl={player.photo_url}
      />
      <PhotoUpload
        playerId={params.player_id}
        groupId={params.id}
        currentPhotoUrl={player.photo_url}
        canEdit={canEdit}
      />
      {isAdminOrOwner && (
        <a
          href={`/groups/${params.id}/players/${params.player_id}/edit-card`}
          className="mt-6 flex items-center justify-center border border-pitch-green/40 bg-pitch-green/10 px-6 py-3 font-headline text-sm font-bold uppercase italic text-pitch-green transition-colors hover:bg-pitch-green/20 active:scale-95"
        >
          Editar Carta (Modo Dios)
        </a>
      )}
    </div>
  );
}
