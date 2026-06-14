'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

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
      className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 border-2 border-white/10 bg-transparent px-5 py-3 text-sm font-black text-white transition-colors hover:bg-white/5 active:scale-95 ${copied ? 'text-pitch-green border-pitch-green' : ''}`}
    >
      <Share2 className="h-4 w-4" />
      {copied ? '¡Link copiado!' : 'Creá tu propio equipo'}
    </button>
  );
}
