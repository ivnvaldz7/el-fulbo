import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from './middleware';

// ---------------------------------------------------------------------------
// Mock @supabase/ssr — control createServerClient and capture the setAll
// callback so we can verify cookies are written to the response.
// ---------------------------------------------------------------------------
interface CookieOp {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

let capturedSetAll: ((cookies: CookieOp[]) => void) | null = null;
let getUserMock = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: { cookies: { getAll: () => void; setAll: (cookies: CookieOp[]) => void } }) => {
    // Store the setAll so tests can invoke it
    capturedSetAll = opts.cookies.setAll;

    return {
      auth: {
        getUser: getUserMock,
      },
    };
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(url = 'http://localhost:3000/groups', cookieHeader?: string): NextRequest {
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  capturedSetAll = null;
  getUserMock = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@example.com' } },
    error: null,
  });
});

describe('middleware', () => {
  it('returns a NextResponse', async () => {
    const req = createRequest();
    const res = await middleware(req);

    expect(res).toBeInstanceOf(NextResponse);
  });

  it('calls getUser on every request', async () => {
    const req = createRequest();
    await middleware(req);

    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it('passes auth cookies from setAll onto the response', async () => {
    const req = createRequest();
    const res = await middleware(req);

    // Simulate what Supabase auth does during token refresh: call setAll
    expect(capturedSetAll).not.toBeNull();
    capturedSetAll!([
      { name: 'sb-access-token', value: 'tok_abc', options: { httpOnly: true, path: '/', sameSite: 'lax' } },
      { name: 'sb-refresh-token', value: 'ref_xyz', options: { httpOnly: true, path: '/', sameSite: 'lax' } },
    ]);

    // The cookies should be accessible from the response cookie jar
    const accessToken = res.cookies.get('sb-access-token');
    expect(accessToken).toBeDefined();
    expect(accessToken?.value).toBe('tok_abc');

    const refreshToken = res.cookies.get('sb-refresh-token');
    expect(refreshToken).toBeDefined();
    expect(refreshToken?.value).toBe('ref_xyz');
  });

  it('handles multiple setAll calls without losing cookies', async () => {
    const req = createRequest();
    const res = await middleware(req);

    expect(capturedSetAll).not.toBeNull();

    // First batch: clear old cookies
    capturedSetAll!([
      { name: 'sb-old-token', value: '', options: { maxAge: 0, path: '/' } },
    ]);

    // Second batch: set new cookies (this was the bug — without the fix,
    // the response recreation in each setAll would LOSE the maxAge:0)
    capturedSetAll!([
      { name: 'sb-new-token', value: 'tok_new', options: { httpOnly: true, path: '/', sameSite: 'lax' } },
    ]);

    // Both cookies should be on the final response
    const oldToken = res.cookies.get('sb-old-token');
    expect(oldToken).toBeDefined();
    expect(oldToken?.value).toBe('');

    const newToken = res.cookies.get('sb-new-token');
    expect(newToken).toBeDefined();
    expect(newToken?.value).toBe('tok_new');
  });

  it('does not crash when no auth cookies are present', async () => {
    getUserMock = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = createRequest();
    const res = await middleware(req);

    expect(res).toBeInstanceOf(NextResponse);
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });
});
