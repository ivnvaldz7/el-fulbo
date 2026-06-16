import Link from 'next/link';
import { ArrowRight, Home } from 'lucide-react';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PlayerCardSharePanel } from '@/components/share/player-card-share-panel';
import { InviteShareButton } from '@/components/groups/invite-share-button';
import { CopyAliasButton } from '@/components/groups/copy-alias-button';
import { AppShareButton } from '@/components/share/app-share-button';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';

type UpcomingEvent = {
  id: string;
  scheduledAt: string;
};

type RecentPlayedEvent = {
  id: string;
  fieldName: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  mvpName: string | null;
  boostsLine: string | null;
  playedAtLabel: string;
};

type GroupDashboardInitialStateProps = {
  groupId: string;
  groupName: string;
  modality: string;
  activePlayers: number;
  adminPendingTotal?: number;
  userRole: string;
  closestMatch?: UpcomingEvent;
  matchesToday: UpcomingEvent[];
  recentPlayedEvents?: RecentPlayedEvent[];
  inviteCode: string;
  currentPlayerId: string | null;
  shareablePlayer?: {
    displayName: string;
    primaryPosition: PlayerPosition;
    stats: PlayerStats;
    currentBoost?: CurrentBoost | null;
    photoUrl?: string | null;
  } | null;
};

