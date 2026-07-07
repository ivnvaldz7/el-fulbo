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

    expect(acceptRows[0]).toMatchObject({
      player_id: null,
      needs_onboarding: true,
      status: null,
    });

    // 3. User submits stats
    const { rows: submitRows } = await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'DEL',
            'MED',
            '{"pac":90,"sho":80,"pas":70,"dri":80,"def":50,"phy":60}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    const playerId = submitRows[0].player_id;
    expect(playerId).toEqual(expect.any(String));
    expect(submitRows[0].status).toBe('pending_approval');

    // 4. Verify player is updated
    const { rows: finalPlayerRows } = await client.query(
      `select primary_position, secondary_position, stats from public.players where id = $1`,
      [playerId]
    );

    expect(finalPlayerRows[0]).toMatchObject({
      primary_position: 'DEL',
      secondary_position: 'MED',
      stats: { pac: 90, sho: 80, pas: 70, dri: 80, def: 50, phy: 60 }
    });
  });
});
