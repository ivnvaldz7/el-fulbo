import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateGroupForm } from './create-group-form';

const createGroupMock = vi.fn();
const pushMock = vi.fn();
const supabaseClient = { rpc: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => supabaseClient,
}));

vi.mock('@/lib/services/groups.service', () => ({
  CREATE_GROUP_DRAFT_KEY: 'create-group-draft',
  createGroup: (...args: unknown[]) => createGroupMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('CreateGroupForm', () => {
  beforeEach(() => {
    createGroupMock.mockReset();
    pushMock.mockReset();
    window.localStorage.clear();
  });

  it('renders the create group form', () => {
    render(<CreateGroupForm />);

    expect(screen.getByLabelText('Nombre del grupo')).toBeInTheDocument();
    expect(screen.getByLabelText('Modalidad')).toHaveValue('F5');
    expect(screen.getByRole('button', { name: 'Crear grupo' })).toBeEnabled();
  });

  it('updates the group name input and stores the draft', () => {
    render(<CreateGroupForm />);

    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Fulbito de los jueves' },
    });

    expect(screen.getByLabelText('Nombre del grupo')).toHaveValue('Fulbito de los jueves');
    expect(window.localStorage.getItem('create-group-draft')).toContain('Fulbito de los jueves');
  });

  it('shows the transition screen while creating the group', async () => {
    createGroupMock.mockReturnValue(new Promise(() => undefined));
    render(<CreateGroupForm />);

    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Fulbito' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Crear grupo' }).closest('form')!);

    expect(await screen.findByText('Creando tu grupo')).toBeInTheDocument();
    expect(screen.getByText('Un toque mas y esta listo')).toBeInTheDocument();
  });

  it('calls createGroup on submit and redirects to admin onboarding', async () => {
    createGroupMock.mockResolvedValue({
      ok: true,
      data: { groupId: '11111111-1111-4111-8111-111111111111' },
    });
    render(<CreateGroupForm />);

    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Fulbito' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Crear grupo' }).closest('form')!);

    await waitFor(() => {
      expect(createGroupMock).toHaveBeenCalledWith(supabaseClient, {
        name: 'Fulbito',
        modality: 'F5',
      });
    });
    expect(pushMock).toHaveBeenCalledWith(
      '/groups/11111111-1111-4111-8111-111111111111/onboarding-stats?as=admin',
    );
  });

  it('does not submit twice while the transition screen is active', async () => {
    createGroupMock.mockReturnValue(new Promise(() => undefined));
    render(<CreateGroupForm />);

    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Fulbito' },
    });

    const form = screen.getByRole('button', { name: 'Crear grupo' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByText('Creando tu grupo')).toBeInTheDocument();
    expect(createGroupMock).toHaveBeenCalledTimes(1);
  });

  it('returns to the form and shows the error when createGroup fails', async () => {
    createGroupMock.mockResolvedValue({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'No pudimos crear el grupo.' },
    });
    render(<CreateGroupForm />);

    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Fulbito' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Crear grupo' }).closest('form')!);

    expect(await screen.findByText('No pudimos crear el grupo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear grupo' })).toBeEnabled();
    expect(screen.queryByText('Creando tu grupo')).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
