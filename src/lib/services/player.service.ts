import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupId, Player, Result } from '@/lib/types';
import { mapSupabaseError } from './errors';

function mapPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as Player['id'],
    userId: row.user_id as Player['userId'],
    groupId: row.group_id as Player['groupId'],
    displayName: row.display_name as string,
    photoUrl: row.photo_url as string | null,
    primaryPosition: row.primary_position as Player['primaryPosition'],
    secondaryPosition: row.secondary_position as Player['secondaryPosition'],
    statsStatus: row.stats_status as Player['statsStatus'],
    stats: row.stats as Player['stats'],
    currentBoost: row.current_boost as Player['currentBoost'],
    isPhantom: row.is_phantom as boolean,
    isExpelled: row.is_expelled as boolean,
    joinedAt: row.joined_at as string,
    archivedAt: row.archived_at as string | null,
  };
}

export async function getCurrentUserPlayerInGroup(
  supabase: SupabaseClient,
  groupId: GroupId | string,
): Promise<Result<Player>> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesion.' } };
  }

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .is('archived_at', null)
    .single();

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: mapPlayer(data) };
}
