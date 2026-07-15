import type { FieldStats, GoalkeeperStats, PlayerPosition, UserId } from '@/lib/types';

export type TeamId = string;
export type TeamMatchId = string;
export type TeamMemberId = string;
export type TeamInvitationId = string;
export type TeamStatSubmissionId = string;

export type TeamRole = 'admin' | 'member';
export type TeamMatchStatus = 'scheduled' | 'played' | 'cancelled';
export type TeamMatchSignupStatus = 'going' | 'not_going';
export type TeamStatKind = 'goals' | 'assists' | 'tackles';
export type TeamSubmissionStatus = 'pending' | 'approved' | 'rejected';
export type TeamCardTier = 'bronze' | 'silver' | 'gold' | 'premium_gold';
export type ProgressableStatKey = keyof FieldStats | keyof GoalkeeperStats;

export interface TeamMember {
  id: TeamMemberId;
  teamId: TeamId;
  userId: UserId;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  role: TeamRole;
}

export interface TeamStatSubmission {
  id: TeamStatSubmissionId;
  teamId: TeamId;
  matchId: TeamMatchId;
  userId: UserId;
  statKind: TeamStatKind;
  value: number;
  status: TeamSubmissionStatus;
  reviewedByUserId: UserId | null;
}

export interface TeamApprovedStatTotals {
  teamId: TeamId;
  matchesPlayed: number;
  goals: number;
  assists: number;
  tackles: number;
}

export interface TeamProgressionResult {
  appliedRewards: number;
  stats: FieldStats | GoalkeeperStats;
  overall: number;
  cardTier: TeamCardTier;
}

export interface TeamHubItem {
  id: TeamId;
  name: string;
  slug: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  role: TeamRole;
  memberCount: number;
  matchesPlayed: number;
  goals: number;
  assists: number;
  tackles: number;
}

export interface TeamRosterMemberView {
  id: TeamMemberId;
  userId: UserId;
  displayName: string;
  role: TeamRole;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  photoUrl?: string | null;
}

export interface TeamMatchView {
  id: TeamMatchId;
  scheduledAt: string;
  opponentName: string | null;
  fieldName: string | null;
  status: TeamMatchStatus;
  signupCount: number;
  teamScore?: number | null;
  opponentScore?: number | null;
  mvpUserId: string | null;
  mvpUserName: string | null;
}

export interface TeamSubmissionView {
  id: TeamStatSubmissionId;
  userId: UserId;
  playerName: string;
  matchLabel: string;
  statKind: TeamStatKind;
  value: number;
  status: TeamSubmissionStatus;
}

export interface TeamDetailView extends TeamHubItem {
  members: TeamRosterMemberView[];
  matches: TeamMatchView[];
  submissions: TeamSubmissionView[];
}

export type TeamDetailTab = 'members' | 'matches' | 'stats' | 'card' | 'moderation';