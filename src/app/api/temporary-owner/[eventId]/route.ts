import { NextResponse } from 'next/server';
import { respondTemporaryOwnerInvite } from '@/lib/services/temporary-owners.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Body = {
  accept?: boolean;
};

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'JSON malformado.' } },
      { status: 400 }
    );
  }
  const supabase = await createServerSupabaseClient();

  if (typeof body.accept !== 'boolean') {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Faltan datos para responder la designación.' } },
      { status: 400 },
    );
  }

  const result = await respondTemporaryOwnerInvite(supabase, {
    eventId: params.eventId,
    accept: body.accept,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
