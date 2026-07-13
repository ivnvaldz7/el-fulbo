import type { TeamApprovedStatTotals } from '@/lib/types/teams.types';

export function TeamStatsPanel({ totals }: { totals: Omit<TeamApprovedStatTotals, 'teamId'> }) {
  const stats = [
    { label: 'Partidos', short: 'PJ', value: totals.matchesPlayed },
    { label: 'Goles', short: 'GOL', value: totals.goals },
    { label: 'Asistencias', short: 'AST', value: totals.assists },
    { label: 'Quites', short: 'QTS', value: totals.tackles },
  ];

  return (
    <section aria-labelledby="stats-heading" className="space-y-4">
      <header>
        <h2 id="stats-heading" className="font-headline text-3xl font-black italic uppercase text-white">Stats</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">Aprobadas solamente. Rechazadas o pendientes no agregan, no prueban participación y no progresan.</p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.short} className="rounded-[1.35rem] bg-white/7 p-5 text-center ring-1 ring-white/10">
            <dt className="font-headline text-4xl font-black text-white">{stat.value}</dt>
            <dd className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-pitch-green">{stat.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
