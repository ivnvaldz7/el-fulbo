import { NextResponse } from 'next/server';
import { safeJson, errorResponse } from '@/lib/api-helpers';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const validateInviteSchema = z.object({
  inviteCode: z.string({ required_error: 'El código de invitación es requerido' })
    .min(1, 'El código de invitación no puede estar vacío'),
});

export async function POST(request: Request) {
  const rawBody = await safeJson(request);
  const parsed = validateInviteSchema.safeParse(rawBody);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return errorResponse({ code: 'VALIDATION_ERROR', message: firstError?.message ?? 'Datos inválidos' }, 400);
  }

  const result = await resolveInviteState(createServerSupabaseClient(), parsed.data.inviteCode);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  if (result.data.kind === 'invalid') {
    return errorResponse(
      {
        code: 'INVITE_CODE_INVALID',
        message: 'No encontramos ese código. Revisá el link o pedile uno nuevo a quien te invitó.',
      },
      400,
    );
  }

  return NextResponse.json(result);
}
