import { NextResponse } from 'next/server';
import { cronAuthError } from '@/lib/api-helpers';
import { runAppUpdateCampaign } from '@/lib/services/app-update-campaign.service';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  const supabase = createServiceSupabaseClient();
  const result = await runAppUpdateCampaign(supabase);

  return NextResponse.json({ ok: result.errors.length === 0, data: result });
}
