import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function GroupDashboardPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentPlayer } = await supabase
    .from('players')
    .select('stats_status')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .is('archived_at', null)
    .maybeSingle();

  const { data: group } = await supabase
    .from('groups')
    .select('name, default_modality')
    .eq('id', params.id)
    .single();

  const { data: roster } = await supabase
    .from('players')
    .select('id, display_name, primary_position')
    .eq('group_id', params.id)
    .eq('stats_status', 'approved')
    .is('archived_at', null)
    .order('display_name');

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10">
      {currentPlayer?.stats_status === 'pending_approval' ? (
        <div className="mb-6 rounded-card border border-yellow-500/40 bg-yellow-100 px-4 py-3 text-sm font-bold text-yellow-900">
          Tu carta esta pendiente. Cuando el admin la apruebe, vas a aparecer en el roster.
        </div>
      ) : null}

      <p className="text-sm font-black uppercase text-cancha">{group?.default_modality}</p>
      <h1 className="mt-2 text-4xl font-black text-noche">{group?.name ?? 'Grupo'}</h1>

      <section className="mt-8">
        <h2 className="text-2xl font-black text-noche">Roster</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(roster ?? []).map((player) => (
            <article key={player.id} className="rounded-card border border-black/10 bg-white/80 p-4">
              <p className="font-black text-noche">{player.display_name}</p>
              <p className="mt-1 text-sm font-bold text-neutral-600">{player.primary_position}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-card border border-black/10 bg-white/80 p-5">
        <h2 className="text-xl font-black text-noche">Proximos partidos</h2>
        <p className="mt-2 text-sm text-neutral-700">
          {currentPlayer?.stats_status === 'pending_approval'
            ? 'Espera que aprueben tu carta para confirmar asistencia.'
            : 'La confirmacion de asistencia se implementa en feat-006.'}
        </p>
      </section>

      {currentPlayer?.stats_status === 'pending_approval' ? (
        <Link href={`/groups/${params.id}/pending`} className="mt-6 inline-block text-sm font-black text-cancha">
          Ver estado de mi carta
        </Link>
      ) : null}
    </main>
  );
}
