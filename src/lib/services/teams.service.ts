import type { SupabaseClient } from '@supabase/supabase-js';
import type { FieldStats, GoalkeeperStats, PlayerPosition, Result } from '@/lib/types';
import type { TeamCardTier, TeamProgressionResult, TeamStatKind, ProgressableStatKey, TeamDetailView, TeamHubItem, TeamMatchView, TeamRosterMemberView, TeamSubmissionView } from '@/lib/types/teams.types';
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
  async validateTeamInvite(code: string): Promise<Result<{
    valid: boolean;
    teamId: string | null;
    teamName: string | null;
    alreadyMember: boolean;
  }>> {
    const { data, error } = await this.supabase.rpc('validate_team_invite', {
      p_code: code,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      return { ok: true, data: { valid: false, teamId: null, teamName: null, alreadyMember: false } };
    }

    return {
      ok: true,
      data: {
        valid: Boolean(row.valid),
        teamId: row.team_id ? String(row.team_id) : null,
        teamName: row.team_name ? String(row.team_name) : null,
        alreadyMember: Boolean(row.already_member),
      },
    };
  }

  async acceptTeamInvite(code: string): Promise<Result<{ teamId: string }>> {
    const { data, error } = await this.supabase.rpc('accept_team_invite', {
      p_code: code,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.team_id) {
      return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
    }

    return { ok: true, data: { teamId: String(row.team_id) } };
  }

  async getTeamsForCurrentUser(): Promise<Result<TeamHubItem[]>> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { ok: true, data: [] };
    }

    const { data: memberships, error: membershipError } = await this.supabase
      .from('team_members')
      .select(`
        id,
        role,
        team_id,
        teams!inner (
          id,
          name,
          slug,
          primary_color,
          secondary_color
        )
      `)
      .eq('user_id', user.id)
      .is('archived_at', null);

    if (membershipError) {
      return { ok: false, error: mapSupabaseError(membershipError) };
    }

    const teamIds = (memberships ?? []).map((row: any) => String(row.team_id));
    const [memberCountsResult, totalsResult] = await Promise.all([
      teamIds.length > 0
        ? this.supabase.from('team_members').select('team_id').in('team_id', teamIds).is('archived_at', null)
        : Promise.resolve({ data: [], error: null }),
      teamIds.length > 0
        ? this.supabase.from('team_approved_stat_totals').select('team_id,matches_played,goals,assists,tackles').in('team_id', teamIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (memberCountsResult.error) {
      return { ok: false, error: mapSupabaseError(memberCountsResult.error) };
    }

    if (totalsResult.error) {
      return { ok: false, error: mapSupabaseError(totalsResult.error) };
    }

    const memberCounts = new Map<string, number>();
    for (const row of memberCountsResult.data ?? []) {
      const teamId = String((row as any).team_id);
      memberCounts.set(teamId, (memberCounts.get(teamId) ?? 0) + 1);
    }

    const totals = new Map<string, any>();
    for (const row of totalsResult.data ?? []) {
      totals.set(String((row as any).team_id), row);
    }

    return {
      ok: true,
      data: (memberships ?? []).map((membership: any) => {
        const team = membership.teams as any;
        const total = totals.get(String(membership.team_id));
        return {
          id: String(team.id),
          name: String(team.name),
          slug: String(team.slug),
          primaryColor: team.primary_color ?? null,
          secondaryColor: team.secondary_color ?? null,
          role: membership.role,
          memberCount: memberCounts.get(String(membership.team_id)) ?? 0,
          matchesPlayed: Number(total?.matches_played ?? 0),
          goals: Number(total?.goals ?? 0),
          assists: Number(total?.assists ?? 0),
          tackles: Number(total?.tackles ?? 0),
        } satisfies TeamHubItem;
      }),
    };
  }

  async getTeamDetail(teamId: string): Promise<Result<TeamDetailView | null>> {
    const { data: team, error: teamError } = await this.supabase
      .from('teams')
      .select('id,name,slug,primary_color,secondary_color')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError) {
      return { ok: false, error: mapSupabaseError(teamError) };
    }

    if (!team) {
      return { ok: true, data: null };
    }

    const { data: { user } } = await this.supabase.auth.getUser();

    const [membersResult, matchesResult, totalsResult] = await Promise.all([
      this.supabase
        .from('team_members')
        .select('id,user_id,role,primary_position,secondary_position,users!team_members_user_id_fkey(display_name,photo_url)')
        .eq('team_id', teamId)
        .is('archived_at', null)
        .order('joined_at', { ascending: true }),
      this.supabase
        .from('team_matches')
        .select('id,scheduled_at,opponent_name,field_name,status,team_score,opponent_score,team_match_signups(id)')
        .eq('team_id', teamId)
        .order('scheduled_at', { ascending: false })
        .limit(20),
      this.supabase
        .from('team_approved_stat_totals')
        .select('matches_played,goals,assists,tackles')
        .eq('team_id', teamId)
        .maybeSingle(),
    ]);

    for (const result of [membersResult, matchesResult, totalsResult]) {
      if (result.error) {
        return { ok: false, error: mapSupabaseError(result.error) };
      }
    }

    const currentMember = (membersResult.data ?? []).find((row: any) => row.user_id === user?.id) as any;
    const canModerate = currentMember?.role === 'admin';
    const submissionsResult = canModerate
      ? await this.supabase
        .from('team_stat_submissions')
        .select('id,stat_kind,value,status,team_matches!team_stat_submissions_match_team_fk(opponent_name,scheduled_at),users!team_stat_submissions_user_id_fkey(display_name)')
        .eq('team_id', teamId)
        .order('submitted_at', { ascending: false })
        .limit(30)
      : { data: [], error: null };

    if (submissionsResult.error) {
      return { ok: false, error: mapSupabaseError(submissionsResult.error) };
    }

    const members: TeamRosterMemberView[] = (membersResult.data ?? []).map((row: any) => ({
      id: String(row.id),
      userId: String(row.user_id),
      displayName: String(row.users?.display_name ?? 'Jugador'),
      role: row.role,
      primaryPosition: row.primary_position,
      secondaryPosition: row.secondary_position ?? null,
      photoUrl: row.users?.photo_url ?? null,
    }));

    const matches: TeamMatchView[] = (matchesResult.data ?? []).map((row: any) => ({
      id: String(row.id),
      scheduledAt: String(row.scheduled_at),
      opponentName: row.opponent_name ?? null,
      fieldName: row.field_name ?? null,
      status: row.status,
      signupCount: Array.isArray(row.team_match_signups) ? row.team_match_signups.length : 0,
      teamScore: row.team_score ?? null,
      opponentScore: row.opponent_score ?? null,
    }));

    const submissions: TeamSubmissionView[] = (submissionsResult.data ?? []).map((row: any) => ({
      id: String(row.id),
      playerName: String(row.users?.display_name ?? 'Jugador'),
      matchLabel: row.team_matches?.opponent_name ? `vs ${row.team_matches.opponent_name}` : 'Partido cerrado',
      statKind: row.stat_kind,
      value: Number(row.value ?? 0),
      status: row.status,
    }));

    const totals = totalsResult.data as any;

    return {
      ok: true,
      data: {
        id: String((team as any).id),
        name: String((team as any).name),
        slug: String((team as any).slug),
        primaryColor: (team as any).primary_color ?? null,
        secondaryColor: (team as any).secondary_color ?? null,
        role: currentMember?.role === 'admin' ? 'admin' : 'member',
        memberCount: members.length,
        matchesPlayed: Number(totals?.matches_played ?? 0),
        goals: Number(totals?.goals ?? 0),
        assists: Number(totals?.assists ?? 0),
        tackles: Number(totals?.tackles ?? 0),
        members,
        matches,
        submissions,
      },
    };
  }
}
