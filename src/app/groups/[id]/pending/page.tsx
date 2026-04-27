import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { getCurrentUserPlayerInGroup } from '@/lib/services/player.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PendingPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const player = await getCurrentUserPlayerInGroup(supabase, params.id);

  if (!player.ok) {
    redirect('/');
  }

  if (player.data.statsStatus === 'approved') {
    redirect(`/groups/${params.id}/dashboard`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-5 py-10 text-center">
      <PlayerCardPreview
        name={player.data.displayName}
        position={player.data.primaryPosition}
        stats={player.data.stats}
        pending
      />
      <h1 className="mt-8 text-4xl font-black text-noche">
        Tu carta esta esperando que el admin la apruebe.
      </h1>
      <p className="mt-3 max-w-xl text-neutral-700">
        Vas a poder confirmar asistencia a partidos cuando tu carta este aprobada. Mientras tanto,
        podes ver el grupo.
      </p>
      <Link
        href={`/groups/${params.id}/dashboard`}
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-card bg-noche px-6 py-3 text-sm font-black text-cal"
      >
        Explorar el grupo
      </Link>
    </main>
  );
}
