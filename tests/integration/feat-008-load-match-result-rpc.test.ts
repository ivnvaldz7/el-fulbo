import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedAuthUser, seedGroup, seedUser, signInAsAuthUser } from './db';

async function seedDrawnEventFixture(client: Client, label: string) {
  const admin = await seedAuthUser(client, `${label}-admin`);
  const striker = await seedUser(client, `${label}-striker`);
  const midfielder = await seedUser(client, `${label}-mid`);
  const defender = await seedUser(client, `${label}-def`);
  const group = await seedGroup(client, admin.id);

  const { rows: insertedPlayers } = await client.query<{
    id: string;
    user_id: string;
    display_name: string;
    primary_position: 'DEL' | 'MED' | 'DEF';
  }>(
    `
      insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status, current_boost)
      values
        ($1, $4, $5, 'DEL', '{"pac":7,"sho":7,"pas":5,"dri":6,"def":3,"phy":5}'::jsonb, 'approved', null),
        ($2, $4, $6, 'MED', '{"pac":6,"sho":5,"pas":7,"dri":7,"def":5,"phy":5}'::jsonb, 'approved', '{"applied_at_event_id":"old-win","partidos_remaining":1,"modifiers":{"pas":1,"dri":1},"reason":"draw_mvp"}'::jsonb),
        ($3, $4, $7, 'DEF', '{"pac":5,"sho":3,"pas":5,"dri":4,"def":8,"phy":8}'::jsonb, 'approved', '{"applied_at_event_id":"old-loss","partidos_remaining":2,"modifiers":{"def":1,"phy":1},"reason":"victory"}'::jsonb)
      returning id, user_id, display_name, primary_position
    `,
    [striker.id, midfielder.id, defender.id, group.id, striker.displayName, midfielder.displayName, defender.displayName],
  );

  const { rows: eventRows } = await client.query<{ id: string }>(
    `
      insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status, draw_seed, team_a_name, team_b_name)
      values ($1, 'F5', 'Resultado cancha', now() - interval '30 minutes', $2, 'drawn', 'seed-008', 'Equipo A', 'Equipo B')
      returning id
    `,
    [group.id, admin.id],
  );

  const eventId = eventRows[0]!.id;

  await client.query(
    `
      insert into public.match_participations (event_id, player_id, team, assigned_position, played_primary_position, boost_applied)
      values
        ($1, $2, 'A', 'DEL', true, null),
        ($1, $3, 'A', 'MED', true, null),
        ($1, $4, 'B', 'DEF', true, null)
    `,
    [eventId, insertedPlayers[0]!.id, insertedPlayers[1]!.id, insertedPlayers[2]!.id],
  );

  return {
    admin,
    strikerPlayerId: insertedPlayers[0]!.id,
    midfielderPlayerId: insertedPlayers[1]!.id,
    defenderPlayerId: insertedPlayers[2]!.id,
    strikerUserId: striker.id,
    midfielderUserId: midfielder.id,
    defenderUserId: defender.id,
    groupId: group.id,
    eventId,
  };
}

