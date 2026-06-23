import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { archivePhantomPlayer } from '@/lib/services/phantom-player.service';

export async function POST(
  _request: Request, props: { params: Promise<{ id: string; playerId: string }> }) {
  const params = await props.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const result = await archivePhantomPlayer(supabase, params.playerId);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
