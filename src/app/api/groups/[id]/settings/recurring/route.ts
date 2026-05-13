import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('group_recurring_schedules')
    .select('*')
    .eq('group_id', params.id)
    .eq('active', true)
    .order('day_of_week', { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const body = await req.json() as {
    day_of_week: number;
    scheduled_time: string;
    field_name: string;
    field_maps_url?: string;
    modality: string;
    notes?: string;
    days_ahead?: number;
  };

  const { data, error } = await supabase
    .from('group_recurring_schedules')
    .upsert(
      {
        group_id: params.id,
        day_of_week: body.day_of_week,
        scheduled_time: body.scheduled_time,
        field_name: body.field_name,
        field_maps_url: body.field_maps_url ?? null,
        modality: body.modality,
        notes: body.notes ?? null,
        days_ahead: body.days_ahead ?? 4,
        active: true,
      },
      { onConflict: 'group_id,day_of_week' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get('scheduleId');

  if (!scheduleId) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase
    .from('group_recurring_schedules')
    .update({ active: false })
    .eq('id', scheduleId)
    .eq('group_id', params.id);

  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
  return NextResponse.json({ ok: true });
}
