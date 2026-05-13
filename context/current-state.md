# Current State

> Vista rápida del estado. Para detalle, leer `handoff.md`.

**Sesión abierta:** 2026-05-07.
**Versión activa:** V2.
**Features V2 escritos:** **15 de 15**.
**Bootstrap del código:** **completado**.
**Estado del código:** feat-015 cerrada. TODOS los 15 features del roadmap V2 implementados. TypeScript limpio (0 errores, 140 tests). UI migrada completamente a Nocturnal Pitch.

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
- **feat-009 (Boost System)**: ✅ cerrada con aplicación/decremento transaccional, card con badges/chip y feed de “Últimos partidos” montado sobre `events`.
- **feat-010 (Share Card)**: ✅ cerrada con share de imagen para la card propia y para el resumen post-partido, usando Web Share API con fallback a descarga.
- **feat-014 (Export Data)**: ✅ cerrada con ZIP server-side (JSON + CSV), anonimización de IDs, descarga automática y fallback manual.
- **feat-013 (Phantom Player)**: ✅ cerrada con creación en check-in, badge FANTASMA, widget de resolución en admin-tasks, conversión con magic link y cron de auto-archive a los 7 días.
- **feat-012 (Notifications)**: ✅ cerrada con push web, badge in-app, feed `/notifications`, preferencias `/settings/notifications`, opt-in contextual, digest diario/semanal y 3 cron jobs.
- **feat-011 (Manage Owners)**: ✅ cerrada con owners fijos desde settings, invitación/aceptación de owner temporal y job programable para designación/expiración automática.
- **feat-006 / feat-007**: ✅ blindados con RPC real y guardrails documentados.
- Mantener registro actualizado antes de cada pasada.

- **feat-015 (Player Stats)**: ✅ cerrada con perfil de jugador, tabs Carta/Estadísticas, VIEW `player_stats_aggregate` expuesta via RPC segura, y componentes `PlayerProfileTabs` + `PlayerStatsView`.
- **Última pasada completada:** cierre de `feat-015` — todos los features del roadmap V2 implementados.
- Implementado en esta pasada (feat-012):
  - Migración con tabla `user_notification_preferences` + RLS en `notifications` y `push_subscriptions` + RPCs de mark/count/upsert.
  - `worker/index.js` para handlers push en el service worker (next-pwa).
  - Utilidad `notifications-deeplink.ts` con deeplinks y copy para todos los tipos.
  - Servicios: `notifications.service.ts`, `push-subscription.service.ts`, `push-sender.service.ts`.
  - Cliente Supabase service role en `src/lib/supabase/service.ts`.
  - API routes: subscribe, lista, mark read, read-all, settings, push-delivery, daily-digest, weekly-digest.
  - Hooks: `use-push-subscription`, `use-notifications` (con Realtime).
  - Componentes: `NotificationBadge`, `NotificationItem`, `PushOptinBanner`.
  - Páginas: `/notifications` y `/settings/notifications`.
  - `vercel.json` con 3 crons nuevos (push-delivery c/5min, daily-digest 9AM, weekly-digest dom 10AM).
  - `web-push` + `@types/web-push` en `package.json`.
- Pendiente (requiere env): instalar `web-push` con `npm install` y configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en `.env.local`.
- Implementado en pasada anterior (feat-011):
  - Se implementó `load_match_result` como RPC transaccional.
  - Se agregó el helper de dominio `src/lib/match-result.ts` con cálculo y decremento de boosts.
  - Se agregaron tests unitarios e integración real para el slice de resultado.
  - Se montó la pantalla `/groups/[id]/events/[event_id]/result`.
  - Se añadió el resumen post-partido en `/groups/[id]/events/[event_id]`.
  - Se agregó `src/lib/services/events.load-match-result.test.ts`.
  - Se mantuvo la cobertura real de `update_attendance` y `confirm_draw` por `supabase.rpc(...)`.
  - Se agregó `src/lib/boost.ts` para la lectura/aplicación visual del boost.
  - `PlayerCardPreview` ahora muestra badges `+N`, highlight de MVP boost y chip de partidos restantes.
  - El dashboard del grupo dejó de consultar `matches` y ahora usa `events` + `match_participations` para “Últimos partidos”.
  - Se agregó `src/lib/share.ts` para centralizar Web Share API con files y fallback a descarga.
  - Se agregaron `ShareableCard`, `PlayerCardSharePanel`, `ShareableMatchSummary` y `ShareMatchSummaryButton`.
  - El dashboard ahora deja compartir la propia card y el post-partido comparte imagen en vez de texto plano.
  - Se agregaron RPCs `assign_owner`, `remove_owner`, `designate_temporary_owners`, `respond_temporary_owner_invite` y `process_temporary_owner_jobs`.
  - Se montó `/groups/[id]/settings/owners` para gestión real de owners fijos.
  - Se montó `/temporary-owner/[event_id]` para aceptar/rechazar designación temporal.
  - Se agregó `vercel.json` con cron cada 15 minutos para `/api/jobs/temporary-owners`.
- Verificación:
  - `src/lib/match-result.test.ts` ✅
  - `src/lib/services/events.load-match-result.test.ts` ✅
  - `src/lib/boost.test.ts` ✅
  - `src/lib/share.test.ts` ✅
  - `src/lib/services/owners.service.test.ts` ✅
  - `src/lib/services/temporary-owners.service.test.ts` ✅
  - `src/lib/notifications-deeplink.test.ts` ✅
  - `src/lib/services/notifications.service.test.ts` ✅
  - `src/lib/services/push-subscription.service.test.ts` ✅
  - `src/components/cards/player-card-preview.test.tsx` ✅
  - `src/components/share/shareable-card.test.tsx` ✅
  - `src/components/groups/group-dashboard-initial-state.test.tsx` ✅
  - `tests/integration/feat-008-load-match-result-rpc.test.ts` ✅
  - `tests/integration/feat-006-attendance-rpc.test.ts` ✅
  - `tests/integration/feat-007-confirm-draw-rpc.test.ts` ✅
  - `public.update_attendance`, `public.confirm_draw` y `public.load_match_result` funcionan por `supabase.rpc(...)` después de recargar schema cache cuando corresponde.

## Bloqueos

- Ninguno de código. Env vars pendientes de configurar antes de producción (ver handoff).

## Evidencia verificada

- `package.json` ya tiene Next 14, Supabase, Vitest y Playwright.
- `src/app/page.tsx` confirma app inicial funcionando.
- `supabase/migrations/20260426000000_initial_schema_v2.sql` confirma schema inicial ya generado.
- `src/lib/services/events.service.ts` llama `supabase.rpc('update_attendance', { p_event_id, p_status })`, `supabase.rpc('confirm_draw', ...)` y `supabase.rpc('load_match_result', ...)`.
- `src/app/groups/[id]/dashboard/page.tsx` ya no depende del modelo falso `matches`; consulta `events` y compone el feed con `getPlayedMatchSummary`.
- `src/components/share/*` concentra la generación de PNG compartibles para la card propia y el resumen del partido.
- `src/app/groups/[id]/settings/owners/*` y `src/app/temporary-owner/[event_id]/*` cierran la gestión funcional de owners.
- `vercel.json` deja cableado el scheduler para temporary owners sobre `/api/jobs/temporary-owners`.
- `supabase/migrations/20260504013000_feat_006_update_attendance_rpc.sql` define `public.update_attendance(p_event_id uuid, p_status public.attendance_status)`.
- `supabase/migrations/20260505234500_feat_008_load_match_result_rpc.sql` define `public.load_match_result(...)`.
- `supabase/config.toml` expone `public` en PostgREST.
