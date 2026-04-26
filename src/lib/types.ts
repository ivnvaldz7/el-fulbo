// types.ts V2 — Tipos compartidos de El Fulbo.
// Fuente única de verdad. Se copia a /src/lib/types.ts al hacer bootstrap.
//
// Para tipos autogenerados de Supabase, ver /src/lib/database.types.ts
// (se genera con `supabase gen types typescript`).

// =========================================================================
// ENUMS
// =========================================================================

export type Modality = 'F5' | 'F6' | 'F8' | 'F11';

export type PlayerPosition = 'ARQ' | 'DEF' | 'MED' | 'DEL';

export type GroupRole = 'admin' | 'owner';

export type EventStatus =
  | 'scheduled'
  | 'confirming'
  | 'checked_in'
  | 'drawn'
  | 'played'
  | 'cancelled';

export type AttendanceStatus = 'going' | 'not_going' | 'maybe';

export type ParticipationTeam = 'A' | 'B' | 'substitute';

export type StatsStatus = 'pending_approval' | 'approved';

export type RevisionStatus = 'pending' | 'approved' | 'rejected';

export type BoostReason = 'victory_mvp' | 'victory' | 'draw_mvp' | 'loss_mvp';

export type Tier = 'bronze' | 'silver' | 'gold_matte' | 'gold' | 'mvp';

export type NotificationType =
  | 'event_created'
  | 'event_cancelled'
  | 'attendance_changed'
  | 'someone_dropped'
  | 'owner_temporary_assigned'
  | 'owner_assigned'
  | 'owner_removed'
  | 'owner_temporary_accepted'
  | 'owner_temporary_rejected'
  | 'owner_temporary_no_one_accepted'
  | 'stats_pending_approval'
  | 'stats_approved'
  | 'stats_revision_requested'
  | 'stats_revision_resolved'
  | 'stats_changed_log'
  | 'player_returned'
  | 'reintegration_request'
  | 'reintegration_approved'
  | 'reintegration_rejected'
  | 'event_rescheduled'
  | 'event_updated'
  | 'match_ready'
  | 'mvp_awarded'
  | 'boost_applied'
  | 'weekly_digest';

// =========================================================================
// BRANDED IDS (type safety)
// =========================================================================

type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type GroupId = Brand<string, 'GroupId'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type EventId = Brand<string, 'EventId'>;
export type MembershipId = Brand<string, 'MembershipId'>;
export type AttendanceId = Brand<string, 'AttendanceId'>;
export type ParticipationId = Brand<string, 'ParticipationId'>;
export type NotificationId = Brand<string, 'NotificationId'>;

export const asId = <T extends string>(id: string): T => id as T;

// =========================================================================
// STATS
// =========================================================================

/** Stats de jugador de campo: PAC/SHO/PAS/DRI/DEF/PHY */
export interface FieldStats {
  pac: number; // 1-10: velocidad
  sho: number; // 1-10: tiro
  pas: number; // 1-10: pase
  dri: number; // 1-10: regate
  def: number; // 1-10: defensa
  phy: number; // 1-10: fuerza
}

/** Stats de arquero: DIV/HAN/KIC/REF/SPD/POS */
export interface GoalkeeperStats {
  div: number; // 1-10: estirada
  han: number; // 1-10: manos
  kic: number; // 1-10: saque
  ref: number; // 1-10: reflejos
  spd: number; // 1-10: velocidad de salida
  pos: number; // 1-10: colocación
}

export type PlayerStats = FieldStats | GoalkeeperStats;

export type FieldStatKey = keyof FieldStats;
export type GoalkeeperStatKey = keyof GoalkeeperStats;
export type StatKey = FieldStatKey | GoalkeeperStatKey;

// =========================================================================
// BOOST
// =========================================================================

export interface BoostModifiers {
  [statKey: string]: number; // ej. { pac: 2, sho: 3 }
}

export interface CurrentBoost {
  appliedAtEventId: EventId;
  partidosRemaining: number; // 0-3
  modifiers: BoostModifiers;
  reason: BoostReason;
}

