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
});
