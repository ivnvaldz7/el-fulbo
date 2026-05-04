import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EventsService } from '@/lib/services/events.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const supabase = createServerSupabaseClient();
  const eventsService = new EventsService(supabase);

  try {
    const attendees = await eventsService.getEventAttendees(params.eventId);
    return NextResponse.json(attendees);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'No pudimos traer la asistencia.' },
      { status: 500 },
    );
  }
}
