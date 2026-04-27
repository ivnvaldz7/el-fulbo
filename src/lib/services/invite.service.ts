import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupId, PlayerId, Result, StatsStatus } from '@/lib/types';
import { inviteCodeSchema } from '@/lib/validations/onboarding';
import { mapSupabaseError, validationError } from './errors';

export interface InvitePreview {
  groupId: GroupId;
  groupName: string;
  defaultModality: string;
  logoUrl: string | null;
  adminName: string;
  activePlayers: number;
}

export interface AcceptInviteOutput {
  groupId: GroupId;
  playerId: PlayerId;
  alreadyMember: boolean;
  status: StatsStatus;
}

export async function getInvitePreview(
  supabase: SupabaseClient,
  inviteCode: string,
): Promise<Result<InvitePreview>> {
  const parsed = inviteCodeSchema.safeParse(inviteCode);
  if (!parsed.success) {
    return { ok: false, error: { code: 'INVITE_CODE_INVALID', message: 'Ese link de invitacion no sirve.' } };
  }

  const { data, error } = await supabase.rpc('get_invite_preview', {
    p_invite_code: parsed.data,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { ok: false, error: { code: 'INVITE_CODE_INVALID', message: 'Ese link de invitacion no sirve.' } };
  }

  return {
    ok: true,
    data: {
      groupId: row.group_id,
      groupName: row.group_name,
      defaultModality: row.default_modality,
      logoUrl: row.logo_url,
      adminName: row.admin_name,
      activePlayers: Number(row.active_players),
    },
  };
}

export async function acceptInviteForUser(
  supabase: SupabaseClient,
  inviteCode: string,
): Promise<Result<AcceptInviteOutput>> {
  const parsed = inviteCodeSchema.safeParse(inviteCode);
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.flatten()) };
  }

  const { data, error } = await supabase.rpc('accept_invite_for_user', {
    p_invite_code: parsed.data,
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
      groupId: row.group_id,
      playerId: row.player_id,
      alreadyMember: row.already_member,
      status: row.status,
    },
  };
}
