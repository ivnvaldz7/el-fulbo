import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const connectionString =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55432/postgres';
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55421';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name} for integration test.`);
  }

  return value;
}

export async function createDbClient() {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

export function createSupabaseAnonClient() {
  return createClient(supabaseUrl, requireEnv(supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createSupabaseServiceRoleClient() {
  return createClient(
    supabaseUrl,
    requireEnv(supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export async function seedUser(client: Client, label: string) {
  const id = randomUUID();
  const email = `${label}-${id.slice(0, 8)}@example.com`;
  const displayName = `Jugador ${label}`;

  await client.query('BEGIN');
  try {
    await client.query(
      `
        insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
        values ($1, 'authenticated', 'authenticated', $2, '{}'::jsonb, now(), now())
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
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  return { id, email, displayName };
}

export async function seedAuthUser(client: Client, label: string) {
  const suffix = randomUUID().slice(0, 8);
  const email = `${label}-${suffix}@example.com`;
  const password = 'Codex123!';
  const displayName = `Jugador ${label}`;
  const admin = createSupabaseServiceRoleClient();

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (created.error || !created.data.user) {
    throw created.error ?? new Error('No se pudo crear el usuario auth para el test.');
  }

  await client.query(
    `
      insert into public.users (id, email, display_name)
      values ($1, $2, $3)
      on conflict (id) do nothing
    `,
    [created.data.user.id, email, displayName],
  );

  return {
    id: created.data.user.id,
    email,
    password,
    displayName,
  };
}

export async function signInAsAuthUser(email: string, password: string): Promise<SupabaseClient> {
  const supabase = createSupabaseAnonClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return supabase;
}

export async function seedGroup(client: Client, adminUserId: string, inviteCode?: string) {
  const code = inviteCode ?? `FULBO-${randomUUID().slice(0, 6).replace(/-/g, '').toUpperCase()}`;
  
  await client.query('BEGIN');
  let groupId: string;
  try {
    const { rows } = await client.query<{ id: string }>(
      `
        insert into public.groups (name, default_modality, admin_user_id, invite_code)
        values ($1, 'F5', $2, $3)
        returning id
      `,
      [`Grupo ${code}`, adminUserId, code],
    );
    groupId = rows[0]!.id;

    await client.query(
      `
        insert into public.group_memberships (user_id, group_id, role)
        values ($1, $2, 'admin')
      `,
      [adminUserId, groupId],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  return { id: groupId, inviteCode: code };
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
