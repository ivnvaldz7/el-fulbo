import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signInWithGoogle, upsertCurrentUser } from './auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Crea un mock de SupabaseClient para `upsertCurrentUser`.
 * Devuelve el mock junto con el `upsert` individual para poder
 * hacer assertions directas sobre él.
 */
function createUpsertMock(options?: {
  user?: { id: string; email: string; user_metadata?: Record<string, unknown> } | null;
  getUserError?: { message: string; code: string } | null;
  upsertError?: { message: string; code: string } | null;
}) {
  const {
    user = { id: '44444444-4444-4444-4444-444444444441', email: 'test@example.com' },
    getUserError = null,
    upsertError = null,
  } = options ?? {};

  const upsert = vi.fn().mockResolvedValue({ error: upsertError });

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: getUserError,
      }),
    },
    from: vi.fn().mockReturnValue({ upsert }),
  } as unknown as SupabaseClient;

  return { supabase, upsert };
}

// ---------------------------------------------------------------------------
// signInWithGoogle
// ---------------------------------------------------------------------------

describe('signInWithGoogle', () => {
  it('returns ok with Google OAuth URL when sign-in succeeds', async () => {
    const supabase = {
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: 'https://accounts.google.com/o/oauth2/auth/choose?redirect_uri=http://localhost:3000/auth/callback' },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    const result = await signInWithGoogle(supabase, '/groups');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toContain('accounts.google.com');
    }
  });

  it('passes the correct redirectTo including next path', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/auth/...' },
      error: null,
    });
    const supabase = {
      auth: { signInWithOAuth },
    } as unknown as SupabaseClient;

    await signInWithGoogle(supabase, '/groups');

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/auth/callback?next='),
      },
    });
  });

  it('maps the error when OAuth returns a Supabase error', async () => {
    const supabase = {
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: { message: 'invalid_client', code: 'invalid_request' },
        }),
      },
    } as unknown as SupabaseClient;

    const result = await signInWithGoogle(supabase, '/');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
    }
  });

  it('returns error when OAuth returns no URL and no error', async () => {
    const supabase = {
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    const result = await signInWithGoogle(supabase, '/');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });
});

// ---------------------------------------------------------------------------
// upsertCurrentUser
// ---------------------------------------------------------------------------

describe('upsertCurrentUser', () => {
  it('returns ok with user ID when user exists and upsert succeeds', async () => {
    const { supabase } = createUpsertMock({});
    const result = await upsertCurrentUser(supabase);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('44444444-4444-4444-4444-444444444441');
    }
  });

  it('upserts the user record with metadata', async () => {
    const { supabase, upsert } = createUpsertMock({
      user: {
        id: '44444444-4444-4444-4444-444444444441',
        email: 'fulbito@example.com',
        user_metadata: { full_name: 'Fulbito García', avatar_url: 'https://example.com/avatar.jpg' },
      },
    });

    await upsertCurrentUser(supabase);

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(upsert).toHaveBeenCalledWith({
      id: '44444444-4444-4444-4444-444444444441',
      email: 'fulbito@example.com',
      display_name: 'Fulbito García',
      photo_url: 'https://example.com/avatar.jpg',
      last_login_at: expect.any(String),
    });
  });

  it('falls back to email name when user_metadata is missing full_name', async () => {
    const { supabase, upsert } = createUpsertMock({
      user: { id: '44444444-4444-4444-4444-444444444442', email: 'fulbito@gmail.com', user_metadata: {} },
    });

    await upsertCurrentUser(supabase);

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'fulbito' }),
    );
  });

  it('returns error when getUser fails', async () => {
    const { supabase } = createUpsertMock({
      getUserError: { message: 'Token expired', code: '401' },
    });

    const result = await upsertCurrentUser(supabase);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns error when there is no user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    const result = await upsertCurrentUser(supabase);

    expect(result.ok).toBe(false);
  });

  it('returns error when user has no email', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '44444444-4444-4444-4444-444444444441', email: null } },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    const result = await upsertCurrentUser(supabase);

    expect(result.ok).toBe(false);
  });

  it('returns error when upsert fails', async () => {
    const { supabase } = createUpsertMock({
      upsertError: { message: 'duplicate key violates unique constraint', code: '23505' },
    });

    const result = await upsertCurrentUser(supabase);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('truncates display name to 40 characters', async () => {
    const name = 'a'.repeat(100);
    const { supabase, upsert } = createUpsertMock({
      user: {
        id: '44444444-4444-4444-4444-444444444441',
        email: 'test@example.com',
        user_metadata: { full_name: name },
      },
    });

    await upsertCurrentUser(supabase);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: name.slice(0, 40) }),
    );
  });
});
