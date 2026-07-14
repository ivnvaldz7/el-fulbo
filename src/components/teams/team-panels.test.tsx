import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamCardPanel } from './team-card-panel';
import { TeamMatchesPanel } from './team-matches-panel';
import { TeamModerationPanel } from './team-moderation-panel';
import { TeamRosterPanel } from './team-roster-panel';
import { TeamStatsPanel } from './team-stats-panel';
import { shareImageBlob } from '@/lib/share';
import { toBlob } from 'html-to-image';

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
}));

vi.mock('@/lib/share', () => ({
  shareImageBlob: vi.fn(),
}));

const members = [
  { id: 'member-1', userId: 'user-1', displayName: 'Juan Pérez', role: 'admin' as const, primaryPosition: 'DEL' as const, secondaryPosition: 'MED' as const },
  { id: 'member-2', userId: 'user-2', displayName: 'Leo Díaz', role: 'member' as const, primaryPosition: 'DEF' as const, secondaryPosition: null },
];

const matches = [
  { id: 'match-1', scheduledAt: '2026-07-20T22:00:00.000Z', opponentName: 'Los Pibes', fieldName: 'Cancha 5', status: 'scheduled' as const, signupCount: 7 },
  { id: 'match-2', scheduledAt: '2026-07-10T22:00:00.000Z', opponentName: null, fieldName: null, status: 'played' as const, signupCount: 10, teamScore: 4, opponentScore: 2 },
];

const submissions = [
  { id: 'submission-1', playerName: 'Juan Pérez', matchLabel: 'vs Los Pibes', statKind: 'goals' as const, value: 2, status: 'pending' as const },
  { id: 'submission-2', playerName: 'Leo Díaz', matchLabel: 'Partido cerrado', statKind: 'tackles' as const, value: 6, status: 'approved' as const },
  { id: 'submission-3', playerName: 'Ana Ruiz', matchLabel: 'Partido cerrado', statKind: 'assists' as const, value: 1, status: 'rejected' as const },
];

const team = {
  id: 'team-1',
  name: 'La Máquina',
  slug: 'la-maquina',
  primaryColor: '#16a34a',
  secondaryColor: '#020617',
  role: 'admin' as const,
  memberCount: 2,
  matchesPlayed: 1,
  goals: 4,
  assists: 1,
  tackles: 6,
};

describe('team detail panels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders roster members and the admin-managed membership state', () => {
    render(<TeamRosterPanel members={members} canManage={true} />);

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('DEL / MED')).toBeInTheDocument();
    expect(screen.getByText('Leo Díaz')).toBeInTheDocument();
    expect(screen.getByText(/Los cambios de roster se gestionan con invitaciones/i)).toBeInTheDocument();
  });

  it('calls roster admin actions with the selected team and member payloads', () => {
    const onInviteMember = vi.fn();
    const onRemoveMember = vi.fn();

    render(
      <TeamRosterPanel
        teamId="team-1"
        members={members}
        canManage={true}
        onInviteMember={onInviteMember}
        onRemoveMember={onRemoveMember}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /invitar miembro/i }));
    fireEvent.click(screen.getByRole('button', { name: /quitar a Leo Díaz/i }));

    expect(onInviteMember).toHaveBeenCalledWith({ teamId: 'team-1' });
    expect(onRemoveMember).toHaveBeenCalledWith({ teamId: 'team-1', memberId: 'member-2' });
  });

  it('renders matches with signup and finished result states without faking mutations', () => {
    render(<TeamMatchesPanel teamId="team-1" matches={matches} />);

    expect(screen.getByText('Los Pibes')).toBeInTheDocument();
    expect(screen.getByText('7 anotados')).toBeInTheDocument();
    expect(screen.getByText('4 - 2')).toBeInTheDocument();
    expect(screen.getByText(/La inscripción se habilita desde el contrato de partido/i)).toBeInTheDocument();
  });

  it('calls match signup and stat submission actions with match payloads', () => {
    const onSignup = vi.fn();
    const onSubmitStat = vi.fn();

    render(<TeamMatchesPanel teamId="team-1" matches={matches} onSignup={onSignup} onSubmitStat={onSubmitStat} />);

    fireEvent.click(screen.getByRole('button', { name: /anotarme contra Los Pibes/i }));
    fireEvent.change(screen.getByLabelText(/stat para Partido cerrado/i), { target: { value: 'assists' } });
    fireEvent.change(screen.getByLabelText(/valor para Partido cerrado/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /cargar stat de Partido cerrado/i }));

    expect(onSignup).toHaveBeenCalledWith({ teamId: 'team-1', matchId: 'match-1', status: 'going' });
    expect(onSubmitStat).toHaveBeenCalledWith({ teamId: 'team-1', matchId: 'match-2', statKind: 'assists', value: 3 });
  });

  it('renders approved-only aggregate stats', () => {
    render(<TeamStatsPanel totals={{ matchesPlayed: 1, goals: 4, assists: 1, tackles: 6 }} />);

    expect(screen.getByText('Partidos')).toBeInTheDocument();
    expect(screen.getByText('Goles')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/Aprobadas solamente/i)).toBeInTheDocument();
  });

  it('renders moderation queues with honest approve and reject pending states', () => {
    render(<TeamModerationPanel submissions={submissions} canModerate={true} />);

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText(/La aprobación y rechazo usan RPCs del servicio/i)).toBeInTheDocument();
  });

  it('calls moderation actions with approve and reject review payloads', () => {
    const onReviewSubmission = vi.fn();

    render(<TeamModerationPanel submissions={submissions} canModerate={true} onReviewSubmission={onReviewSubmission} />);

    fireEvent.click(screen.getByRole('button', { name: /aprobar stat de Juan Pérez/i }));
    fireEvent.click(screen.getByRole('button', { name: /rechazar stat de Juan Pérez/i }));

    expect(onReviewSubmission).toHaveBeenCalledWith({ submissionId: 'submission-1', status: 'approved' });
    expect(onReviewSubmission).toHaveBeenCalledWith({ submissionId: 'submission-1', status: 'rejected' });
  });

  it('hides moderation submission data from non-admin users', () => {
    render(<TeamModerationPanel submissions={submissions} canModerate={false} />);

    expect(screen.getByText(/Solo admins pueden revisar stats pendientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedile a un admin del equipo que revise la cola/i)).toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    expect(screen.queryByText('Leo Díaz')).not.toBeInTheDocument();
    expect(screen.queryByText('Ana Ruiz')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('2 goals')).not.toBeInTheDocument();
  });

  it('renders a public-safe share card panel from approved aggregate team data', () => {
    render(<TeamCardPanel team={team} />);

    expect(screen.getAllByText('La Máquina')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compartir card del equipo/i })).toBeInTheDocument();
    expect(screen.getByText('Public-safe')).toBeInTheDocument();
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });

  it('generates and shares the public-safe team card when the share action is clicked', async () => {
    const imageBlob = new Blob(['team-card'], { type: 'image/png' });
    vi.mocked(toBlob).mockResolvedValue(imageBlob);
    vi.mocked(shareImageBlob).mockResolvedValue('shared');

    render(<TeamCardPanel team={team} />);

    fireEvent.click(screen.getByRole('button', { name: /compartir card del equipo/i }));

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalledWith(expect.any(HTMLDivElement), { cacheBust: true, pixelRatio: 2 });
    });
    expect(shareImageBlob).toHaveBeenCalledWith({
      blob: imageBlob,
      fileName: 'team-card-la-máquina.png',
      title: 'Card de La Máquina',
      text: 'Card pública de La Máquina en El Fulbo.',
    });
  });
});
