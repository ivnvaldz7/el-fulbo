import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventAttendee, PendingConfirmationPlayer } from '@/lib/services/events.service';
import EventAttendeesList from './event-attendees-list';

const baseAttendee = {
  userId: null,
  photoUrl: null,
  joinedAt: '2026-01-01T00:00:00Z',
  primaryPosition: null,
  checkedIn: false,
  checkedInAt: null,
  statsStatus: 'approved',
  isPhantom: false,
} satisfies Omit<EventAttendee, 'playerId' | 'displayName' | 'status'>;

function attendee(playerId: string, displayName: string, status: EventAttendee['status']): EventAttendee {
  return {
    ...baseAttendee,
    playerId,
    displayName,
    status,
  };
}

const pendingPlayers: PendingConfirmationPlayer[] = [
  {
    playerId: 'pending-1',
    userId: null,
    displayName: 'Mario Pendiente',
    photoUrl: null,
    joinedAt: '2026-01-02T00:00:00Z',
  },
  {
    playerId: 'pending-2',
    userId: 'user-2',
    displayName: 'Nico Sin Responder',
    photoUrl: 'https://example.com/nico.jpg',
    joinedAt: '2026-01-03T00:00:00Z',
  },
];

describe('EventAttendeesList', () => {
  it('renders pending confirmation count, names and empty state', () => {
    const { rerender } = render(
      <EventAttendeesList attendees={[]} pendingConfirmationPlayers={pendingPlayers} />,
    );

    expect(screen.getByText('Faltan confirmar: 2')).toBeInTheDocument();
    expect(screen.getByText('Mario Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Nico Sin Responder')).toBeInTheDocument();

    rerender(<EventAttendeesList attendees={[]} pendingConfirmationPlayers={[]} />);

    expect(screen.getByText('Faltan confirmar: 0')).toBeInTheDocument();
    expect(screen.getByText('Todos los jugadores aprobados ya respondieron.')).toBeInTheDocument();
  });

  it('renders compact player rows with only names and keeps section counts', () => {
    render(
      <EventAttendeesList
        pendingConfirmationPlayers={pendingPlayers}
        attendees={[
          attendee('going-1', 'Gonzalo Va', 'going'),
          attendee('not-going-1', 'Noelia No Va', 'not_going'),
          attendee('maybe-1', 'Mateo Tal Vez', 'maybe'),
        ]}
      />,
    );

    expect(screen.getByText('Van: 1')).toBeInTheDocument();
    expect(screen.getByText('No van: 1')).toBeInTheDocument();
    expect(screen.getByText('Tal vez: 1')).toBeInTheDocument();

    for (const name of ['Mario Pendiente', 'Nico Sin Responder', 'Gonzalo Va', 'Noelia No Va', 'Mateo Tal Vez']) {
      const row = screen.getByText(name).closest('li') as HTMLElement;
      expect(within(row).getByText(name)).toBeInTheDocument();
      expect(row.querySelector('img')).not.toBeInTheDocument();
    }

    expect(screen.queryByText('Sin responder')).not.toBeInTheDocument();
    expect(screen.queryByText('Voy')).not.toBeInTheDocument();
    expect(screen.queryByText(/En Espera/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No voy')).not.toBeInTheDocument();
  });
});
