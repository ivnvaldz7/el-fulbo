import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('feat-003 join group', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('acepta una invitación y crea player pending para el usuario autenticado', async () => {
    const admin = await seedUser(client, 'join-admin');
    const user = await seedUser(client, 'join-user');
    const group = await seedGroup(client, admin.id);

    const accepted = await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );

    expect(accepted.rows[0]).toMatchObject({
      group_id: group.id,
      already_member: false,
      needs_onboarding: true,
      player_id: null,
      status: null,
    });
  });

  it('si ya es miembro, no duplica y devuelve already_member=true', async () => {
    const admin = await seedUser(client, 'join-admin-existing');
    const user = await seedUser(client, 'join-user-existing');
    const group = await seedGroup(client, admin.id);

    await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );

    await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'MED',
            null,
            '{"pac":50,"sho":50,"pas":50,"dri":50,"def":50,"phy":50}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    const secondTry = await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );

    expect(secondTry.rows[0].already_member).toBe(true);

    const players = await client.query(
      `select count(*)::int as count from public.players where user_id = $1 and group_id = $2 and archived_at is null`,
      [user.id, group.id],
    );
    expect(players.rows[0].count).toBe(1);
  });

  it('detecta un retorno voluntario dentro de la ventana de 365 dias', async () => {
    const admin = await seedUser(client, 'join-admin-returner');
    const user = await seedUser(client, 'join-user-returner');
    const group = await seedGroup(client, admin.id);

    const archivedPlayer = await client.query(
      `
        insert into public.players (
          user_id, group_id, display_name, primary_position, secondary_position, stats, stats_status, archived_at
        ) values (
          $1, $2, $3, 'MED', null, '{"pac":50,"sho":50,"pas":60,"dri":60,"def":50,"phy":50}'::jsonb, 'approved', now() - interval '10 days'
        )
        returning id
      `,
      [user.id, group.id, user.displayName],
    );

    const result = await asUser(client, user.id, () =>
      client.query(`select public.validate_invite_code($1) as payload`, [group.inviteCode]),
    );

    expect(result.rows[0].payload.user_status).toBe('voluntary_returner');
    expect(result.rows[0].payload.extras.archived_player.id).toBe(archivedPlayer.rows[0].id);
  });

  it('crea una solicitud de reintegro para un expulsado', async () => {
    const admin = await seedUser(client, 'join-admin-expelled');
    const user = await seedUser(client, 'join-user-expelled');
    const group = await seedGroup(client, admin.id);

    await client.query(
      `
        insert into public.players (
          user_id, group_id, display_name, primary_position, secondary_position, stats, stats_status, archived_at, is_expelled
        ) values (
          $1, $2, $3, 'MED', null, '{"pac":50,"sho":50,"pas":60,"dri":60,"def":50,"phy":50}'::jsonb, 'approved', now() - interval '5 days', true
        )
      `,
      [user.id, group.id, user.displayName],
    );

    const requestId = await asUser(client, user.id, async () => {
      const result = await client.query(`select public.create_reintegration_request($1, $2) as request_id`, [
        group.inviteCode,
        'Quiero volver',
      ]);
      return result.rows[0].request_id;
    });

    const requests = await client.query(
      `select message, status from public.reintegration_requests where id = $1`,
      [requestId],
    );

    expect(requests.rows[0]).toMatchObject({
      message: 'Quiero volver',
      status: 'pending',
    });
  });
});
