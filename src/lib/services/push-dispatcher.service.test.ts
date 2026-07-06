import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchAttendanceChangedPushes, dispatchEventCreatedPushes } from './push-dispatcher.service';

const hasVapidConfigMock = vi.hoisted(() => vi.fn());
const sendPushToUserMock = vi.hoisted(() => vi.fn());

vi.mock('./push-sender.service', () => ({
  hasVapidConfig: hasVapidConfigMock,
  sendPushToUser: sendPushToUserMock,
}));

function makeSupabase(rpcData: unknown[] = []) {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: null });

  return {
    supabase: { rpc, from },
    rpc,
    from,
    update,
    eq,
  };
}

describe('dispatchEventCreatedPushes', () => {
  beforeEach(() => {
    hasVapidConfigMock.mockReset();
    sendPushToUserMock.mockReset();
  });

  it('does not claim notifications when VAPID keys are missing', async () => {
    hasVapidConfigMock.mockReturnValue(false);
    const { supabase, rpc } = makeSupabase();

    const result = await dispatchEventCreatedPushes(supabase as never);

    expect(result.skipped).toBe(true);
    expect(result.claimed).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
    expect(sendPushToUserMock).not.toHaveBeenCalled();
  });

  it('does not process notification types other than event_created', async () => {
    hasVapidConfigMock.mockReturnValue(true);
    const { supabase } = makeSupabase([
      {
        notification_id: 'notification-1',
        user_id: 'user-1',
        type: 'event_cancelled',
        payload: { group_id: 'group-1', event_id: 'event-1' },
      },
    ]);

    const result = await dispatchEventCreatedPushes(supabase as never);

    expect(result.claimed).toBe(0);
    expect(sendPushToUserMock).not.toHaveBeenCalled();
  });

  it('marks pushed_at when at least one push is sent', async () => {
    hasVapidConfigMock.mockReturnValue(true);
    sendPushToUserMock.mockResolvedValue({ sent: 1, failed: 0, staleDeleted: 0, errors: [] });
    const { supabase, rpc, update } = makeSupabase([
      {
        notification_id: 'notification-1',
        user_id: 'user-1',
        type: 'event_created',
        payload: { group_id: 'group-1', event_id: 'event-1', scheduled_at: '2026-07-06T20:00:00Z' },
      },
    ]);

    const result = await dispatchEventCreatedPushes(supabase as never);

    expect(result.sent).toBe(1);
    expect(rpc).toHaveBeenCalledWith('claim_event_created_push_notifications', {
      p_limit: 50,
      p_max_attempts: 3,
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      pushed_at: expect.any(String),
      push_last_error: null,
    }));
  });

  it('does not mark pushed_at when delivery fails', async () => {
    hasVapidConfigMock.mockReturnValue(true);
    sendPushToUserMock.mockResolvedValue({ sent: 0, failed: 1, staleDeleted: 0, errors: ['boom'] });
    const { supabase, update } = makeSupabase([
      {
        notification_id: 'notification-1',
        user_id: 'user-1',
        type: 'event_created',
        payload: { group_id: 'group-1', event_id: 'event-1', scheduled_at: '2026-07-06T20:00:00Z' },
      },
    ]);

    const result = await dispatchEventCreatedPushes(supabase as never);

    expect(result.failed).toBe(1);
    expect(update).toHaveBeenCalledWith({ push_last_error: 'boom' });
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ pushed_at: expect.any(String) }));
  });
});

describe('dispatchAttendanceChangedPushes', () => {
  beforeEach(() => {
    hasVapidConfigMock.mockReset();
    sendPushToUserMock.mockReset();
  });

  it('claims attendance_changed notifications with the specific RPC', async () => {
    hasVapidConfigMock.mockReturnValue(true);
    sendPushToUserMock.mockResolvedValue({ sent: 1, failed: 0, staleDeleted: 0, errors: [] });
    const { supabase, rpc } = makeSupabase([
      {
        notification_id: 'notification-1',
        user_id: 'user-1',
        type: 'attendance_changed',
        payload: {
          group_id: 'group-1',
          event_id: 'event-1',
          player_id: 'player-1',
          player_name: 'Jugador Uno',
          status: 'going',
        },
      },
    ]);

    const result = await dispatchAttendanceChangedPushes(supabase as never);

    expect(result.claimed).toBe(1);
    expect(result.sent).toBe(1);
    expect(rpc).toHaveBeenCalledWith('claim_attendance_changed_push_notifications', {
      p_limit: 50,
      p_max_attempts: 3,
    });
    expect(sendPushToUserMock).toHaveBeenCalledWith(
      supabase,
      'user-1',
      expect.objectContaining({
        title: 'Asistencia confirmada',
        body: 'Jugador Uno confirmó que va.',
        url: '/groups/group-1/events/event-1',
      }),
    );
  });

  it('marks pushed_at when at least one attendance_changed push is sent', async () => {
    hasVapidConfigMock.mockReturnValue(true);
    sendPushToUserMock.mockResolvedValue({ sent: 1, failed: 0, staleDeleted: 0, errors: [] });
    const { supabase, update } = makeSupabase([
      {
        notification_id: 'notification-1',
        user_id: 'user-1',
        type: 'attendance_changed',
        payload: { group_id: 'group-1', event_id: 'event-1', status: 'not_going' },
      },
    ]);

    const result = await dispatchAttendanceChangedPushes(supabase as never);

    expect(result.sent).toBe(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      pushed_at: expect.any(String),
      push_last_error: null,
    }));
  });

  it('stores push_last_error when attendance_changed delivery fails', async () => {
    hasVapidConfigMock.mockReturnValue(true);
    sendPushToUserMock.mockResolvedValue({ sent: 0, failed: 1, staleDeleted: 0, errors: ['boom'] });
    const { supabase, update } = makeSupabase([
      {
        notification_id: 'notification-1',
        user_id: 'user-1',
        type: 'attendance_changed',
        payload: { group_id: 'group-1', event_id: 'event-1', status: 'going' },
      },
    ]);

    const result = await dispatchAttendanceChangedPushes(supabase as never);

    expect(result.failed).toBe(1);
    expect(update).toHaveBeenCalledWith({ push_last_error: 'boom' });
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ pushed_at: expect.any(String) }));
  });

  it('does not process notification types other than attendance_changed', async () => {
    hasVapidConfigMock.mockReturnValue(true);
    const { supabase } = makeSupabase([
      {
        notification_id: 'notification-1',
        user_id: 'user-1',
        type: 'event_created',
        payload: { group_id: 'group-1', event_id: 'event-1' },
      },
    ]);

    const result = await dispatchAttendanceChangedPushes(supabase as never);

    expect(result.claimed).toBe(0);
    expect(sendPushToUserMock).not.toHaveBeenCalled();
  });
});
