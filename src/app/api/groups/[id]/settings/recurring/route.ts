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
    const { data, error } = await getRecurringSchedules(supabase, params.id);

    if (error) return errorResponse(error, 400);
    return successResponse(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await req.json();

    const { data, error } = await createRecurringSchedule(supabase, params.id, body);

    if (error) return errorResponse(error, 400);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('scheduleId');

    const { error } = await deleteRecurringSchedule(supabase, params.id, scheduleId ?? '');

    if (error) return errorResponse(error, 400);
    return successResponse({});
  } catch (err) {
    return handleApiError(err);
  }
}
