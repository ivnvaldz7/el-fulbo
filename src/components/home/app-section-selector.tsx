import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { routes } from '@/lib/routes';

export function AppSectionSelector({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-12 pt-10 sm:max-w-[640px] sm:px-6 sm:pt-14">
      <section className="flex flex-grow flex-col justify-center text-center">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-pitch-green">El Fulbo</p>
        <h1 className="mt-4 font-headline text-5xl font-black italic uppercase leading-[0.88] tracking-tight text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.45)] sm:text-6xl">
          Elegí tu cancha
        </h1>
        <p className="mx-auto mt-5 max-w-[320px] text-sm font-semibold leading-6 text-white/70">
          Grupos organiza partidos entre amigos. Equipos reúne planteles fijos, partidos propios y estadísticas aprobadas.
        </p>

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
          <Link
            href={routes.groups}
            aria-label="Entrar a Grupos"
            className="group rounded-[1.75rem] bg-white/8 p-1.5 ring-1 ring-white/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:ring-pitch-green/60 active:scale-[0.98]"
          >
            <div className="flex h-full min-h-60 flex-col rounded-[1.35rem] bg-black/55 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] sm:min-h-64">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/45">El Fulbo entre amigos</span>
              <h2 className="mt-5 font-headline text-3xl font-black italic uppercase text-white group-hover:text-pitch-green">Grupos</h2>
              <p className="mt-3 text-sm font-semibold leading-5 text-white/60">Organizá el fulbito semanal, asistencia, sorteo, MVP y resumen.</p>
              <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-pitch-green px-4 py-2.5 font-headline text-sm font-black uppercase text-black">Entrar a grupos <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
            </div>
          </Link>

          <Link
            href={routes.teams}
            aria-label="Entrar a Equipos"
            className="group rounded-[1.75rem] bg-white/8 p-1.5 ring-1 ring-white/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:ring-pitch-green/60 active:scale-[0.98]"
          >
            <div className="flex h-full min-h-60 flex-col rounded-[1.35rem] bg-black/55 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] sm:min-h-64">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/45">El Fulbo titular</span>
              <h2 className="mt-5 font-headline text-3xl font-black italic uppercase text-white group-hover:text-pitch-green">Equipos</h2>
              <p className="mt-3 text-sm font-semibold leading-5 text-white/60">Plantel fijo, competitivo para los amantes de los desafíos.</p>
              <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-pitch-green px-4 py-2.5 font-headline text-sm font-black uppercase text-black">Entrar a equipos <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-5">
        {!isAuthenticated ? (
          <Link href={routes.login} className="btn-interactive flex h-14 w-full items-center justify-center bg-pitch-green font-headline text-2xl font-bold text-black">
            Entrar
          </Link>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/groups/new" className="btn-interactive flex min-h-11 items-center justify-center border border-white/10 bg-black/30 px-4 font-headline text-sm font-bold italic uppercase text-white/75 hover:border-white/30 hover:bg-white/5 hover:text-white">
            Crear un grupo
          </Link>
          <Link href={routes.join} className="btn-interactive flex min-h-11 items-center justify-center border border-white/10 bg-black/30 px-4 font-headline text-sm font-bold italic uppercase text-white/75 hover:border-white/30 hover:bg-white/5 hover:text-white">
            Tengo un código de invitación
          </Link>
        </div>
      </section>
    </div>
  );
}
