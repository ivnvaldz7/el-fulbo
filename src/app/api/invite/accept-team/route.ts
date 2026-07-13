import { NextResponse } from 'next/server';
import { safeJson } from '@/lib/api-helpers';
import { TeamsService } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = (await safeJson(request)) as { inviteCode?: string };
  const supabase = await createServerSupabaseClient();
  const service = new TeamsService(supabase);
  const result = await service.acceptTeamInvite(body.inviteCode ?? '');

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
