'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Home } from 'lucide-react';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PlayerCardSharePanel } from '@/components/share/player-card-share-panel';
import { InviteShareButton } from '@/components/groups/invite-share-button';
import { CopyAliasButton } from '@/components/groups/copy-alias-button';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';
import toast from 'react-hot-toast';
import { PushOptinBanner } from '@/components/notifications/push-optin-banner';

type UpcomingEvent = {
  id: string;
  scheduledAt: string;
};

type BoostItem = {
  displayName: string;
  modifiers: Array<{ stat: string; delta: number }>;
};

type RecentPlayedEvent = {
  id: string;
  fieldName: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  mvpName: string | null;
  boostsApplied: BoostItem[];
  playedAtLabel: string;
};

type CurrentMvpPlayer = {
  id: string;
  displayName: string;
  primaryPosition: PlayerPosition;
  stats: PlayerStats;
  currentBoost: CurrentBoost | null;
  photoUrl: string | null;
};

type CurrentMvp = {
  eventId: string;
  fieldName: string;
  playedAt: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  mvpPlayer: CurrentMvpPlayer | null;
} | null;

type GroupDashboardInitialStateProps = {
  groupId: string;
  groupName: string;
  modality: string;
  activePlayers: number;
  adminPendingTotal?: number;
  isAdminOrOwner: boolean;
  upcomingEvents: UpcomingEvent[];
  recentPlayedEvents?: RecentPlayedEvent[];
  currentMvp?: CurrentMvp;
  inviteCode: string;
  currentPlayerId: string | null;
  shareablePlayer?: {
    displayName: string;
    primaryPosition: PlayerPosition;
    stats: PlayerStats;
    currentBoost?: CurrentBoost | null;
    photoUrl?: string | null;
  } | null;
  statsStatus?: string | null;
};

