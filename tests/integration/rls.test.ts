import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('feat-001 RLS', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('user can update own pending player stats', async () => {
    const admin = await seedUser(client, 'admin-rls-own');
    const user = await seedUser(client, 'player-rls-own');
    const group = await seedGroup(client, admin.id);
    const accepted = await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );

    const updated = await asUser(client, user.id, () =>
      client.query(
        `
          update public.players
          set stats = '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb
          where id = $1
          returning id
        `,
        [accepted.rows[0].player_id],
      ),
    );

    expect(updated.rowCount).toBe(1);
  });

  it('user cannot update own approved player stats', async () => {
    const admin = await seedUser(client, 'admin-rls-approved');
    const user = await seedUser(client, 'player-rls-approved');
    const group = await seedGroup(client, admin.id);
    const accepted = await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );

    await client.query(`update public.players set stats_status = 'approved' where id = $1`, [
      accepted.rows[0].player_id,
    ]);

    const updated = await asUser(client, user.id, () =>
      client.query(
        `
          update public.players
          set stats = '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb
          where id = $1
          returning id
        `,
        [accepted.rows[0].player_id],
      ),
    );

    expect(updated.rowCount).toBe(0);
  });

  it('user cannot update another pending player stats', async () => {
    const admin = await seedUser(client, 'admin-rls-other');
    const userA = await seedUser(client, 'player-rls-a');
    const userB = await seedUser(client, 'player-rls-b');
    const group = await seedGroup(client, admin.id);
    const acceptedB = await asUser(client, userB.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );

    const updated = await asUser(client, userA.id, () =>
      client.query(
        `
          update public.players
          set stats = '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb
          where id = $1
          returning id
        `,
        [acceptedB.rows[0].player_id],
      ),
    );

    expect(updated.rowCount).toBe(0);
  });
});
