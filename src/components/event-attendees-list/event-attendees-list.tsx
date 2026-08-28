'use client';

import { memo } from 'react';
import type { AttendanceStatus } from '@/lib/types';
import type { EventAttendee, PendingConfirmationPlayer } from '@/lib/services/events.service';

interface EventAttendeesListProps {
  attendees: EventAttendee[];
  pendingConfirmationPlayers?: PendingConfirmationPlayer[];
  showWaitlist?: boolean;
  defaultOpen?: boolean;
}

const SECTIONS: Array<{
  status: AttendanceStatus;
  label: string;
  empty: string;
  tone: string;
  titleTone: string;
}> = [
  {
    status: 'going',
    label: 'Van',
    empty: 'Todavía nadie confirmó que va.',
    tone: 'border-pitch-green/40 bg-pitch-green/10',
    titleTone: 'text-pitch-green',
  },
  {
    status: 'not_going',
    label: 'No van',
    empty: 'Todavía nadie avisó que no va.',
    tone: 'border-red-500/40 bg-red-500/10',
    titleTone: 'text-red-300',
  },
  {
    status: 'maybe',
    label: 'Tal vez',
    empty: 'No hay respuestas en duda por ahora.',
    tone: 'border-amber-400/40 bg-amber-400/10',
    titleTone: 'text-amber-300',
  },
];

const WAITLIST_SECTION = {
  status: 'waitlist' as const,
  label: 'Lista de espera',
  empty: 'No hay jugadores en lista de espera.',
  tone: 'border-purple-400/40 bg-purple-400/10',
  titleTone: 'text-purple-300',
};

const EventAttendeesList = memo(function EventAttendeesList({
  attendees,
  pendingConfirmationPlayers = [],
  showWaitlist = false,
  defaultOpen = false,
}: EventAttendeesListProps) {
  const sections = showWaitlist
    ? SECTIONS.reduce<Array<(typeof SECTIONS)[number] | typeof WAITLIST_SECTION>>(
        (result, section) => {
          result.push(section);
          if (section.status === 'going') {
            result.push(WAITLIST_SECTION);
          }
          return result;
        },
        [],
      )
    : SECTIONS;

  return (
    <div className="space-y-3">
      <details open={defaultOpen} className="overflow-hidden rounded-lg border border-amber-400/40 bg-amber-400/10">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="font-headline text-lg font-bold italic uppercase text-amber-300">
            Faltan confirmar: {pendingConfirmationPlayers.length}
          </span>
        </summary>

        <div className="border-t border-white/10">
          {pendingConfirmationPlayers.length === 0 ? (
            <p className="px-4 py-4 text-sm text-white/60">Todos los jugadores aprobados ya respondieron.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {pendingConfirmationPlayers.map((player) => (
                <li key={player.playerId} className="px-4 py-3">
                  <span className="block truncate text-sm font-medium text-white">{player.displayName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {sections.map((section) => {
        const items = attendees.filter((attendee) => attendee.status === section.status);

        return (
          <details
            key={section.status}
            open={defaultOpen}
            className={`overflow-hidden rounded-lg border ${section.tone}`}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <span className={`font-headline text-lg font-bold italic uppercase ${section.titleTone}`}>
                {section.label}: {items.length}
              </span>
            </summary>

            <div className="border-t border-white/10">
              {items.length === 0 ? (
                <p className="px-4 py-4 text-sm text-white/60">{section.empty}</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {items.map((attendee) => (
                    <li key={attendee.playerId} className="px-4 py-3">
                      <span className="block truncate text-sm font-medium text-white">
                        {attendee.displayName}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </details>
      );
    })}
    </div>
  );
});

export default EventAttendeesList;
