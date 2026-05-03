import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('feat-004 admin tasks phase 1', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('returns the pending summary for the group admin', async () => {
    const admin = await seedUser(client, 'admin-summary-admin');
    const player = await seedUser(client, 'admin-summary-player');
    const group = await seedGroup(client, admin.id);

    const playerRow = await client.query(
      `
        insert into public.players (
          user_id, group_id, display_name, primary_position, stats, stats_status, is_phantom
        ) values (
          $1, $2, $3, 'MED', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'pending_approval', false
        )
        returning id
      `,
      [player.id, group.id, player.displayName],
    );

    await client.query(
      `
        insert into public.stat_revision_requests (player_id, user_id, message, status)
        values ($1, $2, 'Revisame', 'pending')
      `,
      [playerRow.rows[0].id, player.id],
    );

    await client.query(
      `
        update public.players
        set archived_at = now() - interval '5 days', is_expelled = true
        where id = $1
      `,
      [playerRow.rows[0].id],
    );

    await client.query(
      `
        insert into public.reintegration_requests (player_id, user_id, group_id, message, status)
        values ($1, $2, $3, 'Quiero volver', 'pending')
      `,
      [playerRow.rows[0].id, player.id, group.id],
    );

    const summary = await asUser(client, admin.id, () =>
      client.query(`select * from public.get_pending_tasks_summary($1)`, [group.id]),
    );

    expect(summary.rows[0]).toMatchObject({
      cards_new: '0',
      revisions: '0',
      reintegrations: '1',
      total: '1',
    });
  });

  it('returns the grouped detail for admin tasks', async () => {
    const admin = await seedUser(client, 'admin-detail-admin');
    const player = await seedUser(client, 'admin-detail-player');
    const group = await seedGroup(client, admin.id);

    const pendingPlayer = await client.query(
      `
        insert into public.players (
          user_id, group_id, display_name, primary_position, stats, stats_status, is_phantom, joined_at
        ) values (
          $1, $2, $3, 'MED', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'pending_approval', false, now() - interval '8 days'
        )
        returning id
      `,
      [player.id, group.id, player.displayName],
    );

    await client.query(
      `
        insert into public.stat_revision_requests (player_id, user_id, message, status, created_at)
        values ($1, $2, 'Revisame', 'pending', now() - interval '3 days')
      `,
      [pendingPlayer.rows[0].id, player.id],
    );

    await client.query(
      `
        update public.players
        set archived_at = now() - interval '10 days', is_expelled = true
        where id = $1
      `,
      [pendingPlayer.rows[0].id],
    );

    await client.query(
      `
        insert into public.reintegration_requests (player_id, user_id, group_id, message, status, created_at)
        values ($1, $2, $3, 'Quiero volver', 'pending', now() - interval '9 days')
      `,
      [pendingPlayer.rows[0].id, player.id, group.id],
    );

    const detail = await asUser(client, admin.id, () =>
      client.query(`select public.get_admin_tasks_detail($1) as payload`, [group.id]),
    );

    expect(detail.rows[0].payload.reintegrations).toHaveLength(1);
    expect(detail.rows[0].payload.revisions).toHaveLength(0);
    expect(detail.rows[0].payload.cards_new).toHaveLength(0);
    expect(detail.rows[0].payload.reintegrations[0]).toMatchObject({
      player_name: player.displayName,
      overdue: true,
    });
  });

  it('approves initial stats for a pending player', async () => {
    const admin = await seedUser(client, 'admin-approve-initial');
    const player = await seedUser(client, 'admin-approve-initial-player');
    const group = await seedGroup(client, admin.id);

    const pendingPlayer = await client.query(
      `
        insert into public.players (
          user_id, group_id, display_name, primary_position, stats, stats_status, is_phantom
        ) values (
          $1, $2, $3, 'MED', '{"pac":5,"sho":5,"pas":6,"dri":6,"def":5,"phy":5}'::jsonb, 'pending_approval', false
        )
        returning id
      `,
      [player.id, group.id, player.displayName],
    );

    await asUser(client, admin.id, () =>
      client.query(`select public.approve_initial_stats($1)`, [pendingPlayer.rows[0].id]),
    );

    const snapshot = await client.query(
      `
        select stats_status
        from public.players
        where id = $1
      `,
      [pendingPlayer.rows[0].id],
    );

    const logs = await client.query(
      `
        select reason
        from public.player_stat_change_logs
        where player_id = $1
      `,
      [pendingPlayer.rows[0].id],
    );

    expect(snapshot.rows[0].stats_status).toBe('approved');
    expect(logs.rows[0].reason).toBe('initial_approval');
  });

  it('approves a pending stat revision', async () => {
    const admin = await seedUser(client, 'admin-approve-revision');
    const player = await seedUser(client, 'admin-approve-revision-player');
    const group = await seedGroup(client, admin.id);

    const currentPlayer = await client.query(
      `
        insert into public.players (
          user_id, group_id, display_name, primary_position, stats, stats_status, is_phantom
        ) values (
          $1, $2, $3, 'MED', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'approved', false
        )
        returning id
      `,
      [player.id, group.id, player.displayName],
    );

    const request = await client.query(
      `
        insert into public.stat_revision_requests (player_id, user_id, message, proposed_stats, status)
        values (
          $1, $2, 'Subime un poco el pase', '{"pac":5,"sho":5,"pas":7,"dri":5,"def":5,"phy":5}'::jsonb, 'pending'
        )
        returning id
      `,
      [currentPlayer.rows[0].id, player.id],
    );

    await asUser(client, admin.id, () =>
      client.query(`select public.approve_stat_revision($1)`, [request.rows[0].id]),
    );

    const snapshot = await client.query(
      `
        select stats
        from public.players
        where id = $1
      `,
      [currentPlayer.rows[0].id],
    );

    const requestState = await client.query(
      `
        select status
        from public.stat_revision_requests
        where id = $1
      `,
      [request.rows[0].id],
    );

    expect(snapshot.rows[0].stats).toMatchObject({ pas: 7 });
    expect(requestState.rows[0].status).toBe('approved');
  });

  it('approves a pending reintegration request', async () => {
    const admin = await seedUser(client, 'adm-appr-reint');
    const player = await seedUser(client, 'ply-appr-reint');
    const group = await seedGroup(client, admin.id);

    const archivedPlayer = await client.query(
      `
        insert into public.players (
          user_id, group_id, display_name, primary_position, stats, stats_status, archived_at, is_expelled
        ) values (
          $1, $2, $3, 'MED', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'approved', now() - interval '4 days', true
        )
        returning id
      `,
      [player.id, group.id, player.displayName],
    );

    const request = await client.query(
      `
        insert into public.reintegration_requests (player_id, user_id, group_id, message, status)
        values ($1, $2, $3, 'Quiero volver', 'pending')
        returning id
      `,
      [archivedPlayer.rows[0].id, player.id, group.id],
    );

    await asUser(client, admin.id, () =>
      client.query(`select public.approve_reintegration_request($1)`, [request.rows[0].id]),
    );

    const snapshot = await client.query(
      `
        select archived_at, is_expelled
        from public.players
        where id = $1
      `,
      [archivedPlayer.rows[0].id],
    );

    const requestState = await client.query(
      `
        select status
        from public.reintegration_requests
        where id = $1
      `,
      [request.rows[0].id],
    );

    expect(snapshot.rows[0].archived_at).toBeNull();
    expect(snapshot.rows[0].is_expelled).toBe(false);
    expect(requestState.rows[0].status).toBe('approved');
  });
});