// =========================================================================
// CORE ENTITIES
// =========================================================================

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  photoUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Group {
  id: GroupId;
  name: string;
  defaultModality: Modality;
  logoUrl: string | null;
  adminUserId: UserId;
  inviteCode: string;
  donationLink: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface GroupMembership {
  id: MembershipId;
  userId: UserId;
  groupId: GroupId;
  role: GroupRole;
  assignedByUserId: UserId | null;
  assignedAt: string;
}

export interface Player {
  id: PlayerId;
  userId: UserId | null; // null si es phantom
  groupId: GroupId;
  displayName: string;
  photoUrl: string | null;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  statsStatus: StatsStatus;
  stats: PlayerStats;
  currentBoost: CurrentBoost | null;
  isPhantom: boolean;
  isExpelled: boolean;
  joinedAt: string;
  archivedAt: string | null;

  // Campos computados (no en DB, calculados al hidratar):
  baseOverall?: number;
  overallActual?: number; // base + boost
  tier?: Tier;
}

export interface Event {
  id: EventId;
  groupId: GroupId;
  modality: Modality;
  fieldName: string;
  fieldMapsUrl: string | null;
  scheduledAt: string;
  status: EventStatus;
  teamAName: string;
  teamBName: string;
  teamAScore: number | null;
  teamBScore: number | null;
  mvpPlayerId: PlayerId | null;
  drawSeed: string | null;
  createdByUserId: UserId;
  drawnByUserId: UserId | null;
  playedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface EventAttendance {
  id: AttendanceId;
  eventId: EventId;
  playerId: PlayerId;
  status: AttendanceStatus;
  checkedIn: boolean;
  checkedInAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface MatchParticipation {
  id: ParticipationId;
  eventId: EventId;
  playerId: PlayerId;
  team: ParticipationTeam;
  assignedPosition: PlayerPosition | null;
  playedPrimaryPosition: boolean;
  boostApplied: CurrentBoost | null;
  createdAt: string;
}

export interface PlayerStatChangeLog {
  id: string;
  playerId: PlayerId;
  changedByUserId: UserId;
  requestedByUserId: UserId | null;
  beforeStats: PlayerStats | null;
  afterStats: PlayerStats;
  reason: string | null;
  createdAt: string;
}

export interface StatRevisionRequest {
  id: string;
  playerId: PlayerId;
  userId: UserId;
  message: string;
  proposedStats: PlayerStats | null;
  status: RevisionStatus;
  resolvedByUserId: UserId | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface ReintegrationRequest {
  id: string;
  playerId: PlayerId;
  groupId: GroupId;
  userId: UserId;
  message: string | null;
  status: RevisionStatus;
  resolvedByUserId: UserId | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStatsAggregate {
  playerId: PlayerId;
  groupId: GroupId;
  userId: UserId | null;
  displayName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winPercentage: number | null;
  mvpCount: number;
  lastMvpAt: string | null;
  attendanceRate: number | null;
  lateDropouts: number;
}

export interface TemporaryOwner {
  id: string;
  eventId: EventId;
  userId: UserId;
  assignedReason: string;
  confirmedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface Notification {
  id: NotificationId;
  userId: UserId;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  pushedAt: string | null;
  emailedAt: string | null;
  createdAt: string;
}

// =========================================================================
// FORMATIONS
// =========================================================================

export interface FormationSlots {
  ARQ: number;
  DEF: number;
  MED: number;
  DEL: number;
}

export const FORMATIONS: Record<Modality, FormationSlots> = {
  F5: { ARQ: 1, DEF: 1, MED: 2, DEL: 1 },
  F6: { ARQ: 1, DEF: 2, MED: 2, DEL: 1 },
  F8: { ARQ: 1, DEF: 3, MED: 3, DEL: 1 },
  F11: { ARQ: 1, DEF: 4, MED: 3, DEL: 3 },
};

export const getTeamSize = (m: Modality): number =>
  FORMATIONS[m].ARQ + FORMATIONS[m].DEF + FORMATIONS[m].MED + FORMATIONS[m].DEL;

// =========================================================================
// OVERALL CALCULATION
// =========================================================================

export const FIELD_WEIGHTS: Record<Exclude<PlayerPosition, 'ARQ'>, Record<FieldStatKey, number>> = {
  DEF: { pac: 0.1,  sho: 0.05, pas: 0.15, dri: 0.1,  def: 0.35, phy: 0.25 },
  MED: { pac: 0.1,  sho: 0.15, pas: 0.25, dri: 0.25, def: 0.15, phy: 0.1  },
  DEL: { pac: 0.25, sho: 0.3,  pas: 0.15, dri: 0.2,  def: 0.03, phy: 0.07 },
};

export const GK_WEIGHTS: Record<GoalkeeperStatKey, number> = {
  div: 0.2,
  han: 0.25,
  kic: 0.1,
  ref: 0.25,
  spd: 0.05,
  pos: 0.15,
};

export const PRINCIPAL_STATS: Record<PlayerPosition, [string, string]> = {
  ARQ: ['han', 'ref'],
  DEF: ['def', 'phy'],
  MED: ['pas', 'dri'],
  DEL: ['pac', 'sho'],
};

export function isGoalkeeperStats(stats: PlayerStats): stats is GoalkeeperStats {
  return 'div' in stats;
}

export function isFieldStats(stats: PlayerStats): stats is FieldStats {
  return 'pac' in stats;
}

export function calculateOverall(stats: PlayerStats, position: PlayerPosition): number {
  let raw: number;

  if (position === 'ARQ') {
    if (!isGoalkeeperStats(stats)) throw new Error('ARQ requires GoalkeeperStats');
    raw =
      stats.div * GK_WEIGHTS.div +
      stats.han * GK_WEIGHTS.han +
      stats.kic * GK_WEIGHTS.kic +
      stats.ref * GK_WEIGHTS.ref +
      stats.spd * GK_WEIGHTS.spd +
      stats.pos * GK_WEIGHTS.pos;
  } else {
    if (!isFieldStats(stats)) throw new Error('non-ARQ requires FieldStats');
    const w = FIELD_WEIGHTS[position];
    raw =
      stats.pac * w.pac +
      stats.sho * w.sho +
      stats.pas * w.pas +
      stats.dri * w.dri +
      stats.def * w.def +
      stats.phy * w.phy;
  }

  return Math.min(99, Math.round(raw * 10));
}

export function applyBoostToStats(stats: PlayerStats, boost: CurrentBoost | null): PlayerStats {
  if (!boost) return stats;
  const out = { ...stats } as Record<string, number>;
  for (const [key, delta] of Object.entries(boost.modifiers)) {
    if (out[key] !== undefined) {
      out[key] = Math.min(10, out[key] + delta / 10);
    }
  }
  return out as unknown as PlayerStats;
}

export function getTier(overall: number): Tier {
  if (overall <= 65) return 'bronze';
  if (overall <= 75) return 'silver';
  if (overall <= 83) return 'gold_matte';
  return 'gold';
}

// =========================================================================
// DRAW
// =========================================================================

export interface PlayerForDraw {
  id: PlayerId;
  name: string;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  overallActual: number;
  currentBoost: CurrentBoost | null;
  isPhantom: boolean;
}

export interface DrawInput {
  modality: Modality;
  players: PlayerForDraw[];
  seed: string;
}

export interface DrawAssignment {
  playerId: PlayerId;
  team: 'A' | 'B';
  assignedPosition: PlayerPosition;
  playedPrimaryPosition: boolean;
}

export interface DrawResult {
  assignments: DrawAssignment[];
  substitutes: PlayerId[];
  teamAOverallAvg: number;
  teamBOverallAvg: number;
  ratingDiff: number;
  warnings: DrawWarning[];
}

export type DrawWarning =
  | { kind: 'imbalance'; diff: number }
  | { kind: 'out_of_position'; playerId: PlayerId; primary: PlayerPosition; assigned: PlayerPosition }
  | { kind: 'forced_goalkeeper'; playerId: PlayerId };

// =========================================================================
// RESULT / ERROR MODEL
// =========================================================================

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT'
  | 'ADMIN_GROUP_LIMIT_REACHED'
  | 'PLAYER_GROUP_LIMIT_REACHED'
  | 'OWNER_CAP_REACHED'
  | 'STATS_PENDING_APPROVAL'
  | 'REVISION_ALREADY_PENDING'
  | 'INVITE_CODE_INVALID'
  | 'INVITE_CODE_EXPIRED'
  | 'MAGIC_LINK_EXPIRED'
  | 'MAGIC_LINK_INVALID'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'PUSH_SUBSCRIPTION_FAILED'
  | 'INTERNAL_ERROR';

export interface AppError {
  code: AppErrorCode;
  message: string; // user-facing, español
  details?: unknown; // debug, nunca mostrado al user
}

// =========================================================================
// FORM INPUT TYPES
// =========================================================================

export interface CreateGroupInput {
  name: string;
  defaultModality: Modality;
  logoFile: File | null;
  donationLink: string | null;
}

export interface CreatePlayerStatsInput {
  groupId: GroupId;
  displayName: string;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  stats: PlayerStats;
  photoFile: File | null;
}

export interface RequestStatRevisionInput {
  playerId: PlayerId;
  message: string;
  proposedStats: PlayerStats | null;
}

export interface ResolveStatRevisionInput {
  requestId: string;
  decision: 'approved' | 'rejected';
  finalStats: PlayerStats | null; // si approved, puede modificar los proposed
  resolutionNote: string | null;
}

export interface CreateEventInput {
  groupId: GroupId;
  modality: Modality;
  fieldName: string;
  fieldMapsUrl: string | null;
  scheduledAt: string;
  notes: string | null;
}

export interface UpdateAttendanceInput {
  eventId: EventId;
  status: AttendanceStatus;
}

export interface CheckInInput {
  eventId: EventId;
  playerIds: PlayerId[]; // los que están físicamente
}

export interface LoadMatchResultInput {
  eventId: EventId;
  teamAScore: number;
  teamBScore: number;
  mvpPlayerId: PlayerId;
  notes: string | null;
}

export interface CreatePhantomPlayerInput {
  groupId: GroupId;
  eventId: EventId;
  displayName: string;
}

export interface ResolvePhantomPlayerInput {
  playerId: PlayerId;
  decision: 'convert' | 'archive' | 'delete';
  emailForConversion: string | null; // solo si decision='convert'
}

export interface AssignOwnerInput {
  groupId: GroupId;
  userId: UserId;
}

export interface TransferAdminInput {
  groupId: GroupId;
  newAdminUserId: UserId;
}

// =========================================================================
// UTILITIES
// =========================================================================

export function isAdminOf(user: User, group: Group): boolean {
  return group.adminUserId === user.id;
}

export function getActivePositions(modality: Modality): PlayerPosition[] {
  const slots = FORMATIONS[modality];
  const positions: PlayerPosition[] = [];
  if (slots.ARQ > 0) positions.push('ARQ');
  if (slots.DEF > 0) positions.push('DEF');
  if (slots.MED > 0) positions.push('MED');
  if (slots.DEL > 0) positions.push('DEL');
  return positions;
}
