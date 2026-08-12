import type { PlayerStatsAggregate } from '@/lib/types';
import { Trophy, Activity, Flag, Crosshair, Award, Flame } from 'lucide-react';

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

function StatCard({ label, value, sub, icon: Icon, highlight = false }: { label: string; value: string | number; sub?: string; icon?: any; highlight?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${highlight ? 'border-pitch-green/40 bg-pitch-green/5' : 'border-white/5 bg-white/[0.02]'} p-4 shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.02]`}>
      {highlight && (
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-pitch-green/10 blur-2xl" />
      )}
      <div className="relative z-10 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</span>
        {Icon && <Icon className={`h-4 w-4 ${highlight ? 'text-pitch-green' : 'text-white/30'}`} />}
      </div>
      <div className="relative z-10 mt-3 flex flex-col">
        <span className={`font-headline text-3xl font-black italic ${highlight ? 'text-pitch-green' : 'text-white'}`}>{value}</span>
        {sub && <span className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/40">{sub}</span>}
      </div>
    </div>
  );
}

export function PlayerStatsView({ stats }: { stats: PlayerStatsAggregate }) {
  if (stats.matchesPlayed === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-black/20 p-10 text-center">
        <Activity className="mb-4 h-10 w-10 text-white/20" />
        <h3 className="font-headline text-xl font-bold uppercase italic text-white/60">Sin Estadísticas</h3>
        <p className="mt-2 text-sm text-white/40 max-w-[200px]">
          Jugá tu primer partido en este grupo para destrabar tus stats.
        </p>
      </div>
    );
  }

  const lastMvp = stats.lastMvpAt ? relativeTime(stats.lastMvpAt) : '—';

  return (
    <div className="space-y-8">
      {/* Overview Hero Section */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Partidos" value={stats.matchesPlayed} icon={Activity} />
        <StatCard label="Victorias" value={stats.wins} highlight icon={Flame} />
        <StatCard label="Empates" value={stats.draws} />
        <StatCard label="Derrotas" value={stats.losses} />
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Advanced Stats */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-pitch-green" />
          <h2 className="font-headline text-lg font-black uppercase italic text-white">Rendimiento</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.winPercentage !== null && (
            <StatCard label="Win Rate" value={`${stats.winPercentage}%`} highlight />
          )}
          <StatCard
            label="Asistencia"
            value={stats.attendanceRate !== null ? `${stats.attendanceRate}%` : '—'}
          />
        </div>
      </section>

      {/* Awards */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#FFD700]" />
          <h2 className="font-headline text-lg font-black uppercase italic text-white">Palmarés</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Premios MVP" value={stats.mvpCount} icon={Award} highlight={stats.mvpCount > 0} />
          <StatCard label="Último MVP" value={lastMvp} />
        </div>
      </section>

      {/* Disciplinary / Flags */}
      {stats.lateDropouts > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-500" />
            <h2 className="font-headline text-lg font-black uppercase italic text-white">Disciplina</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <StatCard
              label="Bajas tardías"
              value={stats.lateDropouts}
              sub="menos de 6h antes del partido"
            />
          </div>
        </section>
      )}
    </div>
  );
}
