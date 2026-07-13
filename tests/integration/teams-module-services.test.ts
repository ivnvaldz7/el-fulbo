import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

type PlayerPosition = 'DEL' | 'MED' | 'DEF' | 'ARQ';

async function seedPlayerProfile(
  client: Client,
  userId: string,
  position: PlayerPosition,
  label: string,
  stats = { pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 },
  joinedAt = 'now()',
) {
  const admin = await seedUser(client, `ts-pa-${label}`);
  const group = await seedGroup(client, admin.id);

  const player = await client.query<{ id: string }>(
    `
      insert into public.players (
        user_id,
        group_id,
        display_name,
        primary_position,
        stats,
        stats_status,
        joined_at
      )
      values ($1, $2, $3, $4, $5::jsonb, 'approved', ${joinedAt})
      returning id
    `,
    [userId, group.id, `Perfil ${label}`, position, JSON.stringify(stats)],
  );

  return player.rows[0]!.id;
}

async function createTeam(client: Client, adminUserId: string, name: string, position: PlayerPosition = 'MED') {
  const result = await asUser(client, adminUserId, () =>
    client.query<{ team_id: string }>(`select * from public.create_team($1, $2)`, [name, position]),
  );

  return result.rows[0]!.team_id;
}

async function addMember(client: Client, adminUserId: string, teamId: string, userId: string, position: PlayerPosition) {
  return asUser(client, adminUserId, () =>
    client.query(`select * from public.add_team_member($1, $2, $3)`, [teamId, userId, position]),
  );
}

async function createPlayedMatch(client: Client, adminUserId: string, teamId: string, index: number, mvpUserId?: string) {
  const result = await asUser(client, adminUserId, () =>
    client.query<{ match_id: string }>(
      `
        select * from public.create_team_match(
          $1,
          now() - ($2::int || ' days')::interval,
          $3,
          null,
          null,
          'played'\::public.team_match_status,
          3::smallint,
          1::smallint,
          $4,
          now() - ($2::int || ' days')::interval,
          null
        )
      `,
      [teamId, index, `Rival ${index}`, mvpUserId ?? null],
    ),
  );

  return result.rows[0]!.match_id;
}

