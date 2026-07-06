import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedUser } from './db';

describe('push confirmation outbox', () => {
  let client: Client | undefined;
  let dbReady = false;

  beforeAll(async () => {
    try {
      client = await createDbClient();
      dbReady = true;
    } catch {
      dbReady = false;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  it('deduplicates notifications with the same dedupe key', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-outbox-dedupe');

    const payload = JSON.stringify({ event_id: 'event-1', group_id: 'group-1' });
    const key = `event_created:event-1:${user.id}`;

    const first = await dbClient.query(
      `select public.create_notification_once($1::uuid, $2::public.notification_type, $3::jsonb, $4::text) as id`,
      [user.id, 'event_created', payload, key],
    );
    const second = await dbClient.query(
      `select public.create_notification_once($1::uuid, $2::public.notification_type, $3::jsonb, $4::text) as id`,
      [user.id, 'event_created', payload, key],
    );

    expect(first.rows[0]?.id).toBeTruthy();
    expect(second.rows[0]?.id ?? null).toBeNull();

    const count = await dbClient.query(
      `select count(*)::int as count from public.notifications where user_id = $1 and dedupe_key = $2`,
      [user.id, key],
    );

    expect(count.rows[0]?.count).toBe(1);
  });

  it('allows notifications with different dedupe keys', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-outbox-distinct');

    const payload = JSON.stringify({ event_id: 'event-2', group_id: 'group-2' });

    const first = await dbClient.query(
      `select public.create_notification_once($1::uuid, $2::public.notification_type, $3::jsonb, $4::text) as id`,
      [user.id, 'event_created', payload, `event_created:event-2:${user.id}`],
    );
    const second = await dbClient.query(
      `select public.create_notification_once($1::uuid, $2::public.notification_type, $3::jsonb, $4::text) as id`,
      [user.id, 'event_created', payload, `event_created:event-2:${user.id}:retry`],
    );

    expect(first.rows[0]?.id).toBeTruthy();
    expect(second.rows[0]?.id).toBeTruthy();

    const count = await dbClient.query(
      `select count(*)::int as count from public.notifications where user_id = $1 and dedupe_key like $2`,
      [user.id, 'event_created:event-2:%'],
    );

    expect(count.rows[0]?.count).toBe(2);
  });

  it('enables push preferences when saving a push subscription', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-outbox-prefs');

    await asUser(dbClient, user.id, async () => {
      await dbClient.query(
        `select public.upsert_push_subscription($1::text, $2::text, $3::text, $4::text)`,
        ['https://push.example/sub/1', 'p256dh-value', 'auth-value', null],
      );
    });

    const prefs = await dbClient.query(
      `select push_enabled from public.user_notification_preferences where user_id = $1`,
      [user.id],
    );

    expect(prefs.rows[0]?.push_enabled).toBe(true);
  });

  it('denies authenticated clients from creating notifications for another user', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;

    const privilege = await dbClient.query(
      `
        select has_function_privilege(
          'authenticated',
          'public.create_notification_once(uuid, public.notification_type, jsonb, text)',
          'EXECUTE'
        ) as can_execute
      `,
    );

    expect(privilege.rows[0]?.can_execute).toBe(false);
  });

  it('does not claim/no attempt when no eligible rows are returned', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-dispatch-no-claim');
    const notificationId = await insertDispatchCandidate(dbClient, user.id, {
      pushEnabled: false,
      withSubscription: true,
      scheduledAt: futureIso(),
    });

    await dbClient.query(
      `select * from public.claim_event_created_push_notifications($1::integer, $2::integer)`,
      [10, 3],
    );

    const notification = await getNotificationAttempt(dbClient, notificationId);

    expect(notification.push_attempt_count).toBe(0);
    expect(notification.push_attempted_at).toBeNull();
  });

  it('claims only event_created notifications', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-dispatch-type');

    const notificationId = await insertDispatchCandidate(dbClient, user.id, {
      type: 'event_cancelled',
      pushEnabled: true,
      withSubscription: true,
      scheduledAt: futureIso(),
    });

    const claimed = await dbClient.query(
      `select * from public.claim_event_created_push_notifications($1::integer, $2::integer)`,
      [10, 3],
    );

    expect(claimed.rows.some((row) => row.notification_id === notificationId)).toBe(false);
    expect((await getNotificationAttempt(dbClient, notificationId)).push_attempt_count).toBe(0);
  });

  it('does not claim when push preferences are disabled', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-dispatch-prefs-off');

    const notificationId = await insertDispatchCandidate(dbClient, user.id, {
      pushEnabled: false,
      withSubscription: true,
      scheduledAt: futureIso(),
    });

    const claimed = await dbClient.query(
      `select * from public.claim_event_created_push_notifications($1::integer, $2::integer)`,
      [10, 3],
    );

    expect(claimed.rows.some((row) => row.notification_id === notificationId)).toBe(false);
    expect((await getNotificationAttempt(dbClient, notificationId)).push_attempt_count).toBe(0);
  });

  it('does not claim users without push subscriptions', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-dispatch-no-sub');

    const notificationId = await insertDispatchCandidate(dbClient, user.id, {
      pushEnabled: true,
      withSubscription: false,
      scheduledAt: futureIso(),
    });

    const claimed = await dbClient.query(
      `select * from public.claim_event_created_push_notifications($1::integer, $2::integer)`,
      [10, 3],
    );

    expect(claimed.rows.some((row) => row.notification_id === notificationId)).toBe(false);
    expect((await getNotificationAttempt(dbClient, notificationId)).push_attempt_count).toBe(0);
  });

  it('increments attempt metadata when a notification is claimed for dispatch', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-dispatch-attempt');
    const notificationId = await insertDispatchCandidate(dbClient, user.id, {
      pushEnabled: true,
      withSubscription: true,
      scheduledAt: futureIso(),
    });

    const claimed = await dbClient.query(
      `select * from public.claim_event_created_push_notifications($1::integer, $2::integer)`,
      [10, 3],
    );

    expect(claimed.rows.some((row) => row.notification_id === notificationId)).toBe(true);

    const notification = await dbClient.query(
      `select push_attempt_count, push_attempted_at from public.notifications where id = $1`,
      [notificationId],
    );

    expect(notification.rows[0]?.push_attempt_count).toBe(1);
    expect(notification.rows[0]?.push_attempted_at).toBeTruthy();
  });

  it('respects max attempts', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-dispatch-max-attempts');

    const notificationId = await insertDispatchCandidate(dbClient, user.id, {
      pushEnabled: true,
      withSubscription: true,
      scheduledAt: futureIso(),
      pushAttemptCount: 3,
    });

    const claimed = await dbClient.query(
      `select * from public.claim_event_created_push_notifications($1::integer, $2::integer)`,
      [10, 3],
    );

    expect(claimed.rows.some((row) => row.notification_id === notificationId)).toBe(false);
    expect((await getNotificationAttempt(dbClient, notificationId)).push_attempt_count).toBe(3);
  });

  it('does not claim event_created notifications when scheduled_at already passed', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-dispatch-past-event');

    const notificationId = await insertDispatchCandidate(dbClient, user.id, {
      pushEnabled: true,
      withSubscription: true,
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    const claimed = await dbClient.query(
      `select * from public.claim_event_created_push_notifications($1::integer, $2::integer)`,
      [10, 3],
    );

    expect(claimed.rows.some((row) => row.notification_id === notificationId)).toBe(false);
    expect((await getNotificationAttempt(dbClient, notificationId)).push_attempt_count).toBe(0);
  });
});

function futureIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

async function insertDispatchCandidate(
  client: Client,
  userId: string,
  options: {
    type?: string;
    pushEnabled: boolean;
    withSubscription: boolean;
    scheduledAt: string;
    pushAttemptCount?: number;
  },
) {
  if (options.withSubscription) {
    await client.query(
      `
        insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
        values ($1, $2, 'p256dh-value', 'auth-value', null)
      `,
      [userId, `https://push.example/${userId}/${Date.now()}`],
    );
  }

  await client.query(
    `
      insert into public.user_notification_preferences (user_id, push_enabled)
      values ($1, $2)
      on conflict (user_id) do update set push_enabled = excluded.push_enabled
    `,
    [userId, options.pushEnabled],
  );

  const inserted = await client.query(
    `
      insert into public.notifications (user_id, type, payload, push_attempt_count)
      values ($1, $2::public.notification_type, $3::jsonb, $4)
      returning id
    `,
    [
      userId,
      options.type ?? 'event_created',
      JSON.stringify({
        event_id: `event-${Date.now()}`,
        group_id: `group-${Date.now()}`,
        scheduled_at: options.scheduledAt,
      }),
      options.pushAttemptCount ?? 0,
    ],
  );

  return inserted.rows[0]!.id as string;
}

async function getNotificationAttempt(client: Client, notificationId: string) {
  const notification = await client.query(
    `
      select push_attempt_count, push_attempted_at
      from public.notifications
      where id = $1
    `,
    [notificationId],
  );

  return notification.rows[0] as {
    push_attempt_count: number;
    push_attempted_at: Date | null;
  };
}
