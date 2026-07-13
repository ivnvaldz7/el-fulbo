import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppSectionSelector } from './app-section-selector';

describe('AppSectionSelector', () => {
  it('exposes groups and teams as first-level destinations', () => {
    render(<AppSectionSelector isAuthenticated={true} />);

    expect(screen.getByRole('heading', { name: /elegí tu cancha/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /entrar a grupos/i })).toHaveAttribute('href', '/groups');
    expect(screen.getByRole('link', { name: /entrar a equipos/i })).toHaveAttribute('href', '/teams');
  });

  it('keeps the existing group creation and join paths reachable', () => {
    render(<AppSectionSelector isAuthenticated={false} />);

    expect(screen.getByRole('link', { name: /crear un grupo/i })).toHaveAttribute('href', '/groups/new');
    expect(screen.getByRole('link', { name: /tengo un código de invitación/i })).toHaveAttribute('href', '/join');
    expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveAttribute('href', '/login');
  });
});
