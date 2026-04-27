import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarCheck, Shuffle, Trophy, UsersRound } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const previewCards = [
  { name: 'TOMI', overall: 64, tier: 'Bronce', color: 'bg-amber-800' },
  { name: 'NICO', overall: 72, tier: 'Plata', color: 'bg-zinc-300 text-zinc-950' },
  { name: 'IVAN', overall: 81, tier: 'Oro', color: 'bg-yellow-500 text-zinc-950' },
  { name: 'FACU', overall: 88, tier: 'MVP', color: 'bg-orange-400 text-zinc-950' },
];

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: player } = await supabase
      .from('players')
      .select('group_id')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle();

    if (player?.group_id) {
      redirect(`/groups/${player.group_id}/dashboard`);
    }

    redirect('/welcome');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-10">
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="mb-4 text-sm font-black uppercase tracking-wide text-cancha">El Fulbo</p>
          <h1 className="max-w-3xl text-5xl font-black leading-tight text-noche sm:text-7xl">
            Organiza tu fulbito sin salir de una sola app.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-700">
            Evento, confirmaciones, sorteo y cards FIFA para cada jugador. Todo junto.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/welcome"
              className="inline-flex min-h-12 items-center justify-center rounded-card bg-noche px-6 py-3 text-sm font-black text-cal"
            >
              Crear un grupo
            </Link>
            <Link
              href="/join"
              className="inline-flex min-h-12 items-center justify-center rounded-card border border-noche px-6 py-3 text-sm font-black text-noche"
            >
              Unirme a un grupo
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3" aria-label="Preview de cards">
          {previewCards.map((card, index) => (
            <div
              key={card.name}
              className={`min-h-44 rounded-card p-4 shadow-xl ${card.color}`}
              style={{ transform: `translateY(${index % 2 === 0 ? 0 : 20}px)` }}
            >
              <p className="text-4xl font-black">{card.overall}</p>
              <p className="mt-1 text-xs font-black uppercase">{card.tier}</p>
              <div className="mt-8 rounded-card bg-white/25 px-3 py-5 text-center text-2xl font-black">
                {card.name}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Evento', icon: CalendarCheck },
          { label: 'Confirmacion', icon: UsersRound },
          { label: 'Sorteo', icon: Shuffle },
          { label: 'Memoria', icon: Trophy },
        ].map(({ label, icon: Icon }) => (
          <div key={label} className="rounded-card border border-black/10 bg-white/70 p-4 shadow-sm">
            <Icon className="mb-4 h-6 w-6 text-cancha" aria-hidden="true" />
            <p className="text-sm font-bold text-noche">{label}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
