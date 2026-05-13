import { NextResponse } from 'next/server';
import { assignOwner, removeOwner } from '@/lib/services/owners.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Body = {
  action?: 'assign' | 'remove';
  userId?: string;
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as Body;
  const supabase = createServerSupabaseClient();

  if (!body.action || !body.userId) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Faltan datos para gestionar owners.' } },
      { status: 400 },
    );
  }

  const result =
    body.action === 'assign'
      ? await assignOwner(supabase, { groupId: params.id, userId: body.userId })
      : await removeOwner(supabase, { groupId: params.id, userId: body.userId });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
