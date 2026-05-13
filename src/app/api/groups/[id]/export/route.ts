import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import {
  fetchGroupData,
  anonymizeData,
  buildGroupZip,
  exportFileName,
} from '@/lib/services/export.service';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const userSupabase = createServerSupabaseClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' } },
      { status: 401 },
    );
  }

  const [isAdminRes, isOwnerRes] = await Promise.all([
    userSupabase.rpc('is_group_admin', { gid: params.id }),
    userSupabase.rpc('is_group_owner', { gid: params.id }),
  ]);

  const isAdmin = Boolean(isAdminRes.data);
  const isOwner = Boolean(isOwnerRes.data);

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: 'No tenés permisos para exportar.' } },
      { status: 403 },
    );
  }

  const { data: userProfile } = await userSupabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const exportedByName = (userProfile?.display_name as string | undefined) ?? 'desconocido';

  const serviceSupabase = createServiceSupabaseClient();
  const groupData = await fetchGroupData(serviceSupabase, params.id);
  const anonymized = anonymizeData(groupData, user.id, isAdmin, exportedByName);
  const zipBuffer = await buildGroupZip(anonymized);
  const filename = exportFileName(anonymized.groupName);

  return new Response(Buffer.from(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(zipBuffer.byteLength),
    },
  });
}
