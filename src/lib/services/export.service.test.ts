import { describe, it, expect } from 'vitest';
import { anonymizeData, exportFileName } from './export.service';
import type { ExportGroupData } from './export.service';

const BASE_DATA: ExportGroupData = {
  group: { id: 'g1', name: 'Los Pibes', default_modality: 'F5', created_at: '2026-01-01' },
  roster: [
    { id: 'p1', user_id: 'u1', display_name: 'Messi', primary_position: 'DEL', stats_status: 'approved', stats: {}, is_phantom: false, is_expelled: false, joined_at: '2026-01-01', archived_at: null },
    { id: 'p2', user_id: 'u2', display_name: 'Riquelme', primary_position: 'MED', stats_status: 'approved', stats: {}, is_phantom: false, is_expelled: false, joined_at: '2026-01-02', archived_at: null },
  ],
  events: [
    { id: 'e1', modality: 'F5', field_name: 'La Boquita', scheduled_at: '2026-05-01T20:00:00Z', status: 'played', team_a_score: 3, team_b_score: 2 },
  ],
  attendances: [
    { event_id: 'e1', player_id: 'p1', status: 'going', checked_in: true },
  ],
  participations: [
    { event_id: 'e1', player_id: 'p1', team: 'A', assigned_position: 'DEL' },
  ],
  statChangeLogs: [
    { id: 'l1', player_id: 'p1', changed_by_user_id: 'u1', requested_by_user_id: 'u2', before_stats: {}, after_stats: {}, reason: 'MVP', created_at: '2026-05-01' },
  ],
  revisionRequests: [
    { id: 'r1', player_id: 'p1', user_id: 'u2', status: 'pending' },
  ],
  reintegrationRequests: [],
};

describe('anonymizeData', () => {
  it('replaces user_id with sequential anonymous ids', () => {
    const result = anonymizeData(BASE_DATA, 'u1', true, 'Messi');
    const [p1, p2] = result.tables.roster as [typeof result.tables.roster[0], typeof result.tables.roster[0]];
    expect(p1.user_id).toMatch(/^user_\d+$/);
    expect(p2.user_id).toMatch(/^user_\d+$/);
    expect(p1.user_id).not.toBe(p2.user_id);
  });

  it('uses same anon id for the same real user id', () => {
    const result = anonymizeData(BASE_DATA, 'u1', true, 'Messi');
    const rosterU1 = result.tables.roster.find((p) => p.display_name === 'Messi')!;
    const logRow = result.tables.stat_change_logs[0]!;
    expect(rosterU1.user_id).toBe(logRow.changed_by_user_id);
  });

  it('preserves display_name (public info)', () => {
    const result = anonymizeData(BASE_DATA, 'u1', true, 'Messi');
    expect(result.tables.roster[0]!.display_name).toBe('Messi');
  });

  it('preserves group name in metadata', () => {
    const result = anonymizeData(BASE_DATA, 'u1', true, 'Messi');
    expect((result.metadata.group as Record<string, unknown>).name).toBe('Los Pibes');
  });

  it('sets correct exportedBy for admin', () => {
    const result = anonymizeData(BASE_DATA, 'u1', true, 'Messi');
    expect(result.metadata.exportedBy).toBe('Messi');
  });

  it('hides identity for owner (not admin)', () => {
    const result = anonymizeData(BASE_DATA, 'u1', false, 'Messi');
    expect(result.metadata.exportedBy).toBe('owner');
  });

  it('anonymizes changed_by_user_id in stat_change_logs', () => {
    const result = anonymizeData(BASE_DATA, 'u1', true, 'Messi');
    const log = result.tables.stat_change_logs[0]!;
    expect(log.changed_by_user_id).toMatch(/^user_\d+$/);
    expect(log.requested_by_user_id).toMatch(/^user_\d+$/);
  });

  it('handles null user_id gracefully', () => {
    const data = {
      ...BASE_DATA,
      roster: [{ ...BASE_DATA.roster[0], user_id: null }],
    };
    const result = anonymizeData(data, 'u1', true, 'Messi');
    expect(result.tables.roster[0]!.user_id).toBeNull();
  });
});

describe('exportFileName', () => {
  it('generates slug from group name with date', () => {
    const name = exportFileName('Los Pibes FC');
    expect(name).toMatch(/^los-pibes-fc-\d{4}-\d{2}-\d{2}\.zip$/);
  });

  it('removes accents from group name', () => {
    const name = exportFileName('Café del Fútbol');
    expect(name).not.toMatch(/[áéíóúñ]/);
    expect(name).toContain('.zip');
  });

  it('handles single-word names', () => {
    const name = exportFileName('Pibes');
    expect(name).toMatch(/^pibes-\d{4}-\d{2}-\d{2}\.zip$/);
  });
});
