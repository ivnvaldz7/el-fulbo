import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deletePhantomPlayer } from '@/lib/services/phantom-player.service';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; playerId: string } },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const result = await deletePhantomPlayer(supabase, params.playerId);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
