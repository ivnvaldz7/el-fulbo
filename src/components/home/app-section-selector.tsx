import Link from 'next/link';
import { routes } from '@/lib/routes';

export function AppSectionSelector({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-12 pt-10 lg:max-w-[540px]">
      <section className="flex flex-grow flex-col justify-center text-center">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-pitch-green">El Fulbo</p>
        <h1 className="mt-4 font-headline text-5xl font-black italic uppercase leading-[0.85] tracking-tight text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.45)] sm:text-6xl">
          Elegí tu cancha
        </h1>
        <p className="mx-auto mt-5 max-w-[300px] text-sm font-semibold leading-6 text-white/70">
          Grupos sigue igual. Equipos suma roster fijo, partidos propios, stats aprobadas y card compartible.
        </p>

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
          <Link
            href={routes.groups}
            aria-label="Entrar a Grupos"
            className="group rounded-[1.75rem] bg-white/8 p-1.5 ring-1 ring-white/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:ring-pitch-green/60 active:scale-[0.98]"
          >
            <div className="min-h-48 rounded-[1.35rem] bg-black/55 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Actual</span>
              <h2 className="mt-4 font-headline text-3xl font-black italic uppercase text-white group-hover:text-pitch-green">Grupos</h2>
              <p className="mt-3 text-sm font-semibold leading-5 text-white/60">Organizá el fulbito semanal, asistencia, sorteo, MVP y resumen.</p>
              <span className="mt-7 inline-flex rounded-full bg-pitch-green px-4 py-2 font-headline text-sm font-black uppercase text-black">Entrar a grupos</span>
            </div>
          </Link>

          <Link
            href={routes.teams}
            aria-label="Entrar a Equipos"
            className="group rounded-[1.75rem] bg-pitch-green/15 p-1.5 ring-1 ring-pitch-green/30 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:ring-pitch-green active:scale-[0.98]"
          >
            <div className="min-h-48 rounded-[1.35rem] bg-[#07120c] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.16)]">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-pitch-green">Nuevo</span>
              <h2 className="mt-4 font-headline text-3xl font-black italic uppercase text-white group-hover:text-pitch-green">Equipos</h2>
              <p className="mt-3 text-sm font-semibold leading-5 text-white/60">Roster fijo, partidos del equipo, moderación de stats y card pública.</p>
              <span className="mt-7 inline-flex rounded-full bg-white px-4 py-2 font-headline text-sm font-black uppercase text-black">Entrar a equipos</span>
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-4">
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