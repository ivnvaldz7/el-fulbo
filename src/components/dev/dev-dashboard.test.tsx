import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DevDashboard, type DevDashboardData } from './dev-dashboard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

const data: DevDashboardData = {
  user: { id: 'user-1', email: 'dev@el-fulbo.app' },
  globalCard: { exists: false, position: null, overall: null, locked: false },
  legacyCards: [{ name: 'Jugador legacy', position: 'DEL', status: 'approved' }],
  teams: [],
};

describe('DevDashboard', () => {
  it('shows the current card gap and the main test paths', () => {
    render(<DevDashboard data={data} />);

    expect(screen.getByRole('heading', { name: /la cancha de pruebas/i })).toBeInTheDocument();
    expect(screen.getAllByText('Falta crear').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /card global/i })).toHaveAttribute('href', '/teams/card');
    expect(screen.getByRole('link', { name: /nuevo equipo/i })).toHaveAttribute('href', '/teams/new');
    expect(screen.getByText('Cards legacy')).toBeInTheDocument();
  });
});
