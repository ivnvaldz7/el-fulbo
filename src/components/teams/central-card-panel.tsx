import Link from 'next/link';
import type { FieldStats, GoalkeeperStats } from '@/lib/types';
import type { TeamCardTier, TeamCentralCardView } from '@/lib/types/teams.types';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import type { PlayerPosition, PlayerStats } from '@/lib/types';
import { routes } from '@/lib/routes';
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

export function CentralCardPanel({ 
  view, 
  userProfile 
}: { 
  view: TeamCentralCardView | null;
  userProfile?: { name: string; photoUrl: string | null };
}) {
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
        <Link
          href={routes.teamCard}
          className="btn-interactive group mt-6 inline-flex min-h-12 items-center justify-between gap-4 rounded-full bg-pitch-green px-5 font-headline text-sm font-black uppercase text-black hover:brightness-110"
        >
          Crear mi card
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-lg transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
            +
          </span>
        </Link>
      </section>
    );
  }

  const isKeeper = view.primaryPosition === 'ARQ';
  const statLabels = isKeeper ? goalkeeperStatLabels : fieldStatLabels;
  const statOrder = isKeeper ? goalkeeperStatOrder : fieldStatOrder;
  const stats = isKeeper ? (view.stats as GoalkeeperStats) : (view.stats as FieldStats);
  const statEntries = statOrder.map((key) => ({
    key,
    label: statLabels[key] ?? key,
    value: Number(stats[key as keyof typeof stats]),
  }));

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

      <div className="grid gap-6 md:grid-cols-[minmax(0,340px)_1fr] md:items-stretch">
        <div className="mx-auto w-full max-w-[340px]">
          <div className="rounded-[2rem] bg-white/5 p-2 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
            <div
              role="img"
              aria-label={`Card de ${userProfile?.name || 'Jugador'}`}
              className="overflow-hidden rounded-[1.65rem] bg-black/40"
            >
              <PlayerCardPreview
                name={userProfile?.name ?? ''}
                position={view.primaryPosition as PlayerPosition}
                stats={view.stats as unknown as PlayerStats}
                photoUrl={userProfile?.photoUrl}
                showBoostIndicator={false}
              />
            </div>
            <div className="flex items-center justify-between px-3 pb-2 pt-3">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Posición</span>
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">
                {view.primaryPosition} / {view.secondaryPosition}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-[1.5rem] bg-white/7 p-5 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Rendimiento aprobado</p>
            <dl className="mt-5 grid grid-cols-5 gap-2 text-center">
              <Stat value={view.matchesPlayed} label="PJ" />
              <Stat value={view.goals} label="GOL" />
              <Stat value={view.assists} label="AST" />
              <Stat value={view.tackles} label="QTS" />
              <Stat value={view.mvps} label="MVP" />
            </dl>
          </div>

          <div className="rounded-[1.5rem] bg-black/35 p-5 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Aptitudes</p>
              <span className="rounded-full bg-white/8 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                {tierLabels[view.cardTier]}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {statEntries.map((entry) => (
                <div key={entry.key} className="rounded-xl bg-white/6 px-3 py-3 text-center ring-1 ring-white/6">
                  <dt className="font-headline text-xl font-black text-white">{entry.value}</dt>
                  <dd className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white/40">{entry.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-[1.5rem] bg-white/7 p-5 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Logros y misiones</p>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Stat value={view.trophies} label="Trofeos" />
              <Stat value={view.missions} label="Misiones" />
              <Stat value={view.missionPoints} label="Pts" />
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <p className="rounded-[1.5rem] bg-black/45 px-5 py-4 text-xs font-semibold leading-5 text-white/55 ring-1 ring-white/10">
              Cada 3 MVPs oficiales sumás +2 a tus aptitudes. Cada racha de 3 victorias válidas suma +1. También cuentan
              los hitos de goles, asistencias y quites. Solo se consideran stats aprobadas.
            </p>
            <Link 
              href="/rewards"
              className="btn-interactive group flex h-12 w-full items-center justify-between rounded-full bg-pitch-green px-5 font-headline text-sm font-black uppercase text-black hover:brightness-110"
            >
              Ver Recompensas y Misiones
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-lg transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                +
              </span>
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
