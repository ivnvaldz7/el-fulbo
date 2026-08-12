import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CentralCardPanel } from './central-card-panel';
import type { TeamCentralCardView } from '@/lib/types/teams.types';

const fieldView: TeamCentralCardView = {
  userId: 'user-1',
  stats: { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 },
  primaryPosition: 'DEL',
  secondaryPosition: 'MED',
  matchesPlayed: 12,
  goals: 25,
  assists: 8,
  tackles: 4,
  mvps: 5,
  trophies: 3,
  missions: 6,
  missionPoints: 9,
  overall: 71,
  cardTier: 'silver',
};

const keeperView: TeamCentralCardView = {
  ...fieldView,
  stats: { div: 70, han: 71, kic: 72, ref: 69, spd: 70, pos: 71 },
  primaryPosition: 'ARQ',
  secondaryPosition: 'DEF',
  overall: 71,
};

describe('CentralCardPanel', () => {
  it('renders the global card with overall, tier, positions and approved aggregates', () => {
    render(<CentralCardPanel view={fieldView} />);

    expect(screen.getByRole('heading', { name: 'Tu card global' })).toBeInTheDocument();
    expect(screen.getByLabelText('Card de Teams')).toBeInTheDocument();
    expect(screen.getAllByText('71').length).toBeGreaterThan(0);
    expect(screen.getByText('DEL / MED')).toBeInTheDocument();
    expect(screen.getByText('Plata')).toBeInTheDocument();
    expect(screen.getByText('Tiro')).toBeInTheDocument();
    expect(screen.getByText('Velocidad')).toBeInTheDocument();

    expect(screen.getByText('Rendimiento aprobado')).toBeInTheDocument();
    expect(screen.getByText('Logros y misiones')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('maps goalkeeper aptitude labels for ARQ cards', () => {
    render(<CentralCardPanel view={keeperView} />);

    expect(screen.getByText('ARQ / DEF')).toBeInTheDocument();
    expect(screen.getByText('Estirada')).toBeInTheDocument();
    expect(screen.getByText('Reflejos')).toBeInTheDocument();
    expect(screen.getByText('Colocacion')).toBeInTheDocument();
    expect(screen.queryByText('Tiro')).not.toBeInTheDocument();
  });

  it('shows an explanatory empty state when the player has no global card yet', () => {
    render(<CentralCardPanel view={null} />);

    expect(screen.getByRole('heading', { name: /Todavía no creaste tu card de Teams/i })).toBeInTheDocument();
    expect(screen.getByText(/las misiones se activan/i)).toBeInTheDocument();
  });
});
