import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { deliverPendingPushes } from '@/lib/services/push-sender.service';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'No tenés permisos.' } }, { status: 403 });
  }

  const supabase = createServiceSupabaseClient();
  const sent = await deliverPendingPushes(supabase);

  return NextResponse.json({ ok: true, data: { sent } });
}
