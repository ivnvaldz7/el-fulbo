# feat-012 — Sistema de notificaciones

## Objetivo

Mantener un sistema de notificaciones simple, auditable y compatible con Vercel Hobby para los eventos críticos de partido.

La arquitectura vigente es:

```text
evento de dominio -> public.notifications outbox -> dispatcher server-side -> Web Push
```

Para mejorar UX sin romper deploy en Hobby, el modelo objetivo agrega un trigger inmediato server-side y conserva el cron diario como fallback:

```text
evento de dominio
  -> public.notifications
  -> dispatcher inmediato server-side
  -> cron diario fallback/retry
```

## Referencias

- Lineamientos operativos: `docs/NOTIFICATIONS_GUIDELINES.md`.
- Estado actual: `docs/CURRENT_STATE.md`.
- Cambio SDD activo: `openspec/changes/notifications-v3-vercel-hobby/`.
- Reportes de validación: `E2E_EVENT_CREATED_PUSH_TEST_REPORT.md`, `REAL_BROWSER_EVENT_CREATED_PUSH_TEST.md`.

## Alcance actual

### Incluye

- Web Push para tipos críticos de partido.
- Feed in-app basado en `public.notifications`.
- Deep-links por tipo.
- Preferencia mínima `user_notification_preferences.push_enabled`.
- Auditoría de delivery con `pushed_at`, `push_attempted_at`, `push_attempt_count` y `push_last_error`.
- Dedupe obligatorio para toda notification pushable.
- Dispatcher inmediato server-side para UX razonable.
- `/api/jobs/maintenance` diario como fallback/retry.

### No incluye

- Emails transaccionales.
- Digests diarios/semanales.
- SMS.
- WhatsApp API oficial.
- Preferencias granulares por tipo.
- Rediseño visual completo de `/notifications`.
- Crons frecuentes en Vercel Hobby.

## Restricción de plataforma

Vercel Hobby permite cron jobs diarios. Expresiones más frecuentes, por ejemplo `0 */3 * * *`, fallan en deploy.

Por eso:

- no usar cron frecuente para entregar notificaciones críticas;
- no depender de `maintenance` como único mecanismo de UX inmediata;
- usar dispatch inmediato server-side después de acciones críticas;
- dejar el cron diario como fallback/retry.

## Tipos críticos

| Tipo | Cuándo nace | Destinatarios | Exclusiones | Deep-link |
|------|-------------|---------------|-------------|-----------|
| `event_created` | Admin/owner crea partido | Jugadores aprobados del grupo con `user_id` | Phantoms, archivados, actor si aplica por diseño | `/groups/{group_id}/events/{event_id}` |
| `attendance_changed` | Jugador cambia a `going` o `not_going` | Admin + owners fijos | Actor, temporary owners salvo decisión futura | `/groups/{group_id}/events/{event_id}` |
| `attendance_reminder` | Evento en ventana 0-24h | Jugadores aprobados que no están `going` | Phantoms, sin `user_id`, ya confirmados | `/groups/{group_id}/events/{event_id}` |

## Reglas de outbox

- Toda row pushable debe tener `dedupe_key`.
- `pushed_at` solo significa que al menos una subscription recibió push (`sent > 0`).
- `push_attempt_count` solo sube cuando hubo intento real de envío.
- `push_last_error` debe guardar errores diagnosticables.
- Si no hay VAPID config, no se claimean rows.
- Si `push_enabled` falta o es false, no se envía push.
- Si web-push devuelve 404/410, se elimina la subscription stale.

## Dispatcher

El dispatcher es el único responsable de enviar Web Push.

Debe:

- correr solo server-side;
- usar service role para claim/update;
- procesar tipos allowlisted;
- respetar `limit` y `maxAttempts`;
- usar claim RPCs service-role-only con locking;
- marcar `pushed_at` solo si `sent > 0`;
- registrar errores sin romper el flujo de dominio;
- devolver métricas: `claimed`, `sent`, `failed`, `staleDeleted`, `skipped`, `errors`.

## UI mínima

- `/notifications` muestra el feed in-app.
- La campana/badge refleja notificaciones no leídas si el componente está activo.
- Cada item usa copy y deeplink definidos por tipo.
- Settings mantiene al menos el toggle `push_enabled`.
- Si el browser bloquea permisos, la UI debe informar que el navegador está bloqueando las notificaciones.

## Criterios de aceptación

- [ ] `vercel.json` no contiene crons más frecuentes que diario.
- [ ] `event_created` crea rows con dedupe y se puede despachar inmediatamente.
- [ ] `attendance_changed` crea rows para admin + owners fijos, excluyendo actor.
- [ ] `attendance_reminder` crea rows idempotentes para no confirmados en 0-24h.
- [ ] Dispatcher no envía push si `push_enabled` es false o falta.
- [ ] `pushed_at` se marca solo cuando `sent > 0`.
- [ ] Errores quedan en `push_last_error`.
- [ ] Unit tests cubren copy/deeplink y dispatcher.
- [ ] Integration tests cubren creación/dedupe para tipos críticos.
- [ ] Prueba real browser valida al menos un push end-to-end después del deploy.
