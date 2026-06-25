'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { archiveSelfPlayer } from '@/lib/services/player.service';

type LeaveGroupButtonProps = {
  playerId: string;
  groupId: string;
};

export function LeaveGroupButton({ playerId, groupId }: LeaveGroupButtonProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const handleLeave = async () => {
    if (!confirm('¿Estás seguro que querés salir del equipo?')) {
      return;
    }

    setIsLeaving(true);

    try {
      const result = await archiveSelfPlayer(supabase, playerId);

      if (!result.ok) {
        console.error('Error leaving group:', result.error);
        alert(result.error.message ?? 'Hubo un error al intentar salir del equipo.');
        return;
      }

      router.push('/groups');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <button
      onClick={handleLeave}
      disabled={isLeaving}
      className="mt-6 flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/10 px-6 py-3 font-headline text-sm font-bold italic uppercase text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 active:scale-95 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {isLeaving ? 'Saliendo...' : 'Salir del equipo'}
    </button>
  );
}
