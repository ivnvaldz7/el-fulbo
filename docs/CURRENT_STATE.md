# CURRENT_STATE.md

Última actualización: 2026-07-06.

## 1. Resumen ejecutivo

El proyecto está en V2 completa y en producción. La etapa actual confirmada es push para `event_created`: el outbox existe, el dispatcher está integrado al job de `maintenance`, los grants de `service_role` fueron corregidos y una prueba real en Chrome local confirmó entrega push con `sent: 1` y `pushed_at` seteado.

## 2. Estado actual confirmado

- Push `event_created` funciona end-to-end en prueba real Chrome contra Supabase local.
- `notifications` funciona como outbox con `dedupe_key`, `push_attempted_at`, `push_attempt_count` y `push_last_error`.
- El dispatcher `event_created` está integrado en `/api/jobs/maintenance`.
- Los grants explícitos para `service_role` fueron agregados en migration.
- `close-mvp` fue corregido para usar service role solo después de auth/authz.
- Tests principales reportados:
  - `npm test` / unitarios de Vitest: reportado en sesión previa.
  - Integration con `npm run supabase db reset`: reportado y usado en los reportes E2E.
  - E2E semi-local: documentado en `E2E_EVENT_CREATED_PUSH_TEST_REPORT.md`.
  - Prueba real Chrome: documentada en `REAL_BROWSER_EVENT_CREATED_PUSH_TEST.md`.
- Reportes E2E existentes:
  - `E2E_EVENT_CREATED_PUSH_TEST_REPORT.md`
  - `REAL_BROWSER_EVENT_CREATED_PUSH_TEST.md`

## 3. Decisiones técnicas tomadas

- Las notificaciones push se modelan como outbox en `notifications`.
- No hay push directo desde flujos de dominio: `create_event` crea filas `event_created`, no envía web-push.
- `pushed_at` se marca solo si `delivery.sent > 0`.
- `push_attempt_count` y `push_last_error` quedan para diagnóstico operativo.
- `create_notification_once` es helper privado e idempotente.
- El dispatcher procesa solo `event_created` por ahora.
- `maintenance` es el runner inicial del dispatcher.
- No se implementa lógica de “70%” todavía.

## 4. Seguridad

- `close-mvp` fue corregido: primero valida sesión y autorización, después usa `service_role` para enviar push al MVP.
- `service_role` no se usa antes de auth/authz en `close-mvp`.
- `create_notification_once` revoca execute a `public`, `anon` y `authenticated`; solo `service_role` tiene execute.
- `claim_event_created_push_notifications` es service-role-only.
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

## 7. Tests y validaciones

- `npm test`: reportado en sesión previa.
- Integration con DB reset: `npm run supabase db reset` fue ejecutado en los reportes.
- E2E semi-local: validó outbox, claim, dispatcher, attempts y errores diagnosticables.
- Prueba real Chrome: validó subscription real FCM, `maintenance`, `sent: 1`, `pushed_at` y notificación visible.
- Limitación: el click físico de la notificación del sistema operativo no fue automatizado; queda como verificación manual.

## 8. Riesgos pendientes

- El cron diario puede ser mala UX para “me avisan cuando crean partido”.
- `event_created` no es instantáneo si depende solo de `maintenance`.
- Falta `attendance_reminder` 24h idempotente.
- Falta prueba real en producción si no se hizo.
- No hay preferencias granulares por tipo de notificación.

## 9. Próximo paso recomendado

Etapa 3: implementar `attendance_reminder` 24h idempotente.

No implementar todavía:

- “70%”.
- Push a admin/owners por `attendance_changed`.
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

## 12. Última actualización operativa

- Qué cambió: se creó este archivo vivo de estado del proyecto.
- Archivos tocados: `docs/CURRENT_STATE.md`.
- Tests ejecutados: no se ejecutaron tests; solo lectura/verificación documental.
- Riesgos pendientes: los listados en sección 8.
- Próximo paso recomendado: Etapa 3, `attendance_reminder` 24h idempotente.
