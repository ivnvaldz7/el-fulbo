import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedAuthUser, seedGroup, seedUser, signInAsAuthUser } from './db';

describe('feat-007 confirm_draw RPC', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('persists participations, marks event drawn and notifies players', async () => {
    const admin = await seedUser(client, 'draw-admin');
    const playerA = await seedUser(client, 'draw-a');
    const playerB = await seedUser(client, 'draw-b');
    const group = await seedGroup(client, admin.id);

    const { rows: insertedPlayers } = await client.query<{ id: string; user_id: string; display_name: string }>(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values
          ($1, $3, $4, 'ARQ', '{"div":6,"han":6,"kic":6,"ref":6,"spd":6,"pos":6}'::jsonb, 'approved'),
          ($2, $3, $5, 'DEL', '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb, 'approved')
        returning id, user_id, display_name
      `,
      [playerA.id, playerB.id, group.id, playerA.displayName, playerB.displayName],
    );

    const { rows: eventRows } = await client.query<{ id: string }>(
      `
        insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
        values ($1, 'F5', 'Cancha 7', now() + interval '1 hour', $2, 'checked_in')
        returning id
      `,
      [group.id, admin.id],
    );

    const eventId = eventRows[0]!.id;

    for (const player of insertedPlayers) {
      await client.query(
        `
          insert into public.event_attendances (event_id, player_id, status, checked_in, checked_in_at)
          values ($1, $2, 'going', true, now())
        `,
        [eventId, player.id],
      );
    }

    const assignments = [
      {
        playerId: insertedPlayers[0]!.id,
        team: 'A',
        assignedPosition: 'ARQ',
        playedPrimaryPosition: true,
      },
      {
        playerId: insertedPlayers[1]!.id,
        team: 'B',
        assignedPosition: 'DEL',
        playedPrimaryPosition: true,
      },
    ];

    await asUser(client, admin.id, async () => {
      await client.query(
        `select public.confirm_draw($1::uuid, $2::text, $3::jsonb, $4::text, $5::text)`,
        [eventId, 'seed-007', JSON.stringify(assignments), 'Equipo A', 'Equipo B'],
      );
    });

    const { rows: eventState } = await client.query(
      `select status, draw_seed, team_a_name, team_b_name, team_assignments from public.events where id = $1`,
      [eventId],
    );

    expect(eventState[0]?.status).toBe('drawn');
    expect(eventState[0]?.draw_seed).toBe('seed-007');
    expect(eventState[0]?.team_a_name).toBe('Equipo A');
    expect(eventState[0]?.team_b_name).toBe('Equipo B');
    expect(eventState[0]?.team_assignments.teams).toHaveLength(2);

    const { rows: participations } = await client.query(
      `select player_id, team, assigned_position from public.match_participations where event_id = $1 order by team`,
      [eventId],
    );

    expect(participations).toHaveLength(2);
    expect(participations[0]?.team).toBe('A');
    expect(participations[1]?.team).toBe('B');

    const { rows: notifications } = await client.query(
      `select user_id, type, payload from public.notifications where type = 'match_ready' and payload->>'event_id' = $1`,
      [eventId],
    );

    expect(notifications).toHaveLength(2);
  });

  it('works through supabase.rpc after reloading the PostgREST schema cache', async () => {
    const admin = await seedAuthUser(client, 'draw-rpc-admin');
    const playerA = await seedUser(client, 'draw-rpc-a');
    const playerB = await seedUser(client, 'draw-rpc-b');
    const group = await seedGroup(client, admin.id);

    const { rows: insertedPlayers } = await client.query<{ id: string; user_id: string; display_name: string }>(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values
          ($1, $3, $4, 'ARQ', '{"div":6,"han":6,"kic":6,"ref":6,"spd":6,"pos":6}'::jsonb, 'approved'),
          ($2, $3, $5, 'DEL', '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb, 'approved')
        returning id, user_id, display_name
      `,
      [playerA.id, playerB.id, group.id, playerA.displayName, playerB.displayName],
    );

    const { rows: eventRows } = await client.query<{ id: string }>(
      `
        insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
        values ($1, 'F5', 'Cancha RPC', now() + interval '1 hour', $2, 'checked_in')
        returning id
      `,
      [group.id, admin.id],
    );

    const eventId = eventRows[0]!.id;

    for (const player of insertedPlayers) {
      await client.query(
        `
          insert into public.event_attendances (event_id, player_id, status, checked_in, checked_in_at)
          values ($1, $2, 'going', true, now())
        `,
        [eventId, player.id],
      );
    }

    const assignments = [
      {
        playerId: insertedPlayers[0]!.id,
        team: 'A',
        assignedPosition: 'ARQ',
        playedPrimaryPosition: true,
      },
      {
        playerId: insertedPlayers[1]!.id,
        team: 'B',
        assignedPosition: 'DEL',
        playedPrimaryPosition: true,
      },
    ];

    await client.query(`notify pgrst, 'reload schema'`);

    const supabase = await signInAsAuthUser(admin.email, admin.password);
    const { error } = await supabase.rpc('confirm_draw', {
      p_event_id: eventId,
      p_seed: 'seed-rpc-007',
      p_assignments: assignments,
      p_team_a_name: 'Equipo RPC A',
      p_team_b_name: 'Equipo RPC B',
    });

    expect(error).toBeNull();

    const { rows: eventState } = await client.query(
      `select status, draw_seed, team_a_name, team_b_name, team_assignments from public.events where id = $1`,
      [eventId],
    );

    expect(eventState[0]?.status).toBe('drawn');
    expect(eventState[0]?.draw_seed).toBe('seed-rpc-007');
    expect(eventState[0]?.team_a_name).toBe('Equipo RPC A');
    expect(eventState[0]?.team_b_name).toBe('Equipo RPC B');
    expect(eventState[0]?.team_assignments.teams).toHaveLength(2);

    const { rows: participations } = await client.query(
      `select player_id, team, assigned_position from public.match_participations where event_id = $1 order by team`,
      [eventId],
    );

    expect(participations).toHaveLength(2);
    expect(participations[0]?.team).toBe('A');
    expect(participations[1]?.team).toBe('B');

    const { rows: notifications } = await client.query(
      `select user_id, type, payload from public.notifications where type = 'match_ready' and payload->>'event_id' = $1`,
      [eventId],
    );

    expect(notifications).toHaveLength(2);
  });
});
