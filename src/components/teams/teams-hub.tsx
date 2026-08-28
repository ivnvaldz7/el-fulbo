import Link from 'next/link';
import { ArrowUpRight, Users } from 'lucide-react';
import type { CSSProperties } from 'react';
import { routes } from '@/lib/routes';
import type { TeamHubItem } from '@/lib/types/teams.types';

export function TeamsHub({ teams }: { teams: TeamHubItem[] }) {
  const totalMatches = teams.reduce((total, team) => total + team.matchesPlayed, 0);
  const totalMembers = teams.reduce((total, team) => total + team.memberCount, 0);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:pt-12">
      <header className="grid gap-8 border-b border-white/10 pb-10 md:grid-cols-[1.15fr_0.85fr] md:items-end">
        <div>
          <p className="inline-flex rounded-full bg-pitch-green/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">
            Tu vestuario
          </p>
          <h1 className="mt-5 max-w-[560px] font-headline text-6xl font-black italic uppercase leading-[0.92] tracking-[-0.06em] text-white">
            Equipos que juegan juntos
          </h1>
          <p className="mt-5 max-w-[520px] text-sm font-semibold leading-6 text-white/60">
            Entrá a tus equipos, revisá el roster, seguí los partidos y construí tu historial oficial.
          </p>
          <Link
            href={routes.teamNew}
            className="btn-interactive group mt-7 inline-flex min-h-12 items-center justify-between gap-4 rounded-full bg-pitch-green px-5 font-headline text-sm font-black italic uppercase text-black hover:brightness-110"
          >
            Crear equipo
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </Link>
        </div>

        <div className="rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
          <div className="rounded-[1.65rem] bg-black/45 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Resumen de cancha</p>
              <Users className="h-4 w-4 text-pitch-green" strokeWidth={1.8} />
            </div>
            <dl className="mt-7 grid grid-cols-2 gap-5">
              <Metric value={teams.length} label="Equipos" />
              <Metric value={totalMembers} label="Jugadores" />
              <Metric value={totalMatches} label="Partidos" />
              <Metric value={teams.filter((team) => team.role === 'admin').length} label="Como admin" />
            </dl>
          </div>
        </div>
      </header>

      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Tus equipos</p>
          <h2 className="mt-2 font-headline text-3xl font-black italic uppercase text-white">Elegí tu cancha</h2>
        </div>
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
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--team-primary)] font-headline text-xl font-black italic text-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)]">
                      {getInitials(team.name)}
                    </span>
                    <div>
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{team.role}</p>
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
          <Link
            href={routes.teamNew}
            className="btn-interactive mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-pitch-green px-5 font-headline text-sm font-black italic uppercase text-black hover:brightness-110"
          >
            Crear mi equipo
          </Link>
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

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="font-headline text-3xl font-black text-white">{value}</dt>
      <dd className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-white/40">{label}</dd>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
