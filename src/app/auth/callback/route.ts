import { NextResponse } from 'next/server';
import { upsertCurrentUser } from '@/lib/services/auth.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/welcome';
  const supabase = createServerSupabaseClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    await upsertCurrentUser(supabase);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