export function GroupDashboardInitialState({
  groupId,
  groupName,
  modality,
  activePlayers,
  adminPendingTotal = 0,
  isAdminOrOwner,
  upcomingEvents,
  recentPlayedEvents = [],
  currentMvp,
  inviteCode,
  currentPlayerId,
  shareablePlayer = null,
  statsStatus = null,
}: GroupDashboardInitialStateProps) {
  const showPendingBanner = statsStatus === 'pending_approval';
  const showAdminPendingBanner = adminPendingTotal > 0;
  const hasUpcomingEvents = upcomingEvents.length > 0;

  return (
    <ImmersiveScreen contentClassName="mx-auto max-w-xl">
      <FloatingPanel className="w-full border-2 border-white/10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/groups" className="link-interactive flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white">
            <Home className="h-4 w-4" /> Volver a mis equipos
          </Link>
        </div>

        <div className="mb-6">
          <PushOptinBanner />
        </div>

        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-pitch-green">{modality}</p>
        <h1 className="mt-2 font-headline text-4xl font-black italic uppercase leading-none text-white text-glow-green text-balance">{groupName}</h1>

        {currentMvp?.mvpPlayer ? (
          <div className="mt-8 border border-amber-300/30 bg-gradient-to-br from-amber-300/10 via-black/40 to-amber-300/5 p-5 shadow-[0_0_30px_rgba(251,191,36,0.12)]">
            <div className="flex gap-6">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                  <span className="inline-block h-px w-4 bg-amber-300/50" />
                  MVP de la fecha
                  <span className="inline-block h-px w-4 bg-amber-300/50" />
                </p>
                <Link href={`/groups/${groupId}/players/${currentMvp.mvpPlayer.id}`} className="mt-3 block hover:opacity-80 transition-opacity">
                  <h2 className="truncate font-headline text-2xl font-black italic uppercase leading-none text-white">
                    {currentMvp.mvpPlayer.displayName}
                  </h2>
                </Link>
                <p className="mt-1 font-mono text-xs font-bold uppercase text-amber-300/80">
                  {currentMvp.mvpPlayer.primaryPosition} · Overall {Math.round(
                    Object.values(currentMvp.mvpPlayer.stats).reduce((a, b) => a + Number(b), 0) / 6 * 10
                  )}
                </p>
                <Link
                  href={`/groups/${groupId}/events/${currentMvp.eventId}`}
                  className="link-interactive mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-amber-300"
                >
                  {currentMvp.teamAName} {currentMvp.teamAScore} — {currentMvp.teamBScore} {currentMvp.teamBName}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <Link
                href={`/groups/${groupId}/players/${currentMvp.mvpPlayer.id}`}
                className="relative flex h-24 w-24 shrink-0 items-center justify-center border-2 border-amber-300/50 bg-amber-300/10 text-4xl font-black text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:opacity-80 transition-opacity self-center"
              >
                {currentMvp.mvpPlayer.photoUrl ? (
                  <Image
                    src={currentMvp.mvpPlayer.photoUrl}
                    alt={currentMvp.mvpPlayer.displayName}
                    fill
                    sizes="96px"
                    className="object-cover grayscale brightness-90 contrast-125"
                    crossOrigin="anonymous"
                    unoptimized
                  />
                ) : (
                  currentMvp.mvpPlayer.displayName.slice(0, 1).toUpperCase()
                )}
              </Link>
            </div>
          </div>
        ) : null}

        {showPendingBanner ? (
          <div className="mt-8 border border-amber-400/20 bg-amber-400/5 p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Carta pendiente</p>
            <h2 className="mt-1 font-headline text-xl font-black italic uppercase text-white">
              Tu carta se copió desde tu otro equipo
            </h2>
            <p className="mt-2 font-mono text-xs leading-relaxed text-white/60">
              El administrador del grupo la va a revisar. Mientras tanto, no vas a poder
              confirmar asistencia a los partidos.
            </p>
            <a
              href="./pending"
              className="btn-interactive mt-4 inline-flex min-h-12 items-center justify-center bg-amber-400 px-6 py-2 font-headline text-sm font-bold uppercase text-black hover:bg-amber-300"
            >
              Ver estado
            </a>
          </div>
        ) : null}

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

        {isAdminOrOwner ? (
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
          {hasUpcomingEvents ? (
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Próximos partidos</p>
              <ul className="mt-3 space-y-2">
                {upcomingEvents.map((event, index) => (
                  <li key={event.id}>
                    <Link
                      href={`/groups/${groupId}/events/${event.id}`}
                      className={`btn-interactive flex min-h-14 w-full items-center justify-between border px-5 py-4 transition ${
                        index === 0
                          ? 'border-pitch-green/40 bg-pitch-green/10 hover:border-pitch-green/60 hover:bg-pitch-green/15'
                          : 'border-white/10 bg-black/30 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate font-headline text-lg font-black italic uppercase leading-none ${
                            index === 0 ? 'text-white' : 'text-white/70'
                          }`}
                        >
                          {new Date(event.scheduledAt).toLocaleDateString('es-AR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                        <p className="mt-1 font-mono text-[10px] font-bold uppercase text-white/50">
                          {new Date(event.scheduledAt).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <ArrowRight className={`h-5 w-5 shrink-0 ${index === 0 ? 'text-pitch-green' : 'text-white/30'}`} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
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

        {recentPlayedEvents.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-headline text-2xl font-black italic uppercase leading-none text-white">Último partido</h2>
            <div className="mt-4 border border-white/10 bg-black/30 p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
                {recentPlayedEvents[0]!.playedAtLabel}
              </p>
              <p className="mt-2 font-headline text-lg font-black italic uppercase text-white">{recentPlayedEvents[0]!.fieldName}</p>
              <p className="mt-1 font-headline text-base font-bold italic uppercase text-white/70">
                {recentPlayedEvents[0]!.teamAScore > recentPlayedEvents[0]!.teamBScore
                  ? `Ganó ${recentPlayedEvents[0]!.teamAName}`
                  : recentPlayedEvents[0]!.teamBScore > recentPlayedEvents[0]!.teamAScore
                    ? `Ganó ${recentPlayedEvents[0]!.teamBName}`
                    : 'Empate'}
              </p>
              {recentPlayedEvents[0]!.mvpName ? (
                <p className="mt-2 text-sm text-amber-300">🏆 {recentPlayedEvents[0]!.mvpName} fue la figura.</p>
              ) : (
                <p className="mt-2 text-sm text-amber-300">🏆 Votación MVP abierta.</p>
              )}
              {recentPlayedEvents[0]!.boostsApplied.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-emerald-300">📈 Subieron de nivel:</p>
                  <ul className="space-y-0.5">
                    {recentPlayedEvents[0]!.boostsApplied.map((boost, idx) => (
                      <li key={idx} className="text-xs text-emerald-300/80">
                        {boost.displayName} —{' '}
                        {boost.modifiers
                          .map((m) => `${m.stat} +${m.delta}`)
                          .join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link
                href={`/groups/${groupId}/events/${recentPlayedEvents[0]!.id}${
                  recentPlayedEvents[0]!.mvpName ? '' : `?votar-mvp=${recentPlayedEvents[0]!.id}`
                }`}
                className="btn-interactive mt-4 flex min-h-12 w-full items-center justify-center border border-white/10 bg-white/[0.04] px-4 font-headline text-sm font-bold italic uppercase text-white hover:border-amber-300/40 hover:bg-amber-300/10 hover:text-amber-300"
              >
                {recentPlayedEvents[0]!.mvpName ? 'Ver resumen' : 'Entrar a votar / ver votos'}
              </Link>
            </div>
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

        {isAdminOrOwner ? (
          <div className="mt-10 border-t border-white/10 pt-8">
            <h2 className="font-headline text-2xl font-black italic uppercase leading-none text-white">Sumá a tus jugadores</h2>
            <p className="mt-3 font-headline text-base font-medium leading-relaxed text-white/60">
              Compartí el link o el código para que entren al grupo.
            </p>
            <div className="mt-6 space-y-3">
              <InviteShareButton inviteCode={inviteCode} />

              <div className="flex items-center gap-3 border border-white/10 bg-black/30 px-4 py-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 shrink-0">
                  Código
                </span>
                <code className="font-mono text-sm font-bold tracking-wider text-pitch-green select-all">
                  {inviteCode}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteCode);
                    toast.success('Código copiado', {
                      icon: '📋',
                      duration: 2000,
                      style: {
                        background: '#1A1A1A',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                      },
                    });
                  }}
                  className="btn-interactive ml-auto shrink-0 font-mono text-[10px] font-bold uppercase text-white/40 hover:text-white"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
