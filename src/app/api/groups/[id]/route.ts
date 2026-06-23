import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api-helpers';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401);
  }

  // Verificar que sea admin
  const { data: group } = await supabase
    .from('groups')
    .select('admin_user_id')
    .eq('id', params.id)
    .single();

  if (!group || group.admin_user_id !== user.id) {
    return errorResponse({ code: 'FORBIDDEN', message: 'Forbidden' }, 403);
  }

  // Delete the group. Supabase RLS allows admins to delete.
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', params.id);

  if (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: error.message }, 500);
  }

  return successResponse(null);
}
