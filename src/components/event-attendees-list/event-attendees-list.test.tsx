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

  it('preserves response sections, attendees and counts', () => {
    render(
      <EventAttendeesList
        pendingConfirmationPlayers={pendingPlayers}
        attendees={[
          attendee('going-1', 'Gonzalo Va', 'going'),
          attendee('waitlist-1', 'Wanda Espera', 'waitlist'),
          attendee('not-going-1', 'Noelia No Va', 'not_going'),
          attendee('maybe-1', 'Mateo Tal Vez', 'maybe'),
        ]}
      />,
    );

    expect(screen.getByText('Van: 1')).toBeInTheDocument();
    expect(screen.getByText(/Lista de espera: 1/i)).toBeInTheDocument();
    expect(screen.getByText('No van: 1')).toBeInTheDocument();
    expect(screen.getByText('Tal vez: 1')).toBeInTheDocument();

    expect(within(screen.getByText('Gonzalo Va').closest('li') as HTMLElement).getByText('Voy')).toBeInTheDocument();
    expect(within(screen.getByText('Wanda Espera').closest('li') as HTMLElement).getByText(/En Espera/i)).toBeInTheDocument();
    expect(within(screen.getByText('Noelia No Va').closest('li') as HTMLElement).getByText('No voy')).toBeInTheDocument();
    expect(within(screen.getByText('Mateo Tal Vez').closest('li') as HTMLElement).getByText('Tal vez')).toBeInTheDocument();
  });
});
