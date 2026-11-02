import { ArrowUp, Shield, Star, Target, Trophy } from 'lucide-react';
import type { TeamCentralCardView } from '@/lib/types/teams.types';

type MissionType = 'goal' | 'assist' | 'tackle';

interface MissionProgress {
  id: MissionType;
  type: MissionType;
  current: number;
  target: number;
  completed: boolean;
}

const missionThresholds: Record<MissionType, number[]> = {
  goal: [10, 25, 50, 100],
  assist: [10, 25, 50, 100],
  tackle: [20, 50, 100, 200],
};

const missionLabels: Record<MissionType, { title: string; stat: string; icon: typeof Target }> = {
  goal: { title: 'Goleador', stat: 'goles', icon: Target },
  assist: { title: 'Playmaker', stat: 'asistencias', icon: ArrowUp },
  tackle: { title: 'El Muro', stat: 'tacles', icon: Shield },
};

function getNextThreshold(current: number, thresholds: number[]) {
  return thresholds.find((threshold) => current < threshold) ?? thresholds[thresholds.length - 1] ?? current;
}

function buildMissions(view: TeamCentralCardView): MissionProgress[] {
  return [
    { id: 'goal', type: 'goal', current: view.goals, target: getNextThreshold(view.goals, missionThresholds.goal), completed: view.goals >= missionThresholds.goal.at(-1)! },
    { id: 'assist', type: 'assist', current: view.assists, target: getNextThreshold(view.assists, missionThresholds.assist), completed: view.assists >= missionThresholds.assist.at(-1)! },
    { id: 'tackle', type: 'tackle', current: view.tackles, target: getNextThreshold(view.tackles, missionThresholds.tackle), completed: view.tackles >= missionThresholds.tackle.at(-1)! },
  ];
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full bg-white transition-all duration-500" style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function RewardsHub({ view }: { view: TeamCentralCardView | null }) {
  if (!view) {
    return (
      <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 p-8 text-center">
        <Trophy className="mx-auto h-10 w-10 text-white/35" />
        <h2 className="mt-4 font-headline text-2xl font-black italic uppercase text-white">Sin progreso todavía</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/55">
          Tus logros aparecerán cuando tengas una Card de Equipos y stats aprobadas en partidos oficiales.
        </p>
      </section>
    );
  }

  const missions = buildMissions(view);
  const mvpCycleTarget = 3;
  const completedMvpCycles = Math.floor(view.mvps / mvpCycleTarget);
  const currentMvpCycle = view.mvps % mvpCycleTarget;

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-pitch-green/30 bg-gradient-to-b from-pitch-green/10 to-black/80 p-6 shadow-2xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pitch-green/20 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-pitch-green bg-pitch-green/20 shadow-[0_0_30px_rgba(204,255,0,0.3)]">
            <Trophy className="h-10 w-10 text-pitch-green drop-shadow-md" />
          </div>
          <h2 className="font-headline text-2xl font-black italic uppercase text-white">Progresión MVP</h2>
          <p className="mt-2 max-w-[280px] text-sm text-white/70">
            Cada 3 MVPs oficiales acredita un ciclo de mejora automáticamente.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            {[...Array(mvpCycleTarget)].map((_, index) => (
              <div key={index} className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 ${index < currentMvpCycle ? 'border-pitch-green bg-pitch-green/20' : 'border-white/10 bg-white/5'}`}>
                <Star className={`h-5 w-5 ${index < currentMvpCycle ? 'fill-pitch-green text-pitch-green' : 'text-white/20'}`} />
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green">
            {currentMvpCycle} / {mvpCycleTarget} del próximo ciclo · {completedMvpCycles} ciclos acreditados
          </p>
          <p className="mt-4 text-xs font-semibold text-white/45">{view.mvps} MVPs oficiales registrados</p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline text-xl font-black uppercase italic text-white">Próximos hitos</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Datos aprobados</span>
        </div>

        <div className="grid gap-3">
          {missions.map((mission) => {
            const metadata = missionLabels[mission.type];
            const Icon = metadata.icon;
            const progress = mission.completed ? mission.target : mission.current;

            return (
              <article key={mission.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-end justify-between gap-3">
                    <h3 className="font-headline text-base font-bold uppercase text-white">{metadata.title}</h3>
                    <span className="font-mono text-[10px] font-bold text-pitch-green">{mission.completed ? 'Completado' : `Hito ${mission.target}`}</span>
                  </div>
                  <p className="mb-2 text-xs text-white/50">
                    {mission.completed ? 'Todos los hitos actuales alcanzados.' : `Próximo hito: ${mission.target} ${metadata.stat}.`}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1"><ProgressBar current={progress} target={mission.target} /></div>
                    <span className="w-12 text-right font-mono text-[10px] font-bold text-white/70">{mission.current}/{mission.target}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-black/35 p-5 ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-headline text-xl font-black italic uppercase text-white">Resumen real</h2>
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-pitch-green">Sin datos demo</span>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <SummaryStat value={view.trophies} label="Trofeos" />
          <SummaryStat value={view.missions} label="Misiones" />
          <SummaryStat value={view.missionPoints} label="Puntos" />
        </dl>
        <p className="mt-5 text-xs font-semibold leading-5 text-white/45">
          La progresión se calcula con partidos válidos, stats aprobadas y MVPs registrados. Las mejoras se aplican automáticamente al procesar cada hito.
        </p>
      </section>
    </div>
  );
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="font-headline text-2xl font-black text-white">{value}</dt>
      <dd className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-white/40">{label}</dd>
    </div>
  );
}
