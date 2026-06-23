'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type RemovePlayerButtonProps = {
  playerId: string;
  playerName: string;
  groupId: string;
};

export function RemovePlayerButton({ playerId, playerName, groupId }: RemovePlayerButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const handleRemove = async () => {
    if (!confirm(`¿Estás seguro que querés eliminar a ${playerName} del grupo?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('players')
        .update({ archived_at: new Date().toISOString(), is_expelled: true })
        .eq('id', playerId)
        .eq('group_id', groupId);

      if (error) {
        console.error('Error removing player:', error);
        alert('Hubo un error al intentar eliminar al jugador.');
        return;
      }

      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isDeleting}
      className="flex h-10 w-10 items-center justify-center border border-red-500/20 bg-red-500/10 text-red-500/70 transition-colors hover:bg-red-500/20 hover:text-red-500 active:scale-95 disabled:opacity-50"
      title="Eliminar jugador"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
