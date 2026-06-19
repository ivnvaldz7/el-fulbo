import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function applyRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 50; // 50 requests per minute per IP
  const windowMs = 60 * 1000;

  const record = rateLimitMap.get(ip);
  if (!record || record.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function middleware(request: NextRequest) {
  // Rate Limiting (Simple In-Memory Edge Cache)
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  if (ip !== 'unknown' && !applyRateLimit(ip)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  // CSRF Protection
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && origin !== `https://${host}` && origin !== `http://${host}`) {
      return new NextResponse('CSRF Validation Failed', { status: 403 });
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session and updates cookies if needed.
  // IMPORTANT: must be called before any logic that checks session state.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
