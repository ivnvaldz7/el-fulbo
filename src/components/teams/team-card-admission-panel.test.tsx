import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TeamCardAdmissionView } from '@/lib/types/teams.types';
import { TeamCardAdmissionPanel } from './team-card-admission-panel';

const pendingAdmission: TeamCardAdmissionView = {
  teamId: 'team-1',
  userId: 'user-2',
  playerName: 'Leo Díaz',
  cardStats: { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 },
  positions: { primary: 'DEF', secondary: 'MED' },
  status: 'pending',
  reviewedByUserId: null,
  reviewedAt: null,
  rejectionReason: null,
};

describe('TeamCardAdmissionPanel', () => {
  it('lets an admin approve or reject a pending card', () => {
    const onReviewAdmission = vi.fn();
    render(
      <TeamCardAdmissionPanel
        admissions={[pendingAdmission]}
        currentUserId="user-1"
        canManage
        onReviewAdmission={onReviewAdmission}
      />,
    );

    expect(screen.getByText('Leo Díaz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Admitir' }));
    expect(onReviewAdmission).toHaveBeenCalledWith({ userId: 'user-2', status: 'approved' });

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    fireEvent.change(screen.getByPlaceholderText('Motivo del rechazo...'), { target: { value: 'Revisá tu posición' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onReviewAdmission).toHaveBeenLastCalledWith({
      userId: 'user-2',
      status: 'rejected',
      rejectionReason: 'Revisá tu posición',
    });
  });

  it('shows rejection details and lets the player resubmit', () => {
    const onResubmitAdmission = vi.fn();
    render(
      <TeamCardAdmissionPanel
        admissions={[{ ...pendingAdmission, userId: 'user-1', status: 'rejected', rejectionReason: 'Falta ajustar la posición' }]}
        currentUserId="user-1"
        canManage={false}
        onResubmitAdmission={onResubmitAdmission}
      />,
    );

    expect(screen.getByText(/Falta ajustar la posición/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reenviar card/i }));
    expect(onResubmitAdmission).toHaveBeenCalledTimes(1);
  });
});
