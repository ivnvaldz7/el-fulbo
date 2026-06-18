import { createServerSupabaseClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import {
  getRecurringSchedules,
  createRecurringSchedule,
  deleteRecurringSchedule,
} from '@/lib/services/recurring-schedules.service';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const result = await getRecurringSchedules(supabase, params.id);

    if (!result.ok) return errorResponse(result.error, 400);
    return successResponse(result.data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await req.json();

    const result = await createRecurringSchedule(supabase, params.id, body);

    if (!result.ok) return errorResponse(result.error, 400);
    return successResponse(result.data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('scheduleId');

    const result = await deleteRecurringSchedule(supabase, params.id, scheduleId ?? '');

    if (!result.ok) return errorResponse(result.error, 400);
    return successResponse({});
  } catch (err) {
    return handleApiError(err);
  }
}
