import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringClient } from './recurring-client';

const refreshMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe('RecurringClient', () => {
  beforeEach(() => {
    refreshMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('shows a pending message when the schedule is saved but the event is not created yet', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        data: {
          id: 'schedule-1',
          day_of_week: 1,
          scheduled_time: '21:00',
          field_name: 'Club Riachuelo',
          field_maps_url: null,
          modality: 'F5',
          notes: null,
          days_ahead: 4,
        },
      }),
    } as Response);

    render(<RecurringClient groupId="group-1" schedules={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /\+ agregar partido fijo/i }));
    fireEvent.change(screen.getByLabelText('Cancha'), { target: { value: 'Club Riachuelo' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    expect(await screen.findByText(/partido fijo guardado/i)).toBeInTheDocument();
    expect(screen.getByText(/el próximo evento se creará automáticamente/i)).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('shows an error message when automatic generation fails', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        data: {
          id: 'schedule-1',
          day_of_week: 1,
          scheduled_time: '21:00',
          field_name: 'Club Riachuelo',
          field_maps_url: null,
          modality: 'F5',
          notes: null,
          days_ahead: 4,
          _eventError: 'Count query failed: permission denied',
        },
      }),
    } as Response);

    render(<RecurringClient groupId="group-1" schedules={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /\+ agregar partido fijo/i }));
    fireEvent.change(screen.getByLabelText('Cancha'), { target: { value: 'Club Riachuelo' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    expect(await screen.findByText(/no se pudo crear el próximo evento/i)).toBeInTheDocument();
  });
});
