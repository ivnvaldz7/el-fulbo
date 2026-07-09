import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPlayersInGroup } from '@/lib/services/player.service';
import { calculateOverall } from '@/lib/types';
import { PlayerCarousel } from '@/components/players/player-carousel';
import type { PlayerPosition, PlayerStats } from '@/lib/types';
import { routes } from '@/lib/routes';

function hasStats(stats: PlayerStats | undefined): stats is PlayerStats {
  return !!stats;
}

export default async function GroupPlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }
  const { id } = await params;

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdminOrOwner = membership && (membership.role === 'admin' || membership.role === 'owner');

  if (!isAdminOrOwner) {
    redirect(routes.groupDashboard(id));
  }

  const playersResult = await getPlayersInGroup(supabase, id);
  const players = playersResult.ok ? playersResult.data : [];

  const carouselPlayers = players
    .filter((p) => hasStats(p.stats))
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      photoUrl: p.photoUrl ?? null,
      primaryPosition: p.primaryPosition as PlayerPosition,
      overall: calculateOverall(p.stats!, p.primaryPosition),
    }));

  return (
    <ImmersiveScreen contentClassName="mx-auto max-w-xl">
      <FloatingPanel className="w-full border-2 border-white/10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={routes.groupDashboard(id)}
            className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </Link>
        </div>

        <h1 className="mt-2 font-headline text-4xl font-black italic uppercase leading-none text-white">Jugadores</h1>
        <p className="mt-3 font-headline text-base font-medium leading-relaxed text-white/60">
          {players.length} jugador{players.length !== 1 ? 'es' : ''} en el grupo
        </p>

        <PlayerCarousel players={carouselPlayers} groupId={id} />
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
