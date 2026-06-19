import Link from 'next/link';
import { JoinForm } from './join-form';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

export default function JoinPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error =
    searchParams?.error === 'invalid'
      ? 'No encontramos ese código. Revisá el link o pedile uno nuevo a quien organiza.'
      : null;

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <FloatingPanel className="border-2 border-white/10">
        <header className="mb-8">
          <Link href="/" className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            ← Volver
          </Link>
          <h1 className="mt-4 font-headline text-3xl font-black italic uppercase leading-none text-white">UNITE AL GRUPO</h1>
          <p className="mt-3 font-headline text-base font-medium text-white/60">
            Ingresá el código que te pasaron por WhatsApp.
          </p>
        </header>

        {error ? (
          <p className="mb-6 font-mono text-[10px] font-bold uppercase text-pitch-green text-center italic">
            {error}
          </p>
        ) : null}
        
        <JoinForm />
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
