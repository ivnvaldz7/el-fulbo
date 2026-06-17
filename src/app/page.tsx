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
    redirect('/groups');
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
            <p className="mt-4 mb-8 max-w-[240px] font-headline text-2xl font-bold leading-tight text-balance text-white">
              Organizá tus partidos con amigos. <span className="text-pitch-green">Sin caos.</span>
            </p>
          </div>
        </section>

        {/* Primary Actions / Bottom Area */}
        <section className="flex flex-col gap-5">
          <Link
            href="/login"
            className="btn-interactive flex h-14 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold text-black"
          >
            ENTRAR
          </Link>

          <div className="flex flex-col items-center gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              ¿Sos el que organiza?
            </p>
            <Link
              href="/groups/new"
              className="btn-interactive flex min-h-11 w-full items-center justify-center border border-white/10 bg-black/30 px-4 font-headline text-sm font-bold italic uppercase text-white/70 hover:border-white/30 hover:bg-white/5 hover:text-white"
            >
              Crear un grupo
            </Link>
          </div>

          <div className="mt-1 text-center">
            <Link
              href="/join"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
            >
              Tengo un código de invitación
            </Link>
          </div>

          <footer className="mt-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
              Hecho para el fulbito de cada semana
            </p>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.2em] text-white/15">
              Hecho por Iván Valdez
            </p>
          </footer>
        </section>
      </main>
    </ImmersiveScreen>
  );
}
