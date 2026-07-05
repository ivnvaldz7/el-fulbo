import { describe, it, expect, vi } from 'vitest';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  saveNotificationPreferences,
  createNotification,
  createNotificationOnce,
} from './notifications.service';

function makeMockRpc(data: unknown = null, error: unknown = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

function makeSupabase(overrides: Record<string, unknown> = {}) {
  const from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
  }));

  return {
    from,
    rpc: makeMockRpc(0),
    ...overrides,
  };
}

describe('getNotifications', () => {
  it('returns empty list when no notifications', async () => {
    const supabase = makeSupabase();
    const result = await getNotifications(supabase as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notifications).toEqual([]);
      expect(result.data.unreadCount).toBe(0);
    }
  });

  it('returns error when supabase fails', async () => {
    const supabase = makeSupabase();
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail', code: 'X' } }),
    });
    const result = await getNotifications(supabase as never);
    expect(result.ok).toBe(false);
  });
});

describe('markNotificationRead', () => {
  it('calls mark_notification_read rpc', async () => {
    const rpc = makeMockRpc();
    const supabase = makeSupabase({ rpc });
    await markNotificationRead(supabase as never, 'notif-1');
    expect(rpc).toHaveBeenCalledWith('mark_notification_read', { p_notification_id: 'notif-1' });
  });

  it('returns error when rpc fails', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: 'fail', code: 'X' } });
    const supabase = makeSupabase({ rpc });
    const result = await markNotificationRead(supabase as never, 'notif-1');
    expect(result.ok).toBe(false);
  });
});

describe('markAllNotificationsRead', () => {
  it('calls mark_all_notifications_read rpc', async () => {
    const rpc = makeMockRpc();
    const supabase = makeSupabase({ rpc });
    await markAllNotificationsRead(supabase as never);
    expect(rpc).toHaveBeenCalledWith('mark_all_notifications_read');
  });
});

describe('getNotificationPreferences', () => {
  it('returns defaults when no preferences exist', async () => {
    const supabase = makeSupabase();
    const result = await getNotificationPreferences(supabase as never, '44444444-4444-4444-4444-444444444441');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pushEnabled).toBe(false);
    }
  });
});

describe('saveNotificationPreferences', () => {
  it('upserts preferences', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upsert }));
    const supabase = makeSupabase({ from });
    const result = await saveNotificationPreferences(supabase as never, '44444444-4444-4444-4444-444444444441', {
      pushEnabled: true,
    });
    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalled();
  });
});

describe('createNotification', () => {
  it('inserts notification and returns id', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'notif-123' }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn(() => ({ insert }));
    const supabase = makeSupabase({ from });

    const result = await createNotification(supabase as never, '44444444-4444-4444-4444-444444444441', 'event_created', {});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('notif-123');
  });
});

describe('createNotificationOnce', () => {
  it('calls create_notification_once rpc with dedupe key', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'notif-123', error: null });
    const supabase = makeSupabase({ rpc });

    const result = await createNotificationOnce(
      supabase as never,
      '44444444-4444-4444-4444-444444444441',
      'event_created',
      { event_id: 'event-1', group_id: 'group-1' },
      'event_created:event-1:player-1',
    );

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('create_notification_once', expect.objectContaining({
      p_user_id: '44444444-4444-4444-4444-444444444441',
      p_type: 'event_created',
      p_dedupe_key: 'event_created:event-1:player-1',
    }));
  });
});
