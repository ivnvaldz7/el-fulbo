import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError } from './errors';
import type { CreatePhantomInput, ConvertPhantomInput } from '@/lib/validations/phantom-player';

export interface PendingPhantom {
  id: string;
  displayName: string;
  primaryPosition: string;
  joinedAt: string;
  groupId: string;
}

export async function createPhantomPlayer(
  supabase: SupabaseClient,
  input: CreatePhantomInput,
): Promise<Result<string>> {
  const { data, error } = await supabase.rpc('create_phantom_player', {
    p_group_id: input.groupId,
    p_event_id: input.eventId,
    p_name: input.name,
    p_primary_position: input.primaryPosition,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: data as string };
}

export async function getPendingPhantoms(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Result<PendingPhantom[]>> {
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name, primary_position, joined_at, group_id')
    .eq('group_id', groupId)
    .eq('is_phantom', true)
    .is('archived_at', null)
    .order('joined_at', { ascending: false });

  if (error) return { ok: false, error: mapSupabaseError(error) };

  return {
    ok: true,
    data: (data ?? []).map((p) => ({
      id: p.id as string,
      displayName: p.display_name as string,
      primaryPosition: p.primary_position as string,
      joinedAt: p.joined_at as string,
      groupId: p.group_id as string,
    })),
  };
}

export async function archivePhantomPlayer(
  supabase: SupabaseClient,
  playerId: string,
): Promise<Result<void>> {
  const { error } = await supabase.rpc('archive_phantom_player', {
    p_player_id: playerId,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export async function deletePhantomPlayer(
  supabase: SupabaseClient,
  playerId: string,
): Promise<Result<void>> {
  const { error } = await supabase.rpc('delete_phantom_player', {
    p_player_id: playerId,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export interface ConversionInitResult {
  token: string;
}

export async function initiateConversion(
  supabase: SupabaseClient,
  input: ConvertPhantomInput,
): Promise<Result<ConversionInitResult>> {
  const { data, error } = await supabase.rpc('initiate_phantom_conversion', {
    p_player_id: input.playerId,
    p_email: input.email,
  });

  if (error) return { ok: false, error: mapSupabaseError(error) };

  const token = data as string;
  return { ok: true, data: { token } };
}

export async function completeConversion(
  supabase: SupabaseClient,
  token: string,
): Promise<Result<void>> {
  const { error } = await supabase.rpc('complete_phantom_conversion', {
    p_token: token,
  });

  if (error) {
    const code = (error as { message?: string }).message?.includes('TOKEN_INVALID_OR_EXPIRED')
      ? 'TOKEN_INVALID_OR_EXPIRED'
      : undefined;

    return {
      ok: false,
      error: code
        ? { code, message: 'El link expiró o ya fue usado. Pedí uno nuevo al admin.' }
        : mapSupabaseError(error),
    };
  }

  return { ok: true, data: undefined };
}

export async function getTokenInfo(
  supabase: SupabaseClient,
  token: string,
): Promise<Result<{ playerName: string; groupName: string; email: string }>> {
  const { data, error } = await supabase
    .from('phantom_conversion_tokens')
    .select('email, player_id, group_id, used_at, expires_at, players(display_name), groups(name)')
    .eq('token', token)
    .maybeSingle();

  if (error) return { ok: false, error: mapSupabaseError(error) };
  if (!data) {
    return {
      ok: false,
      error: { code: 'TOKEN_INVALID_OR_EXPIRED', message: 'El link expiró o ya fue usado.' },
    };
  }

  const now = new Date();
  if (data.used_at || new Date(data.expires_at as string) < now) {
    return {
      ok: false,
      error: { code: 'TOKEN_INVALID_OR_EXPIRED', message: 'El link expiró o ya fue usado.' },
    };
  }

  const player = Array.isArray(data.players) ? data.players[0] : data.players;
  const group = Array.isArray(data.groups) ? data.groups[0] : data.groups;

  return {
    ok: true,
    data: {
      playerName: (player as Record<string, unknown>)?.display_name as string ?? '',
      groupName: (group as Record<string, unknown>)?.name as string ?? '',
      email: data.email as string,
    },
  };
}

export async function archiveStalePhantoms(supabase: SupabaseClient): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('archive_stale_phantoms');

  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: (data as number) ?? 0 };
}
