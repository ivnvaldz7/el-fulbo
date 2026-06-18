import { describe, it, expect, vi } from 'vitest';
import {
  savePushSubscription,
  removePushSubscription,
  getActiveSubscriptions,
} from './push-subscription.service';

function makeRpc(error: unknown = null) {
  return vi.fn().mockResolvedValue({ data: null, error });
}

function makeSupabase(rpcError: unknown = null) {
  return {
    rpc: makeRpc(rpcError),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
  };
}

describe('savePushSubscription', () => {
  it('returns error when subscription is missing keys', async () => {
    const supabase = makeSupabase();
    const result = await savePushSubscription(supabase as never, { endpoint: 'https://x.com' } as PushSubscriptionJSON);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('calls upsert_push_subscription rpc with valid data', async () => {
    const rpc = makeRpc();
    const supabase = { rpc };
    const sub = {
      endpoint: 'https://push.service.com/x',
      keys: { p256dh: 'abc', auth: 'xyz' },
    } as PushSubscriptionJSON;

    const result = await savePushSubscription(supabase as never, sub);
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('upsert_push_subscription', expect.objectContaining({
      p_endpoint: 'https://push.service.com/x',
      p_p256dh: 'abc',
      p_auth: 'xyz',
    }));
  });

  it('returns error when rpc fails', async () => {
    const supabase = makeSupabase({ message: 'DB error', code: 'X' });
    const sub = {
      endpoint: 'https://push.service.com/x',
      keys: { p256dh: 'abc', auth: 'xyz' },
    } as PushSubscriptionJSON;
    const result = await savePushSubscription(supabase as never, sub);
    expect(result.ok).toBe(false);
  });
});

describe('removePushSubscription', () => {
  it('calls delete_push_subscription rpc', async () => {
    const rpc = makeRpc();
    const supabase = { rpc };
    await removePushSubscription(supabase as never, 'https://push.service.com/x');
    expect(rpc).toHaveBeenCalledWith('delete_push_subscription', {
      p_endpoint: 'https://push.service.com/x',
    });
  });
});

describe('getActiveSubscriptions', () => {
  it('returns empty list when no active subscriptions', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb: (v: unknown) => void) => {
        cb({ data: [], error: null });
      }),
    }));
    const supabase = { from };
    const result = await getActiveSubscriptions(supabase as never, 'user-1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it('returns error when query fails', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb: (v: unknown) => void) => {
        cb({ data: null, error: { message: 'DB error', code: '400' } });
      }),
    }));
    const supabase = { from };
    const result = await getActiveSubscriptions(supabase as never, 'user-1');
    expect(result.ok).toBe(false);
  });
});
