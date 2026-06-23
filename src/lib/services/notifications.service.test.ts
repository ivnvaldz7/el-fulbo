import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  saveNotificationPreferences,
  createNotification,
  getPendingPushNotifications,
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
      expect(result.data.digestFrequency).toBe('disabled');
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

describe('getPendingPushNotifications', () => {
  it('returns empty array when nothing pending', async () => {
    const supabase = makeSupabase();
    const result = await getPendingPushNotifications(supabase as never);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(0);
  });
});