describe('teams module services and RPCs', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('covers team creation, invitation, roster add/remove, match creation and member-only signup through RPCs', async () => {
    const admin = await seedUser(client, 'ts-af');
    const member = await seedUser(client, 'ts-mf');
    const outsider = await seedUser(client, 'ts-outsider-flow');
    await seedPlayerProfile(client, admin.id, 'MED', 'af');
    await seedPlayerProfile(client, member.id, 'DEL', 'mf');

    const teamId = await createTeam(client, admin.id, 'Servicios FC', 'MED');
    const invite = await asUser(client, admin.id, () =>
      client.query<{ code: string }>(`select * from public.create_team_invitation($1, $2)`, [teamId, `TEAM-${randomUUID().slice(0, 8).toUpperCase()}`]),
    );

    await addMember(client, admin.id, teamId, member.id, 'DEL');
    const archived = await asUser(client, admin.id, () =>
      client.query<{ archived_member_id: string }>(`select * from public.remove_team_member($1, $2)`, [teamId, member.id]),
    );
    await addMember(client, admin.id, teamId, member.id, 'DEL');

    const match = await asUser(client, admin.id, () =>
      client.query<{ match_id: string }>(
        `select * from public.create_team_match($1, now() + interval '2 days', 'Visitante', null, null, 'scheduled')`,
        [teamId],
      ),
    );
    const signup = await asUser(client, member.id, () =>
      client.query<{ signup_id: string; status: string }>(`select * from public.signup_team_match($1, $2)`, [teamId, match.rows[0]!.match_id]),
    );

    await expect(
      asUser(client, outsider.id, () => client.query(`select * from public.signup_team_match($1, $2)`, [teamId, match.rows[0]!.match_id])),
    ).rejects.toThrow(/TEAM_SIGNUP_USER_NOT_MEMBER|violates row-level security|FORBIDDEN/);

    expect(invite.rows[0]!.code).toMatch(/^TEAM-/);
    expect(archived.rows[0]!.archived_member_id).toEqual(expect.any(String));
    expect(signup.rows[0]).toMatchObject({ status: 'going' });
  });

  it('keeps submissions pending, rejects wrong stat kinds and aggregates only approved stats', async () => {
    const admin = await seedUser(client, 'ts-as');
    const forward = await seedUser(client, 'ts-fs');
    const defender = await seedUser(client, 'ts-ds');
    const midfielder = await seedUser(client, 'ts-ms');
    const keeper = await seedUser(client, 'ts-ks');
    await seedPlayerProfile(client, admin.id, 'MED', 'as');
    await seedPlayerProfile(client, forward.id, 'DEL', 'fs');
    await seedPlayerProfile(client, defender.id, 'DEF', 'ds');
    await seedPlayerProfile(client, midfielder.id, 'MED', 'ms');
    await seedPlayerProfile(client, keeper.id, 'ARQ', 'ks');
    const teamId = await createTeam(client, admin.id, 'Stats Servicios FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');
    await addMember(client, admin.id, teamId, defender.id, 'DEF');
    await addMember(client, admin.id, teamId, midfielder.id, 'MED');
    await addMember(client, admin.id, teamId, keeper.id, 'ARQ');
    const matchId = await createPlayedMatch(client, admin.id, teamId, 1);

    const pending = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string; status: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 2::smallint)`, [teamId, matchId]),
    );
    const rejected = await asUser(client, defender.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'tackles'::public.team_stat_kind, 5::smallint)`, [teamId, matchId]),
    );
    const assist = await asUser(client, midfielder.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'assists'::public.team_stat_kind, 3::smallint)`, [teamId, matchId]),
    );
    const keeperTackle = await asUser(client, keeper.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'tackles'::public.team_stat_kind, 1::smallint)`, [teamId, matchId]),
    );

    await expect(
      asUser(client, defender.id, () => client.query(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [teamId, matchId])),
    ).rejects.toThrow(/TEAM_STAT_KIND_NOT_ALLOWED/);

    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [pending.rows[0]!.submission_id]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'inflated')`, [rejected.rows[0]!.submission_id]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [assist.rows[0]!.submission_id]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [keeperTackle.rows[0]!.submission_id]),
    );

    const totals = await asUser(client, forward.id, () =>
      client.query(`select goals, assists, tackles from public.team_approved_stat_totals where team_id = $1`, [teamId]),
    );

    expect(pending.rows[0]!.status).toBe('pending');
    expect(totals.rows[0]).toMatchObject({ goals: '2', assists: '3', tackles: '1' });
  });

  it('counts played matches only when they have approved participation', async () => {
    const admin = await seedUser(client, 'ts-apart-a');
    const forward = await seedUser(client, 'ts-apart-f');
    await seedPlayerProfile(client, admin.id, 'MED', 'apart-admin');
    await seedPlayerProfile(client, forward.id, 'DEL', 'apart-forward');
    const teamId = await createTeam(client, admin.id, 'Approved Participation FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');
    const rejectedMatchId = await createPlayedMatch(client, admin.id, teamId, 1);
    const pendingMatchId = await createPlayedMatch(client, admin.id, teamId, 2);

    const rejectedSubmission = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 2::smallint)`, [
        teamId,
        rejectedMatchId,
      ]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'incorrect')`, [
        rejectedSubmission.rows[0]!.submission_id,
      ]),
    );
    await asUser(client, forward.id, () =>
      client.query(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [teamId, pendingMatchId]),
    );

    const totals = await asUser(client, forward.id, () =>
      client.query(`select matches_played, goals, assists, tackles from public.team_approved_stat_totals where team_id = $1`, [teamId]),
    );

    expect(totals.rows[0]).toMatchObject({
      matches_played: 0,
      goals: '0',
      assists: '0',
      tackles: '0',
    });
  });

  it('keeps reviewed submissions immutable after a final approval or rejection', async () => {
    const admin = await seedUser(client, 'ts-final-a');
    const forward = await seedUser(client, 'ts-final-f');
    const defender = await seedUser(client, 'ts-final-d');
    await seedPlayerProfile(client, admin.id, 'MED', 'final-admin');
    await seedPlayerProfile(client, forward.id, 'DEL', 'final-forward');
    await seedPlayerProfile(client, defender.id, 'DEF', 'final-defender');
    const teamId = await createTeam(client, admin.id, 'Final Review FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');
    await addMember(client, admin.id, teamId, defender.id, 'DEF');
    const approvedMatchId = await createPlayedMatch(client, admin.id, teamId, 1);
    const rejectedMatchId = await createPlayedMatch(client, admin.id, teamId, 2);

    const approved = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 2::smallint)`, [
        teamId,
        approvedMatchId,
      ]),
    );
    const rejected = await asUser(client, defender.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'tackles'::public.team_stat_kind, 4::smallint)`, [
        teamId,
        rejectedMatchId,
      ]),
    );

    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
        approved.rows[0]!.submission_id,
      ]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'incorrect')`, [
        rejected.rows[0]!.submission_id,
      ]),
    );

    await expect(
      asUser(client, forward.id, () =>
        client.query(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 9::smallint)`, [teamId, approvedMatchId]),
      ),
    ).rejects.toThrow(/TEAM_STAT_SUBMISSION_FINAL/);
    await expect(
      asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'changed')`, [
          approved.rows[0]!.submission_id,
        ]),
      ),
    ).rejects.toThrow(/TEAM_STAT_SUBMISSION_FINAL/);
    await expect(
      asUser(client, defender.id, () =>
        client.query(`select * from public.submit_team_match_stat($1, $2, 'tackles'::public.team_stat_kind, 1::smallint)`, [teamId, rejectedMatchId]),
      ),
    ).rejects.toThrow(/TEAM_STAT_SUBMISSION_FINAL/);

    const reviewed = await client.query(
      `
        select id, status, value
        from public.team_stat_submissions
        where id = any($1::uuid[])
        order by status
      `,
      [[approved.rows[0]!.submission_id, rejected.rows[0]!.submission_id]],
    );

    expect(reviewed.rows).toEqual([
      { id: approved.rows[0]!.submission_id, status: 'approved', value: 2 },
      { id: rejected.rows[0]!.submission_id, status: 'rejected', value: 4 },
    ]);
  });

  it('denies non-admin review and unrelated progression attempts', async () => {
    const admin = await seedUser(client, 'ts-admin-denials');
    const forward = await seedUser(client, 'ts-forward-denials');
    const outsider = await seedUser(client, 'ts-outsider-denials');
    await seedPlayerProfile(client, admin.id, 'MED', 'denials-admin');
    await seedPlayerProfile(client, forward.id, 'DEL', 'denials-forward');
    await seedPlayerProfile(client, outsider.id, 'MED', 'denials-outsider');
    const teamId = await createTeam(client, admin.id, 'Denied FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');
    const matchId = await createPlayedMatch(client, admin.id, teamId, 1);
    const submitted = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [
        teamId,
        matchId,
      ]),
    );

    await expect(
      asUser(client, forward.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      asUser(client, outsider.id, () => client.query(`select * from public.process_team_player_progression($1)`, [forward.id])),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it('progresses global base card on every third MVP and approved 3-win streak only', async () => {
    const admin = await seedUser(client, 'ts-ap');
    const unrelatedAdmin = await seedUser(client, 'ts-unrel-admin-prog');
    const forward = await seedUser(client, 'ts-fp');
    await seedPlayerProfile(client, admin.id, 'MED', 'ap');
    await seedPlayerProfile(client, unrelatedAdmin.id, 'MED', 'unrel-admin-prog');
    const playerId = await seedPlayerProfile(client, forward.id, 'DEL', 'fp', { pac: 98, sho: 98, pas: 70, dri: 70, def: 50, phy: 65 });
    const teamId = await createTeam(client, admin.id, 'Progress FC', 'MED');
    await createTeam(client, unrelatedAdmin.id, 'Unrelated Progress FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');

    for (const index of [1, 2, 3]) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index, forward.id);
      const submitted = await asUser(client, forward.id, () =>
        client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [teamId, matchId]),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [submitted.rows[0]!.submission_id]),
      );
    }

    const firstProgress = await asUser(client, admin.id, () =>
      client.query<{ applied_rewards: number; stats: Record<string, number>; overall: number; card_tier: string }>(
        `select * from public.process_team_player_progression($1)`,
        [forward.id],
      ),
    );
    for (const index of [4, 5, 6]) {
      const rejectedMatchId = await createPlayedMatch(client, admin.id, teamId, index, forward.id);
      const rejectedSubmission = await asUser(client, forward.id, () =>
        client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [teamId, rejectedMatchId]),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'incorrect')`, [rejectedSubmission.rows[0]!.submission_id]),
      );
    }

    const secondProgress = await asUser(client, admin.id, () =>
      client.query<{ applied_rewards: number; stats: Record<string, number>; card_tier: string }>(
        `select * from public.process_team_player_progression($1)`,
        [forward.id],
      ),
    );
    const player = await client.query<{ stats: Record<string, number> }>(`select stats from public.players where id = $1`, [playerId]);
    const sameTeamAdminState = await asUser(client, admin.id, () =>
      client.query(`select user_id from public.team_player_progression_state where user_id = $1`, [forward.id]),
    );
    const unrelatedAdminState = await asUser(client, unrelatedAdmin.id, () =>
      client.query(`select user_id from public.team_player_progression_state where user_id = $1`, [forward.id]),
    );

    const directTamper = await asUser(client, admin.id, () =>
      client.query(
        `
          update public.team_player_progression_state
          set applied_mvp_rewards = 99
          where user_id = $1
        `,
        [forward.id],
      ),
    );
    const ledgerAfterTamperAttempt = await client.query<{ applied_mvp_rewards: number }>(
      `select applied_mvp_rewards from public.team_player_progression_state where user_id = $1`,
      [forward.id],
    );

    expect(firstProgress.rows[0]!.applied_rewards).toBe(2);
    expect(firstProgress.rows[0]!.stats).toMatchObject({ pac: 99, sho: 99, dri: 72 });
    expect(firstProgress.rows[0]!.card_tier).toMatch(/gold/);
    expect(secondProgress.rows[0]!.applied_rewards).toBe(0);
    expect(player.rows[0]!.stats).toMatchObject({ pac: 99, sho: 99, dri: 72 });
    expect(sameTeamAdminState.rowCount).toBe(1);
    expect(unrelatedAdminState.rowCount).toBe(0);
    expect(directTamper.rowCount).toBe(0);
    expect(ledgerAfterTamperAttempt.rows[0]).toMatchObject({ applied_mvp_rewards: 1 });
  });

  it('does not apply the same progression reward twice during overlapping retries', async () => {
    const admin = await seedUser(client, 'ts-concurrent-prog-a');
    const forward = await seedUser(client, 'ts-concurrent-prog-f');
    await seedPlayerProfile(client, admin.id, 'MED', 'concurrent-prog-admin');
    const playerId = await seedPlayerProfile(client, forward.id, 'DEL', 'concurrent-prog-forward', {
      pac: 70,
      sho: 70,
      pas: 70,
      dri: 70,
      def: 70,
      phy: 70,
    });
    const teamId = await createTeam(client, admin.id, 'Concurrent Progress FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');

    for (const index of [1, 2, 3]) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index, forward.id);
      const submitted = await asUser(client, forward.id, () =>
        client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [
          teamId,
          matchId,
        ]),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      );
    }

    await client.query(
      `
        insert into public.team_player_progression_state (user_id)
        values ($1)
      `,
      [forward.id],
    );
    await client.query(
      `
        create or replace function public.test_delay_progression_state_update()
        returns trigger
        language plpgsql
        as $$
        begin
          if current_setting('app.test_delay_progression_state_update', true) = 'on' then
            perform pg_sleep(0.35);
          end if;
          return new;
        end;
        $$;
      `,
    );
    await client.query(
      `
        drop trigger if exists test_delay_progression_state_update on public.team_player_progression_state;
        create trigger test_delay_progression_state_update
        before update on public.team_player_progression_state
        for each row execute function public.test_delay_progression_state_update();
      `,
    );

    const firstClient = await createDbClient();
    const secondClient = await createDbClient();

    try {
      await firstClient.query(`set app.test_delay_progression_state_update = 'on'`);
      await secondClient.query(`set app.test_delay_progression_state_update = 'on'`);

      const first = asUser(firstClient, admin.id, () =>
        firstClient.query<{ applied_rewards: number }>(`select * from public.process_team_player_progression($1)`, [forward.id]),
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      const second = asUser(secondClient, admin.id, () =>
        secondClient.query<{ applied_rewards: number }>(`select * from public.process_team_player_progression($1)`, [forward.id]),
      );

      const results = await Promise.all([first, second]);
      const appliedRewards = results.map((result) => result.rows[0]!.applied_rewards).sort((a, b) => a - b);
      const player = await client.query<{ stats: Record<string, number> }>(`select stats from public.players where id = $1`, [playerId]);
      const state = await client.query<{ applied_mvp_rewards: number; applied_win_streak_rewards: number }>(
        `select applied_mvp_rewards, applied_win_streak_rewards from public.team_player_progression_state where user_id = $1`,
        [forward.id],
      );

      expect(appliedRewards).toEqual([0, 2]);
      expect(player.rows[0]!.stats).toMatchObject({ pac: 72, sho: 72, dri: 72 });
      expect(state.rows[0]).toMatchObject({ applied_mvp_rewards: 1, applied_win_streak_rewards: 1 });
    } finally {
      await firstClient.end();
      await secondClient.end();
      await client.query(`drop trigger if exists test_delay_progression_state_update on public.team_player_progression_state`);
      await client.query(`drop function if exists public.test_delay_progression_state_update()`);
    }
  });
  it('counts distinct won matches for win-streak rewards even with multiple approved submissions in one match', async () => {
    const admin = await seedUser(client, 'ts-distinct-win-a');
    const forward = await seedUser(client, 'ts-distinct-win-f');
    await seedPlayerProfile(client, admin.id, 'MED', 'distinct-win-admin');
    await seedPlayerProfile(client, forward.id, 'DEL', 'distinct-win-forward');
    const teamId = await createTeam(client, admin.id, 'Distinct Wins FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');
    await asUser(client, admin.id, () =>
      client.query(`update public.team_members set secondary_position = 'DEF' where team_id = $1 and user_id = $2`, [teamId, forward.id]),
    );

    const firstMatchId = await createPlayedMatch(client, admin.id, teamId, 1);
    const firstGoal = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [
        teamId,
        firstMatchId,
      ]),
    );
    const firstTackle = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(
        `select * from public.submit_team_match_stat($1, $2, 'tackles'::public.team_stat_kind, 1::smallint)`,
        [teamId, firstMatchId],
      ),
    );
    const secondMatchId = await createPlayedMatch(client, admin.id, teamId, 2);
    const secondGoal = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [
        teamId,
        secondMatchId,
      ]),
    );

    for (const submissionId of [firstGoal.rows[0]!.submission_id, firstTackle.rows[0]!.submission_id, secondGoal.rows[0]!.submission_id]) {
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [submissionId]),
      );
    }

    const earlyProgression = await asUser(client, admin.id, () =>
      client.query<{ applied_rewards: number }>(`select * from public.process_team_player_progression($1)`, [forward.id]),
    );
    const earlyState = await client.query<{ applied_win_streak_rewards: number }>(
      `select applied_win_streak_rewards from public.team_player_progression_state where user_id = $1`,
      [forward.id],
    );

    expect(earlyProgression.rows[0]!.applied_rewards).toBe(0);
    expect(earlyState.rows[0]).toMatchObject({ applied_win_streak_rewards: 0 });

    const thirdMatchId = await createPlayedMatch(client, admin.id, teamId, 3);
    const thirdGoal = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [
        teamId,
        thirdMatchId,
      ]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
        thirdGoal.rows[0]!.submission_id,
      ]),
    );

    const earnedProgression = await asUser(client, admin.id, () =>
      client.query<{ applied_rewards: number }>(`select * from public.process_team_player_progression($1)`, [forward.id]),
    );
    const earnedState = await client.query<{ applied_win_streak_rewards: number }>(
      `select applied_win_streak_rewards from public.team_player_progression_state where user_id = $1`,
      [forward.id],
    );

    expect(earnedProgression.rows[0]!.applied_rewards).toBe(1);
    expect(earnedState.rows[0]).toMatchObject({ applied_win_streak_rewards: 1 });
  });

  it('progresses the first active approved player card instead of the latest joined card', async () => {
    const admin = await seedUser(client, 'ts-base-a');
    const forward = await seedUser(client, 'ts-base-f');
    await seedPlayerProfile(client, admin.id, 'MED', 'base-admin');
    const basePlayerId = await seedPlayerProfile(
      client,
      forward.id,
      'DEL',
      'base-first',
      { pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 },
      `now() - interval '10 days'`,
    );
    const latestPlayerId = await seedPlayerProfile(
      client,
      forward.id,
      'MED',
      'base-latest',
      { pac: 40, sho: 40, pas: 40, dri: 40, def: 40, phy: 40 },
      `now()`,
    );
    const teamId = await createTeam(client, admin.id, 'Base Card FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');

    for (const index of [1, 2, 3]) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index, forward.id);
      const submitted = await asUser(client, forward.id, () =>
        client.query<{ submission_id: string }>(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [
          teamId,
          matchId,
        ]),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      );
    }

    const progressed = await asUser(client, admin.id, () =>
      client.query<{ applied_rewards: number; stats: Record<string, number> }>(`select * from public.process_team_player_progression($1)`, [forward.id]),
    );
    const players = await client.query<{ id: string; stats: Record<string, number> }>(
      `
        select id, stats
        from public.players
        where id = any($1::uuid[])
        order by joined_at asc
      `,
      [[basePlayerId, latestPlayerId]],
    );

    expect(progressed.rows[0]).toMatchObject({
      applied_rewards: 2,
      stats: expect.objectContaining({ pac: 72, sho: 72, dri: 72 }),
    });
    expect(players.rows).toEqual([
      { id: basePlayerId, stats: expect.objectContaining({ pac: 72, sho: 72, dri: 72 }) },
      { id: latestPlayerId, stats: expect.objectContaining({ pac: 40, pas: 40, phy: 40 }) },
    ]);
  });
});
