'use client';

import { memo } from 'react';
import type { AttendanceStatus } from '@/lib/types';
import type { EventAttendee } from '@/lib/services/events.service';

interface EventAttendeesListProps {
  attendees: EventAttendee[];
}

const SECTIONS: Array<{ status: AttendanceStatus; label: string; empty: string }> = [
  { status: 'going', label: 'Van', empty: 'Todavía nadie confirmó que va.' },
  { status: 'waitlist', label: 'Lista de Espera', empty: 'No hay nadie en espera por ahora.' },
  { status: 'not_going', label: 'No van', empty: 'Todavía nadie avisó que no va.' },
  { status: 'maybe', label: 'Tal vez', empty: 'No hay respuestas en duda por ahora.' },
];

function statusLabel(attendee: EventAttendee) {
  if (attendee.checkedIn) {
    return 'Presente';
  }

  switch (attendee.status) {
    case 'going':
      return 'Voy';
    case 'not_going':
      return 'No voy';
    case 'maybe':
      return 'Tal vez';
    case 'waitlist':
      return 'En Espera';
  }
}

function statusClasses(attendee: EventAttendee) {
  if (attendee.checkedIn) {
    return 'bg-sky-500/20 text-sky-200 border-sky-400/30';
  }

  switch (attendee.status) {
    case 'going':
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30';
    case 'not_going':
      return 'bg-zinc-500/20 text-zinc-200 border-zinc-400/30';
    case 'maybe':
      return 'bg-amber-500/20 text-amber-200 border-amber-400/30';
    case 'waitlist':
      return 'bg-purple-500/20 text-purple-200 border-purple-400/30';
  }
}

function Avatar({ attendee }: { attendee: EventAttendee }) {
  if (attendee.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attendee.photoUrl}
        alt={attendee.displayName}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-mono text-xs font-bold uppercase text-pitch-green ring-1 ring-white/10">
      {attendee.displayName.slice(0, 2)}
    </div>
  );
}

const EventAttendeesList = memo(function EventAttendeesList({ attendees }: EventAttendeesListProps) {
  return (
    <div className="space-y-3">
      {SECTIONS.map((section) => {
        const items = attendees.filter((attendee) => attendee.status === section.status);

        return (
          <details
            key={section.status}
            className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <span className="font-headline text-lg font-bold italic uppercase text-white">
                {section.label}: {items.length}
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                Ver lista
              </span>
            </summary>

            <div className="border-t border-white/10">
              {items.length === 0 ? (
                <p className="px-4 py-4 text-sm text-white/60">{section.empty}</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {items.map((attendee) => (
                    <li key={attendee.playerId} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar attendee={attendee} />
                        <span className="truncate text-sm font-medium text-white">
                          {attendee.displayName}
                        </span>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${statusClasses(attendee)}`}
                      >
                        {statusLabel(attendee)}
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
