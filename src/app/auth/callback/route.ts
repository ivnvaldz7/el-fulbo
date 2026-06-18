import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { upsertCurrentUser } from '@/lib/services/auth.service';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // Leer next del query param. Si no está (se perdió en el redirect OAuth de Supabase),
  // fallback a cookie `pending_next` seteada por GoogleSignInButton antes del redirect.
  const next =
    requestUrl.searchParams.get('next') ??
    request.cookies.get('pending_next')?.value ??
    '/groups';

  if (code) {
    // Acumulá las cookies que Supabase setea DURANTE exchangeCodeForSession,
    // así después las copiamos al response final. Si usamos cookies() de
    // next/headers, las cookies se escriben en un "implicit response" que
    // NextResponse.redirect() descarta — y el usuario nunca recibe las cookies.
    const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              pendingCookies.push({ name, value, options });
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorResponse = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
      errorResponse.cookies.set('pending_next', '', { path: '/', maxAge: 0 });
      return errorResponse;
    }

    await upsertCurrentUser(supabase);

    const response = NextResponse.redirect(new URL(next, requestUrl.origin));
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }

    // Limpiar la cookie pendiente para evitar redirects stale
    response.cookies.set('pending_next', '', { path: '/', maxAge: 0 });

    return response;
  }

  const fallbackResponse = NextResponse.redirect(new URL(next, requestUrl.origin));
  fallbackResponse.cookies.set('pending_next', '', { path: '/', maxAge: 0 });
  return fallbackResponse;
}
