import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  GroupId,
  InviteCode,
  PlayerId,
  PlayerPosition,
  PlayerStats,
  Result,
  StatsStatus,
} from '@/lib/types';
import { inviteCodeSchema, reintegrationRequestSchema } from '@/lib/validations/onboarding';
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
  playerId: PlayerId | null;
  alreadyMember: boolean;
  needsOnboarding: boolean;
  status: StatsStatus | null;
}

export interface ArchivedPlayerPreview {
  id: PlayerId;
  displayName: string;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  stats: PlayerStats;
  statsStatus: StatsStatus;
  archivedAt: string;
}

type InviteValidationPayload =
  | {
      valid: false;
      reason: 'not_found' | 'archived';
      group?: { id?: GroupId; name?: string };
    }
  | {
      valid: true;
      group: {
        id: GroupId;
        name: string;
        default_modality: string;
        logo_url: string | null;
        admin_name: string;
        active_players_count: number;
      };
      user_status:
        | 'anonymous'
        | 'active_member'
        | 'new'
        | 'group_full'
        | 'user_limit'
        | 'voluntary_returner'
        | 'expelled_can_request'
        | 'expelled_pending_request';
      extras?: {
        archived_player?: {
          id: PlayerId;
          display_name: string;
          primary_position: PlayerPosition;
          secondary_position: PlayerPosition | null;
          stats: PlayerStats;
          stats_status: StatsStatus;
          archived_at: string;
        };
        request_created_at?: string;
      };
    };

export type InviteResolvedState =
  | { kind: 'invalid' }
  | { kind: 'archived'; groupName: string | null }
  | { kind: 'anonymous'; preview: InvitePreview }
  | { kind: 'active_member'; groupId: GroupId }
  | { kind: 'group_full'; preview: InvitePreview }
  | { kind: 'user_limit'; preview: InvitePreview }
  | { kind: 'new'; preview: InvitePreview }
  | { kind: 'voluntary_returner'; preview: InvitePreview; archivedPlayer: ArchivedPlayerPreview }
  | { kind: 'expelled_can_request'; preview: InvitePreview }
  | { kind: 'expelled_pending_request'; preview: InvitePreview; requestCreatedAt: string };

function toInvitePreview(group: Extract<InviteValidationPayload, { valid: true }>['group']): InvitePreview {
  return {
    groupId: group.id,
    groupName: group.name,
    defaultModality: group.default_modality,
    logoUrl: group.logo_url,
    adminName: group.admin_name,
    activePlayers: Number(group.active_players_count),
  };
}

function toArchivedPlayerPreview(player: {
  id: PlayerId;
  display_name: string;
  primary_position: PlayerPosition;
  secondary_position: PlayerPosition | null;
  stats: PlayerStats;
  stats_status: StatsStatus;
  archived_at: string;
}): ArchivedPlayerPreview {
  return {
    id: player.id,
    displayName: player.display_name,
    primaryPosition: player.primary_position,
    secondaryPosition: player.secondary_position ?? null,
    stats: player.stats,
    statsStatus: player.stats_status,
    archivedAt: player.archived_at,
  };
}

export async function resolveInviteState(
  supabase: SupabaseClient,
  inviteCode: InviteCode | string,
): Promise<Result<InviteResolvedState>> {
  const parsed = inviteCodeSchema.safeParse(inviteCode);
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.flatten()) };
  }

  const { data, error } = await supabase.rpc('validate_invite_code', {
    p_invite_code: parsed.data,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  const payload = data as InviteValidationPayload | null;
  if (!payload) {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  if (!payload.valid) {
    if (payload.reason === 'archived') {
      return {
        ok: true,
        data: {
          kind: 'archived',
          groupName: payload.group?.name ?? null,
        },
      };
    }

    return { ok: true, data: { kind: 'invalid' } };
  }

  const preview = toInvitePreview(payload.group);

  switch (payload.user_status) {
    case 'anonymous':
      return { ok: true, data: { kind: 'anonymous', preview } };
    case 'active_member':
      return { ok: true, data: { kind: 'active_member', groupId: preview.groupId } };
    case 'group_full':
      return { ok: true, data: { kind: 'group_full', preview } };
    case 'user_limit':
      return { ok: true, data: { kind: 'user_limit', preview } };
    case 'voluntary_returner':
      if (!payload.extras?.archived_player) {
        return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
      }
      return {
        ok: true,
        data: {
          kind: 'voluntary_returner',
          preview,
          archivedPlayer: toArchivedPlayerPreview(payload.extras.archived_player),
        },
      };
    case 'expelled_can_request':
      return { ok: true, data: { kind: 'expelled_can_request', preview } };
    case 'expelled_pending_request':
      if (!payload.extras?.request_created_at) {
        return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
      }
      return {
        ok: true,
        data: {
          kind: 'expelled_pending_request',
          preview,
          requestCreatedAt: payload.extras.request_created_at,
        },
      };
    default:
      return { ok: true, data: { kind: 'new', preview } };
  }
}

export async function getInvitePreview(
  supabase: SupabaseClient,
  inviteCode: InviteCode | string,
): Promise<Result<InvitePreview>> {
  const result = await resolveInviteState(supabase, inviteCode);
  if (!result.ok) {
    return result;
  }

  switch (result.data.kind) {
    case 'anonymous':
    case 'group_full':
    case 'user_limit':
    case 'new':
      return { ok: true, data: result.data.preview };
    default:
      return { ok: false, error: { code: 'INVITE_CODE_INVALID', message: 'Ese link de invitacion no sirve.' } };
  }
}

export async function acceptInviteForUser(
  supabase: SupabaseClient,
  inviteCode: InviteCode | string,
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
      needsOnboarding: row.needs_onboarding,
      status: row.status,
    },
  };
}

export async function reactivatePlayer(
  supabase: SupabaseClient,
  playerId: PlayerId | string,
): Promise<Result<{ groupId: GroupId }>> {
  const { data, error } = await supabase.rpc('reactivate_player', {
    p_player_id: playerId,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  if (!data) {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  return {
    ok: true,
    data: {
      groupId: data as GroupId,
    },
  };
}

export async function createReintegrationRequest(
  supabase: SupabaseClient,
  input: { inviteCode: InviteCode | string; message?: string | null },
): Promise<Result<{ requestId: string }>> {
  const parsed = reintegrationRequestSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.flatten()) };
  }

  const { data, error } = await supabase.rpc('create_reintegration_request', {
    p_invite_code: parsed.data.inviteCode,
    p_message: parsed.data.message ?? null,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  if (!data) {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  return {
    ok: true,
    data: {
      requestId: data as string,
    },
  };
}
