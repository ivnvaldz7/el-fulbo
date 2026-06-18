import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EventsService } from '@/lib/services/events.service';
import { handleApiError, successResponse } from '@/lib/api-helpers';

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } },
) {
  try {
    const supabase = createServerSupabaseClient();
    const eventsService = new EventsService(supabase);
    const result = await eventsService.getEventAttendees(params.eventId);
    if (!result.ok) throw new Error(result.error.message);
    return successResponse(result.data);
  } catch (err) {
    return handleApiError(err);
  }
}
