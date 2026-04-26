import { Trophy, UsersRound, CalendarCheck, Shuffle } from 'lucide-react';

const steps = [
  { label: 'Evento', icon: CalendarCheck },
  { label: 'Confirmacion', icon: UsersRound },
  { label: 'Sorteo', icon: Shuffle },
  { label: 'Memoria', icon: Trophy },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-10">
      <section className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-cancha">
          Bootstrap tecnico
        </p>
        <h1 className="text-4xl font-black leading-tight text-noche sm:text-6xl">
          El Fulbo esta listo para empezar a jugarse en codigo.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-700">
          Base Next.js 14, TypeScript strict, Tailwind, Supabase y PWA preparada para implementar
          feature por feature contra las specs V2.
        </p>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-4">
        {steps.map(({ label, icon: Icon }) => (
          <div key={label} className="rounded-card border border-black/10 bg-white/70 p-4 shadow-sm">
            <Icon className="mb-4 h-6 w-6 text-cancha" aria-hidden="true" />
            <p className="text-sm font-bold text-noche">{label}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
