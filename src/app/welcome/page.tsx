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

        <footer className="mt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            EL FULBO — STREET SOCCER CULTURE
          </p>
        </footer>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
