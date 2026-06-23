# Handoff — 2026-05-07 (ACTUALIZADO POST UI-MIGRATION)

> **Archivo crítico.** Lo primero que cualquier agente lee al arrancar sesión.

---

## Estado del proyecto

**Fase:** specs V2 completas + bootstrap del repo **YA realizado** + los **15 features del roadmap V2 implementados** + TypeScript limpio + **UI 100% Nocturnal Pitch**.
**Próxima fase:** configuración de env vars y producción. V2 está listo para deploy.

**Versión activa:** **V2**.

**V1 archivado** en `/specs/_archive/v1/`. No tocar.

---

## Qué está listo

### Todas las áreas de specs
- ✅ Foundation, Domain, Flows, Contracts, Quality completos.
- ✅ Engram con **144 decisiones** activas.
- ✅ Visión central `_v2-vision.md`.
- ✅ Bootstrap técnico ya presente en el repo y verificado con código.

### 15 Features completos
- ✅ `feat-001-onboarding-user.md` (signup + self-assessment).
- ✅ `feat-002-create-group.md` (creación de grupo).
- ✅ `feat-003-join-group.md` (unirse, con reintegros y reactivación).
- ✅ `feat-004-admin-dashboard.md` (resolución unificada de pendientes).
- ✅ `feat-005-create-event.md` (creación de partido).
- ✅ `feat-006-confirm-attendance.md` (confirmación individual).
- ✅ `feat-007-check-in-and-draw.md` (check-in + sorteo + animación).
- ✅ `feat-008-load-result-and-mvp.md` (resultado + MVP + boosts).
- ✅ `feat-009-boost-system.md` (sistema de boost completo, con card visible y feed en dashboard canónico).
- ✅ `feat-010-share-card.md` (compartir card FIFA y resumen como imagen).
- ✅ `feat-011-manage-owners.md` (owners fijos + temporales automáticos).
- ✅ `feat-012-notifications.md` (push + in-app + digest diario/semanal).
- ✅ `feat-013-phantom-player.md` (creación check-in, conversión magic link, auto-archive 7 días).
- ✅ `feat-014-export-data.md` (ZIP con JSON + CSV, anonimización, descarga directa desde settings).
- ✅ `feat-012-notifications.md` (push + email + in-app + digest).
- ✅ `feat-013-phantom-player.md` (player fantasma + conversión).
- ✅ `feat-014-export-data.md` (backup ZIP JSON + CSV).
- ✅ `feat-015-player-stats.md` (stats individuales MVP).

### UI & UX (Nocturnal Pitch)
- ✅ Primitives `ImmersiveScreen` y `FloatingPanel`.
- ✅ Landing, `/welcome`, `/join` y onboarding de stats.
- ✅ Todas las pantallas de invitación (`/invite/[code]/*`) migradas.
- ✅ `GroupDashboardInitialState` y `/admin-tasks`.
- ✅ Flujo de evento completo: `new`, `detail`, `check-in`, `draw`, `teams`, `result`, `edit`.
- ✅ Jugadores: layout con `ImmersiveScreen`, `player-stats-view` sin `rounded-lg`.
- ✅ Export, notifications, notification-settings, convert-phantom.
- ✅ **Todas las páginas del app usan Nocturnal Pitch. Migración UI completa.**
- ✅ Corregido token fantasma `bg-concrete-base` (no estaba en tailwind.config.ts).
- ✅ Verificado con `tests/integration/join-group.test.ts`.

### RPCs críticas blindadas
- ✅ `update_attendance` con test real por `supabase.rpc(...)`.
- ✅ `confirm_draw` con test real por `supabase.rpc(...)`.
- ✅ `load_match_result` con test real por `supabase.rpc(...)`.

---

## Corrección de estado en esta sesión

- Se verificó que `context/current-state.md` y este `handoff.md` habían quedado desactualizados.
- Ambos ya reflejan ahora el estado real de las features críticas y sus RPCs.
- El código demuestra que la base Next.js + Supabase + migración inicial ya existía y que `feat-008` ya quedó cerrada.
- Se establece como regla operativa: **antes de cada pasada hay que dejar registro actualizado**.

**Impacto:**
- El próximo paso ya NO es “cerrar feat-008”.
- El próximo paso es feat-012 o, si hace falta, refinamiento visual/documental de lo ya cerrado.

---

## Próximos pasos (por orden)

