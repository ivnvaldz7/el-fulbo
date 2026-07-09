'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import EventAttendeesList from '@/components/event-attendees-list/event-attendees-list';
import { ShareMatchSummaryButton } from '@/components/share/share-match-summary-button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { PageContent } from '@/components/ui/page-content';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';
import { MvpVotingPanel } from '@/components/events/mvp-voting-panel';
import { MvpAdminPanel } from '@/components/events/mvp-admin-panel';
import { ShareEventButton } from '@/components/events/share-event-button';
import { PushOptinBanner } from '@/components/notifications/push-optin-banner';
import { AttendanceConfirmationOverlay } from '@/components/events/attendance-confirmation-overlay';
import { MvpVotingOverlay } from '@/components/events/mvp-voting-overlay';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { AttendanceStatus, Event, EventId, EventStatus, GroupId } from '@/lib/types';
import {
  type CurrentPlayerAttendanceContext,
  type EventAttendee,
  type PlayedMatchSummaryItem,
  EventsService,
} from '@/lib/services/events.service';
import { routes } from '@/lib/routes';

const ATTENDANCE_OPTIONS: Array<{ value: AttendanceStatus; label: string; accent: string }> = [
  { value: 'going', label: 'Voy', accent: 'bg-emerald-500 text-black' },
  { value: 'not_going', label: 'No voy', accent: 'bg-zinc-100 text-black' },
  { value: 'maybe', label: 'Tal vez', accent: 'bg-amber-400 text-black' },
];

function canEditAttendance(status: EventStatus) {
  return status === 'scheduled' || status === 'confirming';
}

function canOpenCheckIn(status: EventStatus, scheduledAt: string) {
  const hoursToEvent = (new Date(scheduledAt).getTime() - Date.now()) / 36e5;
  return (status === 'scheduled' || status === 'confirming' || status === 'checked_in') && hoursToEvent <= 4;
}

