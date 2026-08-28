import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Event } from '@/lib/types';
import type {
  CurrentPlayerAttendanceContext,
  EventAttendee,
  PendingConfirmationPlayer,
} from '@/lib/services/events.service';
import { SharedAttendancePanel } from './shared-attendance-panel';

const event = {
  id: '11111111-1111-1111-1111-111111111111',
  group_id: '22222222-2222-2222-2222-222222222222',
  modality: 'F5',
  field_name: 'Cancha Central',
  scheduled_at: '2026-09-01T20:00:00Z',
  status: 'confirming',
  created_by_user_id: '33333333-3333-3333-3333-333333333333',
} satisfies Event;

const attendees = [
  {
    playerId: 'player-going',
    displayName: 'Jugador Va',
    status: 'going',
  },
  {
    playerId: 'player-no',
    displayName: 'Jugador No',
    status: 'not_going',
  },
  {
    playerId: 'player-maybe',
    displayName: 'Jugador Tal Vez',
    status: 'maybe',
  },
  {
    playerId: 'player-wait',
    displayName: 'Jugador En Espera',
    status: 'waitlist',
  },
] satisfies Array<Pick<EventAttendee, 'playerId' | 'displayName' | 'status'>>;

const completeAttendees = attendees.map((attendee) => ({
  userId: null,
  photoUrl: null,
  joinedAt: null,
  primaryPosition: null,
  checkedIn: false,
  checkedInAt: null,
  statsStatus: 'approved' as const,
  isPhantom: false,
  ...attendee,
})) satisfies EventAttendee[];

const pendingConfirmationPlayers = [
  {
    playerId: 'player-pending',
    userId: null,
    displayName: 'Jugador Pendiente',
    photoUrl: null,
    joinedAt: null,
  },
] satisfies PendingConfirmationPlayer[];

const currentPlayer = {
  userId: 'user-1',
  playerId: 'player-going',
  displayName: 'Jugador Va',
  statsStatus: 'approved',
  attendanceStatus: 'going',
} satisfies CurrentPlayerAttendanceContext;

describe('SharedAttendancePanel', () => {
  it('shows the complete live summary and lets the player update their response', () => {
    const onAttendanceChange = vi.fn();

    render(
      <SharedAttendancePanel
        event={event}
        groupName="Los del Miércoles"
        attendees={completeAttendees}
        pendingConfirmationPlayers={pendingConfirmationPlayers}
        currentPlayer={currentPlayer}
        saving={false}
        onAttendanceChange={onAttendanceChange}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Los del Miércoles' })).toBeInTheDocument();
    expect(screen.getByText('Van: 1')).toBeInTheDocument();
    expect(screen.getByText('Lista de espera: 1')).toBeInTheDocument();
    expect(screen.getByText('Faltan confirmar: 1')).toBeInTheDocument();
    expect(screen.getByText('Jugador Pendiente')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tal vez' }));

    expect(onAttendanceChange).toHaveBeenCalledWith('maybe');
  });
});
