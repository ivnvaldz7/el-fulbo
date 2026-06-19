import { NextResponse } from 'next/server';
import { safeJson } from '@/lib/api-helpers';
import { reactivatePlayer } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = (await safeJson(request)) as { playerId?: string };
  const result = await reactivatePlayer(createServerSupabaseClient(), body.playerId ?? '');

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
