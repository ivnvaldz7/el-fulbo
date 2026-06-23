import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import {
  fetchGroupData,
  anonymizeData,
  buildGroupZip,
  exportFileName,
} from '@/lib/services/export.service';
import { handleApiError, errorResponse } from '@/lib/api-helpers';

export async function GET(
  _request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userSupabase = await createServerSupabaseClient();
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
    const groupDataResult = await fetchGroupData(serviceSupabase, params.id);
    if (!groupDataResult.ok) return errorResponse(groupDataResult.error);
    const anonymized = anonymizeData(groupDataResult.data, user.id, isAdmin, exportedByName);
    const zipBuffer = await buildGroupZip(anonymized);
    const filename = exportFileName(anonymized.groupName);

    return new Response(Buffer.from(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.byteLength),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