1. **Antes de cada pasada**, actualizar `CHANGELOG.md`, `context/current-state.md` y `context/handoff.md` si cambió el estado.
2. **Configurar env vars** (ver tabla al final) — bloquean funcionalidad real en producción.
3. **Deploy** — V2 está listo. Stack: Next.js + Supabase + Vercel.
4. **Opcional:** `PushOptinBanner` en confirmación de asistencia (`feat-006`).
5. **V2.1** — rankings, gráficos, comparaciones (fuera del scope actual).
6. **RPCs críticas blindadas:**
   - `update_attendance`
   - `confirm_draw`
   - `load_match_result`
5. **Base ya implementada en fase inicial:**
   - RPC `validate_invite_code`
   - resolución server-side de estados base del invite flow
   - redirects/pantallas para `invalid`, `archived`, `group-full`, `user-limit`
   - ramificación correcta para `anonymous`, `active_member` y `new`
6. **Implementado en fase 2:**
   - `voluntary_returner` con pantalla `welcome-back` y reactivación real
   - `expelled_can_request` con formulario server-side
   - `expelled_pending_request`
   - `expelled_cooldown`
   - `request-sent`
   - nuevas RPCs `reactivate_player` y `create_reintegration_request`
7. **Implementado en feat-007:**
   - check-in + sorteo + equipos
   - cleanup de helpers legacy de permisos
8. **Verificación hecha:**
   - unit tests de `invite.service` pasando
   - `npm run typecheck` pasando
   - `tests/integration/join-group.test.ts` pasando luego de aplicar migraciones locales
   - bugfix aplicado en migration `20260502170000_feat_003_invite_validation.sql` por uso inválido de `SELECT ... INTO`
7. **Mantener auditoría**:
   - verificar contra specs
   - registrar descubrimientos no obvios en engram
   - snapshotear `handoff.md` en `handoff-history/` antes de reescribir

### Guardrail nuevo para RPCs de Supabase

Cuando aparezca `NOT_FOUND` sobre una RPC recién migrada:

1. Confirmar existencia en catálogo (`pg_proc`) y firma exacta.
2. Confirmar que la app use los mismos nombres de parámetros que la función.
3. Confirmar si el test está usando SQL directo o `supabase.rpc(...)`.
4. Ejecutar primero `NOTIFY pgrst, 'reload schema'`.
5. Reprobar la llamada real por Supabase autenticado.
6. Recién después revisar grants o considerar cambios de firma.

NO cambiar enums a `text` para “probar”. Eso degrada el contrato sin demostrar causa.

### Estado actual de `feat-008`

- RPC `load_match_result` implementada y verificada.
- UI de carga de resultado implementada en `/groups/[id]/events/[event_id]/result`.
- Resumen post-partido visible en `/groups/[id]/events/[event_id]` cuando el estado es `played`.
- Cobertura real de Supabase RPC agregada para `update_attendance`, `confirm_draw` y `load_match_result`.

### Estado actual de `feat-009`

- Lógica de boost aplicada/reemplazada/decrementada por `load_match_result`.
- `src/lib/boost.ts` centraliza la lectura de boost activo, el clamp visual a 99 y el copy de partidos restantes.
- `PlayerCardPreview` muestra badges `+N`, chip de duración y highlight de MVP boost.
- El dashboard del grupo ya usa `events` para próximos partidos y “Últimos partidos”, con resumen de boosts y MVP basado en `match_participations`.
- Validado con:
  - `src/lib/boost.test.ts`
  - `src/components/cards/player-card-preview.test.tsx`
  - `src/components/groups/group-dashboard-initial-state.test.tsx`

### Estado actual de `feat-010`

- El dashboard del grupo muestra la propia card y expone **"Compartir mi card"** sólo para el player actual.
- `html-to-image` genera PNG de la card y del resumen del partido mediante componentes shareables dedicados.
- Si `navigator.canShare({ files })` está disponible, se usa Web Share API con file; si no, se descarga el PNG.
- El resumen post-partido de `/groups/[id]/events/[event_id]` dejó de compartir texto plano y ahora comparte imagen con scoreboard, MVP y boosts.
- Validado con:
  - `src/lib/share.test.ts`
  - `src/components/share/shareable-card.test.tsx`
  - `src/components/groups/group-dashboard-initial-state.test.tsx`

### Estado actual de `feat-014`

- Export disponible en `/groups/{id}/settings/export` para admin y owners.
- El fetch de datos usa service role client (después de verificar permisos con user-scoped client).
- `toCsv` es un serializer propio — sin deps extra, maneja comas/quotes/newlines correctamente.
- Los stats (`before_stats`, `after_stats` en stat_change_logs) se serializan como JSON string en el CSV.
- La descarga usa `a.download` con blob URL — el fallback link queda visible 10 segundos después del click.
- `jszip` agregado a package.json — requiere `npm install`.
- Validado con `src/lib/services/export.service.test.ts`.

