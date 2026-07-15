import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamDetailPage from './page';

// ---- Fresh-query render helper ----

function renderWithFreshQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// ---- Mocks ----

const getTeamDetailMock = vi.fn();
const createTeamInvitationMock = vi.fn();
const removeTeamMemberMock = vi.fn();
const signUpForTeamMatchMock = vi.fn();
const submitTeamStatMock = vi.fn();
const reviewTeamStatSubmissionMock = vi.fn();

const channelOnMock = vi.fn().mockReturnThis();
const channelSubscribeMock = vi.fn();
const removeChannelMock = vi.fn();
const supabaseClient = {
  channel: vi.fn(() => ({
    on: channelOnMock,
    subscribe: channelSubscribeMock,
  })),
  removeChannel: removeChannelMock,
};

const pushMock = vi.fn();
const notFoundMock = vi.fn();

let searchParamsValue: { get: (key: string) => string | null } = { get: () => null };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ teamId: 'test-team-id' }),
  useSearchParams: () => searchParamsValue,
  notFound: () => { notFoundMock(); throw new Error('NEXT_NOT_FOUND'); },
  redirect: () => { throw new Error('NEXT_REDIRECT'); },
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => supabaseClient,
}));

vi.mock('@/lib/services/teams.service', () => ({
  TeamsService: function () {
    return {
      getTeamDetail: getTeamDetailMock,
      createTeamInvitation: createTeamInvitationMock,
      removeTeamMember: removeTeamMemberMock,
      signUpForTeamMatch: signUpForTeamMatchMock,
      submitTeamStat: submitTeamStatMock,
      reviewTeamStatSubmission: reviewTeamStatSubmissionMock,
    };
  },
}));

// ---- Fixtures ----

const teamData = {
  id: 'test-team-id',
  name: 'Los Merengues',
  slug: 'los-merengues',
  primaryColor: '#16a34a',
  secondaryColor: '#020617',
  role: 'admin' as const,
  memberCount: 1,
  matchesPlayed: 0,
  goals: 0,
  assists: 0,
  tackles: 0,
  members: [
    {
      id: 'member-1',
      userId: 'user-1',
      displayName: 'Creador',
      role: 'admin' as const,
      primaryPosition: 'MED' as const,
      secondaryPosition: null,
      photoUrl: null,
    },
  ],
  matches: [],
  submissions: [],
};

// ---- Suite ----

describe('TeamDetailPage', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsValue = { get: () => null };
  });

  it('shows loading spinner while fetching team data', async () => {
    getTeamDetailMock.mockReturnValue(new Promise(() => undefined));

    renderWithFreshQueryClient(<TeamDetailPage />);

    expect(screen.getByText('Cargando equipo')).toBeInTheDocument();
    expect(screen.getByText('Recuperando detalle...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders team details when data loads successfully', async () => {
    getTeamDetailMock.mockResolvedValue({ ok: true, data: teamData });

    renderWithFreshQueryClient(<TeamDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Los Merengues')).toBeInTheDocument();
    });

    expect(screen.getByText(/1 miembros/)).toBeInTheDocument();
    expect(screen.getByText(/0 partidos/)).toBeInTheDocument();

    expect(screen.getByRole('navigation', { name: 'Team sections' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Matches' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Card' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Moderation' })).toBeInTheDocument();

    expect(screen.getByText('Creador')).toBeInTheDocument();
    expect(screen.getByText('MED')).toBeInTheDocument();
  });

  it('shows the matches tab when tab query param is set', async () => {
    getTeamDetailMock.mockResolvedValue({ ok: true, data: teamData });
    searchParamsValue = { get: () => 'matches' };

    renderWithFreshQueryClient(<TeamDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Los Merengues')).toBeInTheDocument();
    });

    expect(screen.getByText(/no scheduled matches/i)).toBeInTheDocument();
  });

  it('sets up real-time subscription on mount and cleans up on unmount', async () => {
    getTeamDetailMock.mockResolvedValue({ ok: true, data: teamData });

    const { unmount } = renderWithFreshQueryClient(<TeamDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Los Merengues')).toBeInTheDocument();
    });

    expect(supabaseClient.channel).toHaveBeenCalledWith('team-detail:test-team-id');
    expect(channelOnMock).toHaveBeenCalledTimes(4);
    expect(channelOnMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'team_members' }),
      expect.any(Function),
    );
    expect(channelOnMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'team_matches' }),
      expect.any(Function),
    );
    expect(channelSubscribeMock).toHaveBeenCalled();

    unmount();
    expect(removeChannelMock).toHaveBeenCalled();
  });

  it('calls notFound when team does not exist', async () => {
    getTeamDetailMock.mockResolvedValue({ ok: true, data: null });

    renderWithFreshQueryClient(<TeamDetailPage />);

    await waitFor(() => {
      expect(notFoundMock).toHaveBeenCalled();
    });
  });

  it('calls notFound when getTeamDetail returns an error', async () => {
    getTeamDetailMock.mockResolvedValue({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' },
    });

    renderWithFreshQueryClient(<TeamDetailPage />);

    await waitFor(() => {
      expect(notFoundMock).toHaveBeenCalled();
    });
  });
});
