# CURRENT_STATE.md

Última actualización: 2026-07-08.

## 1. Resumen ejecutivo

El proyecto está en V2 completa y en producción. La etapa actual confirmada es push por outbox para `event_created` y `attendance_changed`: ambos flujos fueron probados con Chrome real, endpoint FCM, `maintenance`, `sent: 1` y `pushed_at` seteado. `attendance_changed` quedó cerrado técnicamente para admin + owners fijos.

## 2. Estado actual confirmado

- Push `event_created` funciona end-to-end en prueba real Chrome contra Supabase local.
- `attendance_changed` se crea desde `update_attendance` para `going` y `not_going`, dirigido a admin + owners fijos, excluyendo al actor.
- `notifications` funciona como outbox con `dedupe_key`, `push_attempted_at`, `push_attempt_count` y `push_last_error`.
- Los dispatchers `event_created` y `attendance_changed` están integrados en `/api/jobs/maintenance` con fallos aislados.
- `attendance_changed` fue validado en Supabase local y Chrome real: crea notifications admin/owner, el claim RPC las toma como elegibles, incrementa `push_attempt_count`, setea `push_attempted_at`, envía web-push y marca `pushed_at` cuando `sent > 0`.
- Los grants explícitos para `service_role` fueron agregados en migration.
- `close-mvp` fue corregido para usar service role solo después de auth/authz.
- Tests principales reportados:
  - `npm test` / unitarios de Vitest: reportado en sesión previa.
  - Integration con `npm run supabase db reset`: reportado y usado en los reportes E2E.
  - E2E semi-local: documentado en `docs/reports/push/E2E_EVENT_CREATED_PUSH_TEST_REPORT.md`.
  - Prueba real Chrome: documentada en `docs/reports/push/REAL_BROWSER_EVENT_CREATED_PUSH_TEST.md`.
  - Prueba real Chrome para `attendance_changed`: documentada en `docs/reports/push/REAL_BROWSER_ATTENDANCE_CHANGED_PUSH_TEST.md`.
- Reportes E2E existentes:
  - `docs/reports/push/E2E_EVENT_CREATED_PUSH_TEST_REPORT.md`
  - `docs/reports/push/REAL_BROWSER_EVENT_CREATED_PUSH_TEST.md`
  - `docs/reports/push/REAL_BROWSER_ATTENDANCE_CHANGED_PUSH_TEST.md`

## 3. Decisiones técnicas tomadas

- Las notificaciones push se modelan como outbox en `notifications`.
- No hay push directo desde flujos de dominio: `create_event` crea filas `event_created`, no envía web-push.
- `pushed_at` se marca solo si `delivery.sent > 0`.
- `push_attempt_count` y `push_last_error` quedan para diagnóstico operativo.
- `create_notification_once` es helper privado e idempotente.
- El dispatcher procesa `event_created` y `attendance_changed` con claim RPCs específicas.
- `maintenance` es el runner inicial del dispatcher.
- No se implementa lógica de “70%” todavía.
- La estrategia Free/Pro quedó documentada como decisión futura en `docs/FREE_PRO_GUIDELINES.md`: Free = organizado, Pro = piloto automático. No hay pricing, pagos ni paywall implementados.
- El contrato de Free readiness quedó documentado en `docs/FREE_READINESS.md`; las rutas críticas deben centralizarse en `src/lib/routes.ts`.

## 3.1 Lineamientos de notificaciones

Ver detalle operativo en `docs/NOTIFICATIONS_GUIDELINES.md`.

- `public.notifications` es outbox y source of truth para feed in-app, push, auditoría, dedupe y diagnóstico.
- No hay push directo desde RPCs, componentes, pages ni services de feature.
- El dispatcher es el único responsable de enviar web push.
- `pushed_at` solo se setea si `sent > 0`.
- `dedupe_key` es obligatorio para flujos pushables generados por eventos de dominio.
- `user_notification_preferences.push_enabled = true` es obligatorio; tener subscription no alcanza.
- Las claim RPCs de push deben ser service-role-only.
- `/api/jobs/maintenance` debe ejecutar dispatchers aislados con `try/catch` propio.
- Todo nuevo tipo debe definir destinatarios, exclusiones, payload, dedupe, canal, deeplink/copy y tests.
- Toda futura notificación debe declarar nivel, plan, destinatario, frecuencia y costo operativo antes de implementarse.

