import { NextResponse } from 'next/server';
import { safeJson } from '@/lib/api-helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { initiateConversion } from '@/lib/services/phantom-player.service';
import { convertPhantomSchema } from '@/lib/validations/phantom-player';

export async function POST(
  request: Request,
  { params }: { params: { id: string; playerId: string } },
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const body = await safeJson(request);
  const parsed = convertPhantomSchema.safeParse({ playerId: params.playerId, email: body.email });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Email inválido.' } },
      { status: 400 },
    );
  }

  const result = await initiateConversion(supabase, parsed.data);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.VERCEL_URL
    ?? 'http://localhost:3000';
  const conversionUrl = `${appUrl}/convert-phantom/${result.data.token}`;

  console.info('[phantom-conversion] Link generado para', parsed.data.email, '→', conversionUrl);

  return NextResponse.json({ ok: true });
}
