'use client';

import { useState } from 'react';

export function InviteShareButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/invite/${inviteCode}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '¡Unite al grupo de fulbito!',
          text: 'Entrá a este link para unirte al grupo.',
          url,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          await copyToClipboard(url);
        }
      }
      return;
    }

    await copyToClipboard(url);
  }

  async function copyToClipboard(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`mt-8 flex min-h-14 w-full items-center justify-center bg-pitch-green px-6 py-3 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95 ${copied ? 'animate-success-pulse' : ''}`}
    >
      {copied ? '✓ Link copiado!' : 'Invitar jugadores'}
    </button>
  );
}
