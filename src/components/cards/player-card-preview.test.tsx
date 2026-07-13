import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerCardPreview } from './player-card-preview';

describe('PlayerCardPreview', () => {
  it('renders boost deltas when an active boost exists', () => {
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

    expect(screen.getByText('MVP')).toBeInTheDocument();
    expect(screen.queryByText(/Boost:/i)).not.toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
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
    expect(screen.queryByText('MVP')).not.toBeInTheDocument();
  });

  it('renders a player photo when one is available', () => {
    render(
      <PlayerCardPreview
        name="Laura"
        position="MED"
        stats={{ pac: 8, sho: 7, pas: 6, dri: 5, def: 4, phy: 3 }}
        photoUrl="https://example.com/laura.jpg"
      />,
    );

    expect(screen.getByAltText('Laura')).toBeInTheDocument();
  });

  it('renders an integrated silhouette fallback without a photo', () => {
    render(
      <PlayerCardPreview
        name="Pedro"
        position="MED"
        stats={{ pac: 8, sho: 7, pas: 6, dri: 5, def: 4, phy: 3 }}
      />,
    );

    expect(screen.getByLabelText('Silueta de Pedro')).toBeInTheDocument();
  });
});