## 4. Seguridad

- `close-mvp` fue corregido: primero valida sesión y autorización, después usa `service_role` para enviar push al MVP.
- `service_role` no se usa antes de auth/authz en `close-mvp`.
- `create_notification_once` revoca execute a `public`, `anon` y `authenticated`; solo `service_role` tiene execute.
- `claim_event_created_push_notifications` es service-role-only.
- `claim_attendance_changed_push_notifications` es service-role-only.
- Hay grants explícitos para `service_role` sobre tablas necesarias de runtime: schedules, groups, events, players, attendances, notifications y push subscriptions.

## 5. Flujo `event_created` actual

1. Admin/owner crea evento vía `create_event`.
2. `create_event` inserta `notifications.event_created` para jugadores aprobados, no phantom, activos y con `user_id`.
3. `/api/jobs/maintenance` corre con `CRON_SECRET`.
4. `maintenance` llama a `dispatchEventCreatedPushes`.
5. El dispatcher claimea filas elegibles con `claim_event_created_push_notifications`.
6. `sendPushToUser` envía vía `web-push`.
7. Si `sent > 0`, se actualiza `notifications.pushed_at`.
8. Si falla, se guarda `push_last_error` y queda trazabilidad con `push_attempt_count`.

## 6. Variables necesarias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

`VAPID_SUBJECT` hoy no se usa: `push-sender.service.ts` usa `mailto:ivnvldz7@gmail.com` hardcodeado.

## 6.1 Flujo `attendance_changed` actual

1. Un jugador cambia asistencia vía `update_attendance`.
2. Si el estado efectivo es `going` o `not_going`, y cambió respecto de `old_status`, se crea `notifications.attendance_changed`.
3. Los destinatarios son admin del grupo y owners fijos; se excluye `auth.uid()`.
4. El dedupe es `attendance_changed:{event_id}:{player_id}:{status}:{recipient_user_id}`.
5. `/api/jobs/maintenance` llama a `dispatchAttendanceChangedPushes`.
6. Si `sent > 0`, se actualiza `pushed_at`; si falla, se guarda `push_last_error`.

## 7. Tests y validaciones

- `npm test`: pasa localmente con 36 archivos y 202 tests después de aplicar `attendance_changed`.
- `npm run typecheck`: pasa localmente.
- Integration con DB reset: `npm run test:integration` pasa localmente con 14 archivos y 63 tests.
- Smoke local `attendance_changed`: outbox + claim RPC OK; sin delivery real, `pushed_at` queda null como corresponde.
- E2E semi-local: validó outbox, claim, dispatcher, attempts y errores diagnosticables.
- Prueba real Chrome `event_created`: validó subscription real FCM, `maintenance`, `sent: 1`, `pushed_at` y notificación visible.
- Prueba real Chrome `attendance_changed`: validó subscription real FCM, `maintenance`, `claimed: 1`, `sent: 1`, `failed: 0`, `pushed_at`, `push_attempt_count: 1` y `push_last_error: null`.
- Limitación: el click físico de la notificación del sistema operativo no fue automatizado; queda como verificación manual.

## 8. Riesgos pendientes

- El cron diario puede ser mala UX para “me avisan cuando crean partido”.
- `event_created` no es instantáneo si depende solo de `maintenance`.
- En Vercel Hobby, cron más frecuente que diario no es viable; `vercel.json` usa `0 */3 * * *`, por lo que hay que mover el runner o subir de plan antes de producción.
- Falta `attendance_reminder` 24h idempotente.
- Falta prueba real en producción si no se hizo.
- No hay preferencias granulares por tipo de notificación.
- No hay paywall implementado; Free/Pro es sólo lineamiento funcional documentado.

## 9. Próximo paso recomendado

Implementar etapa 3: `attendance_reminder` 24h idempotente.

No implementar todavía:

- “70%”.
- Preferencias granulares.
- Rediseño UI.
- Rediseño service worker.

