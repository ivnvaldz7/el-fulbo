import JSZip from 'jszip';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/lib/types';
import { mapSupabaseError } from './errors';

export interface ExportGroupData {
  group: Record<string, unknown>;
  roster: Record<string, unknown>[];
  events: Record<string, unknown>[];
  attendances: Record<string, unknown>[];
  participations: Record<string, unknown>[];
  statChangeLogs: Record<string, unknown>[];
  revisionRequests: Record<string, unknown>[];
  reintegrationRequests: Record<string, unknown>[];
}

export interface AnonymizedExport {
  metadata: Record<string, unknown>;
  tables: {
    group: Record<string, unknown>;
    roster: Record<string, unknown>[];
    events: Record<string, unknown>[];
    attendances: Record<string, unknown>[];
    participations: Record<string, unknown>[];
    stat_change_logs: Record<string, unknown>[];
    revision_requests: Record<string, unknown>[];
    reintegration_requests: Record<string, unknown>[];
  };
  exportedByName: string;
  groupName: string;
}

export async function fetchGroupData(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Result<ExportGroupData>> {
  const [
    groupRes,
    rosterRes,
    eventsRes,
    attendancesRes,
    participationsRes,
    statLogsRes,
    revisionRes,
    reintegrationRes,
  ] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, default_modality, invite_code, donation_link, created_at, archived_at')
      .eq('id', groupId)
      .maybeSingle(),

    supabase
      .from('players')
      .select(
        'id, user_id, display_name, primary_position, secondary_position, stats_status, stats, current_boost, is_phantom, is_expelled, joined_at, archived_at',
      )
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true }),

    supabase
      .from('events')
      .select(
        'id, modality, field_name, field_maps_url, scheduled_at, status, team_a_name, team_b_name, team_a_score, team_b_score, mvp_player_id, played_at, notes, created_at',
      )
      .eq('group_id', groupId)
      .order('scheduled_at', { ascending: true }),

    supabase
      .from('event_attendances')
      .select('event_id, player_id, status, checked_in, checked_in_at, created_at, updated_at')
      .in(
        'event_id',
        (
          await supabase
            .from('events')
            .select('id')
            .eq('group_id', groupId)
        ).data?.map((e) => e.id as string) ?? [],
      ),

    supabase
      .from('match_participations')
      .select(
        'event_id, player_id, team, assigned_position, played_primary_position, boost_applied, created_at',
      )
      .in(
        'event_id',
        (
          await supabase
            .from('events')
            .select('id')
            .eq('group_id', groupId)
        ).data?.map((e) => e.id as string) ?? [],
      ),

    supabase
      .from('player_stat_change_logs')
      .select(
        'id, player_id, changed_by_user_id, requested_by_user_id, before_stats, after_stats, reason, created_at',
      )
      .in(
        'player_id',
        (
          await supabase
            .from('players')
            .select('id')
            .eq('group_id', groupId)
        ).data?.map((p) => p.id as string) ?? [],
      )
      .order('created_at', { ascending: true }),

    supabase
      .from('stat_revision_requests')
      .select(
        'id, player_id, user_id, message, proposed_stats, status, resolved_by_user_id, resolved_at, resolution_note, created_at',
      )
      .in(
        'player_id',
        (
          await supabase
            .from('players')
            .select('id')
            .eq('group_id', groupId)
        ).data?.map((p) => p.id as string) ?? [],
      ),

    supabase
      .from('reintegration_requests')
      .select(
        'id, player_id, user_id, message, status, resolved_by_user_id, resolved_at, resolution_note, created_at',
      )
      .eq('group_id', groupId),
  ]);

  if (groupRes.error) return { ok: false, error: mapSupabaseError(groupRes.error) };
  if (rosterRes.error) return { ok: false, error: mapSupabaseError(rosterRes.error) };
  if (eventsRes.error) return { ok: false, error: mapSupabaseError(eventsRes.error) };
  if (attendancesRes.error) return { ok: false, error: mapSupabaseError(attendancesRes.error) };
  if (participationsRes.error) return { ok: false, error: mapSupabaseError(participationsRes.error) };
  if (statLogsRes.error) return { ok: false, error: mapSupabaseError(statLogsRes.error) };
  if (revisionRes.error) return { ok: false, error: mapSupabaseError(revisionRes.error) };
  if (reintegrationRes.error) return { ok: false, error: mapSupabaseError(reintegrationRes.error) };

  return {
    ok: true,
    data: {
      group: (groupRes.data ?? {}) as Record<string, unknown>,
      roster: (rosterRes.data ?? []) as Record<string, unknown>[],
      events: (eventsRes.data ?? []) as Record<string, unknown>[],
      attendances: (attendancesRes.data ?? []) as Record<string, unknown>[],
      participations: (participationsRes.data ?? []) as Record<string, unknown>[],
      statChangeLogs: (statLogsRes.data ?? []) as Record<string, unknown>[],
      revisionRequests: (revisionRes.data ?? []) as Record<string, unknown>[],
      reintegrationRequests: (reintegrationRes.data ?? []) as Record<string, unknown>[],
    },
  };
}

