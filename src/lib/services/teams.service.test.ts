import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressableStatKey } from '@/lib/types/teams.types';
import {
  TeamsService,
  calculateCardOverall,
  getCardTierByOverall,
  getProgressionStatKeys,
  getTeamStatKindForPosition,
} from './teams.service';

function createRpcSupabase(result: { data?: unknown; error?: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

type QueryCall = { table: string; method: string; args: unknown[] };

function createQuerySupabase({
  user = { id: 'user-1' },
  handler,
}: {
  user?: { id: string } | null;
  handler: (table: string, calls: QueryCall[]) => { data?: unknown; error?: unknown };
}) {
  const calls: QueryCall[] = [];

  class QueryBuilder {
    private localCalls: QueryCall[] = [];

    constructor(private table: string) {}

    private record(method: string, args: unknown[]) {
      const call = { table: this.table, method, args };
      calls.push(call);
      this.localCalls.push(call);
      return this;
    }

    select(...args: unknown[]) {
      return this.record('select', args);
    }

    eq(...args: unknown[]) {
      return this.record('eq', args);
    }

    is(...args: unknown[]) {
      return this.record('is', args);
    }

    in(...args: unknown[]) {
      return this.record('in', args);
    }

    order(...args: unknown[]) {
      return this.record('order', args);
    }

    limit(...args: unknown[]) {
      return this.record('limit', args);
    }

    maybeSingle() {
      this.record('maybeSingle', []);
      return Promise.resolve(handler(this.table, this.localCalls));
    }

    then<TResult1 = { data?: unknown; error?: unknown }, TResult2 = never>(
      onfulfilled?: ((value: { data?: unknown; error?: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(handler(this.table, this.localCalls)).then(onfulfilled, onrejected);
    }
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => new QueryBuilder(table)),
  };

  return { supabase: supabase as unknown as SupabaseClient, calls, from: supabase.from, getUser: supabase.auth.getUser };
}

describe('teams service validation and orchestration', () => {
  it('validates team creation input before calling the RPC', async () => {
    const supabase = createRpcSupabase({ data: [{ team_id: 'team-1' }] });
    const service = new TeamsService(supabase);

    const invalid = await service.createTeam({ name: '', primaryPosition: 'DEL' });
    const valid = await service.createTeam({ name: '  Los Pibes  ', primaryPosition: 'MED' });

    expect(invalid).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('create_team', {
      p_name: 'Los Pibes',
      p_primary_position: 'MED',
      p_secondary_position: null,
      p_badge_url: null,
      p_primary_color: null,
      p_secondary_color: null,
    });
    expect(valid).toEqual({ ok: true, data: { teamId: 'team-1' } });
  });

  it('validates roster, match, signup and submission inputs before RPC calls', async () => {
    const supabase = createRpcSupabase({ data: [{ id: 'created' }] });
    const service = new TeamsService(supabase);

    await expect(service.addTeamMember({ teamId: 'bad', userId: crypto.randomUUID(), primaryPosition: 'DEF' })).resolves.toMatchObject({ ok: false });
    await expect(service.createTeamMatch({ teamId: crypto.randomUUID(), scheduledAt: 'not-date' })).resolves.toMatchObject({ ok: false });
    await expect(service.signUpForTeamMatch({ teamId: crypto.randomUUID(), matchId: 'bad' })).resolves.toMatchObject({ ok: false });
    await expect(
      service.submitTeamStat({
        teamId: crypto.randomUUID(),
        matchId: crypto.randomUUID(),
        statKind: 'goals',
        value: 100,
      }),
    ).resolves.toMatchObject({ ok: false });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('maps player positions to the only allowed submitted stat kind', () => {
    expect(getTeamStatKindForPosition('DEL')).toBe('goals');
    expect(getTeamStatKindForPosition('MED')).toBe('assists');
    expect(getTeamStatKindForPosition('DEF')).toBe('tackles');
    expect(getTeamStatKindForPosition('ARQ')).toBe('tackles');
  });

  it('calls the central missions RPC with the central-missions contract', async () => {
    const userId = crypto.randomUUID();
    const supabase = createRpcSupabase({
      data: [{ applied_points: 3, stats: { pas: 73, dri: 71, phy: 71 }, overall: 72, card_tier: 'silver' }],
    });
    const service = new TeamsService(supabase);

    const result = await service.processCentralMissions({ userId });

    expect(supabase.rpc).toHaveBeenCalledWith('process_team_central_missions', {
      p_user_id: userId,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        appliedPoints: 3,
        stats: { pas: 73, dri: 71, phy: 71 },
        overall: 72,
        cardTier: 'silver',
      },
    });
  });

  it('derives the card overall as a rounded simple mean and maps tiers', () => {
    const overall = calculateCardOverall({ pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 });

    expect(overall).toBe(71);
    expect(getProgressionStatKeys('DEL')).toEqual(['pac', 'sho', 'dri']);
    expect(getProgressionStatKeys('ARQ')).toEqual(['div', 'ref', 'han']);
    expect(getCardTierByOverall(63)).toBe('bronze');
    expect(getCardTierByOverall(74)).toBe('silver');
    expect(getCardTierByOverall(84)).toBe('gold');
    expect(getCardTierByOverall(90)).toBe('premium_gold');
  });

  it('validates card input before create and update RPC calls', async () => {
    const supabase = createRpcSupabase({ data: [{ user_id: 'user-1' }] });
    const service = new TeamsService(supabase);

    const fiveStats = await service.createCard({
      stats: { pac: 70, sho: 71, pas: 72, dri: 69, def: 70 },
      primaryPosition: 'DEL',
      secondaryPosition: 'MED',
    });
    const outOfRange = await service.createCard({
      stats: { pac: 54, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 },
      primaryPosition: 'DEL',
      secondaryPosition: 'MED',
    });
    const samePositions = await service.updateCard({
      stats: { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 },
      primaryPosition: 'DEL',
      secondaryPosition: 'DEL',
    });

    expect(fiveStats).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(outOfRange).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(samePositions).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls create and update card RPCs with parsed input', async () => {
    const supabase = createRpcSupabase({ data: [{ user_id: 'user-1' }] });
    const service = new TeamsService(supabase);

    const stats = { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 };
    const created = await service.createCard({ stats, primaryPosition: 'DEL', secondaryPosition: 'MED' });
    const updated = await service.updateCard({ stats, primaryPosition: 'DEL', secondaryPosition: 'MED' });

    expect(created).toEqual({ ok: true, data: { userId: 'user-1' } });
    expect(updated).toEqual({ ok: true, data: { userId: 'user-1' } });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'create_team_card', {
      p_stats: stats,
      p_primary_position: 'DEL',
      p_secondary_position: 'MED',
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'update_team_card', {
      p_stats: stats,
      p_primary_position: 'DEL',
      p_secondary_position: 'MED',
    });
  });

  it('runs the full card flow without touching Groups players or legacy progression', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ user_id: 'user-1' }], error: null });
    const from = vi.fn();
    const supabase = { rpc, from } as unknown as SupabaseClient;
    const service = new TeamsService(supabase);

    const stats = { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 };
    await service.createCard({ stats, primaryPosition: 'DEL', secondaryPosition: 'MED' });
    await service.updateCard({ stats, primaryPosition: 'DEL', secondaryPosition: 'MED' });
    await service.reviewAdmission({
      teamId: '00000000-0000-0000-0000-000000000000',
      userId: '11111111-1111-1111-1111-111111111111',
      decision: 'approved',
    });
    await service.grantMerit({
      teamId: '00000000-0000-0000-0000-000000000000',
      userId: '11111111-1111-1111-1111-111111111111',
      statKeys: ['sho'],
      pointsTotal: 2,
    });
    await service.processCentralMissions({ userId: '11111111-1111-1111-1111-111111111111' });

    const rpcNames = rpc.mock.calls.map((call) => call[0]);
    expect(rpcNames).toEqual([
      'create_team_card',
      'update_team_card',
      'review_team_admission',
      'grant_team_merit',
      'process_team_central_missions',
    ]);
    expect(rpcNames).not.toContain('process_team_player_progression');
    expect(from).not.toHaveBeenCalled();
  });

  it('requires a rejection reason when rejecting an admission review', async () => {
    const supabase = createRpcSupabase({ data: [] });
    const service = new TeamsService(supabase);

    const result = await service.reviewAdmission({
      teamId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      decision: 'rejected',
      rejectionReason: '',
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls the admission review RPC and maps the sealed status', async () => {
    const supabase = createRpcSupabase({ data: [{ team_id: 'team-1', user_id: 'user-1', status: 'approved' }] });
    const service = new TeamsService(supabase);

    const result = await service.reviewAdmission({
      teamId: '00000000-0000-0000-0000-000000000000',
      userId: '11111111-1111-1111-1111-111111111111',
      decision: 'approved',
    });

    expect(result).toEqual({ ok: true, data: { teamId: 'team-1', userId: 'user-1', status: 'approved' } });
    expect(supabase.rpc).toHaveBeenCalledWith('review_team_admission', {
      p_team_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '11111111-1111-1111-1111-111111111111',
      p_decision: 'approved',
      p_rejection_reason: null,
    });
  });

  it('validates merit input limits before calling the RPC', async () => {
    const supabase = createRpcSupabase({ data: [] });
    const service = new TeamsService(supabase);

    const tooManyPoints = await service.grantMerit({
      teamId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      statKeys: ['sho'],
      pointsTotal: 4,
    });
    const tooManyKeys = await service.grantMerit({
      teamId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      statKeys: ['sho', 'pac', 'pas'],
      pointsTotal: 2,
    });
    const invalidKey = await service.grantMerit({
      teamId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      statKeys: ['abc' as ProgressableStatKey],
      pointsTotal: 2,
    });

    expect(tooManyPoints).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(tooManyKeys).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(invalidKey).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls the merit RPC and maps the boosted card result', async () => {
    const supabase = createRpcSupabase({
      data: [{ grant_id: 'grant-1', stats: { pac: 71, sho: 72, pas: 72, dri: 70, def: 70, phy: 71 }, overall: 71, card_tier: 'silver' }],
    });
    const service = new TeamsService(supabase);

    const result = await service.grantMerit({
      teamId: '00000000-0000-0000-0000-000000000000',
      userId: '11111111-1111-1111-1111-111111111111',
      statKeys: ['sho', 'pac'],
      pointsTotal: 2,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        grantId: 'grant-1',
        stats: { pac: 71, sho: 72, pas: 72, dri: 70, def: 70, phy: 71 },
        overall: 71,
        cardTier: 'silver',
      },
    });
    expect(supabase.rpc).toHaveBeenCalledWith('grant_team_merit', {
      p_team_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '11111111-1111-1111-1111-111111111111',
      p_stat_keys: ['sho', 'pac'],
      p_points_total: 2,
    });
  });

  it('maps the central card panel from the aggregates view and computes overall and tier', async () => {
    const { supabase, calls } = createQuerySupabase({
      handler: (table) => {
        if (table === 'team_central_card_aggregates') {
          return {
            data: {
              user_id: 'user-1',
              stats: { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 },
              primary_position: 'DEL',
              secondary_position: 'MED',
              matches_played: 12,
              goals: 25,
              assists: 8,
              tackles: 4,
              mvps: 5,
              trophies: 3,
              missions: 4,
              mission_points: 9,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
    });
    const service = new TeamsService(supabase);

    const result = await service.getCentralCardPanel('user-1');

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'user-1',
        stats: { pac: 70, sho: 71, pas: 72, dri: 69, def: 70, phy: 71 },
        primaryPosition: 'DEL',
        secondaryPosition: 'MED',
        matchesPlayed: 12,
        goals: 25,
        assists: 8,
        tackles: 4,
        mvps: 5,
        trophies: 3,
        missions: 4,
        missionPoints: 9,
        overall: 71,
        cardTier: 'silver',
      },
    });
    expect(calls).toEqual([
      { table: 'team_central_card_aggregates', method: 'select', args: ['*'] },
      { table: 'team_central_card_aggregates', method: 'eq', args: ['user_id', 'user-1'] },
      { table: 'team_central_card_aggregates', method: 'maybeSingle', args: [] },
    ]);
  });

  it('returns null when the user has no central card panel yet', async () => {
    const { supabase } = createQuerySupabase({
      handler: () => ({ data: null, error: null }),
    });
    const service = new TeamsService(supabase);

    const result = await service.getCentralCardPanel('user-1');

    expect(result).toEqual({ ok: true, data: null });
  });

  it('maps teams for the current user from memberships, counts and approved totals', async () => {
    const { supabase } = createQuerySupabase({
      handler: (table, calls) => {
        if (table === 'team_members') {
          const selected = String(calls.find((call) => call.method === 'select')?.args[0] ?? '');
          if (selected === 'team_id') {
            return {
              data: [{ team_id: 'team-1' }, { team_id: 'team-1' }, { team_id: 'team-2' }],
              error: null,
            };
          }

          return {
            data: [
              {
                id: 'member-1',
                role: 'admin',
                team_id: 'team-1',
                teams: { id: 'team-1', name: 'La Máquina', slug: 'la-maquina', primary_color: '#16a34a', secondary_color: '#020617' },
              },
            ],
            error: null,
          };
        }

        if (table === 'team_approved_stat_totals') {
          return { data: [{ team_id: 'team-1', matches_played: 8, goals: 24, assists: 13, tackles: 31 }], error: null };
        }

        return { data: [], error: null };
      },
    });
    const service = new TeamsService(supabase);

    const result = await service.getTeamsForCurrentUser();

    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: 'team-1',
          name: 'La Máquina',
          slug: 'la-maquina',
          primaryColor: '#16a34a',
          secondaryColor: '#020617',
          role: 'admin',
          memberCount: 2,
          matchesPlayed: 8,
          goals: 24,
          assists: 13,
          tackles: 31,
        },
      ],
    });
  });

  it('maps team detail submissions for admins', async () => {
    const { supabase } = createQuerySupabase({
      handler: (table) => {
        if (table === 'teams') {
          return { data: { id: 'team-1', name: 'La Máquina', slug: 'la-maquina', primary_color: '#16a34a', secondary_color: '#020617' }, error: null };
        }

        if (table === 'team_members') {
          return {
            data: [
              {
                id: 'member-1',
                user_id: 'user-1',
                role: 'admin',
                primary_position: 'DEL',
                secondary_position: 'MED',
                users: { display_name: 'Juan Pérez', photo_url: 'photo.jpg' },
              },
            ],
            error: null,
          };
        }

        if (table === 'team_matches') {
          return {
            data: [
              {
                id: 'match-1',
                scheduled_at: '2026-07-20T22:00:00.000Z',
                opponent_name: 'Los Pibes',
                field_name: 'Cancha 5',
                status: 'played',
                team_score: 4,
                opponent_score: 2,
                team_match_signups: [{ id: 'signup-1' }, { id: 'signup-2' }],
              },
            ],
            error: null,
          };
        }

        if (table === 'team_stat_submissions') {
          return {
            data: [
              {
                id: 'submission-1',
                stat_kind: 'goals',
                value: 2,
                status: 'pending',
                team_matches: { opponent_name: 'Los Pibes', scheduled_at: '2026-07-20T22:00:00.000Z' },
                users: { display_name: 'Juan Pérez' },
              },
            ],
            error: null,
          };
        }

        if (table === 'team_approved_stat_totals') {
          return { data: { matches_played: 1, goals: 4, assists: 1, tackles: 6 }, error: null };
        }

        return { data: [], error: null };
      },
    });
    const service = new TeamsService(supabase);

    const result = await service.getTeamDetail('team-1');

    expect(result).toMatchObject({
      ok: true,
      data: {
        id: 'team-1',
        role: 'admin',
        memberCount: 1,
        matches: [{ id: 'match-1', signupCount: 2, teamScore: 4, opponentScore: 2 }],
        submissions: [{ id: 'submission-1', playerName: 'Juan Pérez', matchLabel: 'vs Los Pibes', statKind: 'goals', value: 2, status: 'pending' }],
      },
    });
  });

  it('does not fetch or expose moderation submissions for non-admin team members', async () => {
    const { supabase, calls } = createQuerySupabase({
      handler: (table) => {
        if (table === 'teams') {
          return { data: { id: 'team-1', name: 'La Máquina', slug: 'la-maquina', primary_color: null, secondary_color: null }, error: null };
        }

        if (table === 'team_members') {
          return {
            data: [
              {
                id: 'member-1',
                user_id: 'user-1',
                role: 'member',
                primary_position: 'DEF',
                secondary_position: null,
                users: { display_name: 'Leo Díaz', photo_url: null },
              },
            ],
            error: null,
          };
        }

        if (table === 'team_matches') {
          return { data: [], error: null };
        }

        if (table === 'team_approved_stat_totals') {
          return { data: null, error: null };
        }

        throw new Error(`Unexpected query for ${table}`);
      },
    });
    const service = new TeamsService(supabase);

    const result = await service.getTeamDetail('team-1');

    expect(result).toMatchObject({ ok: true, data: { role: 'member', submissions: [] } });
    expect(calls.some((call) => call.table === 'team_stat_submissions')).toBe(false);
  });

  it('calls the rpc for voteForTeamMatchMvp', async () => {
    const supabase = createRpcSupabase({ data: null });
    const service = new TeamsService(supabase);

    const result = await service.voteForTeamMatchMvp({
      teamId: '00000000-0000-0000-0000-000000000000',
      matchId: '11111111-1111-1111-1111-111111111111',
      votedPlayerId: '22222222-2222-2222-2222-222222222222',
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(supabase.rpc).toHaveBeenCalledWith('vote_for_team_match_mvp', {
      p_team_id: '00000000-0000-0000-0000-000000000000',
      p_match_id: '11111111-1111-1111-1111-111111111111',
      p_voted_player_id: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('resolves mvp by fetching votes, calculating max, and calling set_team_match_mvp', async () => {
    const { supabase, calls } = createQuerySupabase({
      handler: (table) => {
        if (table === 'team_match_mvp_votes') {
          return {
            data: [
              { voted_player_id: '22222222-2222-2222-2222-222222222222' },
              { voted_player_id: '33333333-3333-3333-3333-333333333333' },
              { voted_player_id: '22222222-2222-2222-2222-222222222222' },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      },
    });

    // Mock rpc so it doesn't fail when setting MVP
    (supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    const service = new TeamsService(supabase);
    const result = await service.resolveTeamMatchMvp({
      teamId: '00000000-0000-0000-0000-000000000000',
      matchId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(calls.some((c) => c.table === 'team_match_mvp_votes')).toBe(true);
    // Player 22...22 got 2 votes, 33...33 got 1 vote
    expect((supabase as any).rpc).toHaveBeenCalledWith('set_team_match_mvp', {
      p_team_id: '00000000-0000-0000-0000-000000000000',
      p_match_id: '11111111-1111-1111-1111-111111111111',
      p_mvp_user_id: '22222222-2222-2222-2222-222222222222',
    });
  });
});
