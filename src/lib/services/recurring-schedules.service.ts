import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError, validationError } from '@/lib/services/errors';
import { recurringScheduleSchema, type RecurringScheduleInput } from '@/lib/validations/recurring-schedule';

export interface RecurringSchedule {
  id: string;
  group_id: string;
  day_of_week: number;
  scheduled_time: string;
  field_name: string;
  field_maps_url: string | null;
  modality: string;
  notes: string | null;
  days_ahead: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getRecurringSchedules(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Result<RecurringSchedule[]>> {
  const { data, error } = await supabase
    .from('group_recurring_schedules')
    .select('*')
    .eq('group_id', groupId)
    .eq('active', true)
    .order('day_of_week', { ascending: true });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: data ?? [] };
}

export async function createRecurringSchedule(
  supabase: SupabaseClient,
  groupId: string,
  input: unknown,
): Promise<Result<RecurringSchedule>> {
  const validation = recurringScheduleSchema.safeParse(input);
  if (!validation.success) {
    return { ok: false, error: validationError(validation.error.flatten()) };
  }

  const { data, error } = await supabase
    .from('group_recurring_schedules')
    .upsert(
      {
        group_id: groupId,
        day_of_week: validation.data.day_of_week,
        scheduled_time: validation.data.scheduled_time,
        field_name: validation.data.field_name,
        field_maps_url: validation.data.field_maps_url ?? null,
        modality: validation.data.modality,
        notes: validation.data.notes ?? null,
        days_ahead: validation.data.days_ahead,
        active: true,
      },
      { onConflict: 'group_id,day_of_week' },
    )
    .select()
    .single();

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data };
}

export async function deleteRecurringSchedule(
  supabase: SupabaseClient,
  groupId: string,
  scheduleId: string,
): Promise<Result<void>> {
  if (!scheduleId) {
    return { ok: false, error: validationError('scheduleId es requerido.') };
  }

  const { error } = await supabase
    .from('group_recurring_schedules')
    .update({ active: false })
    .eq('id', scheduleId)
    .eq('group_id', groupId);

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: undefined };
}
