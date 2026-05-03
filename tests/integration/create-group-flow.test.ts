import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('feat-002 create group phase A', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('RPC creates Group, admin GroupMembership and admin Player atomically', async () => {
    const user = await seedUser(client, 'create-group-happy');

    const created = await asUser(client, user.id, () =>
      client.query(`select * from public.create_group($1, 'F5')`, ['Fulbito Atomico']),
    );
    const groupId = created.rows[0].group_id;

    const snapshot = await client.query(
      `
        select
          g.name,
          g.default_modality,
          gm.role,
          p.primary_position,
          p.secondary_position,
          p.stats,
          p.stats_status
        from public.groups g
        join public.group_memberships gm on gm.group_id = g.id
        join public.players p on p.group_id = g.id
        where g.id = $1 and gm.user_id = $2 and p.user_id = $2
      `,
      [groupId, user.id],
    );

    expect(snapshot.rows[0]).toMatchObject({
      name: 'Fulbito Atomico',
      default_modality: 'F5',
      role: 'admin',
      primary_position: 'MED',
      secondary_position: null,
      stats_status: 'pending_approval',
      stats: { pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 },
    });
  });

  it('rejects the 4th admin group', async () => {
    const user = await seedUser(client, 'create-group-limit');

    await seedGroup(client, user.id);
    await seedGroup(client, user.id);
    await seedGroup(client, user.id);

    await expect(
      asUser(client, user.id, () =>
        client.query(`select * from public.create_group($1, 'F5')`, ['Grupo extra']),
      ),
    ).rejects.toThrow(/ADMIN_GROUP_LIMIT_REACHED/);
  });

  it('admin onboarding approves own stats and writes the self creation log', async () => {
    const user = await seedUser(client, 'create-group-admin-onboarding');

    const created = await asUser(client, user.id, () =>
      client.query(`select * from public.create_group($1, 'F5')`, ['Fulbito Admin']),
    );
    const groupId = created.rows[0].group_id;

    const submitted = await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_admin_onboarding_stats(
            $1,
            'DEL',
            null,
            '{"pac":8,"sho":8,"pas":7,"dri":8,"def":4,"phy":6}'::jsonb
          )
        `,
        [groupId],
      ),
    );

    const playerId = submitted.rows[0].player_id;
    expect(submitted.rows[0].status).toBe('approved');

    const snapshot = await client.query(
      `
        select p.stats_status, p.primary_position, l.reason
        from public.players p
        join public.player_stat_change_logs l on l.player_id = p.id
        where p.id = $1
      `,
      [playerId],
    );

    expect(snapshot.rows[0]).toMatchObject({
      stats_status: 'approved',
      primary_position: 'DEL',
      reason: 'admin_self_creation',
    });
  });

  it('rejects admin onboarding when the user is not the group admin', async () => {
    const admin = await seedUser(client, 'admin-onboarding-owner');
    const outsider = await seedUser(client, 'admin-onboarding-outsider');

    const created = await asUser(client, admin.id, () =>
      client.query(`select * from public.create_group($1, 'F5')`, ['Grupo privado']),
    );
    const groupId = created.rows[0].group_id;

    await expect(
      asUser(client, outsider.id, () =>
        client.query(
          `
            select * from public.submit_admin_onboarding_stats(
              $1,
              'MED',
              null,
              '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb
            )
          `,
          [groupId],
        ),
      ),
    ).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('rejects admin onboarding stats above 8', async () => {
    const user = await seedUser(client, 'admin-onboarding-stat-cap');

    const created = await asUser(client, user.id, () =>
      client.query(`select * from public.create_group($1, 'F5')`, ['Grupo con tope']),
    );
    const groupId = created.rows[0].group_id;

    await expect(
      asUser(client, user.id, () =>
        client.query(
          `
            select * from public.submit_admin_onboarding_stats(
              $1,
              'DEL',
              null,
              '{"pac":9,"sho":8,"pas":7,"dri":8,"def":4,"phy":6}'::jsonb
            )
          `,
          [groupId],
        ),
      ),
    ).rejects.toThrow(/VALIDATION_ERROR/);
  });

  it('does not duplicate self creation logs when admin onboarding is called twice', async () => {
    const user = await seedUser(client, 'admin-onboarding-duplicate-log');

    const created = await asUser(client, user.id, () =>
      client.query(`select * from public.create_group($1, 'F5')`, ['Grupo sin duplicados']),
    );
    const groupId = created.rows[0].group_id;

    const firstSubmission = await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_admin_onboarding_stats(
            $1,
            'MED',
            null,
            '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb
          )
        `,
        [groupId],
      ),
    );
    const playerId = firstSubmission.rows[0].player_id;

    await expect(
      asUser(client, user.id, () =>
        client.query(
          `
            select * from public.submit_admin_onboarding_stats(
              $1,
              'MED',
              null,
              '{"pac":7,"sho":7,"pas":7,"dri":7,"def":7,"phy":7}'::jsonb
            )
          `,
          [groupId],
        ),
      ),
    ).rejects.toThrow(/STATS_PENDING_APPROVAL/);

    const logs = await client.query(
      `
        select count(*)::int as count
        from public.player_stat_change_logs
        where player_id = $1 and reason = 'admin_self_creation'
      `,
      [playerId],
    );

    expect(logs.rows[0].count).toBe(1);
  });

  it('updates only the authenticated admin player in the target group', async () => {
    const admin = await seedUser(client, 'admin-onboarding-own-player');
    const otherUser = await seedUser(client, 'admin-onboarding-other-player');

    const created = await asUser(client, admin.id, () =>
      client.query(`select * from public.create_group($1, 'F5')`, ['Grupo propio']),
    );
    const groupId = created.rows[0].group_id;

    const otherPlayer = await client.query(
      `
        insert into public.players (
          user_id,
          group_id,
          display_name,
          primary_position,
          stats,
          is_phantom,
          stats_status
        )
        values (
          $1,
          $2,
          'Otro jugador',
          'MED',
          '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb,
          false,
          'pending_approval'
        )
        returning id
      `,
      [otherUser.id, groupId],
    );

    const submitted = await asUser(client, admin.id, () =>
      client.query(
        `
          select * from public.submit_admin_onboarding_stats(
            $1,
            'DEF',
            null,
            '{"pac":4,"sho":4,"pas":6,"dri":5,"def":8,"phy":7}'::jsonb
          )
        `,
        [groupId],
      ),
    );

    const players = await client.query(
      `
        select id, user_id, primary_position, stats_status
        from public.players
        where group_id = $1 and archived_at is null
        order by user_id
      `,
      [groupId],
    );

    expect(submitted.rows[0].status).toBe('approved');
    expect(players.rows).toContainEqual(
      expect.objectContaining({
        id: submitted.rows[0].player_id,
        user_id: admin.id,
        primary_position: 'DEF',
        stats_status: 'approved',
      }),
    );
    expect(players.rows).toContainEqual(
      expect.objectContaining({
        id: otherPlayer.rows[0].id,
        user_id: otherUser.id,
        primary_position: 'MED',
        stats_status: 'pending_approval',
      }),
    );
  });
});
