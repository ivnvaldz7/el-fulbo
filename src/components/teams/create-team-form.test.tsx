import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTeamForm } from './create-team-form';

const createTeamMock = vi.fn();
const pushMock = vi.fn();
const supabaseClient = { rpc: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => supabaseClient,
}));

vi.mock('@/lib/services/teams.service', () => ({
  TeamsService: function () {
    return { createTeam: createTeamMock };
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('CreateTeamForm', () => {
  beforeEach(() => {
    createTeamMock.mockReset();
    pushMock.mockReset();
  });

  it('renders the create team form', () => {
    render(<CreateTeamForm />);

    expect(screen.getByPlaceholderText('Ej: Los Merengues')).toBeInTheDocument();
    expect(screen.getByLabelText('Tu posición')).toHaveValue('MED');
    expect(screen.getByRole('button', { name: /crear equipo/i })).toBeEnabled();
  });

  it('shows the transition screen while creating the team', async () => {
    createTeamMock.mockReturnValue(new Promise(() => undefined));
    render(<CreateTeamForm />);

    fireEvent.change(screen.getByPlaceholderText('Ej: Los Merengues'), {
      target: { value: 'Los Merengues' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /crear equipo/i }).closest('form')!);

    expect(await screen.findByText('Armando equipo')).toBeInTheDocument();
    expect(screen.getByText('Preparando el vestuario...')).toBeInTheDocument();
  });

  it('calls createTeam on submit and redirects to team detail', async () => {
    createTeamMock.mockResolvedValue({
      ok: true,
      data: { teamId: 'team-123' },
    });
    render(<CreateTeamForm />);

    fireEvent.change(screen.getByPlaceholderText('Ej: Los Merengues'), {
      target: { value: 'Los Merengues' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /crear equipo/i }).closest('form')!);

    await waitFor(() => {
      expect(createTeamMock).toHaveBeenCalledWith({
        name: 'Los Merengues',
        primaryPosition: 'MED',
      });
    });
    expect(pushMock).toHaveBeenCalledWith('/teams/team-123');
  });

  it('does not submit twice while the transition screen is active', async () => {
    createTeamMock.mockReturnValue(new Promise(() => undefined));
    render(<CreateTeamForm />);

    fireEvent.change(screen.getByPlaceholderText('Ej: Los Merengues'), {
      target: { value: 'Los Merengues' },
    });

    const form = screen.getByRole('button', { name: /crear equipo/i }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByText('Armando equipo')).toBeInTheDocument();
    expect(createTeamMock).toHaveBeenCalledTimes(1);
  });

  it('returns to the form and shows the error when createTeam fails', async () => {
    createTeamMock.mockResolvedValue({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'No pudimos crear el equipo.' },
    });
    render(<CreateTeamForm />);

    fireEvent.change(screen.getByPlaceholderText('Ej: Los Merengues'), {
      target: { value: 'Los Merengues' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /crear equipo/i }).closest('form')!);

    expect(await screen.findByText('No pudimos crear el equipo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear equipo/i })).toBeEnabled();
    expect(screen.queryByText('Armando equipo')).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
