# CURRENT_STATE.md

Última actualización: 2026-07-07.

## 1. Resumen ejecutivo

El proyecto está en V2 completa y en producción. La etapa actual de notificaciones usa `public.notifications` como outbox para feed, auditoría y Web Push.

Estado verificado:

- `event_created` fue validado end-to-end en Chrome real local con `sent: 1` y `pushed_at` seteado.
- `attendance_changed` está implementado localmente para admin + owners fijos, excluyendo al actor.
- La rama `feat/attendance-owner-notifications` está pusheada, pero no está online: Vercel falló el deploy por cron incompatible con Hobby.
- La nueva dirección documentada es `outbox + dispatcher inmediato server-side + cron diario fallback`.

## 2. Deploy y restricción Vercel

La causa del deploy fallido fue este cambio en `vercel.json`:

```diff
- "schedule": "0 8 * * *"
+ "schedule": "0 */3 * * *"
```

Vercel Hobby no permite cron jobs más frecuentes que diarios. Por eso, el cron de `/api/jobs/maintenance` debe volver a una frecuencia diaria antes de deployar.

Decisión:

- No usar cron frecuente como mecanismo principal de notificaciones.
- Usar dispatch inmediato server-side para UX.
- Usar maintenance diario como fallback/retry y batch jobs.

## 3. Documentación portable

Para poder continuar desde otra máquina, la documentación fuente queda en archivos versionados:

- `openspec/changes/notifications-v3-vercel-hobby/proposal.md`
- `openspec/changes/notifications-v3-vercel-hobby/design.md`
- `openspec/changes/notifications-v3-vercel-hobby/tasks.md`
- `openspec/changes/notifications-v3-vercel-hobby/specs/notifications-delivery.md`
- `specs/03-features/feat-012-notifications.md`
- `docs/NOTIFICATIONS_GUIDELINES.md`

Engram puede ayudar como memoria local, pero no es fuente portable para otra máquina.

## 4. Estado actual confirmado

- `notifications` funciona como outbox con `dedupe_key`, `push_attempted_at`, `push_attempt_count` y `push_last_error`.
- `pushed_at` se marca solo si `delivery.sent > 0`.
- `create_notification_once` es helper privado e idempotente.
- `claim_event_created_push_notifications` es service-role-only.
- `claim_attendance_changed_push_notifications` es service-role-only.
- Los dispatchers `event_created` y `attendance_changed` están integrados en `/api/jobs/maintenance` con fallos aislados.
- Hay grants explícitos para `service_role` sobre tablas necesarias de runtime: schedules, groups, events, players, attendances, notifications y push subscriptions.

## 5. Tipos críticos

| Tipo | Estado | Próxima acción |
|------|--------|----------------|
| `event_created` | Validado en prueba real local | Agregar/confirmar dispatch inmediato server-side. |
| `attendance_changed` | Implementado localmente | Validar integration con Supabase local y agregar dispatch inmediato. |
| `attendance_reminder` | Pendiente | Implementar como outbox idempotente 0-24h y dispatch vía dispatcher. |

## 6. Flujo `event_created`

1. Admin/owner crea evento vía `create_event`.
2. `create_event` inserta `notifications.event_created` para jugadores aprobados, no phantom, activos y con `user_id`.
3. Modelo objetivo: una capa server-side post-RPC llama dispatcher inmediato.
4. Fallback: `/api/jobs/maintenance` diario reintenta rows pendientes.
5. Dispatcher claimea filas elegibles con `claim_event_created_push_notifications`.
6. `sendPushToUser` envía vía `web-push`.
7. Si `sent > 0`, se actualiza `notifications.pushed_at`.
8. Si falla, se guarda `push_last_error`.

## 7. Flujo `attendance_changed`

1. Un jugador cambia asistencia vía `update_attendance`.
2. Si el estado efectivo es `going` o `not_going`, y cambió respecto de `old_status`, se crea `notifications.attendance_changed`.
3. Los destinatarios son admin del grupo y owners fijos; se excluye `auth.uid()`.
4. El dedupe es `attendance_changed:{event_id}:{player_id}:{status}:{recipient_user_id}`.
5. Modelo objetivo: una capa server-side post-RPC llama dispatcher inmediato.
6. Fallback: `maintenance` diario reintenta rows pendientes.

## 8. Variables necesarias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

`VAPID_SUBJECT` hoy no se usa: `push-sender.service.ts` usa `mailto:ivnvldz7@gmail.com` hardcodeado.

## 9. Tests y validaciones conocidas

- `npm test`: reportado previamente como passing con 36 archivos y 202 tests.
- `npm run typecheck`: reportado previamente como passing.
- Integration focal `tests/integration/feat-006-attendance-rpc.test.ts`: bloqueado en esta máquina si Docker/Supabase local no está disponible.
- E2E semi-local: validó outbox, claim, dispatcher, attempts y errores diagnosticables.
- Prueba real Chrome: validó subscription real FCM, `maintenance`, `sent: 1`, `pushed_at` y notificación visible.
- Limitación: el click físico de la notificación del sistema operativo no fue automatizado; queda como verificación manual.

## 10. Próximo paso recomendado

1. Revertir `vercel.json` a cron diario para destrabar deploy.
2. Validar `attendance_changed` con integration en una máquina con Docker/Supabase local.
3. Implementar dispatch inmediato server-side para `event_created` y `attendance_changed`.
4. Implementar `attendance_reminder` 24h como outbox idempotente.
5. Validar push real en producción.

No implementar todavía:

- “70%”.
- Preferencias granulares.
- Rediseño UI completo.
- Rediseño service worker.
- Upgrade a Vercel Pro como dependencia.

## 11. Log de cambios recientes

- 2026-07-07 — Documentada arquitectura notifications v3 para Vercel Hobby: outbox + dispatcher inmediato + cron diario fallback.
- 2026-07-07 — Identificada causa de deploy fallido: cron `0 */3 * * *` incompatible con Vercel Hobby.
- 2026-07-06 — `attendance_changed` outbox para admin + owners fijos: migration, claim RPC específica, dispatcher y maintenance con fallos aislados.
- 2026-07-06 — Real browser push test: Chrome real recibió push `event_created`; `sent: 1`, `pushed_at` no null.
- 2026-07-06 — Service role grants: permisos explícitos de runtime para `service_role`.
- 2026-07-06 — `close-mvp` security fix: service role queda después de auth/authz.
- 2026-07-05 — Maintenance hardening: errores del dispatcher aislados para no romper todo el job.
- 2026-07-05 — `event_created` dispatcher: claim RPC y dispatcher server-side.
- 2026-07-05 — Push outbox foundation: metadata de outbox y `create_notification_once`.
