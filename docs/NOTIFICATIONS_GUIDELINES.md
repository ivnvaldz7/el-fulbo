# NOTIFICATIONS_GUIDELINES.md

Última actualización: 2026-07-07.

## 1. Principio central

Toda notificación que pueda disparar push debe nacer primero como row en `public.notifications`.

Regla:

```text
dominio -> notifications outbox -> dispatcher -> web push
```

Modelo objetivo para Vercel Hobby:

```text
dominio
  -> notifications outbox
  -> dispatcher inmediato server-side
  -> cron diario fallback/retry
```

Prohibido:

- mandar push directo desde componentes React;
- mandar push directo desde pages;
- mandar push directo desde SQL;
- duplicar side effects de push en múltiples lugares;
- usar cron frecuente en Vercel Hobby para entregar notificaciones críticas.

## 2. Restricción Vercel Hobby

Vercel Hobby permite cron jobs diarios. Expresiones como estas rompen deploy:

- `0 */3 * * *`
- `0 * * * *`
- `*/30 * * * *`

Por eso:

- `/api/jobs/maintenance` debe quedar diario;
- el cron diario es fallback/retry, no mecanismo principal de UX inmediata;
- acciones críticas deben disparar un dispatcher server-side inmediato después de crear rows en outbox;
- si se necesita cron frecuente real, la decisión explícita es subir a Vercel Pro.

## 3. Source of truth

`public.notifications` es el source of truth para:

- feed in-app;
- outbox de push;
- auditoría de envío;
- deduplicación;
- diagnóstico de fallos.

Campos relevantes:

- `type`
- `payload`
- `dedupe_key`
- `pushed_at`
- `push_attempted_at`
- `push_attempt_count`
- `push_last_error`

## 4. Tipos críticos actuales

| Tipo | Estado | Regla |
|------|--------|-------|
| `event_created` | Validado en browser real local | Nace al crear partido; se despacha por outbox. |
| `attendance_changed` | Implementado localmente, pendiente de integration final | Admin + owners fijos reciben cambios a `going`/`not_going`; actor excluido. |
| `attendance_reminder` | Próximo tipo a implementar | Recordatorio 0-24h para jugadores que no están `going`. |

No implementar todavía:

- lógica de “70%”;
- preferencias granulares;
- temporary owners;
- MVP/stats/owners/reintegration push.

## 5. Dedupe

Toda notification generada por eventos de dominio debe tener `dedupe_key`.

Formatos recomendados:

- `event_created:{event_id}:{user_id}`
- `attendance_changed:{event_id}:{player_id}:{status}:{recipient_user_id}`
- `attendance_reminder:{event_id}:{user_id}:24h`

No usar `dedupe_key null` en flujos pushables.

## 6. Destinatarios

Los destinatarios deben resolverse en una única capa clara:

- RPC si la lógica nace en SQL;
- service server-side si la lógica nace en TypeScript.

Cada feature debe definir:

- quién recibe;
- quién queda excluido;
- si el actor se auto-notifica o no;
- si phantoms quedan excluidos;
- si owners temporales aplican o no.

## 7. Preferences

El dispatcher debe respetar siempre:

```text
user_notification_preferences.push_enabled = true
```

Tener subscription no alcanza. Subscription válida + `push_enabled true` es obligatorio.

Si no existe row de preferences, tratar como push deshabilitado.

El flujo de subscribe debe garantizar que, al guardar una subscription válida, `push_enabled` quede true para el usuario autenticado.

## 8. Delivery fields

### `pushed_at`

`pushed_at` solo significa que la push fue enviada exitosamente al menos a una subscription.

No setear `pushed_at` si:

- `push_enabled = false`;
- no hay subscription;
- falta VAPID config;
- falló web-push;
- el tipo no está habilitado para push;
- el evento ya no es válido para envío.

### `push_attempt_count`

`push_attempt_count` solo debe subir cuando hubo intento real de envío.

No debe subir si:

- faltan VAPID keys;
- la notification no fue claimada;
- el usuario no tiene `push_enabled`;
- el usuario no tiene subscription;
- el tipo no es pushable.

### `push_last_error`

`push_last_error` debe guardar errores diagnosticables de delivery y limpiarse cuando un envío posterior sale exitoso.

## 9. Dispatcher

El dispatcher es el único responsable de enviar Web Push.

Debe:

- correr solo server-side;
- validar VAPID antes de claimar;
- claimar notifications pendientes;
- usar RPCs service-role-only con locking;
- procesar solo tipos allowlisted;
- respetar max attempts;
- marcar `pushed_at` solo si `sent > 0`;
- registrar intentos y errores;
- eliminar subscriptions stale en 404/410;
- no romper el flujo de dominio si falla.

## 10. Dispatch inmediato

Para UX razonable en Hobby, acciones críticas deben invocar dispatch inmediato server-side después de que el evento de dominio fue exitoso.

Reglas:

- el evento de dominio no se revierte si falla el push;
- el trigger inmediato es best-effort;
- las rows quedan disponibles para retry diario;
- el endpoint/server action debe usar service role internamente;
- nunca exponer service role al cliente.

## 11. Maintenance diario

`/api/jobs/maintenance` debe correr diario en Hobby.

Responsabilidades:

- crear eventos recurrentes;
- transicionar estados diarios;
- crear `attendance_reminder` idempotentes;
- despachar/reintentar rows pushables pendientes;
- aislar cada dispatcher con `try/catch` propio.

Una falla en un dispatcher no debe romper todo maintenance.

## 12. Seguridad

RPCs/helper sensibles deben tener permisos explícitos.

Reglas:

- `create_notification_once` es helper privado.
- No debe ser ejecutable por `anon`/`authenticated`.
- Claims de push deben ser service-role-only.
- `service_role` necesita grants SQL explícitos para tablas usadas vía PostgREST.
- No depender de permisos implícitos de Supabase.
- No relajar RLS para resolver errores de permisos.

## 13. Payload y deeplinks

Todo tipo nuevo debe definir:

- payload mínimo;
- copy;
- deeplink;
- fallback si falta payload;
- tests de deeplink/copy.

Para eventos, payload mínimo recomendado:

- `group_id`
- `event_id`
- `scheduled_at`
- `field_name` cuando aplique
- `group_name` cuando mejore el copy
- `player_name` cuando aplique

## 14. Tests mínimos para cada notification type pushable

Cada nuevo tipo pushable debe agregar tests de:

- creación de notification;
- dedupe;
- destinatarios;
- exclusiones;
- deeplink/copy;
- dispatcher éxito;
- dispatcher fallo;
- `pushed_at`;
- `push_last_error`;
- permisos de claim RPC;
- integration con db reset si toca migrations.

## 15. Protocolo para nuevas notificaciones

Antes de implementar cualquier nuevo tipo, responder:

1. ¿Qué evento de dominio la genera?
2. ¿Qué type usa?
3. ¿Quiénes reciben?
4. ¿Quiénes quedan excluidos?
5. ¿Cuál es el payload?
6. ¿Cuál es la dedupe_key?
7. ¿Es in-app solamente o in-app + push?
8. ¿Cuándo se despacha?
9. ¿Qué pasa si falla el dispatch inmediato?
10. ¿Qué tests la cubren?
11. ¿Qué riesgos de spam tiene?
