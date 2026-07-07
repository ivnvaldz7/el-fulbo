import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { createDbClient, seedUser, seedGroup, asUser } from './db';
import { Database } from '@/lib/types';

describe('Event Cancellation Flow', () => {
  let pgClient: Client;
  let supabase: SupabaseClient<Database>;
  let adminUser: { id: string; email: string; displayName: string };
  let group: { id: string; inviteCode: string };
  let eventId: string;
  let regularUser1: { id: string; email: string; displayName: string };
  let regularUser2: { id: string; email: string; displayName: string };
  let unconfirmedUser: { id: string; email: string; displayName: string };

  beforeAll(async () => {
    pgClient = await createDbClient();
    // Clear previous data
    await pgClient.query('truncate table public.users cascade');
    await pgClient.query('truncate table public.groups cascade');
    await pgClient.query('truncate table public.events cascade');
    await pgClient.query('truncate table public.notifications cascade');
    await pgClient.query('truncate table public.players cascade');

    await pgClient.query('truncate table public.players cascade');

    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    adminUser = await seedUser(pgClient, 'admin');
    group = await seedGroup(pgClient, adminUser.id);

    // Seed regular users and add them to the group
    regularUser1 = await seedUser(pgClient, 'regular1');
    regularUser2 = await seedUser(pgClient, 'regular2');
    unconfirmedUser = await seedUser(pgClient, 'unconfirmed');

    await pgClient.query(
      `INSERT INTO public.players (user_id, group_id, display_name, primary_position, stats_status, stats, is_phantom, is_expelled) VALUES ($1, $2, $3, 'MED', 'approved', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, FALSE, FALSE)`,
      [regularUser1.id, group.id, regularUser1.displayName],
    );

    await pgClient.query(
      `INSERT INTO public.players (user_id, group_id, display_name, primary_position, stats_status, stats, is_phantom, is_expelled) VALUES ($1, $2, $3, 'MED', 'approved', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, FALSE, FALSE)`,
      [regularUser2.id, group.id, regularUser2.displayName],
    );

    // User that is a member but not 'approved' in players table (should not receive notification)
    await pgClient.query(
      `INSERT INTO public.players (user_id, group_id, display_name, primary_position, stats_status, stats, is_phantom, is_expelled) VALUES ($1, $2, $3, 'MED', 'pending_approval', '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb, FALSE, FALSE)`,
      [unconfirmedUser.id, group.id, unconfirmedUser.displayName],
    );

    const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
    const event = await asUser(pgClient, adminUser.id, () =>
      pgClient.query(
        `select public.create_event($1::uuid, $2::public.modality, $3::text, $4::text, $5::timestamptz, $6::text) as event_id`,
        [group.id, 'F5', 'Test Event Location', null, scheduledAt, null],
      ),
    );
    eventId = event.rows[0].event_id;

    // Confirm attendance for regularUser1 and regularUser2 (implicitly by being 'approved' in players)
    // The RPC for cancel_event checks for `stats_status = 'approved'` and `user_id IS NOT NULL`
    // So, 'approved' players are considered confirmed for notification purposes in this context.

  });

  afterAll(async () => {
    await pgClient.end();
  });

  it('should cancel an event and notify all confirmed users with the motive', async () => {
    const cancellationMotive = 'Weather conditions are bad.';

    await asUser(pgClient, adminUser.id, () =>
      pgClient.query(`select public.cancel_event($1, $2)`, [eventId, cancellationMotive]),
    );

    // Verify event status and cancellation motive
    const { rows: eventRows } = await pgClient.query(
      `SELECT status, cancellation_motive FROM public.events WHERE id = $1`,
      [eventId],
    );
    expect(eventRows.length).toBe(1);
    expect(eventRows[0].status).toBe('cancelled');
    expect(eventRows[0].cancellation_motive).toBe(cancellationMotive);

    // Verify notifications for confirmed users
    const { rows: notifications } = await pgClient.query(
      `SELECT user_id, type, payload FROM public.notifications WHERE (payload->>'event_id')::uuid = $1 ORDER BY created_at ASC`,
      [eventId],
    );
    const cancellationNotifications = notifications.filter((notification) => notification.type === 'event_cancelled');

    expect(cancellationNotifications.length).toBe(2); // RegularUser1 and RegularUser2

    // Check notification for regularUser1
    const notif1 = cancellationNotifications.find(n => n.user_id === regularUser1.id);
    expect(notif1).toBeDefined();
    expect(notif1.type).toBe('event_cancelled');
    expect(notif1.payload.event_id).toBe(eventId);
    expect(notif1.payload.group_id).toBe(group.id);
    expect(notif1.payload.field_name).toBe('Test Event Location');
    expect(notif1.payload.scheduled_at).toBeDefined(); // Can't precisely match new Date().toISOString() due to potential milliseconds difference
    expect(notif1.payload.cancellation_motive).toBe(cancellationMotive);

    // Check notification for regularUser2
    const notif2 = cancellationNotifications.find(n => n.user_id === regularUser2.id);
    expect(notif2).toBeDefined();
    expect(notif2.type).toBe('event_cancelled');
    expect(notif2.payload.event_id).toBe(eventId);
    expect(notif2.payload.group_id).toBe(group.id);
    expect(notif2.payload.field_name).toBe('Test Event Location');
    expect(notif2.payload.scheduled_at).toBeDefined();
    expect(notif2.payload.cancellation_motive).toBe(cancellationMotive);

    // Verify unconfirmed user did NOT receive a notification
    const unconfirmedNotif = cancellationNotifications.find(n => n.user_id === unconfirmedUser.id);
    expect(unconfirmedNotif).toBeUndefined();
  });

  it('should cancel an event without a motive', async () => {
    // Create a new event for this specific test case
    const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString();
    const newEvent = await asUser(pgClient, adminUser.id, () =>
      pgClient.query(
        `select public.create_event($1::uuid, $2::public.modality, $3::text, $4::text, $5::timestamptz, $6::text) as event_id`,
        [group.id, 'F5', 'Another Test Event Location', null, scheduledAt, null],
      ),
    );
    const newEventId = newEvent.rows[0].event_id;

    await asUser(pgClient, adminUser.id, () =>
      pgClient.query(`select public.cancel_event($1, $2)`, [newEventId, null]),
    );

    // Verify event status and cancellation motive is NULL
    const { rows: eventRows } = await pgClient.query(
      `SELECT status, cancellation_motive FROM public.events WHERE id = $1`,
      [newEventId],
    );
    expect(eventRows.length).toBe(1);
    expect(eventRows[0].status).toBe('cancelled');
    expect(eventRows[0].cancellation_motive).toBeNull();

    // Verify notifications for confirmed users, motive should be NULL in payload
    const { rows: notifications } = await pgClient.query(
      `SELECT user_id, type, payload FROM public.notifications WHERE (payload->>'event_id')::uuid = $1 ORDER BY created_at ASC`,
      [newEventId],
    );
    const cancellationNotifications = notifications.filter((notification) => notification.type === 'event_cancelled');
    expect(cancellationNotifications.length).toBe(2);

    const notif = cancellationNotifications.find(n => n.user_id === regularUser1.id);
    expect(notif).toBeDefined();
    expect(notif.type).toBe('event_cancelled');
    expect(notif.payload.field_name).toBe('Another Test Event Location');
    expect(notif.payload.cancellation_motive).toBeNull();
  });
});
