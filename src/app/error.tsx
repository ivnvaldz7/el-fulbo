'use client';

/**
 * Error boundary de páginas.
 * Atrapa errores en Server Components y client components dentro del layout.
 * A diferencia de global-error.tsx, éste SÍ se renderiza DENTRO del layout
 * existente, así que puede usar Tailwind.
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

import { useEffect } from 'react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error.tsx] Error capturado:', error);
  }, [error]);

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-sm w-full">
      <FloatingPanel className="flex flex-col items-center text-center border-pitch-green/20">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green text-glow-green">
          El Fulbo
        </p>

        <h1 className="mt-2 font-headline text-3xl font-black italic uppercase leading-none text-white text-balance">
          Algo salió mal
        </h1>

        <p className="mt-4 font-mono text-sm text-white/50 max-ch-75 mx-auto">
          {error.digest
            ? `Error inesperado (${error.digest}).`
            : 'Ocurrió un error inesperado.'}
          Si el problema persiste, cerra sesión y volvé a entrar.
        </p>

        <button
          type="button"
          onClick={reset}
          className="btn-interactive mt-8 flex h-14 w-full items-center justify-center gap-3 bg-pitch-green font-headline text-lg font-bold uppercase text-black hover:brightness-110"
        >
          Reintentar
        </button>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
