'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { PlayedMatchSummaryItem } from '@/lib/services/events.service';
import { shareImageBlob } from '@/lib/share';
import { ShareableMatchSummary } from './shareable-match-summary';

export function ShareMatchSummaryButton({
  groupName,
  fieldName,
  playedAtLabel,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  mvpName,
  boostsApplied,
}: {
  groupName: string;
  fieldName: string;
  playedAtLabel: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  mvpName: string | null;
  boostsApplied: PlayedMatchSummaryItem[];
}) {
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    if (!shareRef.current || sharing) {
      return;
    }

    setSharing(true);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(shareRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      if (!blob) {
        throw new Error('No pudimos generar la imagen.');
      }

      const result = await shareImageBlob({
        blob,
        fileName: 'resumen-partido-el-fulbo.png',
        title: `Resumen ${fieldName}`,
        text: `Resumen del partido del ${playedAtLabel} en ${groupName}.`,
      });

      if (result === 'downloaded') {
        toast.success('Card descargada. Podés subirla donde quieras.');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        toast.error('No pudimos generar la imagen. Reintentá.');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={sharing}
        className="w-full rounded-lg bg-white/[0.08] px-4 py-4 font-headline text-xl font-black italic uppercase disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sharing ? 'Generando...' : 'Compartir resumen'}
      </button>

      <div className="pointer-events-none fixed -left-[99999px] top-0 opacity-0">
        <div ref={shareRef}>
          <ShareableMatchSummary
            groupName={groupName}
            fieldName={fieldName}
            playedAtLabel={playedAtLabel}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAScore={teamAScore}
            teamBScore={teamBScore}
            mvpName={mvpName}
            boostsApplied={boostsApplied}
          />
        </div>
      </div>
    </>
  );
}
