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

  it('denies non-admin admission review and unrelated mission attempts', async () => {
    const admin = await seedUser(client, 'ts-admin-denials');
    const member = await seedUser(client, 'ts-member-denials');
    const player = await seedUser(client, 'ts-player-denials');
    const outsider = await seedUser(client, 'ts-outsider-denials');

    const teamId = await createTeam(client, admin.id, 'Denials FC');
    await addMember(client, admin.id, teamId, member.id, 'MED');
    await addMember(client, admin.id, teamId, player.id, 'DEL');

    await asUser(client, player.id, () =>
      client.query(`select * from public.create_team_card($1, 'DEL', 'MED')`, [
        JSON.stringify({ pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 }),
      ]),
    );

    await expect(
      asUser(client, member.id, () =>
        client.query(
          `select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`,
          [teamId, player.id],
        ),
      ),
    ).rejects.toThrow(/FORBIDDEN/i);

    await expect(
      asUser(client, outsider.id, () =>
        client.query(`select * from public.grant_team_merit($1, $2, '["sho"]'::jsonb, 1::smallint)`, [teamId, player.id]),
      ),
    ).rejects.toThrow(/FORBIDDEN/i);

    await expect(
      asUser(client, outsider.id, () =>
        client.query(`select * from public.process_team_central_missions($1)`, [player.id]),
      ),
    ).rejects.toThrow(/FORBIDDEN/i);

    const ownMissions = await asUser(client, player.id, () =>
      client.query<{ applied_points: number }>(`select * from public.process_team_central_missions($1)`, [player.id]),
    );

    expect(ownMissions.rows[0]).toMatchObject({ applied_points: 0 });
  });

  it('creates and updates the global card only while unlocked, enforcing the 55-75 build range', async () => {
    const player = await seedUser(client, 'ts-card-rpc');
    await seedPlayerProfile(client, player.id, 'DEL', 'card-rpc');

    const created = await asUser(client, player.id, () =>
      client.query<{ user_id: string }>(
        `
          select * from public.create_team_card(
            $1,
            'DEL',
            'MED'
          )
        `,
        [JSON.stringify({ pac: 60, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 })],
      ),
    );
    expect(created.rows[0]).toMatchObject({ user_id: player.id });

    await expect(
      asUser(client, player.id, () =>
        client.query(`select * from public.create_team_card($1, 'DEL', 'MED')`, [
          JSON.stringify({ pac: 60, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
        ]),
      ),
    ).rejects.toThrow(/TEAM_CARD_EXISTS/i);

    await expect(
      asUser(client, player.id, () =>
        client.query(`select * from public.update_team_card($1, 'DEL', 'MED')`, [
          JSON.stringify({ pac: 76, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
        ]),
      ),
    ).rejects.toThrow(/VALIDATION_ERROR/i);

    await expect(
      asUser(client, player.id, () =>
        client.query(`select * from public.update_team_card($1, 'DEL', 'MED')`, [
          JSON.stringify({ pac: 54, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
        ]),
      ),
    ).rejects.toThrow(/VALIDATION_ERROR/i);

    await asUser(client, player.id, () =>
      client.query(`select * from public.update_team_card($1, 'DEL', 'MED')`, [
        JSON.stringify({ pac: 72, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
      ]),
    );

    const card = await client.query<{ stats: Record<string, number> }>(
      `select stats from public.team_cards where user_id = $1`,
      [player.id],
    );
    expect(card.rows[0]).toMatchObject({ stats: { pac: 72, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 } });
  });

  it('reviews admissions per team, seals decisions and supports rejection resubmission', async () => {
    const adminA = await seedUser(client, 'ts-adm-admin-a');
    const adminB = await seedUser(client, 'ts-adm-admin-b');
    const player = await seedUser(client, 'ts-adm-player');

    const teamA = await createTeam(client, adminA.id, 'Admission A FC');
    const teamB = await createTeam(client, adminB.id, 'Admission B FC');

    await asUser(client, player.id, () =>
      client.query(`select * from public.create_team_card($1, 'DEL', 'MED')`, [
        JSON.stringify({ pac: 60, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
      ]),
    );

    await addMember(client, adminA.id, teamA, player.id, 'DEL');
    await addMember(client, adminB.id, teamB, player.id, 'DEL');

    await expect(
      asUser(client, adminB.id, () =>
        client.query(
          `select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`,
          [teamA, player.id],
        ),
      ),
    ).rejects.toThrow(/FORBIDDEN/i);

    await asUser(client, adminA.id, () =>
      client.query(`select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`, [
        teamA,
        player.id,
      ]),
    );
    await asUser(client, adminB.id, () =>
      client.query(
        `select * from public.review_team_admission($1, $2, 'rejected'::public.team_card_snapshot_status, 'wrong positions')`,
        [teamB, player.id],
      ),
    );

    const snapshots = await client.query<{ team_id: string; status: string }>(
      `select team_id, status from public.team_card_snapshots where user_id = $1`,
      [player.id],
    );
    expect(Object.fromEntries(snapshots.rows.map((row) => [row.team_id, row.status]))).toEqual({
      [teamA]: 'approved',
      [teamB]: 'rejected',
    });

    const card = await client.query<{ positions_locked_at: string | null }>(
      `select positions_locked_at from public.team_cards where user_id = $1`,
      [player.id],
    );
    expect(card.rows[0]?.positions_locked_at).toBeTruthy();

    await expect(
      asUser(client, player.id, () =>
        client.query(`select * from public.update_team_card($1, 'DEL', 'MED')`, [
          JSON.stringify({ pac: 61, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
        ]),
      ),
    ).rejects.toThrow(/TEAM_CARD_POSITIONS_LOCKED/i);

    const teamASnapshot = await client.query<{ status: string }>(
      `select status from public.team_card_snapshots where team_id = $1 and user_id = $2`,
      [teamA, player.id],
    );
    expect(teamASnapshot.rows[0]).toMatchObject({ status: 'approved' });

    await asUser(client, player.id, () =>
      client.query(
        `delete from public.team_card_snapshots where team_id = $1 and user_id = $2 and status = 'rejected'`,
        [teamB, player.id],
      ),
    );
    const resubmitted = await asUser(client, player.id, () =>
      client.query<{ status: string }>(
        `
          insert into public.team_card_snapshots (team_id, user_id, card_stats, positions, status)
          values (
            $1,
            $2,
            (select stats from public.team_cards where user_id = $2),
            (
              select jsonb_build_object('primary', primary_position, 'secondary', secondary_position)
              from public.team_cards
              where user_id = $2
            ),
            'pending'
          )
          returning status
        `,
        [teamB, player.id],
      ),
    );
    expect(resubmitted.rows[0]).toMatchObject({ status: 'pending' });

    await asUser(client, adminB.id, () =>
      client.query(`select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`, [
        teamB,
        player.id,
      ]),
    );

    const finalSnapshots = await client.query<{ team_id: string; status: string }>(
      `select team_id, status from public.team_card_snapshots where user_id = $1`,
      [player.id],
    );
    expect(Object.fromEntries(finalSnapshots.rows.map((row) => [row.team_id, row.status]))).toEqual({
      [teamA]: 'approved',
      [teamB]: 'approved',
    });
  });

  it('grants merit only after 10 valid matches in the team, respecting limits and the 99 cap', async () => {
    const admin = await seedUser(client, 'ts-merit-admin');
    const player = await seedUser(client, 'ts-merit-player');

    const teamId = await createTeam(client, admin.id, 'Merit FC');
    await addMember(client, admin.id, teamId, player.id, 'DEL');

    await asUser(client, player.id, () =>
      client.query(`select * from public.create_team_card($1, 'DEL', 'MED')`, [
        JSON.stringify({ pac: 60, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
      ]),
    );

    for (let index = 1; index <= 9; index += 1) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index);
      const submitted = await asUser(client, player.id, () =>
        client.query<{ submission_id: string }>(
          `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`,
          [teamId, matchId],
        ),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      );
    }

    await expect(
      asUser(client, admin.id, () =>
        client.query(`select * from public.grant_team_merit($1, $2, '["sho"]'::jsonb, 2::smallint)`, [teamId, player.id]),
      ),
    ).rejects.toThrow(/MERIT_MATCHES_THRESHOLD/i);

    const tenthMatchId = await createPlayedMatch(client, admin.id, teamId, 10);
    const tenth = await asUser(client, player.id, () =>
      client.query<{ submission_id: string }>(
        `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`,
        [teamId, tenthMatchId],
      ),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
        tenth.rows[0]!.submission_id,
      ]),
    );

    await expect(
      asUser(client, admin.id, () =>
        client.query(`select * from public.grant_team_merit($1, $2, '["sho"]'::jsonb, 4::smallint)`, [teamId, player.id]),
      ),
    ).rejects.toThrow(/VALIDATION_ERROR/i);

    await expect(
      asUser(client, admin.id, () =>
        client.query(`select * from public.grant_team_merit($1, $2, '["sho","dri","def"]'::jsonb, 1::smallint)`, [teamId, player.id]),
      ),
    ).rejects.toThrow(/VALIDATION_ERROR/i);

    await expect(
      asUser(client, admin.id, () =>
        client.query(`select * from public.grant_team_merit($1, $2, '["div"]'::jsonb, 1::smallint)`, [teamId, player.id]),
      ),
    ).rejects.toThrow(/VALIDATION_ERROR/i);

    const granted = await asUser(client, admin.id, () =>
      client.query<{ grant_id: string; stats: Record<string, number>; card_tier: string }>(
        `select * from public.grant_team_merit($1, $2, '["sho"]'::jsonb, 2::smallint)`,
        [teamId, player.id],
      ),
    );
    expect(granted.rows[0]).toMatchObject({ stats: { pac: 60, sho: 67, pas: 62, dri: 70, def: 55, phy: 58 } });

    const grantRows = await client.query<{ user_id: string; points_total: number }>(
      `select user_id, points_total from public.team_merit_grants where team_id = $1`,
      [teamId],
    );
    expect(grantRows.rows).toEqual([{ user_id: player.id, points_total: 2 }]);

    await asUser(client, player.id, () =>
      client.query(
        `update public.team_cards set stats = '{"pac":60,"sho":98,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb where user_id = $1`,
        [player.id],
      ),
    );
    const capped = await asUser(client, admin.id, () =>
      client.query<{ stats: Record<string, number> }>(
        `select * from public.grant_team_merit($1, $2, '["sho"]'::jsonb, 2::smallint)`,
        [teamId, player.id],
      ),
    );
    expect(capped.rows[0]).toMatchObject({ stats: { pac: 60, sho: 99, pas: 62, dri: 70, def: 55, phy: 58 } });
  });

  it('processes central missions: trophies, MVP cycles and milestones via the position aptitude map', async () => {
    const admin = await seedUser(client, 'ts-mission-admin');
    const player = await seedUser(client, 'ts-mission-player');

    const teamId = await createTeam(client, admin.id, 'Missions FC');
    await addMember(client, admin.id, teamId, player.id, 'DEL');

    await asUser(client, player.id, () =>
      client.query(`select * from public.create_team_card($1, 'DEL', 'MED')`, [
        JSON.stringify({ pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 }),
      ]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`, [
        teamId,
        player.id,
      ]),
    );

    async function playMatchWithGoals(index: number, goals: number, mvp: boolean) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index, mvp ? player.id : undefined);
      const submitted = await asUser(client, player.id, () =>
        client.query<{ submission_id: string }>(
          `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, $3::smallint)`,
          [teamId, matchId, goals],
        ),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      );
    }

    await playMatchWithGoals(1, 3, true);
    await playMatchWithGoals(2, 3, true);
    await playMatchWithGoals(3, 4, true);

    const firstRun = await asUser(client, admin.id, () =>
      client.query<{ applied_points: number; stats: Record<string, number> }>(
        `select * from public.process_team_central_missions($1)`,
        [player.id],
      ),
    );
    expect(firstRun.rows[0]).toMatchObject({ applied_points: 0 });

    await playMatchWithGoals(4, 5, true);
    await playMatchWithGoals(5, 5, true);
    await playMatchWithGoals(6, 5, false);

    const secondRun = await asUser(client, admin.id, () =>
      client.query<{ applied_points: number; stats: Record<string, number> }>(
        `select * from public.process_team_central_missions($1)`,
        [player.id],
      ),
    );
    expect(secondRun.rows[0]).toMatchObject({
      applied_points: 7,
      stats: { pac: 72, sho: 73, dri: 72, pas: 70, def: 70, phy: 70 },
    });

    const ledger = await client.query<{ kind: string; ref: string }>(
      `select kind, ref from public.team_mission_ledger where user_id = $1 order by case kind when 'mvp_cycle' then 1 when 'milestone' then 2 else 3 end, ref`,
      [player.id],
    );
    expect(ledger.rows).toEqual([
      { kind: 'mvp_cycle', ref: '5' },
      { kind: 'milestone', ref: 'goals:25' },
      { kind: 'trophy', ref: 'goals:10' },
      { kind: 'trophy', ref: 'goals:25' },
      { kind: 'trophy', ref: 'mvp:3' },
      { kind: 'trophy', ref: 'mvp:5' },
    ]);

    const thirdRun = await asUser(client, admin.id, () =>
      client.query<{ applied_points: number; stats: Record<string, number> }>(
        `select * from public.process_team_central_missions($1)`,
        [player.id],
      ),
    );
    expect(thirdRun.rows[0]).toMatchObject({ applied_points: 0 });
  });

  it('caps mission cycle boosts at 99 and still records the cycle', async () => {
    const admin = await seedUser(client, 'ts-cap-admin');
    const player = await seedUser(client, 'ts-cap-player');

    const teamId = await createTeam(client, admin.id, 'Cap FC');
    await addMember(client, admin.id, teamId, player.id, 'DEL');

    await asUser(client, player.id, () =>
      client.query(`select * from public.create_team_card($1, 'DEL', 'MED')`, [
        JSON.stringify({ pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 }),
      ]),
    );
    await asUser(client, player.id, () =>
      client.query(
        `update public.team_cards set stats = '{"pac":98,"sho":99,"pas":70,"dri":98,"def":70,"phy":70}'::jsonb where user_id = $1`,
        [player.id],
      ),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`, [
        teamId,
        player.id,
      ]),
    );

    for (let index = 1; index <= 5; index += 1) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index, player.id);
      const submitted = await asUser(client, player.id, () =>
        client.query<{ submission_id: string }>(
          `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`,
          [teamId, matchId],
        ),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      );
    }

    const run = await asUser(client, admin.id, () =>
      client.query<{ applied_points: number; stats: Record<string, number> }>(
        `select * from public.process_team_central_missions($1)`,
        [player.id],
      ),
    );
    expect(run.rows[0]).toMatchObject({
      applied_points: 6,
      stats: { pac: 99, sho: 99, pas: 70, dri: 99, def: 70, phy: 70 },
    });

    const cycles = await client.query<{ ref: string }>(
      `select ref from public.team_mission_ledger where user_id = $1 and kind = 'mvp_cycle'`,
      [player.id],
    );
    expect(cycles.rows).toEqual([{ ref: '5' }]);

    const rerun = await asUser(client, admin.id, () =>
      client.query<{ applied_points: number }>(`select * from public.process_team_central_missions($1)`, [player.id]),
    );
    expect(rerun.rows[0]).toMatchObject({ applied_points: 0 });
  });

  it('maps ARQ tackle milestones to goalkeeper equivalents and skips goal milestones', async () => {
    const admin = await seedUser(client, 'ts-arq-admin');
    const keeper = await seedUser(client, 'ts-arq-keeper');

    const teamId = await createTeam(client, admin.id, 'Keeper FC');
    await addMember(client, admin.id, teamId, keeper.id, 'ARQ');

    await asUser(client, keeper.id, () =>
      client.query(`select * from public.create_team_card($1, 'ARQ', 'DEF')`, [
        JSON.stringify({ div: 70, han: 70, kic: 70, ref: 70, spd: 70, pos: 70 }),
      ]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`, [
        teamId,
        keeper.id,
      ]),
    );

    for (let index = 1; index <= 5; index += 1) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index);
      const submitted = await asUser(client, keeper.id, () =>
        client.query<{ submission_id: string }>(
          `select * from public.submit_team_match_stat($1, $2, 'tackles'::public.team_stat_kind, 10::smallint)`,
          [teamId, matchId],
        ),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      );
    }

    const run = await asUser(client, admin.id, () =>
      client.query<{ applied_points: number; stats: Record<string, number> }>(
        `select * from public.process_team_central_missions($1)`,
        [keeper.id],
      ),
    );
    expect(run.rows[0]).toMatchObject({
      applied_points: 1,
      stats: { div: 71, han: 70, kic: 70, ref: 70, spd: 70, pos: 70 },
    });

    const goalMilestones = await client.query<{ ref: string }>(
      `select ref from public.team_mission_ledger where user_id = $1 and kind = 'milestone'`,
      [keeper.id],
    );
    expect(goalMilestones.rows).toEqual([{ ref: 'tackles:50' }]);

    const trophies = await client.query<{ ref: string }>(
      `select ref from public.team_mission_ledger where user_id = $1 and kind = 'trophy' order by ref`,
      [keeper.id],
    );
    expect(trophies.rows).toEqual([{ ref: 'tackles:20' }, { ref: 'tackles:50' }]);
  });

  it('enforces the 55-99 invariant on team_cards and the position stat shape', async () => {
    const player = await seedUser(client, 'ts-card-invariant');
    const keeper = await seedUser(client, 'ts-card-invariant-keeper');

    await expect(
      asUser(client, player.id, () =>
        client.query(
          `
            insert into public.team_cards (user_id, stats, primary_position, secondary_position)
            values ($1, '{"pac":54,"sho":65,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb, 'DEL', 'MED')
          `,
          [player.id],
        ),
      ),
    ).rejects.toThrow(/check constraint|team_cards_stats_valid/i);

    await expect(
      asUser(client, player.id, () =>
        client.query(
          `
            insert into public.team_cards (user_id, stats, primary_position, secondary_position)
            values ($1, '{"pac":100,"sho":65,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb, 'DEL', 'MED')
          `,
          [player.id],
        ),
      ),
    ).rejects.toThrow(/check constraint|team_cards_stats_valid/i);

    await expect(
      asUser(client, keeper.id, () =>
        client.query(
          `
            insert into public.team_cards (user_id, stats, primary_position, secondary_position)
            values ($1, '{"pac":60,"sho":65,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb, 'ARQ', 'DEF')
          `,
          [keeper.id],
        ),
      ),
    ).rejects.toThrow(/check constraint|team_cards_stats_valid/i);

    const accepted = await asUser(client, player.id, () =>
      client.query(
        `
          insert into public.team_cards (user_id, stats, primary_position, secondary_position)
          values ($1, '{"pac":99,"sho":65,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb, 'DEL', 'MED')
        `,
        [player.id],
      ),
    );
    expect(accepted.rowCount).toBe(1);
  });

  it('creates snapshots on membership, seals reviewed snapshots and freezes them after card updates', async () => {
    const admin = await seedUser(client, 'ts-snap-admin');
    const player = await seedUser(client, 'ts-snap-player');
    const cardless = await seedUser(client, 'ts-snap-cardless');
    await seedPlayerProfile(client, admin.id, 'MED', 'snap-admin');
    await seedPlayerProfile(client, player.id, 'DEL', 'snap-player');
    await seedPlayerProfile(client, cardless.id, 'MED', 'snap-cardless');

    await asUser(client, player.id, () =>
      client.query(
        `
          insert into public.team_cards (user_id, stats, primary_position, secondary_position)
          values (
            $1,
            '{"pac":60,"sho":65,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb,
            'DEL',
            'MED'
          )
        `,
        [player.id],
      ),
    );

    const teamId = await createTeam(client, admin.id, 'Snapshots Services FC', 'MED');
    await addMember(client, admin.id, teamId, player.id, 'DEL');
    await addMember(client, admin.id, teamId, cardless.id, 'MED');

    const playerSnapshot = await client.query(
      `
        select status, card_stats, positions
        from public.team_card_snapshots
        where team_id = $1 and user_id = $2
      `,
      [teamId, player.id],
    );
    const cardlessSnapshot = await client.query(
      `
        select status
        from public.team_card_snapshots
        where team_id = $1 and user_id = $2
      `,
      [teamId, cardless.id],
    );

    expect(playerSnapshot.rows[0]).toMatchObject({
      status: 'pending',
      card_stats: { pac: 60, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 },
      positions: { primary: 'DEL', secondary: 'MED' },
    });
    expect(cardlessSnapshot.rows[0]).toMatchObject({ status: 'draft' });

    await asUser(client, admin.id, () =>
      client.query(
        `
          update public.team_card_snapshots
          set status = 'approved'
          where team_id = $1 and user_id = $2
        `,
        [teamId, player.id],
      ),
    );

    await expect(
      asUser(client, admin.id, () =>
        client.query(
          `
            update public.team_card_snapshots
            set status = 'rejected', rejection_reason = 'recheck'
            where team_id = $1 and user_id = $2
          `,
          [teamId, player.id],
        ),
      ),
    ).rejects.toThrow(/TEAM_CARD_SNAPSHOT_FINAL/);

    await asUser(client, player.id, () =>
      client.query(
        `
          update public.team_cards
          set stats = '{"pac":80,"sho":80,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb
          where user_id = $1
        `,
        [player.id],
      ),
    );

    const frozen = await client.query(
      `
        select card_stats, status, reviewed_by_user_id
        from public.team_card_snapshots
        where team_id = $1 and user_id = $2
      `,
      [teamId, player.id],
    );

    expect(frozen.rows[0]).toMatchObject({
      card_stats: { pac: 60, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 },
      status: 'approved',
      reviewed_by_user_id: admin.id,
    });
  });

  it('feeds local performance from approved stats and official MVPs only', async () => {
    const admin = await seedUser(client, 'ts-lp-admin');
    const forward = await seedUser(client, 'ts-lp-forward');
    await seedPlayerProfile(client, admin.id, 'MED', 'lp-admin');
    await seedPlayerProfile(client, forward.id, 'DEL', 'lp-forward');
    const teamId = await createTeam(client, admin.id, 'Local Performance FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');
    await asUser(client, admin.id, () =>
      client.query(`update public.team_members set secondary_position = 'MED' where team_id = $1 and user_id = $2`, [teamId, forward.id]),
    );

    const mvpMatchId = await createPlayedMatch(client, admin.id, teamId, 1, forward.id);
    const approved = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(
        `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 2::smallint)`,
        [teamId, mvpMatchId],
      ),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
        approved.rows[0]!.submission_id,
      ]),
    );

    const rejectedMatchId = await createPlayedMatch(client, admin.id, teamId, 2);
    const rejected = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(
        `select * from public.submit_team_match_stat($1, $2, 'assists'::public.team_stat_kind, 1::smallint)`,
        [teamId, rejectedMatchId],
      ),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'inflated')`, [
        rejected.rows[0]!.submission_id,
      ]),
    );

    const pendingMatchId = await createPlayedMatch(client, admin.id, teamId, 3);
    await asUser(client, forward.id, () =>
      client.query(`select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`, [
        teamId,
        pendingMatchId,
      ]),
    );

    const performance = await asUser(client, forward.id, () =>
      client.query(
        `
          select matches_played, goals, assists, tackles, mvps
          from public.team_local_performance
          where team_id = $1 and user_id = $2
        `,
        [teamId, forward.id],
      ),
    );

    expect(performance.rows[0]).toMatchObject({
      matches_played: 1,
      goals: 2,
      assists: 0,
      tackles: 0,
      mvps: 1,
    });
  });

  it('applies the valid-match lifecycle gate: played + active signup + approved stat only', async () => {
    const admin = await seedUser(client, 'ts-gate-admin');
    const forward = await seedUser(client, 'ts-gate-forward');
    await seedPlayerProfile(client, admin.id, 'MED', 'gate-admin');
    await seedPlayerProfile(client, forward.id, 'DEL', 'gate-forward');
    const teamId = await createTeam(client, admin.id, 'Lifecycle Gate FC', 'MED');
    await addMember(client, admin.id, teamId, forward.id, 'DEL');

    const playedMatchId = await createPlayedMatch(client, admin.id, teamId, 1, forward.id);
    const droppedMatchId = await createPlayedMatch(client, admin.id, teamId, 2);
    const cancelledMatchId = await createPlayedMatch(client, admin.id, teamId, 3);

    await client.query(
      `
        insert into public.team_match_signups (team_match_id, team_id, user_id, status)
        values
          ($1, $2, $3, 'going'),
          ($4, $2, $3, 'not_going'),
          ($5, $2, $3, 'going')
      `,
      [playedMatchId, teamId, forward.id, droppedMatchId, cancelledMatchId],
    );

    const playedGoal = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(
        `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 2::smallint)`,
        [teamId, playedMatchId],
      ),
    );
    const droppedGoal = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(
        `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 3::smallint)`,
        [teamId, droppedMatchId],
      ),
    );
    const cancelledGoal = await asUser(client, forward.id, () =>
      client.query<{ submission_id: string }>(
        `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`,
        [teamId, cancelledMatchId],
      ),
    );

    await asUser(client, admin.id, () =>
      client.query(`update public.team_matches set status = 'cancelled' where id = $1`, [cancelledMatchId]),
    );

    for (const submission of [playedGoal, droppedGoal, cancelledGoal]) {
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submission.rows[0]!.submission_id,
        ]),
      );
    }

    const performance = await asUser(client, forward.id, () =>
      client.query(
        `
          select matches_played, goals, assists, tackles, mvps
          from public.team_local_performance
          where team_id = $1 and user_id = $2
        `,
        [teamId, forward.id],
      ),
    );

    expect(performance.rows[0]).toMatchObject({
      matches_played: 1,
      goals: 2,
      assists: 0,
      tackles: 0,
      mvps: 1,
    });

    await client.query(
      `update public.team_match_signups set status = 'not_going' where team_match_id = $1 and user_id = $2`,
      [playedMatchId, forward.id],
    );
    await client.query(
      `update public.team_match_signups set status = 'going' where team_match_id = $1 and user_id = $2`,
      [droppedMatchId, forward.id],
    );

    const flipped = await asUser(client, forward.id, () =>
      client.query(
        `
          select matches_played, goals, assists, tackles, mvps
          from public.team_local_performance
          where team_id = $1 and user_id = $2
        `,
        [teamId, forward.id],
      ),
    );

    expect(flipped.rows[0]).toMatchObject({
      matches_played: 1,
      goals: 3,
      assists: 0,
      tackles: 0,
      mvps: 0,
    });
  });

  it('aggregates approved teams only in the central card view and keeps rejected teams isolated', async () => {
    const adminA = await seedUser(client, 'ts-cav-admin-a');
    const adminB = await seedUser(client, 'ts-cav-admin-b');
    const adminC = await seedUser(client, 'ts-cav-admin-c');
    const player = await seedUser(client, 'ts-cav-player');
    await seedPlayerProfile(client, adminA.id, 'MED', 'cav-a');
    await seedPlayerProfile(client, adminB.id, 'MED', 'cav-b');
    await seedPlayerProfile(client, adminC.id, 'MED', 'cav-c');
    await seedPlayerProfile(client, player.id, 'DEL', 'cav-player');

    await asUser(client, player.id, () =>
      client.query(
        `
          insert into public.team_cards (user_id, stats, primary_position, secondary_position)
          values (
            $1,
            '{"pac":60,"sho":65,"pas":62,"dri":70,"def":55,"phy":58}'::jsonb,
            'DEL',
            'MED'
          )
        `,
        [player.id],
      ),
    );

    const teamA = await createTeam(client, adminA.id, 'Central View A FC', 'MED');
    const teamB = await createTeam(client, adminB.id, 'Central View B FC', 'MED');
    const teamC = await createTeam(client, adminC.id, 'Central View C FC', 'MED');
    await addMember(client, adminA.id, teamA, player.id, 'DEL');
    await addMember(client, adminB.id, teamB, player.id, 'DEL');
    await addMember(client, adminC.id, teamC, player.id, 'DEL');

    await client.query(
      `
        insert into public.team_local_performance (team_id, user_id, matches_played, goals, assists, tackles, mvps)
        values
          ($1, $3, 1, 2, 0, 0, 1),
          ($2, $3, 1, 3, 1, 0, 0),
          ($4, $3, 1, 9, 0, 0, 0)
      `,
      [teamA, teamB, player.id, teamC],
    );
    await client.query(
      `
        insert into public.team_mission_ledger (user_id, kind, ref, stat_key, points)
        values
          ($1, 'trophy', 'goals:10', null, null),
          ($1, 'mvp_cycle', 'cycle:5', 'sho', 2),
          ($1, 'milestone', 'goals:25', 'sho', 1)
      `,
      [player.id],
    );

    await asUser(client, adminA.id, () =>
      client.query(`update public.team_card_snapshots set status = 'approved' where team_id = $1 and user_id = $2`, [teamA, player.id]),
    );
    await asUser(client, adminB.id, () =>
      client.query(`update public.team_card_snapshots set status = 'approved' where team_id = $1 and user_id = $2`, [teamB, player.id]),
    );
    await asUser(client, adminC.id, () =>
      client.query(`update public.team_card_snapshots set status = 'rejected', rejection_reason = 'no' where team_id = $1 and user_id = $2`, [
        teamC,
        player.id,
      ]),
    );

    const aggregates = await asUser(client, player.id, () =>
      client.query(
        `
          select matches_played, goals, assists, tackles, mvps, trophies, missions, mission_points
          from public.team_central_card_aggregates
          where user_id = $1
        `,
        [player.id],
      ),
    );

    expect(aggregates.rows[0]).toMatchObject({
      matches_played: 2,
      goals: 5,
      assists: 1,
      tackles: 0,
      mvps: 1,
      trophies: 1,
      missions: 2,
      mission_points: 3,
    });
  });

  it('keeps Groups players rows untouched and legacy progression absent across the full card lifecycle', async () => {
    const admin = await seedUser(client, 'ts-iso-admin');
    const player = await seedUser(client, 'ts-iso-player');
    await seedPlayerProfile(client, admin.id, 'MED', 'iso-admin');
    await seedPlayerProfile(client, player.id, 'DEL', 'iso-player');

    const playersBefore = await client.query<{ row: object }>(
      `
        select to_jsonb(p) as row
        from public.players p
        where p.user_id = any($1::uuid[])
        order by p.user_id
      `,
      [[admin.id, player.id]],
    );

    await asUser(client, player.id, () =>
      client.query(`select * from public.create_team_card($1, 'DEL', 'MED')`, [
        JSON.stringify({ pac: 60, sho: 65, pas: 62, dri: 70, def: 55, phy: 58 }),
      ]),
    );

    const teamId = await createTeam(client, admin.id, 'Isolation FC', 'MED');
    await addMember(client, admin.id, teamId, player.id, 'DEL');

    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_admission($1, $2, 'approved'::public.team_card_snapshot_status)`, [
        teamId,
        player.id,
      ]),
    );

    for (let index = 1; index <= 10; index += 1) {
      const matchId = await createPlayedMatch(client, admin.id, teamId, index, index <= 5 ? player.id : undefined);
      const submitted = await asUser(client, player.id, () =>
        client.query<{ submission_id: string }>(
          `select * from public.submit_team_match_stat($1, $2, 'goals'::public.team_stat_kind, 1::smallint)`,
          [teamId, matchId],
        ),
      );
      await asUser(client, admin.id, () =>
        client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
          submitted.rows[0]!.submission_id,
        ]),
      );
    }

    const merit = await asUser(client, admin.id, () =>
      client.query<{ grant_id: string }>(`select * from public.grant_team_merit($1, $2, '["sho"]'::jsonb, 1::smallint)`, [teamId, player.id]),
    );
    expect(merit.rows[0]).toMatchObject({ grant_id: expect.any(String) });

    const missions = await asUser(client, admin.id, () =>
      client.query<{ applied_points: number }>(`select * from public.process_team_central_missions($1)`, [player.id]),
    );
    expect(missions.rows[0]).toMatchObject({ applied_points: 6 });

    const playersAfter = await client.query<{ row: object }>(
      `
        select to_jsonb(p) as row
        from public.players p
        where p.user_id = any($1::uuid[])
        order by p.user_id
      `,
      [[admin.id, player.id]],
    );
    expect(playersAfter.rows).toEqual(playersBefore.rows);

    const legacyFunctions = await client.query<{ count: string }>(
      `
        select count(*) as count
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app_private')
          and p.proname in (
            'process_team_player_progression',
            'valid_team_win_streak_rewards',
            'apply_team_progression_to_stats',
            'team_stats_overall'
          )
      `,
    );
    const legacyState = await client.query<{ count: string }>(
      `
        select count(*) as count
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'team_player_progression_state'
      `,
    );

    expect(legacyFunctions.rows[0]).toMatchObject({ count: '0' });
    expect(legacyState.rows[0]).toMatchObject({ count: '0' });
  });
});