export function GroupDashboardInitialState({
  groupId,
  groupName,
  modality,
  activePlayers,
  adminPendingTotal = 0,
  userRole,
  closestMatch,
  matchesToday,
  recentPlayedEvents = [],
  inviteCode,
  currentPlayerId,
  shareablePlayer = null,
}: GroupDashboardInitialStateProps) {
  const showAdminPendingBanner = adminPendingTotal > 0;
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
  const hasClosestMatch = closestMatch !== undefined;

  return (
    <ImmersiveScreen contentClassName="mx-auto max-w-xl">
      <FloatingPanel className="w-full border-2 border-white/10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/groups" className="link-interactive flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white">
            <Home className="h-4 w-4" /> Volver a mis equipos
          </Link>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-pitch-green">{modality}</p>
        <h1 className="mt-2 font-headline text-4xl font-black italic uppercase leading-none text-white text-glow-green text-balance">{groupName}</h1>

        {showAdminPendingBanner ? (
          <div className="mt-8 border border-amber-400/20 bg-amber-400/5 p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Admin</p>
            <h2 className="mt-1 font-headline text-xl font-black italic uppercase text-white">Tenés {adminPendingTotal} pendientes</h2>
            <a
              href="./admin-tasks"
              className="btn-interactive mt-4 inline-flex min-h-12 items-center justify-center bg-amber-400 px-6 py-2 font-headline text-sm font-bold uppercase text-black hover:bg-amber-300"
            >
              Ver ahora
            </a>
          </div>
        ) : null}

        {userRole === 'admin' || userRole === 'owner' ? (
          <div className="animate-stagger mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href={`/groups/${groupId}/admin-tasks`}
              className="btn-interactive flex min-h-12 items-center justify-center border border-white/10 bg-black/30 px-4 font-headline text-sm font-bold uppercase italic text-white hover:border-white/30 hover:bg-white/10"
            >
              Pendientes
            </Link>
            <Link
              href={`/groups/${groupId}/settings/owners`}
              className="btn-interactive flex min-h-12 items-center justify-center bg-pitch-green px-4 font-headline text-sm font-bold uppercase italic text-black hover:brightness-110"
            >
              Owners
            </Link>
            <Link
              href={`/groups/${groupId}/settings/recurring`}
              className="btn-interactive flex min-h-12 items-center justify-center border border-white/10 bg-black/30 px-4 font-headline text-sm font-bold uppercase italic text-white hover:border-white/30 hover:bg-white/10"
            >
              Fijo
            </Link>
            <Link
              href={`/groups/${groupId}/players`}
              className="btn-interactive flex min-h-12 items-center justify-center border border-white/10 bg-black/30 px-4 font-headline text-sm font-bold uppercase italic text-white hover:border-white/30 hover:bg-white/10"
            >
              Jugadores
            </Link>
          </div>
        ) : null}

        <div className="mt-10">
          {hasClosestMatch ? (
            <>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Próximo partido</p>
              <Link
                href={`/groups/${groupId}/events/${closestMatch.id}`}
                className="btn-interactive mt-3 flex min-h-14 w-full items-center justify-between border border-white/10 bg-black/30 px-5 py-4 hover:border-white/30 hover:bg-white/5"
              >
                <div>
                  <p className="font-headline text-lg font-black italic uppercase leading-none text-white">
                    {new Date(closestMatch.scheduledAt).toLocaleDateString('es-AR')}
                  </p>
                  <p className="mt-1 font-mono text-[10px] font-bold uppercase text-white/50">
                    {new Date(closestMatch.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-pitch-green" />
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 border border-dashed border-white/10 bg-white/[0.02] py-8">
              <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/5">
                <span className="font-headline text-lg font-black italic text-white/30">!</span>
              </div>
              <div className="text-center">
                <p className="font-headline text-lg font-black italic uppercase text-white/40">
                  No hay partidos programados
                </p>
                {isAdminOrOwner ? (
                  <p className="mt-1 font-mono text-[10px] text-white/30">
                    Creá el primero para arrancar la temporada
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-[10px] text-white/30">
                    Esperá a que el dueño del grupo cree un partido
                  </p>
                )}
              </div>
            </div>
          )}

          {isAdminOrOwner ? (
            <Link
              href={`/groups/${groupId}/events/new`}
              className="btn-interactive mt-4 flex min-h-14 w-full items-center justify-center bg-pitch-green px-6 font-headline text-sm font-black italic uppercase text-white hover:brightness-110"
            >
              + Crear partido
            </Link>
          ) : null}
        </div>

        {matchesToday.length > 0 && (
          <div className="mt-6">
            <h3 className="font-headline text-xl font-black italic uppercase leading-none text-white/80">Más partidos hoy</h3>
            <ul className="mt-3 space-y-2">
              {matchesToday.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/groups/${groupId}/events/${match.id}`}
                    className="btn-interactive flex min-h-11 items-center justify-between border border-white/10 bg-black/20 px-4 py-3 text-white/60 hover:border-white/30 hover:bg-white/5 hover:text-white/80"
                  >
                    <p className="font-headline text-base font-medium leading-relaxed">
                      A las{' '}
                      {new Date(match.scheduledAt).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <ArrowRight className="h-4 w-4 text-white/30" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recentPlayedEvents.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-headline text-2xl font-black italic uppercase leading-none text-white">Últimos partidos</h2>
            <ul className="mt-4 space-y-3">
              {recentPlayedEvents.map((event) => (
                <li key={event.id} className="border border-white/10 bg-black/30 p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
                    {event.playedAtLabel}
                  </p>
                  <p className="mt-2 font-headline text-lg font-black italic uppercase text-white">{event.fieldName}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {event.teamAName} {event.teamAScore} - {event.teamBScore} {event.teamBName}
                  </p>
                  {event.mvpName ? <p className="mt-2 text-sm text-amber-300">🏆 {event.mvpName} fue la figura.</p> : null}
                  {event.boostsLine ? <p className="mt-1 text-sm text-emerald-300">📈 {event.boostsLine}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-10">
            <h2 className="font-headline text-2xl font-black italic uppercase leading-none text-white">Últimos partidos</h2>
            <div className="mt-4 flex flex-col items-center gap-3 border border-dashed border-white/5 bg-white/[0.01] py-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                Todavía no se jugó ningún partido
              </p>
            </div>
          </div>
        )}

        {shareablePlayer ? (
          <>
            <PlayerCardSharePanel groupName={groupName} player={shareablePlayer} />
            {currentPlayerId ? (
              <Link
                href={`/groups/${groupId}/players/${currentPlayerId}`}
                className="btn-interactive mt-3 flex min-h-12 w-full items-center justify-center border border-white/20 px-6 font-headline text-sm font-bold italic uppercase text-white/70 hover:border-white/40 hover:bg-white/5 hover:text-white"
              >
                Ver / editar mi carta
              </Link>
            ) : null}
          </>
        ) : null}

        <div className="mt-10 border-t border-white/10 pt-8">
          <h2 className="font-headline text-2xl font-black italic uppercase leading-none text-white">Sumá a tus jugadores</h2>
          <p className="mt-3 font-headline text-base font-medium leading-relaxed text-white/60">
            Compartí este link en el grupo de WhatsApp y los que entren ya están adentro.
          </p>
          <div className="mt-4 space-y-3">
            <InviteShareButton inviteCode={inviteCode} />
            <AppShareButton />
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <h2 className="font-headline text-2xl font-black italic uppercase leading-none text-white">Bancá la parada</h2>
          <p className="mt-3 font-mono text-xs text-white/50 leading-relaxed">
            Si la app te sirve para organizar los partidos sin el quilombo de WhatsApp, bancá los servidores con lo que puedas.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <CopyAliasButton />
          </div>
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
