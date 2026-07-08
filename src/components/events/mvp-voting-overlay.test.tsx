import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MvpVotingOverlay } from './mvp-voting-overlay';

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({ rpc: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const playedSummary = [
  {
    playerId: 'player-1',
    displayName: 'Player One',
    team: 'A' as const,
    assignedPosition: 'Delantero',
    playedPrimaryPosition: true,
    boostApplied: null,
    boostReason: null,
    isMvp: false,
  },
  {
    playerId: 'player-2',
    displayName: 'Player Two',
    team: 'B' as const,
    assignedPosition: 'Defensor',
    playedPrimaryPosition: true,
    boostApplied: null,
    boostReason: null,
    isMvp: false,
  },
];

describe('MvpVotingOverlay', () => {
  it('shows a closed voted message with a home action after the player has voted', () => {
    render(
      <MvpVotingOverlay
        eventId="event-1"
        currentPlayerId="player-1"
        playedSummary={playedSummary}
        hasVoted
        isVotingClosed={false}
        homeHref="/groups/group-1/dashboard"
        onClose={vi.fn()}
        onVoteSubmitted={vi.fn()}
      />,
    );

    expect(screen.getByText('Voto registrado')).toBeInTheDocument();
    expect(screen.getByText('Tu voto ya quedó guardado. Cuando se cierre la votación vas a poder ver el resultado.')).toBeInTheDocument();
    expect(screen.queryByText(/Esperando al resto/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/groups/group-1/dashboard');
  });
});
