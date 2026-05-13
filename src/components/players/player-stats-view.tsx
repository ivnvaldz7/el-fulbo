import type { PlayerStatsAggregate } from '@/lib/types';

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'hace 1 semana';
  if (weeks < 4) return `hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'hace 1 mes';
  return `hace ${months} meses`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 border border-white/10 bg-white/5 p-4">
      <span className="font-mono text-xs font-bold uppercase text-white/40">{label}</span>
      <span className="font-headline text-2xl font-black text-white">{value}</span>
      {sub && <span className="font-mono text-[10px] text-white/30">{sub}</span>}
    </div>
  );
}

export function PlayerStatsView({ stats }: { stats: PlayerStatsAggregate }) {
  if (stats.matchesPlayed === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-white/40">
          Todavía no jugaste ningún partido en este grupo. Las estadísticas aparecen cuando juegues tu primero.
        </p>
      </div>
    );
  }

  const lastMvp = stats.lastMvpAt ? relativeTime(stats.lastMvpAt) : '—';

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-mono text-xs font-bold uppercase text-white/40">Partidos</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Jugados" value={stats.matchesPlayed} />
          <StatCard label="Ganados" value={stats.wins} />
          <StatCard label="Empatados" value={stats.draws} />
          <StatCard label="Perdidos" value={stats.losses} />
          {stats.winPercentage !== null && (
            <StatCard label="% Victorias" value={`${stats.winPercentage}%`} />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs font-bold uppercase text-white/40">Reconocimientos</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Veces MVP" value={stats.mvpCount} />
          <StatCard label="Último MVP" value={lastMvp} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs font-bold uppercase text-white/40">Participación</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Asistencia"
            value={stats.attendanceRate !== null ? `${stats.attendanceRate}%` : '—'}
          />
          <StatCard
            label="Bajas tardías"
            value={stats.lateDropouts}
            sub="menos de 6h antes del partido"
          />
        </div>
      </section>
    </div>
  );
}
