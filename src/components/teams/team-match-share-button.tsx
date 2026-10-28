'use client';

import { Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { routes } from '@/lib/routes';
import type { TeamId, TeamMatchId } from '@/lib/types/teams.types';

interface TeamMatchShareButtonProps {
  teamId: TeamId;
  matchId: TeamMatchId;
  matchLabel: string;
}

export function TeamMatchShareButton({ teamId, matchId, matchLabel }: TeamMatchShareButtonProps) {
  async function shareMatch() {
    const shareUrl = `${window.location.origin}${routes.teamDetail(teamId, 'matches')}&matchId=${encodeURIComponent(matchId)}`;
    const shareText = `Confirmá tu asistencia${matchLabel ? ` · ${matchLabel}` : ''}`;

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Convocatoria del equipo', text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link de convocatoria copiado');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast.error('No pudimos compartir la convocatoria');
    }
  }

  return (
    <button type="button" onClick={() => void shareMatch()} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-pitch-green hover:text-pitch-green" aria-label={`Compartir convocatoria ${matchLabel}`}>
      <Share2 className="h-4 w-4" aria-hidden="true" />
      <span>Compartir</span>
      <Copy className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
    </button>
  );
}
