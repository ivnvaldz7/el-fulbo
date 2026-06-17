'use client';

import { useState } from 'react';

export function AppShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.origin;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'El Fulbo',
          text: 'Armá tu propio equipo y organizá los partidos con El Fulbo.',
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
      className={`btn-interactive flex min-h-12 w-full items-center justify-center border-2 border-white/10 bg-transparent px-5 py-3 font-headline text-sm font-bold italic uppercase text-white hover:bg-white/10 hover:border-white/30 ${copied ? 'text-pitch-green border-pitch-green' : ''}`}
    >
      {copied ? '✓ LINK COPIADO' : 'COMPARTIR APP'}
    </button>
  );
}
