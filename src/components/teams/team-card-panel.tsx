'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { shareImageBlob } from '@/lib/share';
import { TeamCardArtwork, type TeamCardData } from './team-card-artwork';
import { TeamShareableCard } from '@/components/share/team-shareable-card';

export function TeamCardPanel({ team }: { team: TeamCardData & { id?: string; slug?: string; role?: string; memberCount?: number } }) {
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    if (!shareRef.current || sharing) {
      return;
    }

    setSharing(true);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(shareRef.current, { cacheBust: true, pixelRatio: 2 });

      if (!blob) {
        throw new Error('No image generated.');
      }

      const result = await shareImageBlob({
        blob,
        fileName: `team-card-${team.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        title: `Card de ${team.name}`,
        text: `Card pública de ${team.name} en El Fulbo.`,
      });

      if (result === 'downloaded') {
        toast.success('Card descargada.');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        toast.error('No pudimos generar la card.');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <section aria-labelledby="card-heading" className="space-y-5">
      <header>
        <h2 id="card-heading" className="font-headline text-3xl font-black italic uppercase text-white">Card</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">Public-safe. Usa identidad del equipo y agregados aprobados, sin datos internos de moderación.</p>
      </header>
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_1fr] md:items-center">
        <TeamCardArtwork team={team} />
        <div className="rounded-[1.35rem] bg-white/7 p-5 ring-1 ring-white/10">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Public-safe</p>
          <h3 className="mt-3 font-headline text-2xl font-black uppercase text-white">{team.name}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/55">La imagen compartible solo contiene nombre, identidad visual y totales aprobados.</p>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={sharing}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-pitch-green px-6 py-3 font-headline text-sm font-black uppercase text-black transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sharing ? 'Generando...' : 'Compartir card del equipo'}
          </button>
        </div>
      </div>
      <div className="pointer-events-none fixed -left-[99999px] top-0 opacity-0">
        <div ref={shareRef}>
          <TeamShareableCard team={team} />
        </div>
      </div>
    </section>
  );
}
