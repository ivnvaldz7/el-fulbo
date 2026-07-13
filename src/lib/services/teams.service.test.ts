import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TeamsService,
  applyTeamProgression,
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

  it('calls progression RPC with the existing base-card contract', async () => {
    const userId = crypto.randomUUID();
    const supabase = createRpcSupabase({
      data: [{ applied_rewards: 1, stats: { pas: 71, dri: 71, phy: 71 }, overall: 71, card_tier: 'silver' }],
    });
    const service = new TeamsService(supabase);

    const result = await service.processTeamPlayerProgression({ userId });

    expect(supabase.rpc).toHaveBeenCalledWith('process_team_player_progression', {
      p_user_id: userId,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        appliedRewards: 1,
        stats: { pas: 71, dri: 71, phy: 71 },
        overall: 71,
        cardTier: 'silver',
      },
    });
  });

  it('allocates permanent progression by position, caps stats at 99 and derives visual tier', () => {
    const forward = applyTeamProgression({
      position: 'DEL',
      stats: { pac: 98, sho: 99, pas: 80, dri: 80, def: 40, phy: 70 },
      amount: 2,
    });
    const defender = applyTeamProgression({
      position: 'DEF',
      stats: { pac: 60, sho: 55, pas: 70, dri: 62, def: 98, phy: 98 },
      amount: 1,
    });

    expect(getProgressionStatKeys('DEL')).toEqual(['pac', 'sho', 'dri']);
    expect(forward.stats).toMatchObject({ pac: 99, sho: 99, dri: 82 });
    expect(forward.overall).toBeGreaterThanOrEqual(80);
    expect(defender.stats).toMatchObject({ def: 99, phy: 99, pas: 71 });
    expect(getCardTierByOverall(63)).toBe('bronze');
    expect(getCardTierByOverall(74)).toBe('silver');
    expect(getCardTierByOverall(84)).toBe('gold');
    expect(getCardTierByOverall(90)).toBe('premium_gold');
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
});
