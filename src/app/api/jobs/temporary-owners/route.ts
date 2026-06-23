import { NextResponse } from 'next/server';
import { runTemporaryOwnerJobs } from '@/lib/services/temporary-owners.service';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { cronAuthError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  try {
    const supabase = createServiceSupabaseClient();
    const result = await runTemporaryOwnerJobs(supabase);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? { code: 'UNKNOWN', message: 'Job failed' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: { code: 'TEMP_OWNERS_ERROR', message } },
      { status: 500 }
    );
  }
}
