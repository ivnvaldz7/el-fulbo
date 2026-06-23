import { NextResponse } from 'next/server';
import { safeJson } from '@/lib/api-helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPhantomPlayer } from '@/lib/services/phantom-player.service';
import { createPhantomSchema } from '@/lib/validations/phantom-player';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const body = await safeJson(request);
  const parsed = createPhantomSchema.safeParse({ ...body, groupId: params.id });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const result = await createPhantomPlayer(supabase, parsed.data);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
