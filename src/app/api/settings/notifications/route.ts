import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { saveNotificationPreferences } from '@/lib/services/notifications.service';
import type { NotificationPreferences } from '@/lib/services/notifications.service';

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'JSON malformado.' } },
      { status: 400 }
    );
  }
  const result = await saveNotificationPreferences(supabase, user.id, body);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
