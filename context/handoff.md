# Handoff — 2026-07-13 (REESCRITO: estado real post-teams + deploy)

> **Archivo crítico.** Lo primero que cualquier agente lee al arrancar sesión.
> Este documento fue reescrito porque el anterior (2026-05-07) estaba completamente desactualizado.

---

## Estado del proyecto

**Fase:** V2 completa + Teams module (feat-017) implementado y en producción.
**Rama activa:** `master` (única rama; default branch en GitHub).
**Deploy:** Vercel (Hobby plan) — funcionando en producción.
**Versión activa:** V2 + Teams extension.

**V1 archivado** en `/specs/_archive/v1/`. No tocar.

---

## Stack actual (verificado contra package.json)

| Capa | Versión |
|------|---------|
| Runtime | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 6 strict (`noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4 + Nocturnal Pitch design system |
| Backend | Supabase (Postgres, RLS, RPCs, Realtime, Storage) |
| State | TanStack React Query v5 + Zustand v5 |
| Validation | Zod v3 |
| PWA | Serwist v9 (+ next-pwa vestigial en package.json) |
| Auth | Supabase SSR (Google OAuth) |
| Testing | Vitest v4 + Testing Library + MSW v2 + Playwright |
| Push | web-push (VAPID) |
| Deploy | Vercel (Hobby plan, daily crons) |

---

## Features completos (17)

Todos implementados y en producción:

1. `feat-001` — Onboarding + self-assessment
2. `feat-002` — Create Group
3. `feat-003` — Join Group (reintegros, reactivación, cooldown)
4. `feat-004` — Admin Dashboard (resolución unificada de pendientes)
5. `feat-005` — Create Event
6. `feat-006` — Confirm Attendance
7. `feat-007` — Check-in & Draw (sorteo + animación)
8. `feat-008` — Load Result + MVP (transaccional, boosts)
9. `feat-009` — Boost System (badges +N, chip duración)
10. `feat-010` — Share Card (PNG + Web Share API)
11. `feat-011` — Manage Owners (fijos + temporales automáticos)
12. `feat-012` — Notifications (push + in-app + digest diario/semanal)
13. `feat-013` — Phantom Player (check-in, magic link, auto-archive)
14. `feat-014` — Export Data (ZIP, JSON + CSV)
15. `feat-015` — Player Stats (perfil, tabs, stats aggregate)
16. `feat-016` — Victory Streak / Share Event
17. `feat-017` — Teams module (Equipos)

---

## Teams module (feat-017) — detalle

### Spec
- Archivo: `specs/03-features/feat-017-equipos-grupos.md`
- 14 requirements, 28 scenarios
- Incluye: selector hub, roster fijo, pertenencia múltiple, matches, signups, stat submissions (pending/approved/rejected), admin approval, team aggregation, global base card progression, temporary team MVP, shareable team card, data separation grupos/equipos

### Implementado
- **DB:** Migration `20260712000000_teams_module_foundation.sql` (final con review batches 1.R1-1.R6)
- **RLS:** Políticas por equipo, admin isolation, outsourced visibility
- **RPCs:** `create_team`, `create_team_invitation`, `accept_team_invite`, `validate_team_invite`, `add_team_member`, `remove_team_member`, `create_team_match`, `signup_team_match`, `submit_team_match_stat`, `review_team_stat_submission`, `process_team_player_progression`
- **Servicios:** `src/lib/services/teams.service.ts` + tests
- **Validaciones:** `src/lib/validations/teams.ts` (Zod schemas)
- **Tipos:** `src/lib/types/teams.types.ts`
- **Routes:** `src/lib/routes.ts` (teams, teamNew, teamDetail, teamInvite)
- **Pages:**
  - `/teams` — hub de equipos
  - `/teams/new` — crear equipo
  - `/teams/[teamId]` — detail con tabs: members/matches/stats/card/moderation
  - `/invite/teams/[code]` — aceptar invitación
- **Components:**
  - `AppSectionSelector` — hub selector Grupos/Equipos (home page)
  - `TeamsHub`, `TeamDetailTabs`, `TeamRosterPanel`, `TeamMatchesPanel`, `TeamStatsPanel`, `TeamModerationPanel`, `TeamCardPanel`, `TeamCardArtwork`, `CreateTeamForm`
- **Tests unitarios:** `teams.service.test.ts`, `team-panels.test.tsx`, `teams-navigation.test.tsx`, `app-section-selector.test.tsx`

### Archive SDD
- Archivado en `openspec/changes/archive/2026-07-13-equipos-grupos/`
- Archive report dice: 26/26 integration tests, 248/248 unit tests, 10/10 Playwright, 0 TS errors
- **Nota:** El archive fue antes de los commits `7794094` (polish) y `0839667` (frontend complete). Esos cambios no están verificados.

### No verificado (post-últimos commits)
- `tsc --noEmit` no corrido
- `vitest run --dir src` no corrido
- Tests de integración teams (requieren Supabase local)
- Playwright smoke tests
- Fase 4 del task plan (4.1, 4.2, 4.3) no tiqueada en `openspec/changes/equipos-grupos/tasks.md`

---

## Últimos commits en master

```
0839667 2026-07-13 feat: complete teams frontend - create, invite and join flows
7794094 2026-07-13 fix: polish navigation, attendance list and event button colors
```

Ambos pusheados a `origin/master` y deployados en Vercel. Usuario confirmó deploy OK.

---

## Comandos de test

```json
{
  "test": "vitest run --dir src",
  "test:unit": "vitest run --dir src",
  "test:integration": "npm run supabase:reset && npm run local:check && vitest run --dir tests/integration --fileParallelism=false",
  "test:e2e": "playwright test",
  "test:coverage": "vitest run --coverage",
  "typecheck": "tsc --noEmit"
}
```

---

## Branches

Solo `master` queda activa. Todas las ramas legacy fueron eliminadas:
- `feat/teams-module` (borrada)
- `feat/teams-module-db-rls` (borrada)
- `feat/event-creation-db` (borrada, era default branch)
- `chore/perf-layout-fixes` (borrada)
- `docs/notifications-v3-vercel-hobby` (borrada)
- `feat/attendance-owner-notifications` (borrada)

---

## Migraciones

72 archivos en `supabase/migrations/`. La foundation de teams es `20260712000000_teams_module_foundation.sql`.

---

## Documentación desactualizada encontrada (corregida en esta sesión)

| Archivo | Problema | Acción |
|---------|----------|--------|
| `context/current-state.md` | Fecha may-2026, "15 features", "Next 14", "deploy pendiente" | Reescribir |
| `context/handoff.md` | Fecha may-2026, mismo desfase | Reescribir |
| `AGENTS.md` | "58 migration files" (son 72) | No corregido (minor) |
| `CHANGELOG.md` | No actualizado desde may-2026 | Pendiente |
| `openspec/changes/equipos-grupos/` (activo) | Sobrevive al archive en `archive/` | Pendiente de limpieza |

---

## Invariantes críticas del producto (consolidadas, vigentes)

1. **`internal_rating` del V1 NO existe en V2.** Transparente vía `overall_actual = base + boost`.
2. **Tope de 8 en self-assessment.** Aplica a TODOS incluido el Admin.
3. **Admin NO puede auto-aumentar sus stats a 9-10.** Solo vía boost.
4. **Log público de cambios de stats:** in-app only.
5. **Admin inactivo: peer pressure vía sección pública ≥3 días.** Sin auto-aprobación.
6. **Redirect silencioso si ya es miembro.**
7. **Modalidad default no afecta events existentes.**
8. **Link de invitación sobrevive cambios de admin.**
9. **Boost descartado al reactivar un Player.**
10. **Cooldown 30 días post-rechazo de reintegro.**
11. **Hard delete es hard delete: sin rastro.**
12. **Contadores de pendientes visibles solo al admin.**
13. **Owners NO editan stats ni aprueban cosas sensibles.**
14. **Optimistic locking en todas las resoluciones.**
15. **Umbral atraso dashboard admin: 7 días.**
16. **Permitir múltiples eventos el mismo día.**
17. **Sorteo y resultado irreversibles en MVP.**
18. **Compartir card solo la propia.**
19. **Notificaciones opt-in contextual.** No al signup.

---

## Próximas acciones sugeridas

1. **Verificar estado post-polish:** correr `tsc --noEmit` y `vitest run --dir src`
2. **Actualizar CHANGELOG.md** con feat-016, feat-017 y últimos commits
3. **Limpiar** `openspec/changes/equipos-grupos/` activo (ya archivado)
4. **Verificar tests de integración** para equipos si hay cambios en RPCs
5. **Evaluar backlog:** chat interno, votación MVP comunitaria, pagos (v2.1+)

---

## Notas operativas

- **Usuario:** responde en español rioplatense, prefiere análisis antes de ejecución
- **Git:** conventional commits sin AI attribution, preguntar "¿Abro rama o va directo a master?"
- **SDD obligatorio** para features > one-liner
- **Service layer** para toda lógica de negocio, Zod para toda input, sin comentarios en prod
- **Verify siempre** con `tsc --noEmit` + `vitest run --dir src` después de cambios
