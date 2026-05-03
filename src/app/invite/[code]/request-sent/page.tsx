import Link from 'next/link';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

export default function InviteRequestSentPage() {
  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px]">
      <FloatingPanel className="text-center border-2 border-pitch-green/20">
        <header className="mb-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Éxito</p>
          <h1 className="mt-2 font-headline text-2xl font-black italic uppercase leading-none text-white">PEDIDO ENVIADO</h1>
          <p className="mt-4 font-headline text-sm font-medium leading-relaxed text-white/60">
            Mandamos tu solicitud al admin. Vas a recibir una notificación cuando responda.
          </p>
        </header>

        <Link
          href="/"
          className="mt-8 flex min-h-14 w-full items-center justify-center bg-pitch-green px-8 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95"
        >
          VOLVER AL INICIO
        </Link>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
