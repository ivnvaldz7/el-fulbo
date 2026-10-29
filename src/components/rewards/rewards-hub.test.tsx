import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TeamCentralCardView } from '@/lib/types/teams.types';
import { RewardsHub } from './rewards-hub';

const view: TeamCentralCardView = {
  userId: 'user-1',
  stats: { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 },
  primaryPosition: 'DEL',
  secondaryPosition: 'MED',
  matchesPlayed: 1,
  goals: 3,
  assists: 4,
  tackles: 1,
  mvps: 0,
  trophies: 0,
  missions: 0,
  missionPoints: 0,
  overall: 71,
  cardTier: 'silver',
};

describe('RewardsHub', () => {
  it('renders real aggregates instead of demo progress', () => {
    render(<RewardsHub view={view} />);

    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.getByText('4/10')).toBeInTheDocument();
    expect(screen.getByText('1/20')).toBeInTheDocument();
    expect(screen.getByText('0 / 3 del próximo ciclo · 0 ciclos acreditados')).toBeInTheDocument();
    expect(screen.queryByText('Reclamar +2 Aptitudes')).not.toBeInTheDocument();
  });

  it('renders an honest empty state without a central card', () => {
    render(<RewardsHub view={null} />);

    expect(screen.getByRole('heading', { name: /sin progreso todavía/i })).toBeInTheDocument();
    expect(screen.getByText(/stats aprobadas/i)).toBeInTheDocument();
  });
});
