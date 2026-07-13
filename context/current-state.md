# Current State

> Vista rápida del estado. Para detalle, leer `handoff.md`.

**Última actualización:** 2026-07-13.
**Versión activa:** V2 completa + Teams module (feat-017).
**Rama activa:** `master` (única rama; default branch en GitHub).
**Deploy:** Vercel (Hobby plan) — en producción.

## Features completos

Los 16 features del roadmap V2 + teams module están implementados y en producción:

- ✅ `feat-001` — Onboarding
- ✅ `feat-002` — Create Group
- ✅ `feat-003` — Join Group
- ✅ `feat-004` — Admin Dashboard
- ✅ `feat-005` — Create Event
- ✅ `feat-006` — Confirm Attendance
- ✅ `feat-007` — Check-in & Draw
- ✅ `feat-008` — Load Result + MVP
- ✅ `feat-009` — Boost System
- ✅ `feat-010` — Share Card
- ✅ `feat-011` — Manage Owners
- ✅ `feat-012` — Notifications
- ✅ `feat-013` — Phantom Player
- ✅ `feat-014` — Export Data
- ✅ `feat-015` — Player Stats
- ✅ `feat-016` — Victory Streak / Share Event
- ✅ `feat-017` — Teams module (Equipos)

## Teams module (feat-017) — estado

### Implementado y desplegado
- DB foundation + migraciones SQL ✅
- RLS policies + RPCs ✅
- Servicios (`teams.service.ts`) + validaciones Zod ✅
- Hub de navegación Equipos/Grupos (`AppSectionSelector`) ✅
- Páginas: `/teams`, `/teams/new`, `/teams/[teamId]` (detail con tabs) ✅
- Invitación por código: `/invite/teams/[code]` + `validate_team_invite` RPC ✅
- Componentes: `TeamsHub`, `TeamDetailTabs`, `TeamRosterPanel`, `TeamMatchesPanel`, `TeamStatsPanel`, `TeamModerationPanel`, `TeamCardPanel`, `TeamCardArtwork`, `CreateTeamForm` ✅
- Tests unitarios: `teams.service.test.ts`, `team-panels.test.tsx`, `teams-navigation.test.tsx`, `app-section-selector.test.tsx` ✅
- Archive SDD complete en `openspec/changes/archive/2026-07-13-equipos-grupos/`

### No verificado post-últimos commits
- `tsc --noEmit` no corrido después de commits `7794094` y `0839667`
- `vitest run --dir src` no corrido después de esos commits
- Tests de integración para teams RPCs (dependen de Supabase local)
- Playwright smoke tests
- Fase 4 del task plan (verificación) no está tiqueada en `openspec/changes/equipos-grupos/tasks.md`

## Últimos commits en master

```
0839667 feat: complete teams frontend - create, invite and join flows
7794094 fix: polish navigation, attendance list and event button colors
```

Ambos pusheados a `origin/master` y deployados en Vercel.

## Stack actual (verificado contra package.json)

- **Runtime:** Next.js 16 + React 19
- **Language:** TypeScript 6 strict (`noUncheckedIndexedAccess`)
- **Styling:** Tailwind CSS v4 + Nocturnal Pitch design system
- **Backend:** Supabase (Postgres, RLS, RPCs, Realtime, Storage)
- **State:** TanStack React Query v5 + Zustand v5
- **Validation:** Zod v3
- **PWA:** Serwist v9 (+ next-pwa vestigial en package.json)
- **Auth:** Supabase SSR (Google OAuth)
- **Testing:** Vitest v4 + Testing Library + MSW v2 + Playwright
- **Push:** web-push (VAPID)
- **Deploy:** Vercel (Hobby plan, daily crons)

## Comandos de test

```json
{
  "test": "vitest run --dir src",
  "test:unit": "vitest run --dir src",
  "test:integration": "npm run supabase:reset && npm run local:check && vitest run --dir tests/integration --fileParallelism=false",
  "test:e2e": "playwright test",
  "typecheck": "tsc --noEmit"
}
```

## Contradicciones documentales encontradas (ya corregidas en esta actualización)

- `current-state.md` decía "15 de 15 features" → ahora 17 (16 V2 + teams)
- `current-state.md` decía "Next 14" → ahora Next.js 16
- `handoff.md` decía "configurar env vars y hacer deploy" → deploy ya está hecho
- `handoff.md` decía "Next.js 14" → ahora Next.js 16
- `AGENTS.md` decía "58 migration files" → ahora 72
- `CHANGELOG.md` quedó en 2026-05-07 (no incluye feat-016, feat-017, ni polish fixes)
- `openspec/changes/equipos-grupos/` (activo) sobrevive al archive — se puede limpiar

## Bloqueos

- Ninguno conocido. El proyecto está en producción funcionando.

## Pendientes (no verificados)

- Correr `tsc --noEmit` y `vitest run --dir src` post-últimos commits
- Verificar que el archive SDD de equipos-grupos refleje el estado post-polish
- Limpiar `openspec/changes/equipos-grupos/` activo (ya archivado en `archive/`)
- Actualizar `CHANGELOG.md`
