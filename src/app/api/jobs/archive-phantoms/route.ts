import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { archiveStalePhantoms } from '@/lib/services/phantom-player.service';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'No tenés permisos.' } }, { status: 403 });
  }

  const supabase = createServiceSupabaseClient();
  const archived = await archiveStalePhantoms(supabase);

  return NextResponse.json({ ok: true, data: { archived } });
}