function helperCopy(
  eventStatus: EventStatus,
  currentPlayer: CurrentPlayerAttendanceContext | null,
  selectedStatus: AttendanceStatus | null,
) {
  if (!currentPlayer) {
    return 'Necesitás estar logueado y ser jugador del grupo para confirmar.';
  }

  if (currentPlayer.statsStatus === 'pending_approval') {
    return 'Esperá que aprueben tu carta para confirmar.';
  }

  if (!canEditAttendance(eventStatus)) {
    return 'El partido ya arrancó el check-in. No podés cambiar tu respuesta.';
  }

  if (!selectedStatus) {
    return 'Tocá para confirmar.';
  }

  switch (selectedStatus) {
    case 'going':
      return 'Quedaste marcado como disponible para jugar.';
    case 'not_going':
      return 'Avisaste que no llegás al partido.';
    case 'maybe':
      return 'Quedaste en duda. Podés cambiarlo cuando quieras antes del check-in.';
    case 'waitlist':
      return 'Estás en lista de espera. Si se baja alguien, entrás.';
  }
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventViewPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as GroupId;
  const eventId = params.event_id as EventId;

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const eventsService = useMemo(() => new EventsService(supabase), [supabase]);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const overlayConfirmar = searchParams.get('confirmar');
  const overlayVotarMvp = searchParams.get('votar-mvp');
  const [overlayClosed, setOverlayClosed] = useState(false);

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const eventResult = await eventsService.getEventById(eventId);
      if (!eventResult.ok) throw new Error(eventResult.error.message);
      const eventData = eventResult.data;

      const [attendeesResult, playerResult, adminResult, groupResponse] = await Promise.all([
        eventsService.getEventAttendees(eventId),
        eventsService.getCurrentPlayerAttendanceContext(eventData.group_id, eventId),
        eventsService.isCurrentUserAdminOrOwner(eventData.group_id),
        supabase.from('groups').select('name').eq('id', eventData.group_id).single(),
      ]);

      if (!attendeesResult.ok) throw new Error(attendeesResult.error.message);
      if (!playerResult.ok) throw new Error(playerResult.error.message);
      if (!adminResult.ok) throw new Error(adminResult.error.message);

      let playedSummary: PlayedMatchSummaryItem[] = [];
      let hasVotedForMvp = false;

      if (eventData.status === 'played') {
        const summaryResult = await eventsService.getPlayedMatchSummary(eventId);
        if (!summaryResult.ok) throw new Error(summaryResult.error.message);
        playedSummary = summaryResult.data;

        if (playerResult.data && !eventData.mvp_player_id) {
          const { data: vote } = await supabase
            .from('event_mvp_votes')
            .select('voter_player_id')
            .eq('event_id', eventId)
            .eq('voter_player_id', playerResult.data.playerId)
            .maybeSingle();
          hasVotedForMvp = !!vote;
        }
      }

      return {
        event: eventData,
        groupName: groupResponse.data?.name ?? 'El Fulbo',
        attendees: attendeesResult.data,
        currentPlayer: playerResult.data,
        isAdminOrOwner: adminResult.data,
        playedSummary,
        hasVotedForMvp,
      };
    },
  });

  const event = data?.event ?? null;
  const groupName = data?.groupName ?? 'El Fulbo';
  const attendees = data?.attendees ?? [];
  const currentPlayer = data?.currentPlayer ?? null;
  const playedSummary = data?.playedSummary ?? [];
  const isAdminOrOwner = data?.isAdminOrOwner ?? false;
  const hasVotedForMvp = data?.hasVotedForMvp ?? false;
  const selectedStatus = currentPlayer?.attendanceStatus ?? null;

  const [savingAttendance, setSavingAttendance] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [is24hPassed, setIs24hPassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (event?.played_at || event?.scheduled_at) {
        const targetTime = new Date(event.played_at ?? event.scheduled_at).getTime() + 24 * 60 * 60 * 1000;
        setIs24hPassed(Date.now() > targetTime);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [event?.played_at, event?.scheduled_at]);

  useEffect(() => {
    const channel = supabase
      .channel(`event-attendance:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendances',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, queryClient, supabase]);

  async function handleAttendanceChange(nextStatus: AttendanceStatus) {
    if (!event || !currentPlayer) {
      return;
    }

    if (currentPlayer.statsStatus === 'pending_approval' || !canEditAttendance(event.status)) {
      return;
    }

    const previousData = queryClient.getQueryData(['event', eventId]);

    const optimisticAttendee: EventAttendee = {
      playerId: currentPlayer.playerId,
      userId: currentPlayer.userId,
      displayName: currentPlayer.displayName,
      photoUrl: null,
      joinedAt: null,
      primaryPosition: null,
      status: nextStatus,
      checkedIn: false,
      checkedInAt: null,
      statsStatus: currentPlayer.statsStatus,
      isPhantom: false,
    };

    setSavingAttendance(true);

    queryClient.setQueryData(['event', eventId], (oldData: any) => {
      if (!oldData) return oldData;
      
      const current = oldData.attendees as EventAttendee[];
      const existingIndex = current.findIndex((attendee) => attendee.playerId === currentPlayer.playerId);
      const newAttendees = existingIndex === -1 
        ? [...current, optimisticAttendee]
        : current.map((attendee) =>
            attendee.playerId === currentPlayer.playerId
              ? { ...attendee, status: nextStatus, checkedIn: false, checkedInAt: null }
              : attendee
          );

      return {
        ...oldData,
        currentPlayer: { ...oldData.currentPlayer, attendanceStatus: nextStatus },
        attendees: newAttendees,
      };
    });

    try {
      const result = await eventsService.updateAttendance({
        p_event_id: event.id,
        p_status: nextStatus,
      });
      if (!result.ok) throw new Error(result.error.message);

      toast.success('Guardamos tu respuesta.');
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    } catch (updateError: any) {
      console.error(updateError);
      queryClient.setQueryData(['event', eventId], previousData);
      toast.error(updateError?.message ?? 'No pudimos guardar tu respuesta, reintentá.');
    } finally {
      setSavingAttendance(false);
    }
  }

  async function handleConfirmCancellation(motive?: string) {
    if (!event) {
      return;
    }

    try {
      setSavingAttendance(true);
      const result = await eventsService.cancelEvent({
        p_event_id: event.id,
        p_motive: motive ?? null,
      });
      if (!result.ok) throw new Error(result.error.message);

      toast.success('Partido cancelado.');
      window.location.href = routes.groupDashboard(groupId);
    } catch (cancelError) {
      console.error(cancelError);
      toast.error('No pudimos cancelar el partido.');
    } finally {
      setSavingAttendance(false);
      setShowCancelModal(false);
    }
  }

  if (loading) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto text-center">
        <div className="mx-auto h-12 w-12 animate-spin border-4 border-pitch-green border-t-transparent" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Cargando evento
        </p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
          Recuperando detalles del partido...
        </h2>
      </ImmersiveScreen>
    );
  }

  if (error || !event) {
    return (
      <ImmersiveScreen align="center" contentClassName="max-w-md mx-auto">
        <div className="border border-red-500/30 bg-red-500/10 p-5 text-center text-red-100">
          {error instanceof Error ? error.message : 'No se pudo cargar el partido.'}
        </div>
      </ImmersiveScreen>
    );
  }

  const attendanceLocked = !canEditAttendance(event.status);
  const showAttendanceSummary = event.status !== 'played' && event.status !== 'cancelled';
  const attendanceDisabled =
    savingAttendance ||
    attendanceLocked ||
    !currentPlayer ||
    currentPlayer.statsStatus === 'pending_approval';
  const mvp = playedSummary.find((item) => item.isMvp) ?? null;
  const boostsApplied = playedSummary.filter((item) => item.boostApplied);

  return (
    <ImmersiveScreen>
      <PageContent className="max-w-md">
        <PageHeader title="PARTIDO" backHref={routes.groupDashboard(groupId)} />
        {overlayConfirmar === eventId && !overlayClosed ? (
          <AttendanceConfirmationOverlay
            eventId={eventId}
            onClose={() => setOverlayClosed(true)}
          />
        ) : null}

        {overlayVotarMvp === eventId && !overlayClosed && event.status === 'played' ? (
          <MvpVotingOverlay
            eventId={eventId}
            currentPlayerId={currentPlayer?.playerId ?? null}
            playedSummary={playedSummary}
            hasVoted={hasVotedForMvp}
            isVotingClosed={!!event.mvp_player_id}
            homeHref={routes.groupDashboard(groupId)}
            onClose={() => setOverlayClosed(true)}
            onVoteSubmitted={() => {
              void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
              setOverlayClosed(true);
            }}
          />
        ) : null}

        {showCancelModal ? (
          <ConfirmationModal
            title="Confirmar cancelación"
            message="¿Seguro que querés cancelar este partido?"
            onConfirm={handleConfirmCancellation}
            onCancel={() => setShowCancelModal(false)}
            loading={savingAttendance}
            showMotiveField
          />
        ) : null}

        <div className="space-y-4">
        <header className="border border-white/10 bg-concrete-overlay p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            Partido
          </p>
          <h1 className="mt-2 font-headline text-3xl font-black italic uppercase tracking-tight text-white">
            {event.field_name}
          </h1>
          <div className="mt-4 space-y-2 text-sm text-white/80">
            <p>
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Fecha:</span>{' '}
              {formatEventDate(event.scheduled_at)}
            </p>
            <p>
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Hora:</span>{' '}
              {formatEventTime(event.scheduled_at)}
            </p>
            <p>
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Modalidad:</span>{' '}
              {event.modality}
            </p>
            <p>
              <span className="font-mono text-[10px] font-bold uppercase text-white/50">Estado:</span>{' '}
              {({ scheduled: 'Agendado', confirming: 'Confirmando', checked_in: 'Check-in abierto', drawn: 'Equipos sorteados', played: 'Jugado', cancelled: 'Cancelado' } as Record<string, string>)[event.status] ?? event.status}
            </p>
            {event.field_maps_url ? (
              <p>
                <span className="font-mono text-[10px] font-bold uppercase text-white/50">Maps:</span>{' '}
                <a
                  href={event.field_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-pitch-green underline"
                >
                  Ver ubicación
                </a>
              </p>
            ) : null}
            {event.notes ? (
              <p>
                <span className="font-mono text-[10px] font-bold uppercase text-white/50">Notas:</span>{' '}
                {event.notes}
              </p>
            ) : null}
          </div>
        </header>

        {showAttendanceSummary ? (
        <section className="border border-white/10 bg-concrete-overlay p-5">
          <div className="mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
              Confirmación
            </p>
            <h2 className="mt-1 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
              ¿Vas?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {helperCopy(event.status, currentPlayer, selectedStatus)}
            </p>
          </div>

          {(selectedStatus === 'going' || selectedStatus === 'maybe' || selectedStatus === 'waitlist') && (
            <div className="mb-4">
              <PushOptinBanner />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {ATTENDANCE_OPTIONS.map((option) => {
              const isGoingButton = option.value === 'going';
              const selected = selectedStatus === option.value || (isGoingButton && selectedStatus === 'waitlist');
              const accentClass = selectedStatus === 'waitlist' && isGoingButton ? 'bg-purple-500 text-white' : option.accent;
              const label = selectedStatus === 'waitlist' && isGoingButton ? 'En Espera' : option.label;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void handleAttendanceChange(option.value)}
                  disabled={attendanceDisabled || (selectedStatus === 'waitlist' && isGoingButton)}
                  className={`rounded-lg border px-3 py-4 font-headline text-lg font-bold italic uppercase tracking-tight transition ${
                    selected
                      ? `${accentClass} border-transparent`
                      : 'border-white/10 bg-white/[0.04] text-white hover:border-white/20'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <ShareEventButton
            groupId={groupId}
            eventId={eventId}
            eventName={event.field_name}
          />
        </section>
        ) : null}

        {showAttendanceSummary ? (
        <section className="border border-white/10 bg-concrete-overlay p-5">
          <div className="mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
              Lista en vivo
            </p>
            <h2 className="mt-1 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
              Asistencia
            </h2>
          </div>

          <EventAttendeesList attendees={attendees} />
        </section>
        ) : null}

        {event.status === 'drawn' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push(routes.groupEventTeams(groupId, eventId))}
              className="w-full rounded-lg bg-pitch-green px-4 py-4 font-headline text-xl font-black italic uppercase text-black"
            >
              Ver equipos
            </button>
            {isAdminOrOwner ? (
              <button
                type="button"
                onClick={() => router.push(routes.groupEventResult(groupId, eventId))}
                className="w-full rounded-lg bg-amber-400 px-4 py-4 font-headline text-xl font-black italic uppercase text-black"
              >
                Cargar resultado
              </button>
            ) : null}
          </div>
        ) : null}

        {event.status === 'played' ? (
          <section className="space-y-4 border border-white/10 bg-concrete-overlay p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Resultado final</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-headline text-xl font-black italic uppercase">{event.team_a_name ?? 'Equipo A'}</p>
                <p className="mt-1 text-3xl font-black">{event.team_a_score ?? 0}</p>
              </div>
              <span className="text-2xl font-black text-white/50">-</span>
              <div className="text-right">
                <p className="font-headline text-xl font-black italic uppercase">{event.team_b_name ?? 'Equipo B'}</p>
                <p className="mt-1 text-3xl font-black">{event.team_b_score ?? 0}</p>
              </div>
            </div>
            {event.notes ? <p className="mt-4 text-sm text-white/70">{event.notes}</p> : null}
            {mvp ? (
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">MVP</p>
                <h3 className="mt-2 font-headline text-2xl font-black italic uppercase text-white">{mvp.displayName}</h3>
                <p className="mt-1 text-sm text-white/65">
                  {mvp.team === 'A' ? event.team_a_name ?? 'Equipo A' : event.team_b_name ?? 'Equipo B'} ·{' '}
                  {mvp.assignedPosition ?? 'SIN POS'}
                </p>
              </div>
            ) : event.status === 'played' && !event.mvp_player_id ? (
              <>
                {isAdminOrOwner ? (
                  <>
                    <MvpAdminPanel eventId={event.id} playedSummary={playedSummary} />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `${window.location.origin}${routes.groupEventMvpVote(groupId, eventId)}`,
                        );
                        toast.success('Link de votación MVP copiado.');
                      }}
                      className="w-full rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 font-headline text-base font-bold italic uppercase tracking-tight text-amber-300 transition hover:bg-amber-400/20 active:scale-[0.98]"
                    >
                      Compartir votación MVP
                    </button>
                  </>
                ) : null}

                {hasVotedForMvp ? (
                  <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/5 p-4 text-center">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Voto registrado</p>
                    <p className="mt-2 text-sm text-white/60">Tu voto ya quedó guardado. Cuando se cierre la votación vas a poder ver el resultado.</p>
                    <button
                      type="button"
                      onClick={() => router.push(routes.groupDashboard(groupId))}
                      className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-3 font-headline text-base font-black italic uppercase text-black transition-transform active:scale-[0.98]"
                    >
                      Volver al inicio
                    </button>
                  </div>
                ) : is24hPassed ? (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-center mt-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Votación cerrada</p>
                    <p className="mt-2 text-sm text-white/60">Pasaron las 24 horas y se cerró la votación.</p>
                  </div>
                ) : (
                  <div className="mt-4">
                    <MvpVotingPanel
                      eventId={event.id}
                      currentPlayerId={currentPlayer?.playerId ?? null}
                      playedSummary={playedSummary}
                      onVoteSubmitted={() => {
                        void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
                      }}
                    />
                  </div>
                )}
              </>
            ) : null}

            {boostsApplied.length > 0 ? (
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
                  Boosts aplicados
                </p>
                <ul className="mt-3 space-y-3">
                  {boostsApplied.map((item) => (
                    <li key={item.playerId} className="border border-white/10 px-3 py-3">
                      <p className="font-semibold text-white">{item.displayName}</p>
                      <p className="mt-1 text-sm text-white/70">
                        {Object.entries(item.boostApplied ?? {})
                          .map(([stat, delta]) => `${stat.toUpperCase()} +${delta}`)
                          .join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {playedSummary.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {(['A', 'B'] as const).map((teamKey) => {
                  const teamName = teamKey === 'A' ? event.team_a_name ?? 'Equipo A' : event.team_b_name ?? 'Equipo B';
                  const players = playedSummary.filter((item) => item.team === teamKey);
                  return (
                    <div key={teamKey} className="border border-white/10 bg-white/[0.03] p-4">
                      <p className="font-headline text-xl font-black italic uppercase text-white">{teamName}</p>
                      <ul className="mt-3 space-y-2 text-sm text-white/75">
                        {players.map((item) => (
                          <li key={item.playerId}>
                            {item.displayName} · {item.assignedPosition ?? 'SIN POS'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <ShareMatchSummaryButton
              groupName={groupName}
              fieldName={event.field_name}
              playedAtLabel={formatEventDate(event.played_at ?? event.scheduled_at)}
              teamAName={event.team_a_name ?? 'Equipo A'}
              teamBName={event.team_b_name ?? 'Equipo B'}
              teamAScore={event.team_a_score ?? 0}
              teamBScore={event.team_b_score ?? 0}
              mvpName={mvp?.displayName ?? null}
              boostsApplied={boostsApplied}
            />
          </section>
        ) : null}

        {isAdminOrOwner && event.status !== 'cancelled' && event.status !== 'played' ? (
          <>
            {event.status === 'confirming' ? (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/groups/${groupId}/events/${eventId}?confirmar=${eventId}`,
                  );
                  toast.success('Link de confirmación copiado.');
                }}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-4 font-headline text-lg font-bold italic uppercase tracking-tight text-white transition hover:border-white/20 active:scale-[0.98]"
              >
                Copiar link de confirmación
              </button>
            ) : null}
            <div className={`grid gap-3 pt-2 ${canOpenCheckIn(event.status, event.scheduled_at) ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {canOpenCheckIn(event.status, event.scheduled_at) ? (
                <button
                  type="button"
                  onClick={() => router.push(routes.groupEventCheckIn(groupId, eventId))}
                  className="h-12 rounded-lg bg-emerald-500 font-headline text-lg font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95"
                >
                  Check-in
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => router.push(routes.groupEventEdit(groupId, eventId))}
                className="h-12 rounded-lg bg-blue-600 font-headline text-lg font-bold italic uppercase tracking-tight text-white transition-transform active:scale-95"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="h-12 rounded-lg bg-red-600 font-headline text-lg font-bold italic uppercase tracking-tight text-white transition-transform active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : null}
        </div>
      </PageContent>
    </ImmersiveScreen>
  );
}

