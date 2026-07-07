# Desarrollo local

Este proyecto usa Supabase CLI para levantar la base local sobre Docker. No hay `docker-compose.yml` propio porque la CLI ya orquesta los contenedores necesarios.

## Requisitos

- Docker Desktop corriendo.
- Node.js compatible con Next.js 16.
- Dependencias instaladas con `npm install`.
- Supabase CLI disponible vía `npm run supabase -- --version`.

## Arranque

```bash
npm run supabase:start
npm run supabase:status
```

Copiá `.env.example` a `.env.local` y pegá las keys locales que imprime `supabase status`.

La URL local esperada es:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421
```

Después validá el entorno:

```bash
npm run local:check
```

Y levantá Next:

```bash
npm run dev
```

## Reset de base local

```bash
npm run supabase:reset
```

Esto aplica migrations, ejecuta `supabase/seed.sql` y reinicia el gateway local de Supabase. El reinicio evita que Kong quede apuntando a una IP vieja de Auth después del reset y devuelva `502` en `/auth/v1/*`.

## Push notifications locales

El flujo actual necesita estas variables:

```text
CRON_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` lo usa el browser para suscribirse. `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` los usa el backend para enviar web-push.

Para disparar el job local de maintenance:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/jobs/maintenance
```

## Verificaciones útiles

```bash
npm run local:check
npm run typecheck
npm test
```

No corras `npm run build` en este flujo: el proyecto lo evita para cambios de setup local.
