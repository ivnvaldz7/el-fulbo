import type { SupabaseClient } from '@supabase/supabase-js';
import type { FieldStats, GoalkeeperStats, PlayerPosition, Result } from '@/lib/types';
import type { TeamCardTier, TeamProgressionResult, TeamStatKind, ProgressableStatKey } from '@/lib/types/teams.types';
import {
  createTeamInvitationSchema,
  createTeamMatchSchema,
  createTeamSchema,
  processTeamPlayerProgressionSchema,
  removeTeamMemberSchema,
  reviewTeamStatSubmissionSchema,
  signUpForTeamMatchSchema,
  submitTeamStatSchema,
  teamMemberSchema,
  type CreateTeamData,
  type CreateTeamInvitationData,
  type CreateTeamMatchData,
  type ProcessTeamPlayerProgressionData,
  type RemoveTeamMemberData,
  type ReviewTeamStatSubmissionData,
  type SignUpForTeamMatchData,
  type SubmitTeamStatData,
  type TeamMemberData,
} from '@/lib/validations/teams';
import { calculateOverall } from '@/lib/types';
import { mapSupabaseError, validationError } from './errors';

const FIELD_PROGRESS: Record<PlayerPosition, ProgressableStatKey[]> = {
  DEL: ['pac', 'sho', 'dri'],
  MED: ['pas', 'dri', 'phy'],
  DEF: ['def', 'phy', 'pas'],
  ARQ: ['div', 'ref', 'han'],
};

const STAT_KIND_BY_POSITION: Record<PlayerPosition, TeamStatKind> = {
  DEL: 'goals',
  MED: 'assists',
  DEF: 'tackles',
  ARQ: 'tackles',
};

interface IdRow {
  team_id?: string;
  invitation_id?: string;
  member_id?: string;
  archived_member_id?: string;
  match_id?: string;
  signup_id?: string;
  submission_id?: string;
}

function firstRow(data: unknown): Record<string, unknown> | null {
  return Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) ?? null : (data as Record<string, unknown> | null);
}

function normalizeNullable<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function rpcId(data: unknown, key: keyof IdRow) {
  const row = firstRow(data) as IdRow | null;
  return row?.[key] ?? null;
}

export function getTeamStatKindForPosition(position: PlayerPosition): TeamStatKind {
  return STAT_KIND_BY_POSITION[position];
}

export function getProgressionStatKeys(position: PlayerPosition): ProgressableStatKey[] {
  return [...FIELD_PROGRESS[position]];
}

export function getCardTierByOverall(overall: number): TeamCardTier {
  if (overall >= 90) {
    return 'premium_gold';
  }

  if (overall >= 80) {
    return 'gold';
  }

  if (overall >= 70) {
    return 'silver';
  }

  return 'bronze';
}

export function applyTeamProgression(input: {
  position: PlayerPosition;
  stats: FieldStats | GoalkeeperStats;
  amount?: number;
}): TeamProgressionResult {
  const amount = input.amount ?? 1;
  const stats = { ...input.stats } as Record<ProgressableStatKey, number>;

  for (const key of getProgressionStatKeys(input.position)) {
    stats[key] = Math.min(99, (stats[key] ?? 0) + amount);
  }

  const progressed = stats as FieldStats | GoalkeeperStats;
  const overall = calculateOverall(progressed, input.position);

  return {
    appliedRewards: amount,
    stats: progressed,
    overall,
    cardTier: getCardTierByOverall(overall),
  };
}

export class TeamsService {
  constructor(private supabase: SupabaseClient) {}

