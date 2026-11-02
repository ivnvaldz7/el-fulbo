import { redirect } from 'next/navigation';
import { TeamCardEditor } from '@/components/teams/team-card-editor';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { routes } from '@/lib/routes';
import { TeamsService } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TeamCardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileResult, cardResult] = await Promise.all([
    supabase.from('users').select('display_name,photo_url').eq('id', user.id).maybeSingle(),
    new TeamsService(supabase).getOwnCard(),
  ]);

  if (!cardResult.ok) {
    throw new Error(cardResult.error.message);
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-5xl">
      <FloatingPanel className="border-2 border-white/10">
        <header className="mb-8 max-w-2xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Identidad de jugador</p>
          <h1 className="mt-2 font-headline text-4xl font-black italic uppercase leading-none text-white">Tu card de Equipos</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
            Esta card es exclusiva de Equipos. Se usa para tu progreso global y cada equipo la revisa por separado al sumarte.
          </p>
        </header>
        <TeamCardEditor
          card={cardResult.data}
          playerName={profileResult.data?.display_name ?? 'Jugador'}
          photoUrl={profileResult.data?.photo_url ?? null}
          backHref={routes.teamProfile}
        />
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
