import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: player } = await supabase
      .from('players')
      .select('group_id')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle();

    if (player?.group_id) {
      redirect(`/groups/${player.group_id}/dashboard`);
    }

    redirect('/welcome');
  }

  const backgroundUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuDlNS1eDv_IzL2vGpHKRro1Le2YdbLxFnMGcdG1awPpsfkVLA-RaRKpJ_c1QxaWJUyq-OM0ycjWV2GfvZbo9jWllP2RKDnMVW_nI7Gaex2TMRcjodIwx5tWRyQBccpSDqTehFArtzbVpcicOGrlq5l9GChuqI1gmXvlbybrqAMb77Euld3_aaXTnQTYYrCYPtlWWt438IlAq5-VPPGfzEdHuWXtqFC9SGXuZF28ykdTLeyI7aAJ4RtsgcgrWqNxayMg1uwvFg9KUX0";

  return (
    <ImmersiveScreen align="center" backgroundImage={`linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.95) 100%), url("${backgroundUrl}")`}>
      <main className="mx-auto flex h-full max-w-[390px] flex-col px-5 pb-12">
        {/* Brand Identity / Center Section */}
        <section className="flex flex-grow flex-col items-center justify-center space-y-6 text-center">
          <div className="flex flex-col items-center">
            <h1 className="flex flex-col font-headline uppercase leading-[0.85]">
              <span className="text-[42px] font-black tracking-tight text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">EL</span>
              <span className="text-[82px] font-black italic tracking-tighter text-pitch-green drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">FULBO</span>
            </h1>
            <p className="mt-4 max-w-[240px] font-headline text-2xl font-bold leading-tight text-white">
              Organizá tus partidos con amigos. <span className="text-pitch-green">Sin caos.</span>
            </p>
          </div>
        </section>

        {/* Primary Actions / Bottom Area */}
        <section className="flex flex-col gap-4">
          <Link
            href="/groups/new"
            className="flex h-16 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold text-black transition-transform active:scale-95"
          >
            CREAR GRUPO ⚽
          </Link>
          <Link
            href="/join"
            className="flex h-16 w-full items-center justify-center border-2 border-pitch-green/50 bg-black/40 font-headline text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors active:bg-pitch-green/20"
          >
            UNIRME A UN GRUPO
          </Link>
          <Link
            href="/login"
            className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
          >
            Ya tengo cuenta → Entrar
          </Link>
          
          <footer className="mt-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Hecho para el fulbito de siempre.
            </p>
          </footer>
        </section>
      </main>
    </ImmersiveScreen>
  );
}
