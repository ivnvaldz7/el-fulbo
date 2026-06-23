import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() porque vi.mock se hoisteada al tope del archivo
// ---------------------------------------------------------------------------
const exchangeCodeForSessionMock = vi.hoisted(() => vi.fn());
const upsertCurrentUserMock = vi.hoisted(() => vi.fn());

let setAllCallback: ((cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void) | null =
  null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(
    (_url: string, _key: string, opts: { cookies: { getAll: () => void; setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void } }) => {
      // Guardar setAll para que los tests puedan invocarlo directamente
      // o para que exchangeCodeForSessionMock lo use internamente.
      setAllCallback = opts.cookies.setAll;

      return {
        auth: {
          exchangeCodeForSession: exchangeCodeForSessionMock,
        },
      };
    },
  ),
}));

vi.mock('@/lib/services/auth.service', () => ({
  upsertCurrentUser: upsertCurrentUserMock,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(url: string): NextRequest {
  return new NextRequest(url);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  setAllCallback = null;

  // Por defecto exchangeCodeForSession no invoca setAll.
  // Los tests de cookies sobreescriben este comportamiento.
  exchangeCodeForSessionMock.mockResolvedValue({ error: null });
  upsertCurrentUserMock.mockResolvedValue({ ok: true, data: { id: 'user-1' } });
});

describe('GET /auth/callback', () => {
  it('redirects to /groups by default when no next param', async () => {
    const req = createRequest('http://localhost:3000/auth/callback?code=abc123');
    const res = await GET(req);

    // NextResponse.redirect usa 307 (Temporary Redirect), no 302
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/groups');
  });

  it('redirects to the next param when provided', async () => {
    const req = createRequest('http://localhost:3000/auth/callback?code=abc123&next=%2Fdashboard');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/dashboard');
  });

  it('exchanges the code for a session', async () => {
    const req = createRequest('http://localhost:3000/auth/callback?code=abc123');
    await GET(req);

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('abc123');
  });

  it('upserts the current user after successful exchange', async () => {
    const req = createRequest('http://localhost:3000/auth/callback?code=abc123');
    await GET(req);

    expect(upsertCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT upsert user when exchange fails', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: { message: 'Invalid code', code: 'bad_code' },
    });

    const req = createRequest('http://localhost:3000/auth/callback?code=bad_code');
    await GET(req);

    expect(upsertCurrentUserMock).not.toHaveBeenCalled();
  });

  it('redirects to /login with error when exchange fails', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: { message: 'Code expired', code: 'expired_code' },
    });

    const req = createRequest('http://localhost:3000/auth/callback?code=expired_code');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('error=');
  });

  it('redirects to next when no code is present', async () => {
    const req = createRequest('http://localhost:3000/auth/callback');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/groups');
  });

  it('copies cookies from setAll onto the redirect response', async () => {
    // Configurar exchangeCodeForSessionMock para que invoque setAll
    // internamente (como hace Supabase en la vida real).
    exchangeCodeForSessionMock.mockImplementation(async () => {
      setAllCallback?.([
        { name: 'sb-access-token', value: 'tok_abc', options: { httpOnly: true, path: '/', sameSite: 'lax' } },
        { name: 'sb-refresh-token', value: 'ref_xyz', options: { httpOnly: true, path: '/', sameSite: 'lax' } },
      ]);
      return { error: null };
    });

    const req = createRequest('http://localhost:3000/auth/callback?code=abc123');
    const res = await GET(req);

    // Las cookies seteadas vía setAll durante exchangeCodeForSession
    // deberían estar en el response final
    const accessToken = res.cookies.get('sb-access-token');
    expect(accessToken).toBeDefined();
    expect(accessToken?.value).toBe('tok_abc');

    const refreshToken = res.cookies.get('sb-refresh-token');
    expect(refreshToken).toBeDefined();
    expect(refreshToken?.value).toBe('ref_xyz');
  });

  it('handles multiple setAll batches (the bug scenario)', async () => {
    // Simular Supabase llamando a setAll múltiples veces:
    // 1. Limpiar cookies viejas
    // 2. Setear cookies nuevas
    exchangeCodeForSessionMock.mockImplementation(async () => {
      setAllCallback?.([{ name: 'sb-old-token', value: '', options: { maxAge: 0, path: '/' } }]);
      setAllCallback?.([{ name: 'sb-new-token', value: 'tok_new', options: { httpOnly: true, path: '/' } }]);
      return { error: null };
    });

    const req = createRequest('http://localhost:3000/auth/callback?code=abc123');
    const res = await GET(req);

    // Ambas cookies deberían estar en el response con sus opciones intactas
    const oldToken = res.cookies.get('sb-old-token');
    expect(oldToken).toBeDefined();
    expect(oldToken?.value).toBe('');

    const newToken = res.cookies.get('sb-new-token');
    expect(newToken).toBeDefined();
    expect(newToken?.value).toBe('tok_new');
  });
});