describe('feat-008 load_match_result RPC', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('persists result, applies/replaces/decrements boosts and creates notifications', async () => {
    const fixture = await seedDrawnEventFixture(client, 'result-sql');

    await asUser(client, fixture.admin.id, async () => {
      await client.query(
        `select public.load_match_result($1::uuid, $2::integer, $3::integer, $4::uuid, $5::text)`,
        [fixture.eventId, 3, 1, fixture.strikerPlayerId, 'Partidazo bajo la lluvia'],
      );
    });

    const { rows: eventRows } = await client.query(
      `select status, team_a_score, team_b_score, mvp_player_id, notes, played_at from public.events where id = $1`,
      [fixture.eventId],
    );

    expect(eventRows[0]?.status).toBe('played');
    expect(eventRows[0]?.team_a_score).toBe(3);
    expect(eventRows[0]?.team_b_score).toBe(1);
    expect(eventRows[0]?.mvp_player_id).toBe(fixture.strikerPlayerId);
    expect(eventRows[0]?.notes).toBe('Partidazo bajo la lluvia');
    expect(eventRows[0]?.played_at).toBeTruthy();

    const { rows: players } = await client.query(
      `select id, current_boost from public.players where id = any($1::uuid[]) order by id`,
      [[fixture.strikerPlayerId, fixture.midfielderPlayerId, fixture.defenderPlayerId]],
    );

    const striker = players.find((row) => row.id === fixture.strikerPlayerId);
    const midfielder = players.find((row) => row.id === fixture.midfielderPlayerId);
    const defender = players.find((row) => row.id === fixture.defenderPlayerId);

    expect(striker?.current_boost.reason).toBe('victory_mvp');
    expect(striker?.current_boost.partidos_remaining).toBe(3);
    expect(striker?.current_boost.modifiers.pac).toBe(3);
    expect(striker?.current_boost.modifiers.sho).toBe(3);
    expect(striker?.current_boost.modifiers.pas).toBe(1);

    expect(midfielder?.current_boost.reason).toBe('victory');
    expect(midfielder?.current_boost.partidos_remaining).toBe(3);
    expect(midfielder?.current_boost.modifiers.pas).toBe(1);
    expect(midfielder?.current_boost.modifiers.dri).toBe(1);

    expect(defender?.current_boost.reason).toBe('victory');
    expect(defender?.current_boost.partidos_remaining).toBe(1);

    const { rows: participations } = await client.query(
      `select player_id, boost_applied from public.match_participations where event_id = $1 order by player_id`,
      [fixture.eventId],
    );

    expect(participations.find((row) => row.player_id === fixture.strikerPlayerId)?.boost_applied.reason).toBe(
      'victory_mvp',
    );
    expect(participations.find((row) => row.player_id === fixture.midfielderPlayerId)?.boost_applied.reason).toBe(
      'victory',
    );
    expect(participations.find((row) => row.player_id === fixture.defenderPlayerId)?.boost_applied).toBeNull();

    const { rows: notifications } = await client.query(
      `select user_id, type, payload from public.notifications where payload->>'event_id' = $1 order by type, user_id`,
      [fixture.eventId],
    );

    expect(notifications.filter((row) => row.type === 'boost_applied')).toHaveLength(2);
    expect(notifications.filter((row) => row.type === 'mvp_awarded')).toHaveLength(1);
    expect(notifications.filter((row) => row.type === 'match_result_loaded')).toHaveLength(3);
  });

  it('rejects loading a result when the event was not drawn yet', async () => {
    const admin = await seedUser(client, 'result-conflict-admin');
    const player = await seedUser(client, 'result-conflict-player');
    const group = await seedGroup(client, admin.id);

    const { rows: playerRows } = await client.query<{ id: string }>(
      `
        insert into public.players (user_id, group_id, display_name, primary_position, stats, stats_status)
        values ($1, $2, $3, 'DEL', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, 'approved')
        returning id
      `,
      [player.id, group.id, player.displayName],
    );

    const { rows: eventRows } = await client.query<{ id: string }>(
      `
        insert into public.events (group_id, modality, field_name, scheduled_at, created_by_user_id, status)
        values ($1, 'F5', 'No sorteado', now(), $2, 'scheduled')
        returning id
      `,
      [group.id, admin.id],
    );

    await expect(
      asUser(client, admin.id, async () => {
        await client.query(`select public.load_match_result($1::uuid, 1, 0, $2::uuid, null)`, [
          eventRows[0]!.id,
          playerRows[0]!.id,
        ]);
      }),
    ).rejects.toThrow(/CONFLICT/);
  });

  it('rejects loading a result twice', async () => {
    const fixture = await seedDrawnEventFixture(client, 'result-played');

    await client.query(
      `
        update public.events
        set status = 'played', team_a_score = 2, team_b_score = 2, mvp_player_id = $2, played_at = now()
        where id = $1
      `,
      [fixture.eventId, fixture.strikerPlayerId],
    );

    await expect(
      asUser(client, fixture.admin.id, async () => {
        await client.query(`select public.load_match_result($1::uuid, 2, 1, $2::uuid, null)`, [
          fixture.eventId,
          fixture.strikerPlayerId,
        ]);
      }),
    ).rejects.toThrow(/CONFLICT/);
  });

  it('works through supabase.rpc after reloading the PostgREST schema cache', async () => {
    const fixture = await seedDrawnEventFixture(client, 'result-rpc');

    await client.query(`notify pgrst, 'reload schema'`);

    const supabase = await signInAsAuthUser(fixture.admin.email, fixture.admin.password);
    const { error } = await supabase.rpc('load_match_result', {
      p_event_id: fixture.eventId,
      p_team_a_score: 4,
      p_team_b_score: 0,
      p_mvp_player_id: fixture.strikerPlayerId,
      p_notes: 'Cierre por RPC real',
    });

    expect(error).toBeNull();

    const { rows: eventRows } = await client.query(
      `select status, team_a_score, team_b_score, mvp_player_id, notes from public.events where id = $1`,
      [fixture.eventId],
    );

    expect(eventRows[0]?.status).toBe('played');
    expect(eventRows[0]?.team_a_score).toBe(4);
    expect(eventRows[0]?.team_b_score).toBe(0);
    expect(eventRows[0]?.mvp_player_id).toBe(fixture.strikerPlayerId);
    expect(eventRows[0]?.notes).toBe('Cierre por RPC real');
  });
});
