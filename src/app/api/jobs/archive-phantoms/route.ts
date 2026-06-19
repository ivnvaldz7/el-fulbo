import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { archiveStalePhantoms } from '@/lib/services/phantom-player.service';
import { successResponse, cronAuthError, handleApiError, errorResponse } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return cronAuthError();
  }

  try {
    const supabase = createServiceSupabaseClient();
    const result = await archiveStalePhantoms(supabase);
    if (!result.ok) return errorResponse(result.error);
    return successResponse({ archived: result.data });
  } catch (err) {
    return handleApiError(err);
  }
}
