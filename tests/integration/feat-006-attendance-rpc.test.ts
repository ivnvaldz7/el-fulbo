import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('feat-006 update_attendance RPC', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('creates and updates attendance for an approved player', async () => {
    const admin = await seedUser(client, 'attendance-admin');
    const playerUser = await seedUser(client, 'attendance-player');
    const group = await seedGroup(client, admin.id);

    const { rows: playerRows } = await client.query<{ id: string }>(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values ($1, $2, $3, 'MED', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'approved')
        returning id
      `,
      [playerUser.id, group.id, playerUser.displayName],
    );

    const playerId = playerRows[0]!.id;

    const { rows: eventRows } = await client.query<{ id: string }>(
      `
        insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
        values ($1, 'F5', 'Pico y pala', now() + interval '2 day', $2, 'scheduled')
        returning id
      `,
      [group.id, admin.id],
    );

    const eventId = eventRows[0]!.id;

    await asUser(client, playerUser.id, async () => {
      await client.query(`select public.update_attendance($1::uuid, 'going'::public.attendance_status)`, [
        eventId,
      ]);

      await client.query(`select public.update_attendance($1::uuid, 'maybe'::public.attendance_status)`, [
        eventId,
      ]);
    });

    const { rows } = await client.query(
      `select player_id, status from public.event_attendances where event_id = $1`,
      [eventId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.player_id).toBe(playerId);
    expect(rows[0]?.status).toBe('maybe');
  });

  it('rejects attendance confirmation when player stats are pending approval', async () => {
    const admin = await seedUser(client, 'pending-admin');
    const playerUser = await seedUser(client, 'pending-player');
    const group = await seedGroup(client, admin.id);

    await client.query(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values ($1, $2, $3, 'DEF', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'pending_approval')
      `,
      [playerUser.id, group.id, playerUser.displayName],
    );

    const { rows: eventRows } = await client.query<{ id: string }>(
      `
        insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
        values ($1, 'F5', 'Cancha suspendida', now() + interval '2 day', $2, 'scheduled')
        returning id
      `,
      [group.id, admin.id],
    );

    const eventId = eventRows[0]!.id;

    await expect(
      asUser(client, playerUser.id, async () => {
        await client.query(`select public.update_attendance($1::uuid, 'going'::public.attendance_status)`, [
          eventId,
        ]);
      }),
    ).rejects.toThrow(/STATS_PENDING_APPROVAL/);
  });

  it('notifies the admin when a player drops within six hours', async () => {
    const admin = await seedUser(client, 'drop-admin');
    const playerUser = await seedUser(client, 'drop-player');
    const group = await seedGroup(client, admin.id);

    const { rows: playerRows } = await client.query<{ id: string }>(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values ($1, $2, $3, 'DEL', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'approved')
        returning id
      `,
      [playerUser.id, group.id, playerUser.displayName],
    );

    const playerId = playerRows[0]!.id;

    const { rows: eventRows } = await client.query<{ id: string }>(
      `
        insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
        values ($1, 'F5', 'Nocturna', now() + interval '3 hour', $2, 'confirming')
        returning id
      `,
      [group.id, admin.id],
    );

    const eventId = eventRows[0]!.id;

    await client.query(
      `
        insert into public.event_attendances (event_id, player_id, status)
        values ($1, $2, 'going')
      `,
      [eventId, playerId],
    );

    await asUser(client, playerUser.id, async () => {
      await client.query(
        `select public.update_attendance($1::uuid, 'not_going'::public.attendance_status)`,
        [eventId],
      );
    });

    const { rows: notifications } = await client.query(
      `select type, payload from public.notifications where user_id = $1 and type = 'someone_dropped'`,
      [admin.id],
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.payload.player_id).toBe(playerId);
    expect(notifications[0]?.payload.event_id).toBe(eventId);
  });
});
