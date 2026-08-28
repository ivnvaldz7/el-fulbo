'use client';

import { CalendarDays, MapPin, Users } from 'lucide-react';
import type { AttendanceStatus, Event } from '@/lib/types';
import type {
  CurrentPlayerAttendanceContext,
  EventAttendee,
  PendingConfirmationPlayer,
} from '@/lib/services/events.service';
import EventAttendeesList from '@/components/event-attendees-list/event-attendees-list';

const ATTENDANCE_OPTIONS: Array<{ value: AttendanceStatus; label: string; selectedClass: string }> =
  [
    { value: 'going', label: 'Voy', selectedClass: 'border-pitch-green bg-pitch-green text-black' },
    { value: 'not_going', label: 'No voy', selectedClass: 'border-white bg-white text-black' },
    { value: 'maybe', label: 'Tal vez', selectedClass: 'border-amber-400 bg-amber-400 text-black' },
  ];

function canEditAttendance(status: Event['status']) {
  return status === 'scheduled' || status === 'confirming';
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: Event['status']) {
  return (
    {
      scheduled: 'Agendado',
      confirming: 'Confirmando',
      checked_in: 'Check-in abierto',
      drawn: 'Equipos sorteados',
      played: 'Jugado',
      cancelled: 'Cancelado',
    } satisfies Record<Event['status'], string>
  )[status];
}

interface SharedAttendancePanelProps {
  event: Event;
  groupName: string;
  attendees: EventAttendee[];
  pendingConfirmationPlayers: PendingConfirmationPlayer[];
  currentPlayer: CurrentPlayerAttendanceContext | null;
  saving: boolean;
  onAttendanceChange: (status: AttendanceStatus) => void;
}

export function SharedAttendancePanel({
  event,
  groupName,
  attendees,
  pendingConfirmationPlayers,
  currentPlayer,
  saving,
  onAttendanceChange,
}: SharedAttendancePanelProps) {
  const selectedStatus = currentPlayer?.attendanceStatus ?? null;
  const attendanceLocked = !canEditAttendance(event.status);
  const attendanceDisabled =
    saving ||
    attendanceLocked ||
    !currentPlayer ||
    currentPlayer.statsStatus === 'pending_approval';
  const goingCount = attendees.filter((attendee) => attendee.status === 'going').length;
  const notGoingCount = attendees.filter((attendee) => attendee.status === 'not_going').length;

  return (
    <div className="space-y-4">
      <header className="border border-white/10 bg-concrete-overlay p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Convocatoria compartida
        </p>
        <h1 className="mt-2 font-headline text-3xl font-black italic uppercase tracking-tight text-white">
          {groupName}
        </h1>
        <div className="mt-4 space-y-2 text-sm text-white/80">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-pitch-green" aria-hidden="true" />
            <span>{event.field_name}</span>
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-pitch-green" aria-hidden="true" />
            <span className="capitalize">{formatEventDate(event.scheduled_at)}</span>
            <span className="text-white/40">·</span>
            <span>{formatEventTime(event.scheduled_at)}</span>
          </p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
            {event.modality} · {statusLabel(event.status)}
          </p>
        </div>
      </header>

      <section className="border border-white/10 bg-concrete-overlay p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
              Estado en vivo
            </p>
            <h2 className="mt-1 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
              ¿Quién juega?
            </h2>
          </div>
          <Users className="h-6 w-6 text-pitch-green" aria-hidden="true" />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="border border-pitch-green/30 bg-pitch-green/10 p-3 text-center">
            <p className="font-headline text-2xl font-black text-pitch-green">{goingCount}</p>
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/60">
              Van
            </p>
          </div>
          <div className="border border-red-400/30 bg-red-400/10 p-3 text-center">
            <p className="font-headline text-2xl font-black text-red-300">{notGoingCount}</p>
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/60">
              No van
            </p>
          </div>
          <div className="border border-amber-400/30 bg-amber-400/10 p-3 text-center">
            <p className="font-headline text-2xl font-black text-amber-300">
              {pendingConfirmationPlayers.length}
            </p>
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/60">
              Faltan
            </p>
          </div>
        </div>

        <div className="mt-5">
          <EventAttendeesList
            attendees={attendees}
            pendingConfirmationPlayers={pendingConfirmationPlayers}
            showWaitlist
            defaultOpen
          />
        </div>
      </section>

      <section className="border border-white/10 bg-concrete-overlay p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Tu respuesta
        </p>
        <p className="mt-2 text-sm text-white/60">
          {attendanceLocked
            ? 'La convocatoria ya está cerrada para nuevas respuestas.'
            : currentPlayer?.statsStatus === 'pending_approval'
              ? 'Esperá que aprueben tu carta para confirmar.'
              : 'Actualizá tu estado directamente desde este enlace.'}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {ATTENDANCE_OPTIONS.map((option) => {
            const isGoing = option.value === 'going';
            const selected =
              selectedStatus === option.value || (isGoing && selectedStatus === 'waitlist');
            const label = selectedStatus === 'waitlist' && isGoing ? 'En espera' : option.label;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onAttendanceChange(option.value)}
                disabled={attendanceDisabled || (selectedStatus === 'waitlist' && isGoing)}
                className={`min-h-12 rounded-lg border px-2 py-3 font-headline text-sm font-bold italic uppercase tracking-tight transition ${
                  selected
                    ? option.selectedClass
                    : 'border-white/10 bg-white/[0.04] text-white hover:border-white/30'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
