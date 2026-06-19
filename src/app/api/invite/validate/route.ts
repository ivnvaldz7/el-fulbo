import { NextResponse } from 'next/server';
import { safeJson } from '@/lib/api-helpers';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = (await safeJson(request)) as { inviteCode?: string };
  const result = await resolveInviteState(createServerSupabaseClient(), body.inviteCode ?? '');

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  if (result.data.kind === 'invalid') {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVITE_CODE_INVALID',
          message: 'No encontramos ese código. Revisá el link o pedile uno nuevo a quien te invitó.',
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
