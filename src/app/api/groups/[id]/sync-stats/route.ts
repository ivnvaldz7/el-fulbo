import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { syncAllPendingStats } from '@/lib/services/player.service';

export async function POST(
  _request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const { data: isAdmin } = await supabase.rpc('is_group_admin_or_owner', { gid: params.id });

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: 'Solo administradores pueden sincronizar stats.' } },
      { status: 403 },
    );
  }

  const result = await syncAllPendingStats(supabase);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
