import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateGroupForm } from './create-group-form';

const createGroupMock = vi.fn();
const supabaseClient = { rpc: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => supabaseClient,
}));

vi.mock('@/lib/services/groups.service', () => ({
  CREATE_GROUP_DRAFT_KEY: 'create-group-draft',
  createGroup: (...args: unknown[]) => createGroupMock(...args),
}));

describe('CreateGroupForm', () => {
  beforeEach(() => {
    createGroupMock.mockReset();
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

  it('calls createGroup on submit', async () => {
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
    expect(screen.getByText('Grupo creado: 11111111-1111-4111-8111-111111111111')).toBeInTheDocument();
  });
});
