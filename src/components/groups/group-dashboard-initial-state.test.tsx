import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GroupDashboardInitialState } from './group-dashboard-initial-state';

const BASE_PROPS = {
  groupId: '22222222-2222-2222-2222-222222222222',
  inviteCode: 'FULBO-ABC123',
  currentPlayerId: null,
};

describe('GroupDashboardInitialState', () => {
  it('renders the invite banner with 0 players', () => {
    render(
      <GroupDashboardInitialState
        {...BASE_PROPS}
        groupName="Fulbito"
        modality="F5"
        activePlayers={0}
        userRole="owner"
        matchesToday={[]}
      />,
    );

    expect(screen.getByText('Fulbito')).toBeInTheDocument();
    expect(screen.getByText('Sumá a tus jugadores')).toBeInTheDocument();
    expect(
      screen.getByText(/Compartí el link o el código para que entren al grupo/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitar jugadores' })).toBeInTheDocument();
  });

  it('renders the invite banner with 1 player', () => {
    render(
      <GroupDashboardInitialState
        {...BASE_PROPS}
        groupName="Fulbito"
        modality="F5"
        activePlayers={1}
        userRole="owner"
        matchesToday={[]}
      />,
    );

    expect(screen.getByText('Sumá a tus jugadores')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitar jugadores' })).toBeInTheDocument();
  });

  it('does not render the invite banner for non-admin users', () => {
    render(
      <GroupDashboardInitialState
        {...BASE_PROPS}
        groupName="Fulbito"
        modality="F5"
        activePlayers={2}
        userRole="player"
        matchesToday={[]}
      />,
    );

    expect(screen.queryByText('Sumá a tus jugadores')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invitar jugadores' })).not.toBeInTheDocument();
  });

  it('renders the admin pending widget when there are tasks to resolve', () => {
    render(
      <GroupDashboardInitialState
        {...BASE_PROPS}
        groupName="Fulbito"
        modality="F5"
        activePlayers={3}
        adminPendingTotal={4}
        userRole="owner"
        matchesToday={[]}
      />,
    );

    expect(screen.getByText('Tenés 4 pendientes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ahora' })).toBeInTheDocument();
  });

  it('renders the recent played matches feed with mvp and boosts', () => {
    render(
      <GroupDashboardInitialState
        {...BASE_PROPS}
        groupName="Fulbito"
        modality="F5"
        activePlayers={10}
        userRole="owner"
        matchesToday={[]}
        recentPlayedEvents={[
          {
            id: '11111111-1111-1111-1111-111111111111',
            fieldName: 'Cancha 5',
            teamAName: 'Negros',
            teamBName: 'Blancos',
            teamAScore: 3,
            teamBScore: 1,
            mvpName: 'Juan',
            boostsLine: 'Subieron de nivel: Juan (PAC +3, SHO +3)',
            playedAtLabel: '06/05/2026',
          },
        ]}
      />,
    );

    expect(screen.getByText('Últimos partidos')).toBeInTheDocument();
    expect(screen.getByText('Cancha 5')).toBeInTheDocument();
    expect(screen.getByText(/Juan fue la figura/i)).toBeInTheDocument();
    expect(screen.getByText(/Subieron de nivel: Juan/i)).toBeInTheDocument();
  });

  it('renders the own card share button when shareable player exists', () => {
    render(
      <GroupDashboardInitialState
        {...BASE_PROPS}
        groupName="Fulbito"
        modality="F5"
        activePlayers={10}
        userRole="owner"
        matchesToday={[]}
        shareablePlayer={{
          displayName: 'Juan',
          primaryPosition: 'DEL',
          stats: { pac: 8, sho: 7, pas: 6, dri: 5, def: 4, phy: 3 },
          currentBoost: null,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Compartir mi card' })).toBeInTheDocument();
  });
});
