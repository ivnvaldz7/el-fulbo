import type { NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket } from 'net';
import type { Server as SocketIOServer } from 'socket.io';

export type UserId = string;
export type PlayerId = string;
export type MatchId = EventId;
export type GroupId = string;
export type EventId = string;
export type InviteCode = string;

export type Modality = 'F5' | 'F6' | 'F7' | 'F8' | 'F11';
export type EventStatus = 'scheduled' | 'confirming' | 'checked_in' | 'drawn' | 'played' | 'cancelled';
export type AttendanceStatus = 'going' | 'not_going' | 'maybe';
export type EventAttendeeStatus =
  | AttendanceStatus
  | 'PENDING'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'CHECKED_IN';
export type GroupRole = 'admin' | 'owner';
export type PlayerStatsStatus = 'pending_approval' | 'approved';
export type StatsStatus = PlayerStatsStatus;
export type PlayerPosition = 'ARQ' | 'DEF' | 'MED' | 'DEL';

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export interface FieldStats {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface GoalkeeperStats {
  div: number;
  han: number;
  kic: number;
  ref: number;
  spd: number;
  pos: number;
}

export type PlayerStats = FieldStats | GoalkeeperStats;

export const FORMATIONS: Record<Modality, Record<PlayerPosition, number>> = {
  F5: { ARQ: 1, DEF: 1, MED: 2, DEL: 1 },
  F6: { ARQ: 1, DEF: 2, MED: 2, DEL: 1 },
  F7: { ARQ: 1, DEF: 2, MED: 3, DEL: 1 },
  F8: { ARQ: 1, DEF: 2, MED: 3, DEL: 2 },
  F11: { ARQ: 1, DEF: 4, MED: 3, DEL: 3 },
};

export function getTeamSize(modality: Modality) {
  return Object.values(FORMATIONS[modality]).reduce((total, value) => total + value, 0);
}

const FIELD_WEIGHTS: Record<PlayerPosition, FieldStats> = {
  ARQ: { pac: 1, sho: 1, pas: 1, dri: 1, def: 1, phy: 1 },
  DEF: { pac: 1, sho: 0.5, pas: 1, dri: 0.75, def: 1.5, phy: 1.25 },
  MED: { pac: 1, sho: 1, pas: 1.5, dri: 1.25, def: 1, phy: 0.75 },
  DEL: { pac: 1.25, sho: 1.5, pas: 0.75, dri: 1.25, def: 0.5, phy: 0.75 },
};

const GOALKEEPER_WEIGHTS: GoalkeeperStats = {
  div: 1.25,
  han: 1.25,
  kic: 0.75,
  ref: 1.5,
  spd: 0.5,
  pos: 1.25,
};

export function calculateOverall(stats: PlayerStats, position: PlayerPosition) {
  if ('div' in stats) {
    const totalWeight = Object.values(GOALKEEPER_WEIGHTS).reduce((sum, value) => sum + value, 0);
    const weighted = (Object.entries(stats) as Array<[keyof GoalkeeperStats, number]>).reduce(
      (sum, [key, value]) => sum + value * GOALKEEPER_WEIGHTS[key],
      0,
    );
    return Math.round((weighted / totalWeight) * 10);
  }

  const weights = FIELD_WEIGHTS[position === 'ARQ' ? 'MED' : position];
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const weighted = (Object.entries(stats) as Array<[keyof FieldStats, number]>).reduce(
    (sum, [key, value]) => sum + value * weights[key],
    0,
  );
  return Math.round((weighted / totalWeight) * 10);
}

export interface UserProfile {
  id: UserId;
  displayName: string;
  avatarUrl?: string | null;
  attendanceStatus?: AttendanceStatus;
}

export interface GroupMembership {
  id: string;
  userId: UserId;
  groupId: GroupId;
  role: GroupRole;
}

export interface GroupWithMemberships {
  id: GroupId;
  name: string;
  adminUserId: UserId;
  group_memberships: GroupMembership[];
}

export interface Player {
  id: PlayerId;
  user_id: UserId | null;
  group_id: GroupId;
  display_name: string;
  photo_url?: string | null;
  primary_position: PlayerPosition;
  secondary_position?: PlayerPosition | null;
  stats_status: PlayerStatsStatus;
  stats?: PlayerStats;
  current_boost?: unknown;
  joined_at?: string;
  archived_at?: string | null;
  is_phantom?: boolean;
  is_expelled?: boolean;
}

export interface PlayerMatchAssignment {
  id: UserId;
  displayName: string;
  team_name: string;
}

export interface TeamAssignment {
  name: string;
  players: PlayerMatchAssignment[];
}

export interface Event {
  id: EventId;
  group_id: GroupId;
  modality: Modality;
  field_name: string;
  field_maps_url?: string | null;
  scheduled_at: string;
  status: EventStatus;
  team_a_name?: string;
  team_b_name?: string;
  team_a_score?: number | null;
  team_b_score?: number | null;
  mvp_player_id?: PlayerId | null;
  draw_seed?: string | null;
  created_by_user_id: UserId;
  drawn_by_user_id?: UserId | null;
  played_at?: string | null;
  notes?: string | null;
  cancellation_motive?: string | null;
  cancelled_at?: string | null;
  team_assignments?: { teams: TeamAssignment[] } | null;
  title?: string;
  date_time?: string;
  location?: string;
  google_maps_link?: string | null;
  name?: string;
  description?: string;
  date?: string;
}

export interface EventDetails extends Event {
  groupName?: string;
  attendees: UserProfile[];
  organizer?: UserProfile;
}

export interface EventInsert {
  group_id: GroupId;
  modality: Modality;
  field_name: string;
  field_maps_url?: string | null;
  scheduled_at: string;
  notes?: string | null;
  created_by_user_id: UserId;
}

export interface EventAttendance {
  event_id: EventId;
  player_id: PlayerId;
  status: AttendanceStatus;
  checked_in: boolean;
}

export interface UpdateAttendanceInput {
  p_event_id: EventId;
  p_user_id?: UserId;
  p_status: AttendanceStatus;
}

interface SocketServer extends NetServer {
  io?: SocketIOServer | undefined;
}

interface SocketWithIo extends Socket {
  server: SocketServer;
}

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketWithIo;
}
