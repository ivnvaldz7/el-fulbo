import Link from 'next/link';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

export default function InviteArchivedPage({
  searchParams,
}: {
  searchParams?: { groupName?: string };
}) {
  const groupName = searchParams?.groupName ? decodeURIComponent(searchParams.groupName) : 'este grupo';
  const subject = encodeURIComponent(`Recuperar grupo ${groupName}`);

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <FloatingPanel className="text-center border-2 border-pitch-green/20">
        <header className="mb-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Aviso</p>
          <h1 className="mt-2 font-headline text-2xl font-black italic uppercase leading-none text-white">GRUPO ARCHIVADO</h1>
          <p className="mt-4 font-headline text-sm font-medium leading-relaxed text-white/60">
            El admin se fue y nadie tomó el rol todavía. Hablá con el admin anterior o escribí a soporte.
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-3">
          <a
            href={`mailto:ivnvldz7@gmail.com?subject=${subject}`}
            className="flex min-h-14 w-full items-center justify-center bg-pitch-green px-8 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95"
          >
            ESCRIBIR A SOPORTE
          </a>
          <Link
            href="/"
            className="flex min-h-12 w-full items-center justify-center border-2 border-white/10 bg-black/40 font-headline text-xs font-bold uppercase tracking-widest text-white/60 transition-colors active:bg-white/5"
          >
            VOLVER AL INICIO
          </Link>
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
