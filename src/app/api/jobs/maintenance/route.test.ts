import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServiceSupabaseClientMock = vi.hoisted(() => vi.fn());
const dispatchEventCreatedPushesMock = vi.hoisted(() => vi.fn());
const dispatchAttendanceChangedPushesMock = vi.hoisted(() => vi.fn());
const tryCreateEventFromScheduleMock = vi.hoisted(() => vi.fn());
const sendPushToUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: createServiceSupabaseClientMock,
}));

vi.mock('@/lib/services/push-dispatcher.service', () => ({
  dispatchEventCreatedPushes: dispatchEventCreatedPushesMock,
  dispatchAttendanceChangedPushes: dispatchAttendanceChangedPushesMock,
}));

vi.mock('@/lib/services/create-event-from-schedule', () => ({
  tryCreateEventFromSchedule: tryCreateEventFromScheduleMock,
}));

vi.mock('@/lib/services/push-sender.service', () => ({
  sendPushToUser: sendPushToUserMock,
}));

function makeEmptyQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn().mockResolvedValue({ data: [], error: null }),
    lt: vi.fn(() => query),
    gt: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn(() => query),
    in: vi.fn().mockResolvedValue({ error: null }),
    not: vi.fn(() => query),
  };

  return query;
}

describe('maintenance job', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRON_SECRET = 'secret';
    createServiceSupabaseClientMock.mockReset();
    dispatchEventCreatedPushesMock.mockReset();
    dispatchAttendanceChangedPushesMock.mockReset();
    tryCreateEventFromScheduleMock.mockReset();
    sendPushToUserMock.mockReset();
  });

  it('keeps maintenance successful when event_created dispatcher throws unexpectedly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const supabase = { from: vi.fn(() => makeEmptyQuery()) };
    createServiceSupabaseClientMock.mockReturnValue(supabase);
    dispatchEventCreatedPushesMock.mockRejectedValue(new Error('dispatcher boom'));
    dispatchAttendanceChangedPushesMock.mockResolvedValue({
      claimed: 0,
      sent: 0,
      failed: 0,
      staleDeleted: 0,
      skipped: false,
      errors: [],
    });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/jobs/maintenance', {
      headers: { authorization: 'Bearer secret' },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.eventsCreated).toBe(0);
    expect(body.data.eventsTransitioned).toBe(0);
    expect(body.data.remindersSent).toBe(0);
    expect(body.data.eventCreatedPushDispatch).toEqual({
      claimed: 0,
      sent: 0,
      failed: 0,
      staleDeleted: 0,
      skipped: true,
      errors: ['dispatcher boom'],
    });
    expect(body.data.errors).toContain('event_created dispatcher failed: dispatcher boom');

    consoleError.mockRestore();
  });

  it('keeps maintenance successful when attendance_changed dispatcher throws unexpectedly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const supabase = { from: vi.fn(() => makeEmptyQuery()) };
    createServiceSupabaseClientMock.mockReturnValue(supabase);
    dispatchEventCreatedPushesMock.mockResolvedValue({
      claimed: 0,
      sent: 0,
      failed: 0,
      staleDeleted: 0,
      skipped: false,
      errors: [],
    });
    dispatchAttendanceChangedPushesMock.mockRejectedValue(new Error('attendance boom'));

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/jobs/maintenance', {
      headers: { authorization: 'Bearer secret' },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.attendanceChangedPushDispatch).toEqual({
      claimed: 0,
      sent: 0,
      failed: 0,
      staleDeleted: 0,
      skipped: true,
      errors: ['attendance boom'],
    });
    expect(body.data.errors).toContain('attendance_changed dispatcher failed: attendance boom');

    consoleError.mockRestore();
  });
});
