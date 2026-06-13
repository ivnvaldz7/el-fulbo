import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppError } from '@/lib/types';
import { mapSupabaseError } from '@/lib/services/errors';
import { recurringScheduleSchema, type RecurringScheduleInput } from '@/lib/validations/recurring-schedule';

export async function getRecurringSchedules(
  supabase: SupabaseClient,
  groupId: string,
): Promise<{ data: any[] | null; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('group_recurring_schedules')
      .select('*')
      .eq('group_id', groupId)
      .eq('active', true)
      .order('day_of_week', { ascending: true });

    if (error) {
      return { data: null, error: mapSupabaseError(error) };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    return { data: null, error: mapSupabaseError(err) };
  }
}

export async function createRecurringSchedule(
  supabase: SupabaseClient,
  groupId: string,
  input: unknown,
): Promise<{ data: any | null; error: AppError | null }> {
  const validation = recurringScheduleSchema.safeParse(input);
  if (!validation.success) {
    return {
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Algunos datos no son validos.',
        details: validation.error.flatten(),
      },
    };
  }

  try {
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
      return { data: null, error: mapSupabaseError(error) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: mapSupabaseError(err) };
  }
}

export async function deleteRecurringSchedule(
  supabase: SupabaseClient,
  groupId: string,
  scheduleId: string,
): Promise<{ error: AppError | null }> {
  if (!scheduleId) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'scheduleId es requerido.',
      },
    };
  }

  try {
    const { error } = await supabase
      .from('group_recurring_schedules')
      .update({ active: false })
      .eq('id', scheduleId)
      .eq('group_id', groupId);

    if (error) {
      return { error: mapSupabaseError(error) };
    }

    return { error: null };
  } catch (err) {
    return { error: mapSupabaseError(err) };
  }
}
