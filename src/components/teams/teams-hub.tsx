import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { TeamHubItem } from '@/lib/types/teams.types';

export function TeamsHub({ teams }: { teams: TeamHubItem[] }) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">Roster fijo</p>
        <h1 className="mt-3 font-headline text-5xl font-black italic uppercase leading-none text-white">Equipos</h1>
        <p className="mt-3 max-w-[520px] text-sm font-semibold leading-6 text-white/60">
          Entrá a tus equipos, revisá miembros, partidos, stats aprobadas y la card pública.
        </p>
      </header>

      {teams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={routes.teamDetail(team.id)}
              aria-label={`Abrir ${team.name}`}
              className="group rounded-[1.75rem] bg-white/8 p-1.5 ring-1 ring-white/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:ring-pitch-green/70 active:scale-[0.98]"
            >
              <article className="min-h-56 rounded-[1.35rem] bg-black/55 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{team.role}</p>
                    <h2 className="mt-2 font-headline text-3xl font-black italic uppercase text-white group-hover:text-pitch-green">{team.name}</h2>
                  </div>
                  <span className="rounded-full bg-pitch-green px-3 py-1 font-mono text-[10px] font-black uppercase text-black">{team.memberCount} miembros</span>
                </div>
                <dl className="mt-8 grid grid-cols-4 gap-2 text-center">
                  <Stat value={team.matchesPlayed} label="PJ" />
                  <Stat value={team.goals} label="GOL" />
                  <Stat value={team.assists} label="AST" />
                  <Stat value={team.tackles} label="QTS" />
                </dl>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 p-8 text-center">
          <h2 className="font-headline text-2xl font-black italic uppercase text-white">Todavía no tenés equipos</h2>
          <p className="mx-auto mt-3 max-w-[360px] text-sm font-semibold leading-6 text-white/55">
            Pedile a un admin una invitación. Los equipos son roster fijo y no se mezclan con tus grupos.
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="font-headline text-2xl font-black text-white">{value}</dt>
      <dd className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{label}</dd>
    </div>
  );
}
