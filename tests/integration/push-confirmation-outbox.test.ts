import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedUser, seedAuthUser, signInAsAuthUser } from './db';

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

    await asUser(dbClient, user.id, async () => {
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
  });

  it('allows notifications with different dedupe keys', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const user = await seedUser(dbClient, 'push-outbox-distinct');

    await asUser(dbClient, user.id, async () => {
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

      const prefs = await dbClient.query(
        `select push_enabled from public.user_notification_preferences where user_id = $1`,
        [user.id],
      );

      expect(prefs.rows[0]?.push_enabled).toBe(true);
    });
  });

  it('denies authenticated clients from creating notifications for another user', async () => {
    if (!dbReady || !client) return;
    const dbClient = client;
    const authUser = await seedAuthUser(dbClient, 'push-outbox-auth');
    const targetUser = await seedUser(dbClient, 'push-outbox-target');
    const supabase = await signInAsAuthUser(authUser.email, authUser.password);

    const { error } = await supabase.rpc('create_notification_once', {
      p_user_id: targetUser.id,
      p_type: 'event_created',
      p_payload: { event_id: 'event-1', group_id: 'group-1' },
      p_dedupe_key: `event_created:event-1:${targetUser.id}`,
    });

    expect(error).toBeTruthy();
  });
});
