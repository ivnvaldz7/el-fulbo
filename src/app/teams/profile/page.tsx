import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { CentralCardPanel } from '@/components/teams/central-card-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { routes } from '@/lib/routes';
import { TeamsService } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TeamProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(routes.login);

  const [profileResult, cardResult] = await Promise.all([
    supabase.from('users').select('display_name,photo_url').eq('id', user.id).maybeSingle(),
    new TeamsService(supabase).getCentralCardPanel(user.id),
  ]);

  if (!cardResult.ok) throw new Error(cardResult.error.message);

  return (
    <ImmersiveScreen contentClassName="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Link href={routes.teams} className="group inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          Volver a Equipos
        </Link>
        <header className="mb-10 mt-8 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-8">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">Identidad de jugador</p>
            <h1 className="mt-3 font-headline text-5xl font-black italic uppercase leading-none tracking-[-0.05em] text-white">Mi perfil</h1>
            <p className="mt-3 max-w-lg text-sm font-semibold leading-6 text-white/55">Tu progreso en todos tus equipos, en un solo lugar.</p>
          </div>
          {cardResult.data ? (
            <Link href={routes.teamCard} className="btn-interactive inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 font-headline text-sm font-black italic uppercase text-white transition-colors hover:border-pitch-green hover:text-pitch-green">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar card
            </Link>
          ) : null}
        </header>
        <CentralCardPanel
          view={cardResult.data}
          userProfile={{ name: profileResult.data?.display_name ?? 'Jugador', photoUrl: profileResult.data?.photo_url ?? null }}
        />
      </div>
    </ImmersiveScreen>
  );
}
