'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function DeleteGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`¿Estás seguro que querés eliminar el equipo "${groupName}"? Esta acción no se puede deshacer y borrará todos los partidos y jugadores.`)) {
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    
    if (res.ok) {
      router.refresh();
    } else {
      alert('Hubo un error al eliminar el equipo.');
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar equipo"
      className="flex h-8 w-8 items-center justify-center rounded bg-red-500/10 text-red-500 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
