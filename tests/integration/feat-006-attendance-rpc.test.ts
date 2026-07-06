import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import {
  asUser,
  createDbClient,
  seedAuthUser,
  seedGroup,
  seedUser,
  signInAsAuthUser,
} from './db';

async function seedApprovedPlayer(client: Client, userId: string, groupId: string, displayName: string) {
  const { rows } = await client.query<{ id: string }>(
    `
      insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
      values ($1, $2, $3, 'MED', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'approved')
      returning id
    `,
    [userId, groupId, displayName],
  );

  return rows[0]!.id;
}

async function seedScheduledEvent(client: Client, groupId: string, adminUserId: string, fieldName = 'Pico y pala') {
  const { rows } = await client.query<{ id: string }>(
    `
      insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
      values ($1, 'F5', $2, now() + interval '2 day', $3, 'scheduled')
      returning id
    `,
    [groupId, fieldName, adminUserId],
  );

  return rows[0]!.id;
}

describe('feat-006 update_attendance RPC', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
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

  it('creates attendance_changed for admin and fixed owner when a player goes', async () => {
    const admin = await seedUser(client, 'going-admin');
    const owner = await seedUser(client, 'going-owner');
    const playerUser = await seedUser(client, 'going-player');
    const group = await seedGroup(client, admin.id);
    const playerId = await seedApprovedPlayer(client, playerUser.id, group.id, playerUser.displayName);
    const eventId = await seedScheduledEvent(client, group.id, admin.id);

    await client.query(
      `insert into public.group_memberships (user_id, group_id, role) values ($1, $2, 'owner')`,
      [owner.id, group.id],
    );

    await asUser(client, playerUser.id, async () => {
      await client.query(`select public.update_attendance($1::uuid, 'going'::public.attendance_status)`, [
        eventId,
      ]);
    });

    const { rows } = await client.query<{ user_id: string; payload: Record<string, unknown>; dedupe_key: string }>(
      `select user_id, payload, dedupe_key from public.notifications where type = 'attendance_changed' and payload->>'event_id' = $1`,
      [eventId],
    );

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.user_id))).toEqual(new Set([admin.id, owner.id]));

    for (const row of rows) {
      expect(row.payload).toMatchObject({
        group_id: group.id,
        event_id: eventId,
        player_id: playerId,
        player_name: playerUser.displayName,
        status: 'going',
        old_status: null,
      });
      expect(row.payload.scheduled_at).toBeTruthy();
      expect(row.payload.field_name).toBe('Pico y pala');
      expect(row.dedupe_key).toBe(`attendance_changed:${eventId}:${playerId}:going:${row.user_id}`);
    }
  });

  it('creates attendance_changed for admin and fixed owner when a player is not going', async () => {
    const admin = await seedUser(client, 'not-going-admin');
    const owner = await seedUser(client, 'not-going-owner');
    const playerUser = await seedUser(client, 'not-going-player');
    const group = await seedGroup(client, admin.id);
    const playerId = await seedApprovedPlayer(client, playerUser.id, group.id, playerUser.displayName);
    const eventId = await seedScheduledEvent(client, group.id, admin.id);

    await client.query(
      `insert into public.group_memberships (user_id, group_id, role) values ($1, $2, 'owner')`,
      [owner.id, group.id],
    );

    await asUser(client, playerUser.id, async () => {
      await client.query(
        `select public.update_attendance($1::uuid, 'not_going'::public.attendance_status)`,
        [eventId],
      );
    });

    const { rows } = await client.query<{ user_id: string; payload: Record<string, unknown>; dedupe_key: string }>(
      `select user_id, payload, dedupe_key from public.notifications where type = 'attendance_changed' and payload->>'event_id' = $1`,
      [eventId],
    );

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.user_id))).toEqual(new Set([admin.id, owner.id]));

    for (const row of rows) {
      expect(row.payload).toMatchObject({
        group_id: group.id,
        event_id: eventId,
        player_id: playerId,
        player_name: playerUser.displayName,
        status: 'not_going',
        old_status: null,
      });
      expect(row.dedupe_key).toBe(`attendance_changed:${eventId}:${playerId}:not_going:${row.user_id}`);
    }
  });

  it('does not create attendance_changed for maybe', async () => {
    const admin = await seedUser(client, 'maybe-admin');
    const playerUser = await seedUser(client, 'maybe-player');
    const group = await seedGroup(client, admin.id);
    await seedApprovedPlayer(client, playerUser.id, group.id, playerUser.displayName);
    const eventId = await seedScheduledEvent(client, group.id, admin.id);

    await asUser(client, playerUser.id, async () => {
      await client.query(`select public.update_attendance($1::uuid, 'maybe'::public.attendance_status)`, [
        eventId,
      ]);
    });

    const { rows } = await client.query(
      `select id from public.notifications where type = 'attendance_changed' and payload->>'event_id' = $1`,
      [eventId],
    );

    expect(rows).toHaveLength(0);
  });

  it('deduplicates repeated statuses but creates a new notification when status changes', async () => {
    const admin = await seedUser(client, 'dedupe-admin');
    const owner = await seedUser(client, 'dedupe-owner');
    const playerUser = await seedUser(client, 'dedupe-player');
    const group = await seedGroup(client, admin.id);
    const playerId = await seedApprovedPlayer(client, playerUser.id, group.id, playerUser.displayName);
    const eventId = await seedScheduledEvent(client, group.id, admin.id);

    await client.query(
      `insert into public.group_memberships (user_id, group_id, role) values ($1, $2, 'owner')`,
      [owner.id, group.id],
    );

    await asUser(client, playerUser.id, async () => {
      await client.query(`select public.update_attendance($1::uuid, 'going'::public.attendance_status)`, [
        eventId,
      ]);
      await client.query(`select public.update_attendance($1::uuid, 'going'::public.attendance_status)`, [
        eventId,
      ]);
      await client.query(
        `select public.update_attendance($1::uuid, 'not_going'::public.attendance_status)`,
        [eventId],
      );
      await client.query(
        `select public.update_attendance($1::uuid, 'not_going'::public.attendance_status)`,
        [eventId],
      );
    });

    const { rows } = await client.query<{ dedupe_key: string; payload: Record<string, unknown> }>(
      `select dedupe_key, payload from public.notifications where type = 'attendance_changed' and payload->>'event_id' = $1 order by dedupe_key`,
      [eventId],
    );

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.dedupe_key)).toEqual([
      `attendance_changed:${eventId}:${playerId}:going:${admin.id}`,
      `attendance_changed:${eventId}:${playerId}:going:${owner.id}`,
      `attendance_changed:${eventId}:${playerId}:not_going:${admin.id}`,
      `attendance_changed:${eventId}:${playerId}:not_going:${owner.id}`,
    ].sort());
    expect(rows.filter((row) => row.payload.status === 'going')).toHaveLength(2);
    expect(rows.filter((row) => row.payload.status === 'not_going')).toHaveLength(2);
  });

  it('does not create self-notifications for admin or owner actors', async () => {
    const admin = await seedUser(client, 'self-admin');
    const owner = await seedUser(client, 'self-owner');
    const group = await seedGroup(client, admin.id);
    await seedApprovedPlayer(client, admin.id, group.id, admin.displayName);
    await seedApprovedPlayer(client, owner.id, group.id, owner.displayName);
    const ownerEventId = await seedScheduledEvent(client, group.id, admin.id, 'Owner actor');
    const adminEventId = await seedScheduledEvent(client, group.id, admin.id, 'Admin actor');

    await client.query(
      `insert into public.group_memberships (user_id, group_id, role) values ($1, $2, 'owner')`,
      [owner.id, group.id],
    );

    await asUser(client, owner.id, async () => {
      await client.query(`select public.update_attendance($1::uuid, 'going'::public.attendance_status)`, [
        ownerEventId,
      ]);
    });

    await asUser(client, admin.id, async () => {
      await client.query(`select public.update_attendance($1::uuid, 'going'::public.attendance_status)`, [
        adminEventId,
      ]);
    });

    const { rows: ownerActorRows } = await client.query<{ user_id: string }>(
      `select user_id from public.notifications where type = 'attendance_changed' and payload->>'event_id' = $1`,
      [ownerEventId],
    );
    const { rows: adminActorRows } = await client.query<{ user_id: string }>(
      `select user_id from public.notifications where type = 'attendance_changed' and payload->>'event_id' = $1`,
      [adminEventId],
    );

    expect(ownerActorRows.map((row) => row.user_id)).toEqual([admin.id]);
    expect(adminActorRows.map((row) => row.user_id)).toEqual([owner.id]);
  });

  it('works through supabase.rpc after reloading the PostgREST schema cache', async () => {
    const admin = await seedUser(client, 'rpc-cache-admin');
    const playerUser = await seedAuthUser(client, 'rpc-cache-player');
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
        values ($1, 'F5', 'Cache RPC', now() + interval '2 day', $2, 'scheduled')
        returning id
      `,
      [group.id, admin.id],
    );

    const eventId = eventRows[0]!.id;

    await client.query(`notify pgrst, 'reload schema'`);

    const supabase = await signInAsAuthUser(playerUser.email, playerUser.password);
    const { error } = await supabase.rpc('update_attendance', {
      p_event_id: eventId,
      p_status: 'going',
    });

    expect(error).toBeNull();

    const { rows } = await client.query(
      `select player_id, status from public.event_attendances where event_id = $1`,
      [eventId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.player_id).toBe(playerId);
    expect(rows[0]?.status).toBe('going');
  });
});
