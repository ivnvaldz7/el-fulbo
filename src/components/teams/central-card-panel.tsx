import Link from 'next/link';
import type { FieldStats, GoalkeeperStats } from '@/lib/types';
import type { TeamCardTier, TeamCentralCardView } from '@/lib/types/teams.types';

const fieldStatLabels: Record<string, string> = {
  pac: 'Velocidad',
  sho: 'Tiro',
  pas: 'Pase',
  dri: 'Regate',
  def: 'Defensa',
  phy: 'Fisico',
};

const goalkeeperStatLabels: Record<string, string> = {
  div: 'Estirada',
  han: 'Manos',
  kic: 'Saque',
  ref: 'Reflejos',
  spd: 'Velocidad',
  pos: 'Colocacion',
};

const tierLabels: Record<TeamCardTier, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  premium_gold: 'Oro Premium',
};

const fieldStatOrder = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const goalkeeperStatOrder = ['div', 'han', 'kic', 'ref', 'spd', 'pos'];

export function CentralCardPanel({ view }: { view: TeamCentralCardView | null }) {
  if (!view) {
    return (
      <section aria-labelledby="central-card-heading" className="mb-10 rounded-[2rem] bg-white/7 p-6 ring-1 ring-white/10">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">Card central</p>
        <h2 id="central-card-heading" className="mt-3 font-headline text-3xl font-black italic uppercase text-white">
          Todavía no creaste tu card de Teams
        </h2>
        <p className="mt-3 max-w-[520px] text-sm font-semibold leading-6 text-white/55">
          Acá vas a ver tu overall, tus logros y las stats aprobadas de todos tus equipos. Las misiones se activan cuando
          tus partidos válidos acumulan goles, asistencias, tackles y MVPs oficiales.
        </p>
      </section>
    );
  }

  const isKeeper = view.primaryPosition === 'ARQ';
  const statLabels = isKeeper ? goalkeeperStatLabels : fieldStatLabels;
  const statOrder = isKeeper ? goalkeeperStatOrder : fieldStatOrder;
  const stats = isKeeper ? (view.stats as GoalkeeperStats) : (view.stats as FieldStats);

  return (
    <section aria-labelledby="central-card-heading" className="mb-10">
      <header className="mb-6">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">Card central</p>
        <h2 id="central-card-heading" className="mt-3 font-headline text-4xl font-black italic uppercase leading-none text-white">
          Tu card global
        </h2>
        <p className="mt-3 max-w-[560px] text-sm font-semibold leading-6 text-white/55">
          Una sola card para todos tus equipos. Los números suman partidos válidos y stats aprobadas por tus admins; las
          misiones avanzan solas al cruzar cada hito.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_1fr] md:items-stretch">
        <article
          aria-label="Card de Teams"
          className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-pitch-green via-[#f7f7d9] to-slate-950 p-2 text-white shadow-[0_30px_80px_rgba(0,0,0,0.46)]"
        >
          <div className="flex h-full min-h-[430px] flex-col rounded-[calc(2rem-0.5rem)] bg-black/85 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-pitch-green">El Fulbo</span>
              <span className="rounded-full bg-pitch-green px-3 py-1 font-mono text-[10px] font-black uppercase text-black">Teams</span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-32 w-32 flex-col items-center justify-center rounded-[2rem] bg-white/10 ring-1 ring-white/15">
                <span className="font-headline text-6xl font-black italic text-pitch-green">{view.overall}</span>
                <span className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Overall</span>
              </div>
              <h3 className="font-headline text-3xl font-black italic uppercase leading-none tracking-tight text-white">
                {view.primaryPosition} / {view.secondaryPosition}
              </h3>
              <p className="mt-3 rounded-full bg-white/10 px-4 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">
                {tierLabels[view.cardTier]}
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
              {statOrder.map((key) => (
                <div key={key}>
                  <dt className="font-headline text-xl font-black leading-none text-white">{stats[key as keyof typeof stats]}</dt>
                  <dd className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-pitch-green">{statLabels[key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>

        <div className="flex flex-col gap-5">
          <div className="rounded-[1.35rem] bg-white/7 p-5 ring-1 ring-white/10">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Rendimiento aprobado</p>
            <dl className="mt-5 grid grid-cols-5 gap-2 text-center">
              <Stat value={view.matchesPlayed} label="PJ" />
              <Stat value={view.goals} label="GOL" />
              <Stat value={view.assists} label="AST" />
              <Stat value={view.tackles} label="QTS" />
              <Stat value={view.mvps} label="MVP" />
            </dl>
          </div>

          <div className="rounded-[1.35rem] bg-white/7 p-5 ring-1 ring-white/10">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Logros y misiones</p>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Stat value={view.trophies} label="Trofeos" />
              <Stat value={view.missions} label="Misiones" />
              <Stat value={view.missionPoints} label="Pts" />
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <p className="rounded-[1.35rem] bg-black/45 px-5 py-4 text-xs font-semibold leading-5 text-white/45 ring-1 ring-white/10">
              Cada 5 MVPs oficiales sumás +2 a tus aptitudes y cada hito de goles, asistencias o tackles otorga +1. Solo
              cuentan partidos jugados con stat aprobada y presencia confirmada.
            </p>
            <Link 
              href="/rewards"
              className="btn-interactive flex h-12 w-full items-center justify-center rounded-[1.35rem] bg-pitch-green font-headline text-sm font-black uppercase text-black hover:scale-[1.02]"
            >
              Ver Recompensas y Misiones
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="font-headline text-2xl font-black text-white">{value}</dt>
      <dd className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-white/40">{label}</dd>
    </div>
  );
}
