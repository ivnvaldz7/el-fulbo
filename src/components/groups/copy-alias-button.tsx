'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

const DEFAULT_ALIAS = '0000177509553009633357';

export function CopyAliasButton({ alias }: { alias?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const value = alias ?? DEFAULT_ALIAS;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Alias MP copiado', {
        icon: '📋',
        duration: 2000,
        style: {
          background: '#1A1A1A',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          fontSize: '14px',
        },
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('No se pudo copiar. Probá manualmente.');
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`btn-interactive flex min-h-14 flex-1 items-center justify-center bg-[#009EE3] px-6 font-headline text-lg font-bold italic uppercase text-white hover:brightness-110 ${copied ? 'animate-success-pulse' : ''}`}
    >
      {copied ? '✓ Alias copiado' : 'Copiar Alias MP'}
    </button>
  );
}
