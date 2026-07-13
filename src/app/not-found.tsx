import Link from 'next/link';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

export default function NotFound() {
  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-4xl">
      <FloatingPanel className="border-2 border-pitch-green/25">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="border border-white/10 bg-black/30 p-6 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-pitch-green">
              Jugada anulada
            </p>
            <div className="mt-5 font-headline text-[96px] font-black italic leading-none tracking-tighter text-white sm:text-[128px]">
              404
            </div>
            <div className="mx-auto mt-4 h-1 w-24 bg-pitch-green" aria-hidden="true" />
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              Página fuera de la cancha
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
              El Fulbo
            </p>
            <h1 className="mt-3 text-balance font-headline text-4xl font-black uppercase italic leading-none text-white sm:text-5xl">
              Esta ruta no existe
            </h1>
            <p className="mt-5 max-w-xl font-headline text-sm font-medium leading-relaxed text-white/65 sm:text-base">
              Puede que el link esté vencido, que el partido haya cambiado de lugar o que esta pantalla nunca haya sido creada.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="btn-interactive flex min-h-12 items-center justify-center bg-pitch-green px-6 font-headline text-sm font-black uppercase italic text-black"
              >
                Volver al inicio
              </Link>
              <Link
                href="/groups"
                className="btn-interactive flex min-h-12 items-center justify-center border border-white/20 px-6 font-headline text-sm font-bold uppercase italic text-white/75 hover:border-pitch-green hover:bg-pitch-green/10 hover:text-pitch-green"
              >
                Ver mis grupos
              </Link>
            </div>
          </div>
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