  async createTeam(input: CreateTeamData): Promise<Result<{ teamId: string }>> {
    const parsed = createTeamSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('create_team', {
      p_name: parsed.data.name,
      p_primary_position: parsed.data.primaryPosition,
      p_secondary_position: normalizeNullable(parsed.data.secondaryPosition),
      p_badge_url: normalizeNullable(parsed.data.badgeUrl),
      p_primary_color: normalizeNullable(parsed.data.primaryColor),
      p_secondary_color: normalizeNullable(parsed.data.secondaryColor),
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const teamId = rpcId(data, 'team_id');
    return teamId ? { ok: true, data: { teamId } } : { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  async createTeamInvitation(input: CreateTeamInvitationData): Promise<Result<{ code: string }>> {
    const parsed = createTeamInvitationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('create_team_invitation', {
      p_team_id: parsed.data.teamId,
      p_code: parsed.data.code ?? null,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const row = firstRow(data);
    return typeof row?.code === 'string'
      ? { ok: true, data: { code: row.code } }
      : { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  async addTeamMember(input: TeamMemberData): Promise<Result<{ memberId: string }>> {
    const parsed = teamMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('add_team_member', {
      p_team_id: parsed.data.teamId,
      p_user_id: parsed.data.userId,
      p_primary_position: parsed.data.primaryPosition,
      p_secondary_position: normalizeNullable(parsed.data.secondaryPosition),
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const memberId = rpcId(data, 'member_id');
    return memberId ? { ok: true, data: { memberId } } : { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  async removeTeamMember(input: RemoveTeamMemberData): Promise<Result<{ memberId: string }>> {
    const parsed = removeTeamMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('remove_team_member', {
      p_team_id: parsed.data.teamId,
      p_user_id: parsed.data.userId,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const memberId = rpcId(data, 'archived_member_id');
    return memberId ? { ok: true, data: { memberId } } : { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  async createTeamMatch(input: CreateTeamMatchData): Promise<Result<{ matchId: string }>> {
    const parsed = createTeamMatchSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('create_team_match', {
      p_team_id: parsed.data.teamId,
      p_scheduled_at: parsed.data.scheduledAt,
      p_opponent_name: normalizeNullable(parsed.data.opponentName),
      p_field_name: normalizeNullable(parsed.data.fieldName),
      p_field_maps_url: normalizeNullable(parsed.data.fieldMapsUrl),
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const matchId = rpcId(data, 'match_id');
    return matchId ? { ok: true, data: { matchId } } : { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  async signUpForTeamMatch(input: SignUpForTeamMatchData): Promise<Result<{ signupId: string }>> {
    const parsed = signUpForTeamMatchSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('signup_team_match', {
      p_team_id: parsed.data.teamId,
      p_team_match_id: parsed.data.matchId,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const signupId = rpcId(data, 'signup_id');
    return signupId ? { ok: true, data: { signupId } } : { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  async submitTeamStat(input: SubmitTeamStatData): Promise<Result<{ submissionId: string }>> {
    const parsed = submitTeamStatSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('submit_team_match_stat', {
      p_team_id: parsed.data.teamId,
      p_team_match_id: parsed.data.matchId,
      p_stat_kind: parsed.data.statKind,
      p_value: parsed.data.value,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const submissionId = rpcId(data, 'submission_id');
    return submissionId ? { ok: true, data: { submissionId } } : { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
  }

  async reviewTeamStatSubmission(input: ReviewTeamStatSubmissionData): Promise<Result<void>> {
    const parsed = reviewTeamStatSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { error } = await this.supabase.rpc('review_team_stat_submission', {
      p_submission_id: parsed.data.submissionId,
      p_decision: parsed.data.decision,
      p_rejection_reason: normalizeNullable(parsed.data.rejectionReason),
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    return { ok: true, data: undefined };
  }

  async processTeamPlayerProgression(input: ProcessTeamPlayerProgressionData): Promise<Result<TeamProgressionResult>> {
    const parsed = processTeamPlayerProgressionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('process_team_player_progression', {
      p_user_id: parsed.data.userId,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const row = firstRow(data);
    if (!row) {
      return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
    }

    return {
      ok: true,
      data: {
        appliedRewards: Number(row.applied_rewards ?? 0),
        stats: row.stats as FieldStats | GoalkeeperStats,
        overall: Number(row.overall ?? 0),
        cardTier: row.card_tier as TeamCardTier,
      },
    };
  }
}
