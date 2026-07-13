import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamCardArtwork } from '@/components/teams/team-card-artwork';
import { TeamShareableCard } from './team-shareable-card';

const team = {
  name: 'La Máquina',
  primaryColor: '#16a34a',
  secondaryColor: '#020617',
  matchesPlayed: 9,
  goals: 27,
  assists: 14,
  tackles: 44,
};

describe('TeamCardArtwork', () => {
  it('renders team identity and approved aggregate stats', () => {
    render(<TeamCardArtwork team={team} />);

    expect(screen.getByRole('article', { name: /card del equipo la máquina/i })).toBeInTheDocument();
    expect(screen.getByText('La Máquina')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('PJ')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('GOL')).toBeInTheDocument();
  });
});

describe('TeamShareableCard', () => {
  it('limits share output to public-safe aggregate fields', () => {
    render(<TeamShareableCard team={team} />);

    expect(screen.getByText('Public-safe team card')).toBeInTheDocument();
    expect(screen.getByText('La Máquina')).toBeInTheDocument();
    expect(screen.queryByText(/moderation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/member email/i)).not.toBeInTheDocument();
  });
});