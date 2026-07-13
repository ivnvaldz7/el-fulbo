import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/lib/routes';
import { TeamDetailTabs } from './team-detail-tabs';
import { TeamsHub } from './teams-hub';

const teams = [
  {
    id: 'team-1',
    name: 'La Máquina',
    slug: 'la-maquina',
    primaryColor: '#16a34a',
    secondaryColor: '#020617',
    role: 'admin' as const,
    memberCount: 12,
    matchesPlayed: 8,
    goals: 24,
    assists: 13,
    tackles: 31,
  },
];

describe('TeamsHub', () => {
  it('lists real teams with aggregate entrypoints', () => {
    render(<TeamsHub teams={teams} />);

    expect(screen.getByRole('heading', { name: /equipos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir la máquina/i })).toHaveAttribute('href', '/teams/team-1');
    expect(screen.getByText('12 miembros')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('PJ')).toBeInTheDocument();
  });

  it('renders an honest empty state when the user has no teams', () => {
    render(<TeamsHub teams={[]} />);

    expect(screen.getByText('Todavía no tenés equipos')).toBeInTheDocument();
    expect(screen.getByText(/Pedile a un admin una invitación/i)).toBeInTheDocument();
  });
});

describe('TeamDetailTabs', () => {
  it('renders normal navigation links backed by the tab query parameter', () => {
    render(<TeamDetailTabs teamId="team-1" activeTab="stats" />);

    expect(screen.getByRole('navigation', { name: 'Team sections' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', routes.teamDetail('team-1', 'members'));
    expect(screen.getByRole('link', { name: 'Matches' })).toHaveAttribute('href', routes.teamDetail('team-1', 'matches'));
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Stats' })).not.toHaveAttribute('aria-selected');
    expect(screen.getByRole('link', { name: 'Card' })).toHaveAttribute('href', routes.teamDetail('team-1', 'card'));
    expect(screen.getByRole('link', { name: 'Moderation' })).toHaveAttribute('href', routes.teamDetail('team-1', 'moderation'));
  });
});
