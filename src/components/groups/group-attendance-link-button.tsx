'use client';

import toast from 'react-hot-toast';
import { routes } from '@/lib/routes';

export function GroupAttendanceLinkButton({ shareToken }: { shareToken: string }) {
  async function copyLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}${routes.groupSharedAttendance(shareToken)}`,
    );
    toast.success('Link fijo de convocatoria copiado.');
  }

  return (
    <button
      type="button"
      onClick={() => void copyLink()}
      className="btn-interactive flex min-h-12 items-center justify-center border border-white/10 bg-black/30 px-4 font-headline text-sm font-bold uppercase italic text-white hover:border-white/30 hover:bg-white/10"
    >
      Link WhatsApp
    </button>
  );
}
