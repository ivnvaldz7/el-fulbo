# Current State

> Vista rápida del estado. Para detalle, leer `handoff.md`.

**Sesión abierta:** implementación Codex del 2026-04-26/27.  
**Versión activa:** V2.  
**Specs V2 escritos:** 15 de 15.  
**Bootstrap del código:** completado.  
**Implementer actual:** Codex, trabajando en `C:\Users\Usuario\Desktop\el-fulbo`.

## Bootstrap completado

- Next.js 14 App Router + React 18.
- TypeScript strict con `noUncheckedIndexedAccess`.
- Tailwind CSS.
- ESLint + Prettier.
- TanStack Query provider.
- Clientes Supabase base en `src/lib/supabase/`.
- PWA con `next-pwa`.
- Vitest + Testing Library + Playwright config.
- Supabase local inicializado.
- Migration inicial V2 creada en `supabase/migrations/`.
- `specs/04-contracts/types.ts` copiado a `src/lib/types.ts`.

## Specs disponibles

Los 15 specs funcionales están escritos:

- `feat-001-onboarding-user.md`
- `feat-002-create-group.md`
- `feat-003-join-group.md`
- `feat-004-admin-dashboard.md`
- `feat-005-create-event.md`
- `feat-006-confirm-attendance.md`
- `feat-007-check-in-and-draw.md`
- `feat-008-load-result-and-mvp.md`
- `feat-009-boost-system.md`
- `feat-010-share-card.md`
- `feat-011-manage-owners.md`
- `feat-012-notifications.md`
- `feat-013-phantom-player.md`
- `feat-014-export-data.md`
- `feat-015-player-stats.md`

## Implementación aceptada

### feat-001 — Onboarding User

**Estado:** ACCEPTED.

Implementado:

- Landing inicial.
- Login Google OAuth vía Supabase.
- Callback con upsert en `public.users`.
- `/join` con validación de invite code.
- `/invite/[code]` con preview y aceptación.
- RPC `accept_invite_for_user`.
- Player inicial creado con:
  - `primary_position = 'MED'`
  - `secondary_position = null`
  - stats de campo en 5
  - `stats_status = 'pending_approval'`
- Wizard de stats en 2 pasos.
- Draft versionado en `localStorage`:
  - `onboarding-draft-v1-${groupId}`
- Submit de onboarding vía server/API + service.
- Validación Zod con tope 8 para onboarding.
- Notification in-app `stats_pending_approval` best-effort.
- Pantalla pending.
- Dashboard filtra roster aprobado.
- Fix aplicado:
  - ARQ como primera posición inicializa stats de arquero.
  - redirect inválido `/invite` corregido a `/join`.

Tests:

- `npm run lint` pasa.
- `npm run typecheck` pasa.
- `npm run test` pasa: 22/22.
- `npm run build` pasa.

Commit base de feat-001:

- `30e47b7 feat: implement onboarding invite flow`

Pendiente:

- commitear fixes post-auditoría:
  - `fix(feat-001): handle ARQ as first position + fix invalid redirect`

## Verificaciones actuales

- `npm run lint` pasa.
- `npm run typecheck` pasa.
- `npm run test` pasa.
- `npm run build` pasa.

## Supabase local

- `npx supabase start` corre correctamente.
- `npx supabase db reset` aplicó migraciones.
- Hubo timeout de healthcheck de Storage en CLI, pero `supabase status` quedó OK y los tests DB/RLS pasaron.
- DB local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- Studio local: `http://127.0.0.1:54323`.
- `.env.local` creado con keys locales y queda ignorado por Git.

## Riesgos / pendientes

- `npm audit --omit=dev` reporta vulnerabilidades conocidas en Next 14 y `next-pwa`/Workbox. No se actualizó a Next 16 porque el stack cerrado define Next 14.
- Configurar Google OAuth provider en Supabase para login real fuera del entorno local/test.
- RLS real y RPCs complejas deben auditarse feature por feature.
- Crear `docs/runtime/feat-001-runtime-context.md` para dejar histórico operativo.
- Preparar runtime context de `feat-002` antes de implementar.

## Próximo

1. Commit de fixes de feat-001.
2. Crear runtime context histórico de feat-001.
3. Preparar `feat-002-create-group` antes de ejecución.
