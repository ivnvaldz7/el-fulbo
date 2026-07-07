import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { createDbClient, seedAuthUser, seedGroup, signInAsAuthUser, createSupabaseServiceRoleClient } from './db';

describe('MVP Voting Flow (Feat 009)', () => {
  let db: Client;
  let adminUserId: string;
  let adminEmail: string;
  let adminPass: string;
  let groupId: string;
  let eventId: string;
  const players: { id: string; userId: string; email: string; pass: string }[] = [];
  const adminClient = createSupabaseServiceRoleClient(); // Use service role for fast inserts, we can test RPC via signed-in clients.

  beforeAll(async () => {
    db = await createDbClient();

    // Setup admin and group
    const adminAuth = await seedAuthUser(db, 'MVPAdmin');
    adminUserId = adminAuth.id;
    adminEmail = adminAuth.email;
    adminPass = adminAuth.password;

    const group = await seedGroup(db, adminUserId);
    groupId = group.id;

    // Seed 10 players
    for (let i = 1; i <= 10; i++) {
      const pAuth = await seedAuthUser(db, `P${i}`);
      // Create player record
      const { rows } = await db.query<{ id: string }>(
        `insert into public.players (group_id, user_id, display_name, primary_position, stats_status, stats)
         values ($1, $2, $3, 'MED', 'approved', '{"pac": 50, "sho": 50, "pas": 50, "dri": 50, "def": 50, "phy": 50}')
         returning id`,
        [groupId, pAuth.id, pAuth.displayName]
      );
      players.push({ id: rows[0]!.id, userId: pAuth.id, email: pAuth.email, pass: pAuth.password });
    }

    // Create drawn event
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (group_id, created_by_user_id, field_name, modality, scheduled_at, status, team_a_name, team_b_name)
       values ($1, $2, 'El Clásico', 'F5', now() - interval '2 days', 'drawn', 'Los Perros', 'Los Gatos')
       returning id`,
      [groupId, adminUserId]
    );
    eventId = eventRows[0]!.id;

    // Add participations
    for (let i = 0; i < players.length; i++) {
      await db.query(
        `insert into public.match_participations (event_id, player_id, team, assigned_position)
         values ($1, $2, $3, 'MED')`,
        [eventId, players[i]!.id, i < 5 ? 'A' : 'B']
      );
    }
  });

  afterAll(async () => {
    await db.end();
  });

  test('load_match_result decoupling - should process result without MVP', async () => {
    const supabase = await signInAsAuthUser(adminEmail, adminPass);
    
    const { error } = await supabase.rpc('load_match_result', {
      p_event_id: eventId,
      p_team_a_score: 3,
      p_team_b_score: 0,
      p_mvp_player_id: null,
      p_notes: 'Tremendo partido'
    });
    
    expect(error).toBeNull();

    // Check event status
    const { rows: events } = await db.query(`select status, mvp_player_id from public.events where id = $1`, [eventId]);
    expect(events[0]!.status).toBe('played');
    expect(events[0]!.mvp_player_id).toBeNull(); // MVP not set yet!

    // Check victory boost applied to Player A1 (players[0])
    const { rows: pA1 } = await db.query(`select current_boost from public.players where id = $1`, [players[0]!.id]);
    expect(pA1[0]!.current_boost?.reason).toBe('victory');
  });

  test('submit_mvp_vote - should allow 24h voting window', async () => {
    // Player 1, 2, 3 vote for Player 1
    // Player 4, 5 vote for Player 2
    const votes = [
      { voter: players[0], voted: players[0] }, // Self-vote should fail usually! wait, we fixed that earlier? The check constraint cant_vote_self blocks it.
      { voter: players[1], voted: players[0] },
      { voter: players[2], voted: players[0] },
      { voter: players[3], voted: players[0] },
      { voter: players[4], voted: players[1] },
      { voter: players[5], voted: players[1] }
    ];

    for (let i = 1; i < votes.length; i++) {
      const v = votes[i]!;
      const supabase = await signInAsAuthUser(v.voter!.email, v.voter!.pass);
      const { error } = await supabase.rpc('submit_mvp_vote', {
        p_event_id: eventId,
        p_voted_player_id: v.voted!.id
      });
      expect(error).toBeNull();
    }

    // Try to vote self
    const p1Supabase = await signInAsAuthUser(players[0]!.email, players[0]!.pass);
    const { error: selfVoteErr } = await p1Supabase.rpc('submit_mvp_vote', {
      p_event_id: eventId,
      p_voted_player_id: players[0]!.id
    });
    expect(selfVoteErr).not.toBeNull();
  });

  test('submit_mvp_vote - should fail after 24 hours', async () => {
    // Move played_at to 25 hours ago
    await db.query(`update public.events set played_at = now() - interval '25 hours' where id = $1`, [eventId]);

    const p6Supabase = await signInAsAuthUser(players[6]!.email, players[6]!.pass);
    const { error } = await p6Supabase.rpc('submit_mvp_vote', {
      p_event_id: eventId,
      p_voted_player_id: players[0]!.id
    });
    
    expect(error).not.toBeNull();
    expect(error?.message).toContain('El tiempo para votar (24 horas) ya expiró.');

    // Restore played_at
    await db.query(`update public.events set played_at = now() where id = $1`, [eventId]);
  });

  test('close_mvp_voting - should assign MVP and boost successfully', async () => {
    const supabase = await signInAsAuthUser(adminEmail, adminPass);

    const { error } = await supabase.rpc('close_mvp_voting', {
      p_event_id: eventId,
      p_tiebreaker_player_id: null
    });
    
    expect(error).toBeNull();

    // Check event MVP assigned
    const { rows: events } = await db.query(`select mvp_player_id from public.events where id = $1`, [eventId]);
    expect(events[0]!.mvp_player_id).toBe(players[0]!.id);

    // Check MVP boost
    const { rows: pA1 } = await db.query(`select current_boost from public.players where id = $1`, [players[0]!.id]);
    expect(pA1[0]!.current_boost?.reason).toBe('victory_mvp');
  });
});