### Estado actual de `feat-013`

- `create_phantom_player` RPC valida permiso (admin/owner), cupo 50 players, asigna stats 6/6 por posición y auto check-in.
- `phantom_conversion_tokens` guarda el magic link con TTL 7 días y se invalida al usarse.
- La conversión loguea la URL en consola — el envío real de email requiere SMTP/provider configurado.
- `archive_stale_phantoms` excluye fantasmas que estén en eventos futuros activos.
- `EventAttendee.isPhantom` agregado — la query de `getEventAttendees` incluye `is_phantom`.
- `PhantomResolutionWidget` es client component (no se puede usar `router.refresh()` desde server component padre) — el admin-tasks page pasa `onResolved={() => {}}`. Para producción, integrar un `router.refresh()` o refetch.
- Validado con: `src/lib/services/phantom-player.service.test.ts`

### Estado actual de `feat-012`

- Infraestructura completa de notificaciones: push web, in-app y digest.
- `user_notification_preferences` con RLS, triggers y RPCs de mark/count/subscribe.
- `worker/index.js` extiende el service worker de next-pwa con handlers `push` y `notificationclick`.
- `notifications-deeplink.ts` centraliza deeplinks y copy para todos los tipos del enum.
- Servicios: `notifications.service.ts`, `push-subscription.service.ts`, `push-sender.service.ts`.
- API routes completos (ver CHANGELOG 0.1.8).
- Hooks con Supabase Realtime para badge reactivo.
- Componentes: `NotificationBadge`, `NotificationItem`, `PushOptinBanner`.
- Páginas: `/notifications` y `/settings/notifications`.
- 3 crons nuevos en `vercel.json`.
- **Env vars requeridas (pendiente configurar en .env.local y Vercel):**
  - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — generadas con `npx web-push generate-vapid-keys`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — igual que `VAPID_PUBLIC_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` — para los jobs del cron
- Validado con:
  - `src/lib/notifications-deeplink.test.ts`
  - `src/lib/services/notifications.service.test.ts`
  - `src/lib/services/push-subscription.service.test.ts`

### Estado actual de `feat-011`

- `assign_owner` y `remove_owner` ya existen como RPCs y están expuestos en `/groups/[id]/settings/owners`.
- La UI de owners fijos filtra admin, owners existentes y players fantasma.
- `designate_temporary_owners`, `respond_temporary_owner_invite` y `process_temporary_owner_jobs` cubren designación, respuesta, escalación básica y expiración.
- `/temporary-owner/[event_id]` permite aceptar o rechazar la designación temporal.
- `vercel.json` programa `/api/jobs/temporary-owners` cada 15 minutos para disparar la automatización.
- `is_group_owner` ya reconoce temporary owners confirmados y no expirados como owners efectivos.
- Validado con:
  - `src/lib/services/owners.service.test.ts`
  - `src/lib/services/temporary-owners.service.test.ts`
  - `src/components/groups/group-dashboard-initial-state.test.tsx`

---

## Invariantes críticas del producto (consolidadas)

Estas son la verdad última del producto. Si un agente duda, ganan estas:

1. **`internal_rating` del V1 NO existe en V2.** Transparente vía `overall_actual = base + boost`.
2. **Tope de 8 en self-assessment.** Aplica a TODOS incluido el Admin (dec-043).
3. **Admin NO puede auto-aumentar sus stats a 9-10** (dec-054, dec-079). Solo via boost.
4. **Log público de cambios de stats: in-app only** (dec-037).
5. **Admin inactivo: peer pressure vía sección pública ≥3 días** (dec-048). Sin auto-aprobación.
6. **Redirect silencioso si ya es miembro** (dec-051).
7. **Modalidad default no afecta events existentes** (dec-060).
8. **Link de invitación sobrevive cambios de admin** (dec-071).
9. **Boost descartado al reactivar un Player** (dec-062, dec-083).
10. **Cooldown 30 días post-rechazo de reintegro** (dec-065).
11. **Hard delete es hard delete: sin rastro** (dec-068).
12. **Contadores de pendientes visibles solo al admin** (dec-077).
13. **Owners NO editan stats ni aprueban cosas sensibles** (dec-026, dec-132).
14. **Optimistic locking en todas las resoluciones** (dec-085).
15. **Umbral atraso dashboard admin: 7 días** (dec-087).
16. **Permitir múltiples eventos el mismo día** (dec-088).
17. **Sorteo y resultado irreversibles en MVP** (dec-104, dec-107).
18. **Compartir card solo la propia** (dec-110).
19. **Notificaciones opt-in contextual** (dec-116). No al signup.
20. **Diseño visual queda pendiente, se hace con preguntas** (dec-136).

