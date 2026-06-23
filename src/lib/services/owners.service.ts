import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupId, Result, UserId } from '@/lib/types';
import { mapSupabaseError, validationError } from './errors';
import { assignOwnerSchema, removeOwnerSchema } from '@/lib/validations/owners';

export interface OwnerMember {
  userId: UserId;
  displayName: string;
  photoUrl: string | null;
  assignedAt: string;
}

export interface OwnerCandidate {
  userId: UserId;
  displayName: string;
  photoUrl: string | null;
}

export interface OwnersSettingsData {
  groupId: GroupId;
  groupName: string;
  owners: OwnerMember[];
  candidates: OwnerCandidate[];
}

export async function getOwnersSettingsData(
  supabase: SupabaseClient,
  groupId: GroupId | string,
): Promise<Result<OwnersSettingsData>> {
  const [{ data: isAdmin, error: adminError }, groupResponse, ownersResponse, candidatesResponse] = await Promise.all([
    supabase.rpc('is_group_admin', { gid: groupId }),
    supabase.from('groups').select('id, name, admin_user_id').eq('id', groupId).maybeSingle(),
    supabase
      .from('group_memberships')
      .select('user_id, assigned_at')
      .eq('group_id', groupId)
      .eq('role', 'owner')
      .order('assigned_at', { ascending: true }),
    supabase
      .from('players')
      .select('user_id, display_name, photo_url')
      .eq('group_id', groupId)
      .eq('is_phantom', false)
      .is('archived_at', null)
      .not('user_id', 'is', null)
      .order('display_name', { ascending: true }),
  ]);

  if (adminError) {
    return { ok: false, error: mapSupabaseError(adminError) };
  }

  if (!isAdmin) {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'No tenés permisos para hacer eso.' } };
  }

  if (groupResponse.error) {
    return { ok: false, error: mapSupabaseError(groupResponse.error) };
  }

  if (!groupResponse.data) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Grupo no encontrado.' } };
  }

  if (ownersResponse.error) {
    return { ok: false, error: mapSupabaseError(ownersResponse.error) };
  }

  if (candidatesResponse.error) {
    return { ok: false, error: mapSupabaseError(candidatesResponse.error) };
  }

  const group = groupResponse.data;
  type PlayerRow = { user_id: string; display_name: string | null; photo_url: string | null };
  type OwnerRow = { user_id: string; assigned_at: string };

  const candidatesData = (candidatesResponse.data as PlayerRow[] | null) ?? [];
  const ownersData = (ownersResponse.data as OwnerRow[] | null) ?? [];

  const playersByUserId = new Map(
    candidatesData.map((row) => [row.user_id, row]),
  );
  const ownerIds = new Set(ownersData.map((row) => row.user_id));

  return {
    ok: true,
    data: {
      groupId: group.id,
      groupName: group.name,
      owners: ownersData.map((row) => {
        const player = playersByUserId.get(row.user_id);
        return {
          userId: row.user_id,
          displayName: player?.display_name ?? 'Jugador',
          photoUrl: player?.photo_url ?? null,
          assignedAt: row.assigned_at,
        };
      }),
      candidates: candidatesData
        .filter((row) => row.user_id !== group.admin_user_id && !ownerIds.has(row.user_id))
        .map((row) => ({
          userId: row.user_id,
          displayName: row.display_name ?? 'Jugador',
          photoUrl: row.photo_url ?? null,
        })),
    },
  };
}

export async function assignOwner(
  supabase: SupabaseClient,
  input: { groupId: GroupId | string; userId: UserId | string },
): Promise<Result<null>> {
  const parsed = assignOwnerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.flatten()) };
  }

  const { error } = await supabase.rpc('assign_owner', {
    p_group_id: parsed.data.groupId,
    p_user_id: parsed.data.userId,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}

export async function removeOwner(
  supabase: SupabaseClient,
  input: { groupId: GroupId | string; userId: UserId | string },
): Promise<Result<null>> {
  const parsed = removeOwnerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.flatten()) };
  }

  const { error } = await supabase.rpc('remove_owner', {
    p_group_id: parsed.data.groupId,
    p_user_id: parsed.data.userId,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return { ok: true, data: null };
}
