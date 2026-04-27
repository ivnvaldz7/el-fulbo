import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

export const connectionString =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export async function createDbClient() {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

export async function seedUser(client: Client, label: string) {
  const id = randomUUID();
  const email = `${label}-${id.slice(0, 8)}@example.com`;
  const displayName = `Jugador ${label}`;

  await client.query(
    `
      insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      values ($1, 'authenticated', 'authenticated', $2, now(), '{}'::jsonb, now(), now())
    `,
    [id, email],
  );
  await client.query(
    `
      insert into public.users (id, email, display_name)
      values ($1, $2, $3)
    `,
    [id, email, displayName],
  );

  return { id, email, displayName };
}

export async function seedGroup(client: Client, adminUserId: string, inviteCode?: string) {
  const code = inviteCode ?? `FULBO-${randomUUID().slice(0, 6).replace(/-/g, '').toUpperCase()}`;
  const { rows } = await client.query<{ id: string }>(
    `
      insert into public.groups (name, default_modality, admin_user_id, invite_code)
      values ($1, 'F5', $2, $3)
      returning id
    `,
    [`Grupo ${code}`, adminUserId, code],
  );

  await client.query(
    `
      insert into public.group_memberships (user_id, group_id, role)
      values ($1, $2, 'admin')
    `,
    [adminUserId, rows[0]!.id],
  );

  return { id: rows[0]!.id, inviteCode: code };
}

export async function asUser<T>(client: Client, userId: string, fn: () => Promise<T>) {
  await client.query('begin');
  try {
    await client.query('set local role authenticated');
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    const result = await fn();
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
