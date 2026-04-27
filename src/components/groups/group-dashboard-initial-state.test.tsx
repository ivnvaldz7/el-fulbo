import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GroupDashboardInitialState } from './group-dashboard-initial-state';

describe('GroupDashboardInitialState', () => {
  it('renders the invite banner with 0 players', () => {
    render(<GroupDashboardInitialState groupName="Fulbito" modality="F5" activePlayers={0} />);

    expect(screen.getByText('Fulbito')).toBeInTheDocument();
    expect(screen.getByText('Sumá a tus jugadores')).toBeInTheDocument();
    expect(
      screen.getByText('Compartí este link en el grupo de WhatsApp y los que entren ya están'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitar jugadores' })).toBeInTheDocument();
  });

  it('renders the invite banner with 1 player', () => {
    render(<GroupDashboardInitialState groupName="Fulbito" modality="F5" activePlayers={1} />);

    expect(screen.getByText('Sumá a tus jugadores')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitar jugadores' })).toBeInTheDocument();
  });

  it('does not render the invite banner with 2 players', () => {
    render(<GroupDashboardInitialState groupName="Fulbito" modality="F5" activePlayers={2} />);

    expect(screen.queryByText('Sumá a tus jugadores')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invitar jugadores' })).not.toBeInTheDocument();
  });
});
