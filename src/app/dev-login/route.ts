import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

function devOnly(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function formPage(error?: string): Response {
  return new Response(
    `<!doctype html>
<html>
<body style="font-family:system-ui;max-width:340px;margin:80px auto;background:#0b0f14;color:#e8eef6">
<h2 style="color:#7ee787">Dev login (local only)</h2>
<form method="post" style="display:grid;gap:8px">
  <input name="email" type="email" placeholder="email" required style="padding:8px" value="uat@el-fulbo.app" />
  <input name="password" type="text" placeholder="password" required style="padding:8px" value="uat-local-password" />
  <button type="submit" style="padding:8px;cursor:pointer">Entrar (crea el usuario si no existe)</button>
</form>
${error ? `<p style="color:#ff7b72">${error}</p>` : ''}
</body>
</html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

async function ensureAppUser(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  admin: ReturnType<typeof createServiceSupabaseClient>,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let authUser = (await supabase.auth.signInWithPassword({ email, password })).data.user;

  if (!authUser) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return { ok: false, error: `No se pudo crear el usuario: ${createError.message}` };
    }

    const { data: signed, error: retryError } = await supabase.auth.signInWithPassword({ email, password });

    if (retryError) {
      return { ok: false, error: `No se pudo iniciar sesion: ${retryError.message}` };
    }

    authUser = signed.user ?? created.user;
  }

  if (!authUser) {
    return { ok: false, error: 'No se obtuvo el usuario de auth' };
  }

  const { error: userError } = await supabase.from('users').upsert(
    {
      id: authUser.id,
      email,
      display_name: email.split('@')[0] ?? 'dev-user',
      last_login_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (userError) {
    return { ok: false, error: `No se pudo sincronizar el usuario: ${userError.message}` };
  }

  return { ok: true };
}

export async function GET() {
  if (!devOnly()) {
    return new Response('Not found', { status: 404 });
  }
  return formPage();
}

export async function POST(request: Request) {
  if (!devOnly()) {
    return new Response('Not found', { status: 404 });
  }

  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');

  if (!email || !password) {
    return formPage('Email y password son obligatorios');
  }

  const supabase = await createServerSupabaseClient();
  const admin = createServiceSupabaseClient();
  const result = await ensureAppUser(supabase, admin, email, password);

  if (!result.ok) {
    return formPage(result.error);
  }

  return new Response(null, { status: 303, headers: { location: '/' } });
}