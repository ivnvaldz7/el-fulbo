import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, User, Search, Play } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { routes } from '@/lib/routes';
import type { PlayerPosition, PlayerStats } from '@/lib/types';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Si no está logueado, lo mandamos al welcome o login, pero vamos a dejar el AppSectionSelector para el landing
    redirect('/welcome');
  }

  // Buscar si tiene una "Carta Global" (usamos la ficha activa más reciente como base por ahora)
  const { data: baseCard } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  const backgroundUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlNS1eDv_IzL2vGpHKRro1Le2YdbLxFnMGcdG1awPpsfkVLA-RaRKpJ_c1QxaWJUyq-OM0ycjWV2GfvZbo9jWllP2RKDnMVW_nI7Gaex2TMRcjodIwx5tWRyQBccpSDqTehFArtzbVpcicOGrlq5l9GChuqI1gmXvlbybrqAMb77Euld3_aaXTnQTYYrCYPtlWWt438IlAq5-VPPGfzEdHuWXtqFC9SGXuZF28ykdTLeyI7aAJ4RtsgcgrWqNxayMg1uwvFg9KUX0';

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px] w-full py-8" backgroundImage={`linear-gradient(to bottom, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.96) 100%), url("${backgroundUrl}")`}>
      <FloatingPanel className="border-2 border-white/10 p-6">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-black italic uppercase leading-none text-white text-balance">
              Mi Perfil
            </h1>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green">
              Identidad Global
            </p>
          </div>
        </header>

        {baseCard ? (
          <div className="flex flex-col gap-4">
            <article className="group border-2 border-pitch-green/20 bg-absolute-dark p-5 transition-all duration-150 hover:border-pitch-green/50">
              <h2 className="mb-4 font-headline text-xl font-black uppercase italic text-pitch-green">Tu Carta Base</h2>
              <div className="flex flex-col items-center">
                <PlayerCardPreview
                  name={baseCard.display_name}
                  position={baseCard.primary_position as PlayerPosition}
                  stats={baseCard.stats as unknown as PlayerStats}
                  photoUrl={baseCard.photo_url}
                  showBoostIndicator={false}
                />
              </div>
            </article>

            <Link
              href={routes.teams}
              className="btn-interactive mt-4 flex h-14 w-full items-center justify-center gap-2 bg-pitch-green px-4 font-headline text-sm font-bold uppercase tracking-widest text-black hover:brightness-110"
            >
              <Play className="h-5 w-5 fill-black" />
              Ir a mis Equipos
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6 rounded-xl border-2 border-dashed border-white/20 bg-white/5 py-10 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pitch-green/10 text-pitch-green">
              <User className="h-8 w-8" />
            </div>
            <div>
              <p className="font-headline text-2xl font-black uppercase italic text-white">Generá tu Carta Global</p>
              <p className="mt-2 font-mono text-[10px] text-white/50 uppercase tracking-widest">
                Primer paso antes de pisar la cancha
              </p>
              <p className="mt-4 text-sm text-white/60">
                Tu carta global es tu identidad en todos los equipos. Define tus stats iniciales y tu posición en la cancha.
              </p>
            </div>
            <Link
              href="/onboarding-global"
              className="btn-interactive flex h-14 w-full items-center justify-center gap-2 bg-pitch-green px-4 font-headline text-sm font-bold uppercase tracking-widest text-black hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Crear mi carta base
            </Link>
          </div>
        )}
      </FloatingPanel>
    </ImmersiveScreen>
  );
}