import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('onboarding integration test', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('full onboarding flow: accept invite -> pending player -> submit stats -> updated player', async () => {
    // 1. Setup: Admin, User and Group
    const admin = await seedUser(client, 'admin-onb');
    const user = await seedUser(client, 'user-onb');
    const group = await seedGroup(client, admin.id);

    // 2. User accepts invitation
    const { rows: acceptRows } = await asUser(client, user.id, () =>
      client.query(
        `select * from public.accept_invite_for_user($1)`,
        [group.inviteCode],
      ),
    );

    const playerId = acceptRows[0].player_id;
    expect(playerId).toBeDefined();

    // Verify player is in pending state with default stats
    const { rows: initialPlayerRows } = await client.query(
      `select stats_status, stats from public.players where id = $1`,
      [playerId]
    );
    expect(initialPlayerRows[0].stats_status).toBe('pending_approval');
    expect(initialPlayerRows[0].stats).toMatchObject({ pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 });

    // 3. User submits stats
    const { rows: submitRows } = await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'DEL',
            'MED',
            '{"pac":9,"sho":8,"pas":7,"dri":8,"def":4,"phy":6}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    expect(submitRows[0].player_id).toBe(playerId);
    expect(submitRows[0].status).toBe('pending_approval');

    // 4. Verify player is updated
    const { rows: finalPlayerRows } = await client.query(
      `select primary_position, secondary_position, stats from public.players where id = $1`,
      [playerId]
    );

    expect(finalPlayerRows[0]).toMatchObject({
      primary_position: 'DEL',
      secondary_position: 'MED',
      stats: { pac: 9, sho: 8, pas: 7, dri: 8, def: 4, phy: 6 }
    });
  });
});
