import { z } from 'zod';

export const teamPositionSchema = z.enum(['ARQ', 'DEF', 'MED', 'DEL']);
export const teamStatKindSchema = z.enum(['goals', 'assists', 'tackles']);
export const teamSubmissionDecisionSchema = z.enum(['approved', 'rejected']);

const uuidSchema = z.string().uuid();
const optionalTrimmedUrlSchema = z.string().trim().url().optional().nullable();
const optionalTrimmedStringSchema = z.string().trim().min(1).max(120).optional().nullable();

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(60, 'Maximum 60 characters'),
  primaryPosition: teamPositionSchema,
  secondaryPosition: teamPositionSchema.optional().nullable(),
  badgeUrl: optionalTrimmedUrlSchema,
  primaryColor: z.string().trim().max(32).optional().nullable(),
  secondaryColor: z.string().trim().max(32).optional().nullable(),
}).refine((value) => !value.secondaryPosition || value.secondaryPosition !== value.primaryPosition, {
  path: ['secondaryPosition'],
  message: 'Secondary position must be different',
});

export const createTeamInvitationSchema = z.object({
  teamId: uuidSchema,
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,40}$/).optional(),
});

export const teamMemberSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
  primaryPosition: teamPositionSchema,
  secondaryPosition: teamPositionSchema.optional().nullable(),
}).refine((value) => !value.secondaryPosition || value.secondaryPosition !== value.primaryPosition, {
  path: ['secondaryPosition'],
  message: 'Secondary position must be different',
});

export const removeTeamMemberSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
});

export const createTeamMatchSchema = z.object({
  teamId: uuidSchema,
  scheduledAt: z.string().datetime({ offset: true }),
  opponentName: optionalTrimmedStringSchema,
  fieldName: optionalTrimmedStringSchema,
  fieldMapsUrl: optionalTrimmedUrlSchema,
});

export const signUpForTeamMatchSchema = z.object({
  teamId: uuidSchema,
  matchId: uuidSchema,
});

export const submitTeamStatSchema = z.object({
  teamId: uuidSchema,
  matchId: uuidSchema,
  statKind: teamStatKindSchema,
  value: z.number().int().min(0).max(99),
});

export const reviewTeamStatSubmissionSchema = z.object({
  submissionId: uuidSchema,
  decision: teamSubmissionDecisionSchema,
  rejectionReason: z.string().trim().min(1).max(240).optional().nullable(),
}).refine((value) => value.decision === 'approved' || Boolean(value.rejectionReason), {
  path: ['rejectionReason'],
  message: 'Rejection reason is required',
});

export const processTeamPlayerProgressionSchema = z.object({
  userId: uuidSchema,
});

export type CreateTeamData = z.infer<typeof createTeamSchema>;
export type CreateTeamInvitationData = z.infer<typeof createTeamInvitationSchema>;
export type TeamMemberData = z.infer<typeof teamMemberSchema>;
export type RemoveTeamMemberData = z.infer<typeof removeTeamMemberSchema>;
export type CreateTeamMatchData = z.infer<typeof createTeamMatchSchema>;
export type SignUpForTeamMatchData = z.infer<typeof signUpForTeamMatchSchema>;
export type SubmitTeamStatData = z.infer<typeof submitTeamStatSchema>;
export type ReviewTeamStatSubmissionData = z.infer<typeof reviewTeamStatSubmissionSchema>;
export const setTeamMatchMvpSchema = z.object({
  teamId: uuidSchema,
  matchId: uuidSchema,
  mvpUserId: uuidSchema.nullable(),
});

export type ProcessTeamPlayerProgressionData = z.infer<typeof processTeamPlayerProgressionSchema>;
export type SetTeamMatchMvpData = z.infer<typeof setTeamMatchMvpSchema>;
