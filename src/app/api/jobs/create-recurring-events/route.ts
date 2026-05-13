import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (expected && authHeader !== expected) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const supabase = createServiceSupabaseClient();
  const now = new Date();

  const { data: schedules } = await supabase
    .from('group_recurring_schedules')
    .select('*, groups(admin_user_id)')
    .eq('active', true);

  if (!schedules?.length) {
    return NextResponse.json({ ok: true, data: { created: 0 } });
  }

  let created = 0;

  for (const schedule of schedules) {
    const dayOfWeek = schedule.day_of_week as number;
    const [hours, minutes] = (schedule.scheduled_time as string).split(':').map(Number);

    const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
    const nextOccurrence = new Date(now);
    nextOccurrence.setDate(now.getDate() + daysUntil);
    nextOccurrence.setHours(hours, minutes, 0, 0);

    const daysUntilEvent = (nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilEvent > (schedule.days_ahead as number)) continue;

    const windowStart = new Date(nextOccurrence.getTime() - 2 * 3600_000).toISOString();
    const windowEnd = new Date(nextOccurrence.getTime() + 2 * 3600_000).toISOString();

    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', schedule.group_id)
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd)
      .neq('status', 'cancelled');

    if ((count ?? 0) > 0) continue;

    const { data: eventRow, error } = await supabase
      .from('events')
      .insert({
        group_id: schedule.group_id,
        modality: schedule.modality,
        field_name: schedule.field_name,
        field_maps_url: schedule.field_maps_url ?? null,
        scheduled_at: nextOccurrence.toISOString(),
        notes: schedule.notes ?? null,
        status: 'scheduled',
        created_by_user_id: (schedule as any).groups.admin_user_id,
        team_a_name: 'Equipo A',
        team_b_name: 'Equipo B',
      })
      .select('id')
      .single();

    if (error || !eventRow) continue;

    const { data: players } = await supabase
      .from('players')
      .select('user_id')
      .eq('group_id', schedule.group_id)
      .eq('stats_status', 'approved')
      .is('archived_at', null)
      .not('user_id', 'is', null);

    if (players?.length) {
      await supabase.from('notifications').insert(
        players.map((p) => ({
          user_id: p.user_id,
          type: 'event_created',
          payload: {
            event_id: eventRow.id,
            group_id: schedule.group_id,
            field_name: schedule.field_name,
            scheduled_at: nextOccurrence.toISOString(),
            is_recurring: true,
          },
        })),
      );
    }

    created++;
  }

  return NextResponse.json({ ok: true, data: { created } });
}
