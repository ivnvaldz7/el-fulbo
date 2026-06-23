import { describe, expect, it, vi } from 'vitest';
import { fetchPlayerStats } from './player-stats.service';

const baseRow = {
  player_id: '33333333-3333-3333-3333-333333333331',
  group_id: '22222222-2222-2222-2222-222222222221',
  user_id: '44444444-4444-4444-4444-444444444441',
  display_name: 'Juan',
  matches_played: 10,
  wins: 5,
  draws: 3,
  losses: 2,
  mvp_count: 2,
  last_mvp_at: '2026-04-01T18:00:00Z',
  attendance_rate: 80.0,
  late_dropouts: 1,
};

function mockSupabase(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    }),
  };
}

describe('fetchPlayerStats', () => {
  it('maps a full row correctly', async () => {
    const result = await fetchPlayerStats(mockSupabase(baseRow) as never, '33333333-3333-3333-3333-333333333331');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.matchesPlayed).toBe(10);
    expect(result.data.wins).toBe(5);
    expect(result.data.draws).toBe(3);
    expect(result.data.losses).toBe(2);
    expect(result.data.winPercentage).toBe(50);
    expect(result.data.mvpCount).toBe(2);
    expect(result.data.attendanceRate).toBe(80.0);
    expect(result.data.lateDropouts).toBe(1);
  });

  it('returns winPercentage null when matchesPlayed is 0', async () => {
    const row = { ...baseRow, matches_played: 0, wins: 0 };
    const result = await fetchPlayerStats(mockSupabase(row) as never, '33333333-3333-3333-3333-333333333331');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.winPercentage).toBeNull();
    expect(result.data.matchesPlayed).toBe(0);
  });

  it('returns error on query failure', async () => {
    const result = await fetchPlayerStats(
      mockSupabase(null, { message: 'Database error', code: 'PGRST116' }) as never,
      '33333333-3333-3333-3333-333333333331',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND when data is null without error', async () => {
    const result = await fetchPlayerStats(mockSupabase(null, null) as never, '33333333-3333-3333-3333-333333333331');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('handles null attendance_rate (jugador nuevo)', async () => {
    const row = { ...baseRow, attendance_rate: null };
    const result = await fetchPlayerStats(mockSupabase(row) as never, '33333333-3333-3333-3333-333333333331');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.attendanceRate).toBeNull();
  });

  it('handles null last_mvp_at', async () => {
    const row = { ...baseRow, last_mvp_at: null };
    const result = await fetchPlayerStats(mockSupabase(row) as never, '33333333-3333-3333-3333-333333333331');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lastMvpAt).toBeNull();
  });
});