## 10. Protocolo de actualización

Después de cada implementación o auditoría importante, actualizar este archivo con:

- fecha;
- cambio realizado;
- archivos clave;
- tests ejecutados;
- decisión siguiente;
- riesgos nuevos.

## 11. Log de cambios recientes

- 2026-07-06 — `close-mvp` security fix: service role queda después de auth/authz.
- 2026-07-05 — Push outbox foundation: metadata de outbox y `create_notification_once`.
- 2026-07-05 — `event_created` dispatcher: claim RPC y dispatcher server-side.
- 2026-07-05 — Maintenance hardening: errores del dispatcher aislados para no romper todo el job.
- 2026-07-06 — Service role grants: permisos explícitos de runtime para `service_role`.
- 2026-07-06 — Real browser push test: Chrome real recibió push `event_created`; `sent: 1`, `pushed_at` no null.
- 2026-07-07 — Setup local Docker/Supabase: scripts npm para Supabase CLI, preflight local, `.env.example` completo, `supabase/seed.sql` mínimo, gateway restart post-reset, grants runtime para `authenticated`, documentación local e integration tests actualizados al contrato vigente.
- 2026-07-07 — `attendance_changed` outbox para admin + owners fijos: migration, claim RPC específica, dispatcher, maintenance con fallos aislados, copy/deeplink y tests.
- 2026-07-08 — Validación local `attendance_changed`: Docker/Supabase local OK, integration suite OK, smoke de outbox + claim confirmó 2 notifications admin/owner elegibles, `push_attempt_count = 1`, `push_attempted_at` seteado y `pushed_at` null sin delivery real.
- 2026-07-08 — Prueba real Chrome `attendance_changed`: Supabase local reseteado, Chrome real generó endpoint FCM, `maintenance` devolvió `claimed: 1`, `sent: 1`, `failed: 0`, y la notification quedó con `pushed_at` seteado, `push_attempt_count = 1` y `push_last_error = null`.
- 2026-07-08 — Investigación scheduler: Vercel Hobby limita cron a una ejecución diaria; para notificaciones con menor latencia conviene mover el runner a Supabase Cron/Edge Function, Cloudflare Workers Cron o QStash.
- 2026-07-08 — Free/Pro guidelines: documentado el framing futuro `Free = organizado` / `Pro = piloto automático`, comprador inicial organizador y precio referencial USD 4.99/mes por grupo, sin implementar paywall.
- 2026-07-09 — Free readiness: agregado contrato de rutas centralizado, entrypoints de card/MVP más consistentes y documentación de alcance Free sin paywall.

## 12. Última actualización operativa

- Qué cambió: se implementó setup local reproducible para Docker/Supabase y se aplicó `attendance_changed` como outbox pushable para admin + owners fijos.
- Qué cambió en producto: se documentaron lineamientos Free/Pro como decisión futura, sin cambiar comportamiento actual.
- Archivos tocados: `README.md`, `.env.example`, `package.json`, `tsconfig.json`, `vercel.json`, `scripts/local-preflight.js`, `scripts/restart-supabase-gateway.js`, `supabase/seed.sql`, `supabase/migrations/20260707000000_grant_authenticated_runtime_access.sql`, `supabase/migrations/20260706010000_attendance_changed_outbox.sql`, `docs/LOCAL_DEVELOPMENT.md`, `docs/NOTIFICATIONS_GUIDELINES.md`, `docs/FREE_PRO_GUIDELINES.md`, `docs/CURRENT_STATE.md`, `src/app/api/jobs/maintenance/route.ts`, `src/lib/services/push-dispatcher.service.ts`, `src/lib/notifications-deeplink.ts` e integration/unit tests relacionados.
- Tests ejecutados: `npm run local:check` OK; `npm run typecheck` OK; `npm test` OK; `npm run test:integration` OK; smoke local `attendance_changed` outbox + claim OK.
- Riesgos pendientes: los listados en sección 8.
- Próximo paso recomendado: Etapa 3, `attendance_reminder` 24h idempotente. Para futuras notificaciones, declarar nivel, plan, destinatario, frecuencia y costo operativo.
