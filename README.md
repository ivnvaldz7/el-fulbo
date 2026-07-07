# El Fulbo

PWA para organizar fulbito amateur: grupo, evento, confirmación, sorteo, resultado, MVP, estadísticas, notificaciones y cards compartibles.

## Estado

V2 completa y en producción. El estado operativo vivo está en `docs/CURRENT_STATE.md`.

## Stack

- Next.js 16 App Router + React 19
- TypeScript strict
- Tailwind CSS v4
- Supabase Postgres/Auth/RLS/RPC/Realtime/Storage
- TanStack React Query + Zustand
- Serwist PWA + Web Push
- Vitest, Testing Library, MSW y Playwright
- Vercel

## Desarrollo local

El entorno local de Supabase corre con Docker a través de Supabase CLI.

```bash
npm install
npm run supabase:start
npm run supabase:status
```

Copiá `.env.example` a `.env.local` y pegá las keys locales de `supabase status`.

Validá el entorno:

```bash
npm run local:check
```

Levantá la app:

```bash
npm run dev
```

Guía completa: `docs/LOCAL_DEVELOPMENT.md`.

## Scripts principales

```bash
npm run dev
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run supabase:start
npm run supabase:reset
npm run supabase:status
npm run supabase:stop
```

## Reglas de implementación

- Specs primero para features nuevas.
- Business logic en `src/lib/services/`.
- Inputs validados con Zod.
- Tests co-localizados para unidad.
- Migrations versionadas en `supabase/migrations`.
- Conventional commits.
- Sin atribución AI en commits.
