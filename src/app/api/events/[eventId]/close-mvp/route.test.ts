import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerSupabaseClientMock = vi.hoisted(() => vi.fn());
const createServiceSupabaseClientMock = vi.hoisted(() => vi.fn());
const sendPushToUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: createServiceSupabaseClientMock,
}));

vi.mock('@/lib/services/push-sender.service', () => ({
  sendPushToUser: sendPushToUserMock,
}));

import { POST } from './route';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '22222222-2222-4222-8222-222222222222';
const PLAYER_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const MVP_USER_ID = '55555555-5555-4555-8555-555555555555';

function makeRequest(body: unknown = { tiebreakerPlayerId: null }) {
  return new Request(`http://localhost:3000/api/events/${EVENT_ID}/close-mvp`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(eventId = EVENT_ID) {
  return { params: Promise.resolve({ eventId }) };
}

function makeQuery(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };

  return query;
}

function makeServerSupabase(options?: {
  user?: { id: string } | null;
  event?: unknown;
  isAuthorized?: boolean;
  closeError?: unknown;
  closedEvent?: unknown;
  player?: unknown;
}) {
  const event = options && 'event' in options ? options.event : { id: EVENT_ID, group_id: GROUP_ID };
  const closedEvent = options && 'closedEvent' in options
    ? options.closedEvent
    : { mvp_player_id: PLAYER_ID, group_id: GROUP_ID };
  const player = options && 'player' in options ? options.player : { user_id: MVP_USER_ID };

  const rpc = vi.fn((name: string) => {
    if (name === 'is_group_admin_or_owner') {
      return Promise.resolve({ data: options?.isAuthorized ?? true, error: null });
    }

    if (name === 'close_mvp_voting') {
      return Promise.resolve({ data: null, error: options?.closeError ?? null });
    }

    return Promise.resolve({ data: null, error: null });
  });

  const from = vi.fn()
    .mockReturnValueOnce(makeQuery(event))
    .mockReturnValueOnce(makeQuery(closedEvent))
    .mockReturnValueOnce(makeQuery(player));

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.user === undefined ? { id: USER_ID } : options.user },
        error: null,
      }),
    },
    from,
    rpc,
  };
}

describe('POST /api/events/[eventId]/close-mvp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendPushToUserMock.mockResolvedValue(undefined);
    createServiceSupabaseClientMock.mockReturnValue({ service: true });
  });

  it('returns 400 when eventId is invalid', async () => {
    const res = await POST(makeRequest(), makeParams('not-a-uuid'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no authenticated user', async () => {
    const supabase = makeServerSupabase({ user: null });
    createServerSupabaseClientMock.mockResolvedValue(supabase);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the event does not exist or is not visible through RLS', async () => {
    const supabase = makeServerSupabase({ event: null });
    createServerSupabaseClientMock.mockResolvedValue(supabase);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it('returns 403 when the user is not admin or owner', async () => {
    const supabase = makeServerSupabase({ isAuthorized: false });
    createServerSupabaseClientMock.mockResolvedValue(supabase);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('is_group_admin_or_owner', { gid: GROUP_ID });
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it('closes MVP voting for authorized users before using service role for push', async () => {
    const supabase = makeServerSupabase();
    const serviceSupabase = { service: true };
    createServerSupabaseClientMock.mockResolvedValue(supabase);
    createServiceSupabaseClientMock.mockReturnValue(serviceSupabase);

    const res = await POST(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, data: { closed: true } });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'is_group_admin_or_owner', { gid: GROUP_ID });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'close_mvp_voting', {
      p_event_id: EVENT_ID,
      p_tiebreaker_player_id: null,
    });
    expect(createServiceSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(sendPushToUserMock).toHaveBeenCalledWith(serviceSupabase, MVP_USER_ID, {
      title: '¡Sos el MVP!',
      body: 'Te votaron como el mejor del partido.',
      url: `/groups/${GROUP_ID}/events/${EVENT_ID}`,
    });

    const closeRpcOrder = supabase.rpc.mock.invocationCallOrder[1]!;
    const serviceRoleOrder = createServiceSupabaseClientMock.mock.invocationCallOrder[0]!;
    expect(serviceRoleOrder).toBeGreaterThan(closeRpcOrder);
  });
});
