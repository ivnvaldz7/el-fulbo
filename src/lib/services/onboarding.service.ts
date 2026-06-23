import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupId, PlayerId, Result } from '@/lib/types';
import {
  submitOnboardingStatsSchema,
  type SubmitOnboardingStatsData,
} from '@/lib/validations/onboarding';
import { mapSupabaseError, validationError } from './errors';

export type SubmitOnboardingStatsInput = SubmitOnboardingStatsData;

export interface SubmitOnboardingStatsOutput {
  playerId: PlayerId;
  status: 'pending_approval' | 'approved' | 'rejected';
}

export function getOnboardingDraftKey(groupId: GroupId | string) {
  return `onboarding-draft-v1-${groupId}`;
}

export async function submitOnboardingStats(
  supabase: SupabaseClient,
  input: SubmitOnboardingStatsInput,
): Promise<Result<SubmitOnboardingStatsOutput>> {
  const parsed = submitOnboardingStatsSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.flatten()) };
  }

  const { data, error } = await supabase.rpc('submit_onboarding_stats', {
    p_group_id: parsed.data.groupId,
    p_primary_position: parsed.data.primaryPosition,
    p_secondary_position: parsed.data.secondaryPosition,
    p_stats: parsed.data.stats,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  return {
    ok: true,
    data: {
      playerId: row.player_id,
      status: row.status,
    },
  };
}

export async function submitAdminOnboardingStats(
  supabase: SupabaseClient,
  input: SubmitOnboardingStatsInput,
): Promise<Result<SubmitOnboardingStatsOutput>> {
  const parsed = submitOnboardingStatsSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.flatten()) };
  }

  const { data, error } = await supabase.rpc('submit_admin_onboarding_stats', {
    p_group_id: parsed.data.groupId,
    p_primary_position: parsed.data.primaryPosition,
    p_secondary_position: parsed.data.secondaryPosition,
    p_stats: parsed.data.stats,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  return {
    ok: true,
    data: {
      playerId: row.player_id,
      status: row.status,
    },
  };
}
