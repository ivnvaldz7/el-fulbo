import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('feat-001 onboarding flow', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('accept invite creates a pending player with initial defaults', async () => {
    const admin = await seedUser(client, 'admin-accept');
    const user = await seedUser(client, 'player-accept');
    const group = await seedGroup(client, admin.id);

    const { rows } = await asUser(client, user.id, () =>
      client.query(
        `select * from public.accept_invite_for_user($1)`,
        [group.inviteCode],
      ),
    );

    expect(rows[0].group_id).toBe(group.id);
    expect(rows[0].already_member).toBe(false);

    expect(rows[0]).toMatchObject({
      player_id: null,
      needs_onboarding: true,
      status: null,
    });
  });

  it('submit stats updates player and creates admin notification', async () => {
    const admin = await seedUser(client, 'admin-submit');
    const user = await seedUser(client, 'player-submit');
    const group = await seedGroup(client, admin.id);

    const accepted = await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );

    const { rows } = await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'DEL',
            'MED',
            '{"pac":80,"sho":70,"pas":60,"dri":70,"def":50,"phy":50}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    expect(rows[0]).toMatchObject({
      player_id: expect.any(String),
      status: 'pending_approval',
    });

    const player = await client.query(
      `select primary_position, secondary_position, stats from public.players where id = $1`,
      [rows[0].player_id],
    );
    expect(player.rows[0]).toMatchObject({
      primary_position: 'DEL',
      secondary_position: 'MED',
      stats: { pac: 80, sho: 70, pas: 60, dri: 70, def: 50, phy: 50 },
    });

    const notifications = await client.query(
      `
        select type, payload->>'player_id' as player_id
        from public.notifications
        where user_id = $1 and type = 'stats_pending_approval'
      `,
      [admin.id],
    );
    expect(notifications.rows[0]).toMatchObject({
      type: 'stats_pending_approval',
      player_id: rows[0].player_id,
    });
  });

  it('rejects invite when group has 50 active players', async () => {
    const admin = await seedUser(client, 'admin-limit');
    const user = await seedUser(client, 'player-limit');
    const group = await seedGroup(client, admin.id);

    for (let index = 0; index < 50; index += 1) {
      await client.query(
        `
          insert into public.players (group_id, display_name, primary_position, stats, stats_status)
          values ($1, $2, 'MED', '{"pac":50,"sho":50,"pas":50,"dri":50,"def":50,"phy":50}'::jsonb, 'approved')
        `,
        [group.id, `Seed ${index}`],
      );
    }

    await expect(
      asUser(client, user.id, () =>
        client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
      ),
    ).rejects.toThrow(/PLAYER_GROUP_LIMIT_REACHED/);
  });
});
