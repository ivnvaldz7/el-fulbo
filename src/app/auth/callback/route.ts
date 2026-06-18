import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { upsertCurrentUser } from '@/lib/services/auth.service';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/groups';

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
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
    }

    await upsertCurrentUser(supabase);

    const response = NextResponse.redirect(new URL(next, requestUrl.origin));
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }

    return response;
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
