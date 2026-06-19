import { NextResponse } from 'next/server';
import { safeJson } from '@/lib/api-helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { savePushSubscription, removePushSubscription } from '@/lib/services/push-subscription.service';

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  let sub;
  try {
    sub = await request.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'JSON malformado.' } },
      { status: 400 }
    );
  }
  const result = await savePushSubscription(supabase, sub);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const { endpoint } = (await safeJson(request)) as { endpoint: string };
  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Falta el endpoint.' } },
      { status: 400 },
    );
  }

  const result = await removePushSubscription(supabase, endpoint);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
