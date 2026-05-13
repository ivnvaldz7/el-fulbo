import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getNotifications } from '@/lib/services/notifications.service';

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '30', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const result = await getNotifications(supabase, limit, offset);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
