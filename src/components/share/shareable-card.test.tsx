import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableCard } from './shareable-card';

describe('ShareableCard', () => {
  it('renders watermark and boost badges', () => {
    render(
      <ShareableCard
        name="Juan"
        position="DEL"
        stats={{ pac: 8, sho: 7, pas: 6, dri: 5, def: 4, phy: 3 }}
        groupName="Fulbito"
        currentBoost={{
          partidos_remaining: 2,
          modifiers: { pac: 3, sho: 1 },
          reason: 'victory_mvp',
        }}
      />,
    );

    expect(screen.getByText('El Fulbo')).toBeInTheDocument();
    expect(screen.getByText('Boost: 2 partidos más')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
