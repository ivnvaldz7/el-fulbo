import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CentralCardPanel } from '@/components/teams/central-card-panel';
import { TeamsHub } from '@/components/teams/teams-hub';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { TeamsService } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TeamsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const service = new TeamsService(supabase);
  const [{ data: profile }, teamsResult, cardResult] = await Promise.all([
    supabase.from('users').select('display_name, photo_url').eq('id', user.id).single(),
    service.getTeamsForCurrentUser(),
    service.getCentralCardPanel(user.id),
  ]);

  if (!teamsResult.ok) {
    console.error('[teams] Error fetching teams:', teamsResult.error);
  }

  if (!cardResult.ok) {
    console.error('[teams] Error fetching central card panel:', cardResult.error);
  }

  return (
    <ImmersiveScreen contentClassName="w-full">
      <div className="mx-auto w-full max-w-4xl px-4 pt-10">
        <Link
          href="/"
          className="group mb-8 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver a Inicio
        </Link>
      </div>
      <TeamsHub teams={teamsResult.ok ? teamsResult.data : []} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-10">
        <CentralCardPanel 
          view={cardResult.ok ? cardResult.data : null} 
          userProfile={profile ? { name: profile.display_name, photoUrl: profile.photo_url } : { name: 'Jugador', photoUrl: null }}
        />
      </div>
    </ImmersiveScreen>
  );
}
