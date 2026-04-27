import { NextResponse } from 'next/server';
import { getInvitePreview } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = (await request.json()) as { inviteCode?: string };
  const result = await getInvitePreview(createServerSupabaseClient(), body.inviteCode ?? '');

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
