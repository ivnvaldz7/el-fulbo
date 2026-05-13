import Link from 'next/link';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

export default function WelcomePage() {
  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-lg">
      <FloatingPanel className="flex flex-col items-center text-center border-2 border-pitch-green/20">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Bienvenido</p>
        <h1 className="mt-2 font-headline text-3xl font-black italic uppercase leading-none text-white">
          Arrancá uniéndote a un grupo.
        </h1>
        <p className="mt-4 font-headline text-base font-medium text-white/60">
          Por ahora, la app está en fase de invitación. Necesitás un código o link para entrar a la cancha.
        </p>
        
        <Link
          href="/join"
          className="mt-8 flex min-h-14 w-full items-center justify-center bg-pitch-green px-8 font-headline text-xl font-bold italic uppercase text-black transition-transform active:scale-95"
        >
          UNIRME A UN GRUPO
        </Link>

        <div className="mt-4 w-full border-t border-white/10 pt-4">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">¿Sos el que organiza?</p>
          <Link
            href="/groups/new"
            className="flex min-h-12 w-full items-center justify-center border border-white/20 px-8 font-headline text-base font-bold italic uppercase text-white/70 transition-colors hover:border-white/40 hover:text-white active:scale-95"
          >
            CREAR UN GRUPO
          </Link>
        </div>

        <Link
          href="/login"
          className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
        >
          Ya tengo cuenta → Entrar
        </Link>

        <footer className="mt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            EL FULBO — STREET SOCCER CULTURE
          </p>
        </footer>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
