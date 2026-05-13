import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError } from './errors';

export interface TemporaryOwnerAssignment {
  eventId: string;
  groupId: string;
  groupName: string;
  fieldName: string;
  scheduledAt: string;
  confirmedAt: string | null;
  expiresAt: string;
}

export async function getMyTemporaryOwnerAssignment(
  supabase: SupabaseClient,
  eventId: string,
): Promise<Result<TemporaryOwnerAssignment>> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesion.' } };
  }

  const { data, error } = await supabase
    .from('temporary_owners')
    .select(
      `
        event_id,
        confirmed_at,
        expires_at,
        events!inner(
          id,
          group_id,
          field_name,
          scheduled_at,
          groups!inner(
            id,
            name
          )
        )
      `,
    )
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  const event = Array.isArray((data as any).events) ? (data as any).events[0] : (data as any).events;
  const group = Array.isArray(event?.groups) ? event.groups[0] : event?.groups;

  return {
    ok: true,
    data: {
      eventId: data.event_id,
      groupId: event?.group_id,
      groupName: group?.name ?? 'El Fulbo',
      fieldName: event?.field_name ?? 'Partido',
      scheduledAt: event?.scheduled_at,
      confirmedAt: data.confirmed_at ?? null,
      expiresAt: data.expires_at,
    },
  };
}

export async function respondTemporaryOwnerInvite(
  supabase: SupabaseClient,
  input: { eventId: string; accept: boolean },
): Promise<Result<null>> {
  const { error } = await supabase.rpc('respond_temporary_owner_invite', {
    p_event_id: input.eventId,
    p_accept: input.accept,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function runTemporaryOwnerJobs(supabase: SupabaseClient): Promise<Result<{ designated: number; expired: number }>> {
  const { data, error } = await supabase.rpc('process_temporary_owner_jobs');

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return {
    ok: true,
    data: {
      designated: Number((data as any)?.designated ?? 0),
      expired: Number((data as any)?.expired ?? 0),
    },
  };
}
