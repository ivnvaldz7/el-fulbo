import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock the EventsService class properly - defined inside factory to avoid hoisting issues
vi.mock('@/lib/services/events.service', () => {
  class MockEventsService {
    getMvpVotes = vi.fn().mockResolvedValue({
      ok: true,
      data: [{ playerId: 'player-2', votes: 1 }],
    });
  }
  return { EventsService: MockEventsService };
});

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

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchInterval: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('MvpVotingOverlay', () => {
  it('shows voting panel with real-time results and user vote indicated after voting', async () => {
    renderWithQueryClient(
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
    
    // Wait for the vote data to load and render
    await waitFor(
      () => {
        expect(screen.getByText('Tu voto: Player Two')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    
    // The voted player (player-2) should show vote count
    await waitFor(
      () => {
        expect(screen.getByText('1 voto')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volver al inicio' })).not.toBeInTheDocument();
  });
});
