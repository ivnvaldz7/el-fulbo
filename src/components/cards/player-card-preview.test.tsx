import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerCardPreview } from './player-card-preview';

describe('PlayerCardPreview', () => {
  it('renders boost badges and remaining label when an active boost exists', () => {
    render(
      <PlayerCardPreview
        name="Juan"
        position="DEL"
        stats={{ pac: 8, sho: 7, pas: 6, dri: 5, def: 4, phy: 3 }}
        currentBoost={{
          partidos_remaining: 3,
          modifiers: { pac: 3, sho: 1 },
          reason: 'victory_mvp',
        }}
      />,
    );

    expect(screen.getByText('MVP BOOST')).toBeInTheDocument();
    expect(screen.getByText('Boost: 3 partidos más')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('83')).toBeInTheDocument();
  });

  it('does not render boost UI without an active boost', () => {
    render(
      <PlayerCardPreview
        name="Pedro"
        position="MED"
        stats={{ pac: 8, sho: 7, pas: 6, dri: 5, def: 4, phy: 3 }}
      />,
    );

    expect(screen.queryByText(/Boost:/i)).not.toBeInTheDocument();
    expect(screen.queryByText('MVP BOOST')).not.toBeInTheDocument();
  });
});
