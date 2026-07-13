'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';
import { shareImageBlob } from '@/lib/share';
import { ShareableCard } from './shareable-card';

export function PlayerCardSharePanel({
  groupName,
  player,
  showPreview = true,
}: {
  groupName: string;
  player: {
    displayName: string;
    primaryPosition: PlayerPosition;
    stats: PlayerStats;
    currentBoost?: CurrentBoost | null;
    photoUrl?: string | null;
  };
  showPreview?: boolean;
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
        fileName: 'mi-card-el-fulbo.png',
        title: `Mi card en ${groupName}`,
        text: `Acá está mi card FIFA en ${groupName}.`,
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
      <div className={showPreview ? 'mt-10' : ''}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Tu card</p>
        <div className={`mt-4 flex flex-col gap-4 ${showPreview ? 'items-center' : 'items-stretch'}`}>
          {showPreview ? (
            <div className="w-full max-w-[250px]">
              <PlayerCardPreview
                name={player.displayName}
                position={player.primaryPosition}
                stats={player.stats}
                currentBoost={player.currentBoost}
                photoUrl={player.photoUrl}
                size="compact"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={sharing}
            className="flex min-h-12 w-full items-center justify-center bg-pitch-green px-6 py-3 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sharing ? 'Generando...' : 'Compartir mi card'}
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed -left-[99999px] top-0 opacity-0">
        <div ref={shareRef}>
          <ShareableCard
            name={player.displayName}
            position={player.primaryPosition}
            stats={player.stats}
            currentBoost={player.currentBoost}
            photoUrl={player.photoUrl}
            groupName={groupName}
          />
        </div>
      </div>
    </>
  );
}
