# NOTIFICATIONS_GUIDELINES.md

## 1. Principio central

Toda notificación que pueda disparar push debe nacer primero como row en `public.notifications`.

Regla:

`dominio -> notifications outbox -> dispatcher -> web push`

Prohibido:

- mandar push directo desde RPCs de dominio;
- mandar push directo desde componentes;
- mandar push directo desde pages;
- mandar push directo desde services de feature sin pasar por `notifications`;
- duplicar side effects de push en múltiples lugares.

## 2. Source of truth

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

## 3. pushed_at

`pushed_at` solo significa:

la push fue enviada exitosamente al menos a una subscription.

No setear `pushed_at` si:

- `push_enabled = false`;
- no hay subscription;
- falta VAPID config;
- falló web-push;
- el tipo no está habilitado para push;
- el evento ya no es válido para envío.

## 4. push_attempt_count

`push_attempt_count` solo debe subir cuando hubo intento real de envío.

No debe subir si:

- faltan VAPID keys;
- la notification no fue claimada;
- el usuario no tiene `push_enabled`;
- el usuario no tiene subscription;
- el tipo no es pushable.

## 5. push_last_error

`push_last_error` debe guardar errores diagnosticables de delivery.

Debe limpiarse cuando:

- un envío posterior sale exitoso.

## 6. Idempotencia

Toda notification generada por eventos de dominio debe tener `dedupe_key`.

Formato recomendado:

`{notification_type}:{scope}:{recipient_user_id}`

Ejemplos:

- `event_created:{event_id}:{user_id}`
- `attendance_reminder:{event_id}:{user_id}:24h`
- `attendance_changed:{event_id}:{player_id}:{status}:{recipient_user_id}`

No usar `dedupe_key null` en flujos pushables.

## 7. Destinatarios

Los destinatarios deben resolverse en una única capa clara:

- RPC si la lógica nace en SQL;
- service server-side si la lógica nace en TS.

Evitar resolver destinatarios duplicados en UI, API route y dispatcher al mismo tiempo.

Cada feature debe definir explícitamente:

- quién recibe;
- quién queda excluido;
- si el actor se auto-notifica o no;
- si phantoms quedan excluidos;
- si owners temporales aplican o no.

## 8. Preferences

El dispatcher debe respetar siempre:

`user_notification_preferences.push_enabled = true`

Tener subscription no alcanza.
Subscription válida + `push_enabled true` es obligatorio.

Si no existe row de preferences:

tratar como push deshabilitado.

El flujo de subscribe debe garantizar que, al guardar subscription válida, `push_enabled` quede true para el usuario autenticado.

## 9. Subscriptions

`push_subscriptions` debe usarse solo para delivery.

Si web-push devuelve 404 o 410:

- eliminar subscription inválida.

Otros errores:

- registrar `push_last_error`;
- no marcar `pushed_at`.

## 10. Dispatcher

El dispatcher es el único responsable de enviar push.

Debe:

- validar VAPID antes de claimar;
- claimar notifications pendientes;
- usar `FOR UPDATE SKIP LOCKED` en RPCs de claim;
- procesar solo tipos allowlisted;
- respetar max attempts;
- marcar `pushed_at` solo si `sent > 0`;
- registrar intentos y errores;
- no romper maintenance si falla.

## 11. Maintenance

`/api/jobs/maintenance` puede actuar como runner inicial de dispatchers.

Cada dispatcher debe estar aislado:

- `try/catch` propio;
- métricas propias;
- errores propios.

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

## 15. Prohibiciones explícitas

No hacer:

- push directo desde `update_attendance`, `create_event` u otras RPCs;
- push directo desde componentes React;
- agregar lógica de push en service worker salvo bug real;
- modificar migrations históricas salvo problema de idempotencia probado;
- agregar preferencias granulares sin diseño previo;
- incluir temporary owners sin decisión explícita;
- implementar 70% sin validar primero `attendance_reminder` 24h.

## 16. Protocolo para nuevas notificaciones

Antes de implementar cualquier nuevo tipo, responder:

1. ¿Qué evento de dominio la genera?
2. ¿Qué type usa?
3. ¿Quiénes reciben?
4. ¿Quiénes quedan excluidos?
5. ¿Cuál es el payload?
6. ¿Cuál es la dedupe_key?
7. ¿Es in-app solamente o in-app + push?
8. ¿Cuándo se despacha?
9. ¿Qué tests la cubren?
10. ¿Qué riesgos de spam tiene?

## 17. Estado actual

Push real validado para:

- `event_created`

En implementación/diseño:

- `attendance_changed` para admin + owners fijos cuando jugador pasa a `going`/`not_going`

Pendiente:

- `attendance_reminder` 24h
- 70%
- preferencias granulares
- push a temporary owners
- push para MVP/stats/owners/reintegration
