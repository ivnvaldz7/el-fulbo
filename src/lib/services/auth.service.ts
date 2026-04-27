import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError } from './errors';

export async function signInWithGoogle(
  supabase: SupabaseClient,
  nextPath: string,
): Promise<Result<{ url: string }>> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  if (!data.url) {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  return { ok: true, data: { url: data.url } };
}

export async function upsertCurrentUser(supabase: SupabaseClient): Promise<Result<{ id: string }>> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesion.' } };
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email.split('@')[0] ??
    'Jugador';

  const { error } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    display_name: String(displayName).slice(0, 40),
    photo_url: user.user_metadata?.avatar_url ?? null,
    last_login_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: { id: user.id } };
}
