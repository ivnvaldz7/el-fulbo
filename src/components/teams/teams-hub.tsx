import Link from 'next/link';
import { ArrowUpRight, UserRound } from 'lucide-react';
import type { CSSProperties } from 'react';
import { routes } from '@/lib/routes';
import type { TeamHubItem } from '@/lib/types/teams.types';
import { TeamBadge } from './team-badge';

export function TeamsHub({ teams }: { teams: TeamHubItem[] }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:pt-8">
      <header className="border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">Tu vestuario</p>
        <h1 className="mt-3 font-headline text-5xl font-black italic uppercase leading-none tracking-[-0.05em] text-white sm:text-6xl">
          Mis equipos
        </h1>
        <p className="mt-4 max-w-[610px] text-sm font-semibold leading-6 text-white/60">
          Planteles fijos para jugar juntos. En cada equipo ves sus miembros, partidos y estadísticas oficiales aprobadas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={routes.teamProfile}
            className="btn-interactive inline-flex min-h-12 items-center gap-3 rounded-full border border-white/20 bg-white/5 px-5 font-headline text-sm font-black italic uppercase text-white transition-colors hover:border-pitch-green hover:text-pitch-green"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Mi perfil de jugador
          </Link>
          <Link
            href={routes.teamNew}
            className="btn-interactive group inline-flex min-h-12 items-center justify-between gap-4 rounded-full bg-pitch-green px-5 font-headline text-sm font-black italic uppercase text-black hover:brightness-110"
          >
            Crear equipo
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </Link>
        </div>
      </header>

      <div className="mt-8 flex items-end justify-between gap-4">
        <h2 className="font-headline text-2xl font-black italic uppercase text-white">Tus equipos</h2>
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{teams.length} activos</span>
      </div>

      {teams.length > 0 ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={routes.teamDetail(team.id)}
              aria-label={`Abrir ${team.name}`}
              style={{
                '--team-primary': team.primaryColor ?? '#22c55e',
                '--team-secondary': team.secondaryColor ?? '#0a0a0a',
              } as CSSProperties}
              className="group relative overflow-hidden rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:ring-[var(--team-primary)]/70 active:scale-[0.98]"
            >
              <article className="relative min-h-60 overflow-hidden rounded-[1.65rem] bg-[var(--team-secondary)] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
                <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[var(--team-primary)]/15 blur-2xl transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-125" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <TeamBadge badgeUrl={team.badgeUrl} name={team.name} className="h-14 w-14 shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{team.role} · {team.modality}</p>
                      <h3 className="mt-2 font-headline text-3xl font-black italic uppercase leading-none text-white transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-[var(--team-primary)]">{team.name}</h3>
                      <p className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{team.memberCount} miembros</p>
                    </div>
                  </div>
                  <ArrowUpRight className="mt-1 h-5 w-5 text-white/35 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--team-primary)]" strokeWidth={1.8} />
                </div>
                <dl className="relative mt-10 grid grid-cols-4 gap-2 border-t border-white/10 pt-4 text-center">
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
        <div className="mt-5 rounded-[2rem] border border-dashed border-white/15 bg-white/5 p-8 sm:p-12">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Vestuario vacío</span>
          <h2 className="mt-3 max-w-[420px] font-headline text-4xl font-black italic uppercase leading-none text-white">Todavía no tenés equipos</h2>
          <p className="mt-4 max-w-[420px] text-sm font-semibold leading-6 text-white/55">
            Pedile a un admin una invitación o armá tu primer equipo para empezar a registrar partidos y stats oficiales.
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
