import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { deliverPendingPushes } from '@/lib/services/push-sender.service';
import { successResponse, cronAuthError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  try {
    const supabase = createServiceSupabaseClient();
    const sent = await deliverPendingPushes(supabase);
    return successResponse({ sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: { code: 'PUSH_DELIVERY_ERROR', message } },
      { status: 500 }
    );
  }
}
