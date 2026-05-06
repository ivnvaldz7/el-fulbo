# Current State

> Vista rápida del estado. Para detalle, leer `handoff.md`.

**Sesión abierta:** 2026-05-02.
**Versión activa:** V2.
**Features V2 escritos:** **15 de 15**.
**Bootstrap del código:** **completado**.
**Estado del código:** bootstrap + implementación inicial verificados en repo.

## Features completos

Todos los 15 features escritos:

- ✅ `feat-001-onboarding-user.md`
- ✅ `feat-002-create-group.md`
- ✅ `feat-003-join-group.md`
- ✅ `feat-004-admin-dashboard.md`
- ✅ `feat-005-create-event.md`
- ✅ `feat-006-confirm-attendance.md`
- ✅ `feat-007-check-in-and-draw.md`
- ✅ `feat-008-load-result-and-mvp.md`
- ✅ `feat-009-boost-system.md`
- ✅ `feat-010-share-card.md`
- ✅ `feat-011-manage-owners.md`
- ✅ `feat-012-notifications.md`
- ✅ `feat-013-phantom-player.md`
- ✅ `feat-014-export-data.md`
- ✅ `feat-015-player-stats.md`

## Engram

- **144 decisiones** activas.
- Fase de diseño cerrada con `dec-140`; `feat-015` agregada después con `dec-141` a `dec-144`.

## Próximo

- **feat-008 (Load Result + MVP)**: ✅ cerrada de punta a punta, con backend transaccional, UI mínima y resumen post-partido.
- **feat-006 / feat-007**: ✅ blindados con RPC real y guardrails documentados.
- Mantener registro actualizado antes de cada pasada.

- **Última pasada completada:** cierre funcional de `feat-008` + documentación sincronizada.
- Implementado en esta pasada:
  - Se implementó `load_match_result` como RPC transaccional.
  - Se agregó el helper de dominio `src/lib/match-result.ts` con cálculo y decremento de boosts.
  - Se agregaron tests unitarios e integración real para el slice de resultado.
  - Se montó la pantalla `/groups/[id]/events/[event_id]/result`.
  - Se añadió el resumen post-partido en `/groups/[id]/events/[event_id]`.
  - Se agregó `src/lib/services/events.load-match-result.test.ts`.
  - Se mantuvo la cobertura real de `update_attendance` y `confirm_draw` por `supabase.rpc(...)`.
- Verificación:
  - `src/lib/match-result.test.ts` ✅
  - `src/lib/services/events.load-match-result.test.ts` ✅
  - `tests/integration/feat-008-load-match-result-rpc.test.ts` ✅
  - `tests/integration/feat-006-attendance-rpc.test.ts` ✅
  - `tests/integration/feat-007-confirm-draw-rpc.test.ts` ✅
  - `public.update_attendance`, `public.confirm_draw` y `public.load_match_result` funcionan por `supabase.rpc(...)` después de recargar schema cache cuando corresponde.

## Bloqueos

- El repo sigue teniendo deuda TypeScript legacy ajena a `feat-008`; el full typecheck no es señal confiable del slice actual.

## Evidencia verificada

- `package.json` ya tiene Next 14, Supabase, Vitest y Playwright.
- `src/app/page.tsx` confirma app inicial funcionando.
- `supabase/migrations/20260426000000_initial_schema_v2.sql` confirma schema inicial ya generado.
- `src/lib/services/events.service.ts` llama `supabase.rpc('update_attendance', { p_event_id, p_status })`, `supabase.rpc('confirm_draw', ...)` y `supabase.rpc('load_match_result', ...)`.
- `supabase/migrations/20260504013000_feat_006_update_attendance_rpc.sql` define `public.update_attendance(p_event_id uuid, p_status public.attendance_status)`.
- `supabase/migrations/20260505234500_feat_008_load_match_result_rpc.sql` define `public.load_match_result(...)`.
- `supabase/config.toml` expone `public` en PostgREST.
