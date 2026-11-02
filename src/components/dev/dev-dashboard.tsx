import Link from 'next/link';
import { routes } from '@/lib/routes';

export type DevDashboardData = {
  user: {
    id: string;
    email: string;
  };
  globalCard: {
    exists: boolean;
    position: string | null;
    overall: number | null;
    locked: boolean;
  };
  legacyCards: Array<{
    name: string;
    position: string;
    status: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
  }>;
};

export function DevDashboard({ data }: { data: DevDashboardData }) {
  const cardState = data.globalCard.exists ? 'Lista' : 'Falta crear';
  const cardTone = data.globalCard.exists ? 'text-pitch-green' : 'text-amber-300';

  return (
    <main className="min-h-[100dvh] bg-[#050505] px-4 py-10 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-pitch-green/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pitch-green">
              Área de desarrollo
            </p>
            <h1 className="mt-6 max-w-3xl font-headline text-6xl font-black italic uppercase leading-[0.88] tracking-[-0.06em] text-white sm:text-7xl">
              La cancha de pruebas
            </h1>
            <p className="mt-6 max-w-2xl text-sm font-semibold leading-6 text-white/60">
              Un punto de control para revisar el onboarding, la Card Global y el recorrido de Equipos mientras lo construimos.
            </p>
          </div>
          <div className="rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
            <div className="rounded-[1.65rem] bg-[#0a120d] p-5 sm:p-6">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Sesión activa</p>
              <p className="mt-3 break-all font-mono text-sm font-bold text-pitch-green">{data.user.email}</p>
              <p className="mt-2 break-all font-mono text-[10px] text-white/35">{data.user.id}</p>
              <Link href="/dev" className="mt-6 inline-flex rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/65 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-pitch-green hover:text-pitch-green">
                Actualizar estado
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-3" aria-label="Estado de la implementación">
          <StatusCard label="Card Global" value={cardState} detail={data.globalCard.position ? `Posición ${data.globalCard.position}` : 'El onboarding todavía no está completo'} tone={cardTone} />
          <StatusCard label="Equipos" value={`${data.teams.length}`} detail="Equipos activos de esta sesión" tone="text-white" />
          <StatusCard label="Cards legacy" value={`${data.legacyCards.length}`} detail="Registros históricos en Groups" tone="text-white" />
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
            <div className="rounded-[1.65rem] bg-black/40 p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-pitch-green">Recorrido principal</p>
                  <h2 className="mt-3 font-headline text-4xl font-black italic uppercase leading-none">Probar Equipos</h2>
                </div>
                <span className={`font-mono text-[10px] font-black uppercase tracking-[0.18em] ${cardTone}`}>{cardState}</span>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <DevLink href={routes.teamCard} label="01" title="Card Global" detail="Crear o editar" />
                <DevLink href={routes.teamNew} label="02" title="Nuevo equipo" detail="Crear roster" />
                <DevLink href={routes.teams} label="03" title="Hub de equipos" detail="Ver estado" />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
            <div className="rounded-[1.65rem] bg-[#0b0d12] p-6 sm:p-8">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-pitch-green">Puntos de entrada</p>
              <h2 className="mt-3 font-headline text-4xl font-black italic uppercase leading-none">Accesos rápidos</h2>
              <div className="mt-8 grid gap-3">
                <DevLink href="/" label="HOME" title="Perfil actual" detail="Estado de sesión" />
                <DevLink href="/dev-login" label="AUTH" title="Dev login" detail="Crear o cambiar usuario local" />
                <DevLink href="/groups" label="GROUPS" title="Grupos" detail="Ver compatibilidad legacy" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <DataPanel title="Card Global" eyebrow="Fuente de verdad objetivo">
            <DataRow label="Estado" value={cardState} tone={cardTone} />
            <DataRow label="Posición" value={data.globalCard.position ?? '—'} />
            <DataRow label="Overall" value={data.globalCard.overall === null ? '—' : String(data.globalCard.overall)} />
            <DataRow label="Posiciones bloqueadas" value={data.globalCard.locked ? 'Sí' : 'No'} />
          </DataPanel>

          <DataPanel title="Equipos actuales" eyebrow="Membresías de la sesión">
            {data.teams.length > 0 ? data.teams.map((team) => (
              <Link key={team.id} href={routes.teamDetail(team.id)} className="flex items-center justify-between gap-4 border-b border-white/8 py-3 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] last:border-b-0 hover:text-pitch-green">
                <span>
                  <span className="block font-headline text-xl font-black uppercase">{team.name}</span>
                  <span className="mt-1 block font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{team.role} · {team.memberCount} miembros</span>
                </span>
                <span className="font-mono text-lg text-white/40">↗</span>
              </Link>
            )) : <p className="text-sm font-semibold leading-6 text-white/50">Todavía no hay equipos para esta sesión.</p>}
          </DataPanel>
        </section>

        <section className="mt-10 rounded-[2rem] border border-amber-300/20 bg-amber-300/5 p-6 sm:p-8">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Reset local</p>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/65">
            El reset completo se ejecuta desde la terminal con <code className="rounded bg-black/30 px-2 py-1 font-mono text-xs text-amber-200">npm run supabase:reset</code> cuando Docker Desktop está activo. Esta pantalla es de diagnóstico y no incluye una acción destructiva.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <article className="rounded-[1.75rem] bg-white/5 p-1.5 ring-1 ring-white/10">
      <div className="min-h-36 rounded-[1.4rem] bg-black/35 p-5">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{label}</p>
        <p className={`mt-4 font-headline text-4xl font-black italic uppercase ${tone}`}>{value}</p>
        <p className="mt-2 text-xs font-semibold text-white/45">{detail}</p>
      </div>
    </article>
  );
}

function DevLink({ href, label, title, detail }: { href: string; label: string; title: string; detail: string }) {
  return (
    <Link href={href} className="group rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-pitch-green/60 hover:bg-pitch-green/10">
      <span className="font-mono text-[10px] font-black tracking-[0.18em] text-pitch-green">{label}</span>
      <span className="mt-5 block font-headline text-xl font-black uppercase text-white group-hover:text-pitch-green">{title}</span>
      <span className="mt-1 block text-xs font-semibold text-white/40">{detail}</span>
    </Link>
  );
}

function DataPanel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
      <div className="rounded-[1.65rem] bg-black/35 p-6 sm:p-8">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-pitch-green">{eyebrow}</p>
        <h2 className="mt-3 font-headline text-3xl font-black italic uppercase">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function DataRow({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 py-3 last:border-b-0">
      <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</span>
      <span className={`text-right font-mono text-xs font-black uppercase ${tone}`}>{value}</span>
    </div>
  );
}
