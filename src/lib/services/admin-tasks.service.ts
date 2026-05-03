import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupId, Result } from '@/lib/types';
import { mapSupabaseError } from './errors';

export interface PendingTasksSummary {
  cardsNew: number;
  revisions: number;
  reintegrations: number;
  total: number;
}

export interface AdminTaskItem {
  id: string;
  playerId: string;
  playerName: string;
  createdAt: string;
  overdue: boolean;
}

export interface AdminTasksDetail {
  cardsNew: AdminTaskItem[];
  revisions: AdminTaskItem[];
  reintegrations: AdminTaskItem[];
}

export async function approveInitialStats(
  supabase: SupabaseClient,
  playerId: string,
): Promise<Result<null>> {
  const { error } = await supabase.rpc('approve_initial_stats', {
    p_player_id: playerId,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function rejectInitialStats(
  supabase: SupabaseClient,
  playerId: string,
  note?: string | null,
): Promise<Result<null>> {
  const { error } = await supabase.rpc('reject_initial_stats', {
    p_player_id: playerId,
    p_note: note ?? null,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function approveStatRevision(
  supabase: SupabaseClient,
  requestId: string,
): Promise<Result<null>> {
  const { error } = await supabase.rpc('approve_stat_revision', {
    p_request_id: requestId,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function rejectStatRevision(
  supabase: SupabaseClient,
  requestId: string,
  note?: string | null,
): Promise<Result<null>> {
  const { error } = await supabase.rpc('reject_stat_revision', {
    p_request_id: requestId,
    p_note: note ?? null,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function approveReintegrationRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<Result<null>> {
  const { error } = await supabase.rpc('approve_reintegration_request', {
    p_request_id: requestId,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function rejectReintegrationRequest(
  supabase: SupabaseClient,
  requestId: string,
  note?: string | null,
): Promise<Result<null>> {
  const { error } = await supabase.rpc('reject_reintegration_request', {
    p_request_id: requestId,
    p_note: note ?? null,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function getPendingTasksSummary(
  supabase: SupabaseClient,
  groupId: GroupId | string,
): Promise<Result<PendingTasksSummary>> {
  const { data, error } = await supabase.rpc('get_pending_tasks_summary', {
    p_group_id: groupId,
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
      cardsNew: Number(row.cards_new ?? 0),
      revisions: Number(row.revisions ?? 0),
      reintegrations: Number(row.reintegrations ?? 0),
      total: Number(row.total ?? 0),
    },
  };
}

function mapTaskItem(
  item: Record<string, unknown>,
  idKey: 'player_id' | 'request_id',
): AdminTaskItem {
  return {
    id: String(item[idKey] ?? ''),
    playerId: String(item.player_id ?? ''),
    playerName: String(item.player_name ?? ''),
    createdAt: String(item.created_at ?? ''),
    overdue: Boolean(item.overdue),
  };
}

export async function getAdminTasksDetail(
  supabase: SupabaseClient,
  groupId: GroupId | string,
): Promise<Result<AdminTasksDetail>> {
  const { data, error } = await supabase.rpc('get_admin_tasks_detail', {
    p_group_id: groupId,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  const payload = data as
    | {
        cards_new?: Record<string, unknown>[];
        revisions?: Record<string, unknown>[];
        reintegrations?: Record<string, unknown>[];
      }
    | null;

  if (!payload) {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  return {
    ok: true,
    data: {
      cardsNew: (payload.cards_new ?? []).map((item) => mapTaskItem(item, 'player_id')),
      revisions: (payload.revisions ?? []).map((item) => mapTaskItem(item, 'request_id')),
      reintegrations: (payload.reintegrations ?? []).map((item) => mapTaskItem(item, 'request_id')),
    },
  };
}