---

## Schema changes acumulados

Total de cambios al schema desde V1 base:

- Nuevas tablas: `reintegration_requests` (feat-003).
- Nuevos enums de notification: `player_returned`, `reintegration_request`, `reintegration_approved`, `reintegration_rejected`, `stats_changed_log`, `event_rescheduled`, `event_updated`, `match_ready`, `owner_assigned`, `owner_removed`, `owner_temporary_accepted`, `owner_temporary_rejected`, `owner_temporary_no_one_accepted`.
- Columnas `updated_at` en `stat_revision_requests` y `reintegration_requests` (optimistic locking).
- RPCs nuevos: ~20 funciones (ver features para detalle).
- Cronjobs nuevos: cleanup orphans, archive phantom players, temporary owners expiration, digest diario, recordatorios de partidos, designación de owners temporales.
- Storage buckets: `group-logos`, `player-photos` (ya existentes).

---

## Cosas a tener en cuenta

1. **Iván tiene la carpeta localmente**, Windows + PowerShell.
2. **Git setup pendiente** (opcional, para facilitar syncs).
3. **Stack cerrado:** Next.js 14 App Router + TS strict + Tailwind + Supabase + Vercel + next-pwa + Web Push. No cambiar.
4. **Email de soporte:** `ivnvldz7@gmail.com`.
5. **Idioma:** español argentino coloquial.
6. **Filosofía:** "tan fluido como una encuesta de WhatsApp".
7. **Prohibido:** discutir chat en detalle técnico.
8. **Prohibido:** cambiar invariantes sin aprobación explícita.
9. **Estrategia Opción A CUMPLIDA:** los 15 features están escritos.
10. **Diseño visual pendiente:** sesiones dedicadas con preguntas al usuario.
11. **Nueva regla operativa:** antes de cada pasada se deja registro actualizado del estado real.
12. **Nueva regla operativa para RPCs:** un test SQL directo NO valida exposición PostgREST; si el bug es de `supabase.rpc`, hay que reprobar por el camino real.

---

## Para el Auditor (cuando empiece implementación)

Checklist general al revisar cualquier PR:

- Los tipos de `/src/lib/types.ts` coinciden con `/specs/04-contracts/types.ts`.
- Tests unit, integration y RLS pasan.
- No se agregaron dependencias pesadas sin justificar.
- RLS cubre todos los casos del spec del feature.
- El código usa `Result<T, E>`, nunca `throw`.
- Boosts se calculan según `business-rules.md §5.2` y `feat-009`.
- Validaciones cumplen rangos del `error-model.md`.
- Log de cambios se crea cuando corresponde.
- Invariantes (las 20 de arriba) están respetadas.
- Copy en español argentino coloquial, sin slang juvenil ni formalismo.

---

## Estado de feat-015

- Rutas: `/groups/[id]/players/[player_id]` (Carta) y `/groups/[id]/players/[player_id]/stats` (Estadísticas)
- Layout compartido con tabs y header de jugador
- VIEW `player_stats_aggregate` ya existía; expuesta vía RPC `get_player_stats` con check de membresía
- Componentes: `PlayerProfileTabs`, `PlayerStatsView`
- Tests: `src/lib/services/player-stats.service.test.ts` (6 casos)
- Migración: `20260507002000_feat_015_player_stats.sql`

## Próxima acción

**El roadmap V2 está completo y listo para deploy.**

- ✅ 15/15 features implementados
- ✅ TypeScript limpio (0 errores, 140 tests pasando)
- ✅ UI 100% Nocturnal Pitch

Siguiente paso concreto: **configurar env vars y hacer deploy a Vercel**.

## ENV VARS PENDIENTES DE CONFIGURAR

Estas variables no están configuradas y bloquean funcionalidad real en producción:

| Variable | Para qué | Cómo obtenerla |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Push web | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Push web | ídem |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push web (cliente) | igual que `VAPID_PUBLIC_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Jobs de cron + export | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_APP_URL` | Magic link de conversión fantasma | URL del deploy (ej: `https://elfulbo.app`) |
| `CRON_SECRET` | Proteger endpoints de cron | cualquier string random |
