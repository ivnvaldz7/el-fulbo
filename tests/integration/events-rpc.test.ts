import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('events RPCs', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('creates an event and notifies approved players', async () => {
    const admin = await seedUser(client, 'event-admin');
    const player1 = await seedUser(client, 'event-p1');
    const player2 = await seedUser(client, 'event-p2');

    const group = await seedGroup(client, admin.id);

    // Player 1: approved
    await client.query(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values ($1, $2, $3, 'DEL', '{}', 'approved')
      `,
      [player1.id, group.id, player1.displayName]
    );

    // Player 2: pending
    await client.query(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values ($1, $2, $3, 'ARQ', '{}', 'pending_approval')
      `,
      [player2.id, group.id, player2.displayName]
    );

    const eventId = await asUser(client, admin.id, async () => {
      const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
      const res = await client.query(
        `select public.create_event($1::uuid, $2::public.modality, $3::text, $4::text, $5::timestamptz, $6::text) as event_id`,
        [group.id, 'F5', 'Pico y Pala', 'Cancha 1', scheduledAt, null]
      );
      return res.rows[0].event_id;
    });

    expect(eventId).toBeDefined();

    // Verify event created
    const evQuery = await client.query(`select * from public.events where id = $1`, [eventId]);
    expect(evQuery.rows[0].field_name).toBe('Pico y Pala');
    expect(evQuery.rows[0].field_maps_url).toBe('Cancha 1');

    // Verify notification created for player1 but not player2
    const notifs1 = await client.query(`select * from public.notifications where user_id = $1`, [player1.id]);
    const notifs2 = await client.query(`select * from public.notifications where user_id = $1`, [player2.id]);

    expect(notifs1.rows.length).toBe(1);
    expect(notifs1.rows[0].type).toBe('event_created');
    expect(notifs1.rows[0].payload.event_id).toBe(eventId);

    expect(notifs2.rows.length).toBe(0);
  });
});