export function anonymizeData(
  data: ExportGroupData,
  requestingUserId: string,
  isAdmin: boolean,
  exportedByName: string,
): AnonymizedExport {
  let counter = 1;
  const userIdMap = new Map<string, string>();

  function anonUserId(userId: string | null | undefined): string | null {
    if (!userId) return null;
    if (!userIdMap.has(userId)) {
      userIdMap.set(userId, `user_${counter++}`);
    }
    return userIdMap.get(userId)!;
  }

  const roster = data.roster.map((p) => ({
    ...p,
    user_id: anonUserId(p.user_id as string | null),
  }));

  const statChangeLogs = data.statChangeLogs.map((log) => ({
    ...log,
    changed_by_user_id: anonUserId(log.changed_by_user_id as string | null),
    requested_by_user_id: anonUserId(log.requested_by_user_id as string | null),
  }));

  const revisionRequests = data.revisionRequests.map((r) => ({
    ...r,
    user_id: anonUserId(r.user_id as string | null),
    resolved_by_user_id: anonUserId(r.resolved_by_user_id as string | null),
  }));

  const reintegrationRequests = data.reintegrationRequests.map((r) => ({
    ...r,
    user_id: anonUserId(r.user_id as string | null),
    resolved_by_user_id: anonUserId(r.resolved_by_user_id as string | null),
  }));

  const groupName = (data.group.name as string) ?? 'grupo';

  return {
    metadata: {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: isAdmin ? exportedByName : 'owner',
      group: {
        id: data.group.id,
        name: groupName,
        modality: data.group.default_modality,
        createdAt: data.group.created_at,
        playersCount: data.roster.length,
        eventsCount: data.events.length,
      },
    },
    tables: {
      group: data.group,
      roster,
      events: data.events,
      attendances: data.attendances,
      participations: data.participations,
      stat_change_logs: statChangeLogs,
      revision_requests: revisionRequests,
      reintegration_requests: reintegrationRequests,
    },
    exportedByName,
    groupName,
  };
}

function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const str = String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escape).join(',');
  const dataRows = rows.map((row) => headers.map((h) => escape(row[h])).join(','));
  return [headerRow, ...dataRows].join('\n');
}

function generateReadme(ex: AnonymizedExport): string {
  const date = new Date().toISOString().replace('T', ' ').slice(0, 16);
  return `El Fulbo — Export de datos
Grupo: ${ex.groupName}
Fecha de export: ${date}
Generado por: ${ex.exportedByName}

Este ZIP contiene todos los datos de tu grupo en El Fulbo.

Estructura:
- /json/: archivos JSON estructurados, uno por tabla.
- /csv/: mismos datos en formato CSV para análisis en Excel/Sheets.
- metadata.json: info general del grupo.

Privacidad:
- Se excluyen los emails de los jugadores.
- Los IDs internos de usuarios se reemplazaron por referencias anonimizadas.

Preguntas: ivnvldz7@gmail.com
`;
}

const LICENSE = `Los datos exportados pertenecen al grupo y sus miembros.
Este archivo fue generado por El Fulbo (https://elfulbo.app).
No compartir sin consentimiento de los miembros del grupo.
`;

export async function buildGroupZip(ex: AnonymizedExport): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file('README.txt', generateReadme(ex));
  zip.file('metadata.json', JSON.stringify(ex.metadata, null, 2));
  zip.file('LICENSE.txt', LICENSE);

  const jsonFolder = zip.folder('json')!;
  for (const [key, value] of Object.entries(ex.tables)) {
    jsonFolder.file(`${key}.json`, JSON.stringify(value, null, 2));
  }

  const csvFolder = zip.folder('csv')!;

  const rosterHeaders = [
    'id', 'display_name', 'user_id', 'primary_position', 'secondary_position',
    'stats_status', 'is_phantom', 'is_expelled', 'joined_at', 'archived_at',
  ];
  csvFolder.file('roster.csv', toCsv(ex.tables.roster, rosterHeaders));

  const eventsHeaders = [
    'id', 'modality', 'field_name', 'scheduled_at', 'status',
    'team_a_name', 'team_b_name', 'team_a_score', 'team_b_score',
    'mvp_player_id', 'played_at', 'created_at',
  ];
  csvFolder.file('events.csv', toCsv(ex.tables.events, eventsHeaders));

  const participationsHeaders = [
    'event_id', 'player_id', 'team', 'assigned_position',
    'played_primary_position', 'created_at',
  ];
  csvFolder.file('participations.csv', toCsv(ex.tables.participations, participationsHeaders));

  const statLogsHeaders = [
    'id', 'player_id', 'changed_by_user_id', 'before_stats',
    'after_stats', 'reason', 'created_at',
  ];
  csvFolder.file(
    'stat_change_logs.csv',
    toCsv(
      ex.tables.stat_change_logs.map((r) => ({
        ...r,
        before_stats: JSON.stringify(r.before_stats),
        after_stats: JSON.stringify(r.after_stats),
      })),
      statLogsHeaders,
    ),
  );

  return zip.generateAsync({ type: 'uint8array' });
}

export function exportFileName(groupName: string): string {
  const slug = groupName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-${date}.zip`;
}
