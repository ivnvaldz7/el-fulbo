import { NextResponse } from 'next/server';
import { runTemporaryOwnerJobs } from '@/lib/services/temporary-owners.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'No tenés permisos para hacer eso.' } }, { status: 403 });
  }

  const supabase = createServerSupabaseClient();
  const result = await runTemporaryOwnerJobs(supabase);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
