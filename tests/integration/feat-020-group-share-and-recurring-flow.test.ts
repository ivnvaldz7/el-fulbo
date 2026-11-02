import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedAuthUser, seedGroup } from './db';

describe('feat-020 shared attendance and recurring opening', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it('opens one recurring occurrence, lets an external guest reserve it, and accepts their MVP vote', async () => {
    const admin = await seedAuthUser(client, 'share-flow-admin');
    const group = await seedGroup(client, admin.id);

    const { rows: groupRows } = await client.query<{ public_attendance_token: string }>(
      `select public_attendance_token from public.groups where id = $1`,
      [group.id],
    );
    const shareToken = groupRows[0]!.public_attendance_token;

    const { rows: scheduleRows } = await client.query<{ id: string }>(
      `
        insert into public.group_recurring_schedules (
          group_id, day_of_week, scheduled_time, field_name, modality, days_ahead
        ) values ($1, 5, '22:00', 'Cancha fija', 'F5', 2)
        returning id
      `,
      [group.id],
    );
    const scheduleId = scheduleRows[0]!.id;
    const occurrence = '2026-12-26T01:00:00.000Z';

    const firstOpen = await asUser(client, admin.id, () =>
      client.query<{ event_id: string; created: boolean }>(
        `select * from public.open_recurring_event($1::uuid, $2::timestamptz)`,
        [scheduleId, occurrence],
      ),
    );
    const secondOpen = await asUser(client, admin.id, () =>
      client.query<{ event_id: string; created: boolean }>(
        `select * from public.open_recurring_event($1::uuid, $2::timestamptz)`,
        [scheduleId, occurrence],
      ),
    );

    expect(firstOpen.rows[0]).toMatchObject({ created: true });
    expect(secondOpen.rows[0]).toEqual({ event_id: firstOpen.rows[0]!.event_id, created: false });

    const { rows: eventRows } = await client.query<{ id: string }>(
      `
        insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
        values ($1, 'F5', 'Cancha del barrio', now() + interval '2 days', $2, 'scheduled')
        returning id
      `,
      [group.id, admin.id],
    );
    const eventId = eventRows[0]!.id;
    const guestKey = randomUUID();

    const { rows: reservationRows } = await client.query<{
      reservation: { playerId: string; status: string };
    }>(
      `select public.reserve_shared_guest_attendance($1::uuid, $2::uuid, $3::uuid, $4, 'going') as reservation`,
      [shareToken, eventId, guestKey, 'Lucho'],
    );
    const reservation = reservationRows[0]!.reservation;
    const guestPlayerId = reservation.playerId;

    expect(reservation.status).toBe('going');

    const { rows: adminPlayerRows } = await client.query<{ id: string }>(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats_status, stats)
        values ($1, $2, 'Admin jugador', 'DEL', 'approved', '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb)
        returning id
      `,
      [admin.id, group.id],
    );
    const adminPlayerId = adminPlayerRows[0]!.id;

    await client.query(
      `update public.events set status = 'drawn', draw_seed = 'share-flow-seed' where id = $1`,
      [eventId],
    );
    await client.query(
      `
        insert into public.match_participations (event_id, player_id, team, assigned_position)
        values ($1, $2, 'A', 'MED'), ($1, $3, 'B', 'DEL')
      `,
      [eventId, guestPlayerId, adminPlayerId],
    );
    await asUser(client, admin.id, () =>
      client.query(`select public.load_match_result($1::uuid, 2, 1, null, null)`, [eventId]),
    );

    const { rows: sharedVoteRows } = await client.query<{
      payload: { groupId: string; guestPlayerId: string };
    }>(`select public.get_shared_mvp_vote($1::uuid, $2::uuid, $3::uuid) as payload`, [
      shareToken,
      eventId,
      guestKey,
    ]);

    expect(sharedVoteRows[0]!.payload.groupId).toBe(group.id);
    expect(sharedVoteRows[0]!.payload.guestPlayerId).toBe(guestPlayerId);

    await client.query(
      `select public.submit_shared_guest_mvp_vote($1::uuid, $2::uuid, $3::uuid, $4::uuid)`,
      [shareToken, eventId, guestKey, adminPlayerId],
    );

    const { rows: voteRows } = await client.query<{
      voter_player_id: string;
      voted_player_id: string;
    }>(`select voter_player_id, voted_player_id from public.event_mvp_votes where event_id = $1`, [
      eventId,
    ]);
    expect(voteRows).toEqual([{ voter_player_id: guestPlayerId, voted_player_id: adminPlayerId }]);
  });
});
