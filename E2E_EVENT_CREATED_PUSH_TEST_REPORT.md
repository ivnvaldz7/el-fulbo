# E2E_EVENT_CREATED_PUSH_TEST_REPORT.md

## 1. Resumen ejecutivo

**Base usada:** Supabase local. `.env.local` apunta a Supabase remoto, por eso no muté datos reales.

**Resultado:** el flujo funciona parcialmente en validación local/semi-local:

- ✅ `create_event` crea `notifications.event_created` con payload y dedupe correctos.
- ✅ `maintenance` llama al dispatcher.
- ✅ el dispatcher claimea notifications elegibles.
- ✅ si el envío falla, `push_attempted_at`, `push_attempt_count` y `push_last_error` quedan diagnosticables.
- ✅ si faltan/son inválidas las condiciones de envío, no se marca `pushed_at`.
- ❌ no se pudo verificar recepción real en navegador/service worker.
- ❌ no se pudo verificar `sent > 0` con push real; la prueba con fake endpoint falló antes de entregar por TLS/protocolo.

**Hallazgo importante:** con `supabase db reset` local, el `service_role` vía Supabase REST no tiene permisos de tabla suficientes para `events`, `push_subscriptions` y `notifications`. El RPC de claim puede ejecutarse, pero `getActiveSubscriptions` y el update de `notifications` fallan con permisos hasta aplicar grants locales temporales. Esto no se corrigió en migrations.

## 2. Entorno y herramientas

No instalé dependencias nuevas ni modifiqué `package.json`.

Usado:

- Supabase local (`npm run supabase db reset`).
- Next dev local (`npm run dev`) con overrides de Supabase local.
- Scripts temporales en `C:\tmp`.
- Playwright Chromium ya instalado.
- Fake push service temporal Node en `127.0.0.1:45678`.

No se tocaron:

- UI.
- Service worker.
- Migrations.
- `vercel.json`.
- Lógica de negocio.
- `attendance_reminder`.

## 3. Comandos ejecutados

```bash
npm run supabase db reset
npx supabase status
npm run dev
node C:\tmp\el-fulbo-e2e-seed.js
Invoke-WebRequest GET http://localhost:3000/api/jobs/maintenance con Authorization: Bearer <CRON_SECRET>
node C:\tmp\el-fulbo-e2e-check.js <event_id>
npx supabase db query "grant usage on schema public to service_role"
npx supabase db query "grant all privileges on all tables in schema public to service_role"
npx supabase db query "grant all privileges on all routines in schema public to service_role"
node C:\tmp\el-fulbo-browser-subscribe.js
```

Los grants fueron **temporales y solo en DB local** para poder continuar la validación HTTP de maintenance. No se modificaron migrations.

## 4. Queries SQL usadas

```sql
insert into auth.users (...);
insert into public.users (...);
insert into public.groups (...);
insert into public.group_memberships (...);
insert into public.players (... stats_status = 'approved', is_phantom = false ...);
insert into public.push_subscriptions (...);
insert into public.user_notification_preferences (user_id, push_enabled) values (..., true);

select public.create_event(
  $1::uuid,
  'F5'::public.modality,
  'E2E Cancha Push',
  'https://maps.example/e2e',
  $scheduled_at::timestamptz,
  'E2E push validation'
);

select id, user_id, type, payload, dedupe_key, pushed_at,
       push_attempted_at, push_attempt_count, push_last_error
from public.notifications
where payload->>'event_id' = $1;

select id, user_id, endpoint, user_agent
from public.push_subscriptions
where user_id = $1;

select user_id, push_enabled
from public.user_notification_preferences
where user_id = $1;
```

## 5. Resultado paso a paso

### 5.1 Supabase local

✅ `npm run supabase db reset` pasó completo.

### 5.2 App local

✅ Next levantó en `http://localhost:3000`.

Se arrancó con overrides de Supabase local para evitar usar la DB remota apuntada por `.env.local`.

### 5.3 Creación de evento / notification

✅ Evento creado por RPC `create_event`.

Evento de prueba:

- `eventId`: `2960ba02-2593-44c4-aeeb-1811ab83c6c2`
- `groupId`: `f2e4385b-7560-482f-96fc-bfcbb4d78afe`
- jugador destinatario: approved, no phantom, no archived, con `user_id`.

Notification creada con:

- `type = event_created`
- `payload.event_id`
- `payload.group_id`
- `payload.field_name`
- `payload.scheduled_at`
- `dedupe_key = event_created:{eventId}:{userId}`
- `pushed_at = null`
- `push_attempt_count = 0`

✅ Esto prueba realmente: `create_event -> outbox event_created`.

### 5.4 Maintenance antes de grants locales

Resultado HTTP:

```json
{
  "ok": true,
  "data": {
    "eventCreatedPushDispatch": {
      "claimed": 1,
      "sent": 0,
      "failed": 0,
      "staleDeleted": 0,
      "skipped": false,
      "errors": ["Necesitas iniciar sesion.", "Necesitas iniciar sesion."]
    },
    "errors": [
      "Failed to fetch schedules: permission denied for table group_recurring_schedules",
      "Failed to fetch events for transition: permission denied for table events",
      "Failed to fetch events for reminders: permission denied for table events"
    ]
  }
}
```

Estado DB posterior:

```json
{
  "pushed_at": null,
  "push_attempted_at": "2026-07-06T02:15:43.643Z",
  "push_attempt_count": 1,
  "push_last_error": null
}
```

Diagnóstico: claim RPC ejecutó, pero REST con service role local no pudo leer/updatear tablas por grants faltantes.

### 5.5 Maintenance después de grants locales temporales

Se creó segundo evento:

- `eventId`: `b6b83d12-5abd-4f73-816f-630c64580d35`
- subscription dummy hacia `https://example.com/...`

Resultado HTTP:

```json
{
  "ok": true,
  "data": {
    "eventsCreated": 0,
    "eventsTransitioned": 2,
    "remindersSent": 0,
    "eventCreatedPushDispatch": {
      "claimed": 2,
      "sent": 0,
      "failed": 2,
      "staleDeleted": 0,
      "skipped": false,
      "errors": [
        "Received unexpected response code",
        "Received unexpected response code"
      ]
    },
    "errors": []
  }
}
```

Estado final del segundo evento:

```json
{
  "pushed_at": null,
  "push_attempted_at": "2026-07-06T02:19:12.357Z",
  "push_attempt_count": 1,
  "push_last_error": "Received unexpected response code"
}
```

✅ Esto prueba realmente con HTTP local:

- maintenance ejecuta dispatcher;
- dispatcher claimea;
- web-push intenta enviar;
- failure queda diagnosticable;
- `pushed_at` no se marca si `sent = 0`.

### 5.6 Fake push service local

Se levantó fake service HTTP `127.0.0.1:45678` y se creó un tercer evento:

- `eventId`: `eb097c07-0a17-4b6d-bbbf-a8d90874f0ab`

Resultado maintenance:

```json
{
  "eventCreatedPushDispatch": {
    "claimed": 3,
    "sent": 0,
    "failed": 3,
    "staleDeleted": 0,
    "skipped": false,
    "errors": [
      "Received unexpected response code",
      "Received unexpected response code",
      "write EPROTO ... wrong version number"
    ]
  }
}
```

El fake push service no recibió request válida; `web-push` intentó TLS sobre endpoint HTTP y falló con `wrong version number`.

Resultado: no sirve para probar `sent > 0` sin fake HTTPS confiable o push service real.

### 5.7 Prueba navegador / PushSubscription real

Intento con Playwright Chromium:

- abrió `localhost:3000`;
- concedió permission `notifications`;
- esperó service worker;
- intentó `registration.pushManager.subscribe(...)`.

Resultado:

```text
AbortError: Registration failed - permission denied
```

No se pudo obtener PushSubscription real con Chromium headless/local. No se instaló nada.

## 6. Estado final de tablas relevantes

### notifications

Probado con notification `event_created` real creada por `create_event`.

Estado exitoso de creación:

- `type = event_created` ✅
- `payload.event_id` ✅
- `payload.group_id` ✅
- `payload.scheduled_at` futuro ✅
- `payload.field_name` ✅
- `dedupe_key` correcto ✅

Estado tras dispatch con endpoint inválido:

- `push_attempted_at` seteado ✅
- `push_attempt_count = 1` ✅
- `push_last_error = "Received unexpected response code"` ✅
- `pushed_at = null` ✅ correcto porque `sent = 0`

### push_subscriptions

Se insertó subscription local para usuario destinatario.

- `user_id` coincide con notification ✅
- endpoint existe ✅
- keys existen ✅

Pero fue dummy, no una subscription de navegador real.

### user_notification_preferences

- row existe ✅
- `push_enabled = true` ✅

## 7. Separación de cobertura

### Probado real

- Supabase local reset completo.
- RPC `create_event` real.
- Creación real de `notifications.event_created`.
- Payload y dedupe real.
- Maintenance HTTP local real.
- Dispatcher real.
- Claim real.
- Intento real de `web-push` contra endpoint dummy.
- Persistencia real de `push_attempted_at`, `push_attempt_count`, `push_last_error`.

### Probado con simulación/mock

- Subscription dummy insertada por script, no creada por navegador.
- Fake push service local intentado, pero no exitoso por TLS.

### No probado

- Recepción real de push en navegador/SO.
- `pushed_at` marcado por `sent > 0` en prueba E2E real.
- Click de notificación abriendo deeplink desde SW.
- Suscripción real vía UI autenticada.

## 8. Diagnóstico si no llega push

### VAPID

- Variables presentes en `.env.local`.
- `.env.example` no lista `VAPID_PUBLIC_KEY`, aunque server lo exige.
- `VAPID_SUBJECT` no existe en código; se usa mailto hardcodeado.

### Permissions / Browser

- Playwright Chromium no pudo crear PushSubscription: `Registration failed - permission denied`.
- Requiere prueba manual con navegador real, permiso concedido y contexto seguro.

### Service worker

- `src/app/sw.ts` maneja `push` y `notificationclick`.
- No se probó recepción real.

### Subscription

- Dispatcher exige existencia de row en `push_subscriptions`.
- Endpoint dummy genera error diagnosticable.
- 404/410 deberían limpiar stale subscriptions.

### CRON_SECRET

- Maintenance local respondió 200 con header correcto.
- Sin header debería devolver 403; no fue foco de esta prueba.

### Dispatcher

- Claimea y actualiza attempts correctamente.
- No marca `pushed_at` si `sent = 0`.

### Payload/deeplink

- Payload trae `event_id` y `group_id`.
- `getNotificationDeepLink('event_created')` puede construir `/groups/{group_id}/events/{event_id}`.

## 9. Configuración producción

`vercel.json` tiene:

```json
{
  "path": "/api/jobs/maintenance",
  "schedule": "0 8 * * *"
}
```

Frecuencia: diaria.

Esto es suficiente para batch/background, pero pobre para UX de “me avisan cuando crean partido”. Si el evento se crea después del cron, el push espera hasta el día siguiente; si para entonces el evento ya pasó, el dispatcher lo saltea por `scheduled_at`.

Para validación manual en producción conviene ejecutar `maintenance` manualmente con `CRON_SECRET`.

## 10. Bloqueos / riesgos encontrados

### Bloqueo 1 — local REST grants faltantes

Causa probable: migrations no otorgan grants de tabla a `service_role` para acceso vía Supabase REST tras `db reset`.

Efecto observado:

- `createServiceSupabaseClient` vía REST recibe `permission denied` para `events`, `group_recurring_schedules`, `push_subscriptions`, `notifications`.
- El claim RPC sí ejecuta porque tiene `grant execute` a `service_role`.
- Luego falla lectura de subscriptions y update de notification.

Archivo relacionado probable:

- migrations base / grants ausentes en `supabase/migrations/*`.

Propuesta mínima futura:

- agregar migration de grants explícitos para `service_role` sobre tablas/routines necesarias, o política de grants global consistente.
- verificar si producción ya tiene esos grants antes de tocar.

### Bloqueo 2 — no hay prueba real navegador

No se pudo crear PushSubscription real con Playwright Chromium headless.

Propuesta mínima:

- prueba manual con Chrome real en localhost/producción;
- usuario logueado;
- permiso notifications concedido;
- subscription creada desde UI.

## 11. Confirmaciones obligatorias

- ¿`event_created` genera notification? **Sí, probado real.**
- ¿maintenance claimea? **Sí, probado real.**
- ¿dispatcher envía? **Intenta enviar, probado real contra endpoint dummy. Envío exitoso real no probado.**
- ¿`pushed_at` se marca? **No en esta prueba porque `sent = 0`; el camino está cubierto por unit test, no por E2E real.**
- ¿la push llega al navegador? **No probado; Playwright no logró crear subscription real.**

## 12. Recomendación

No avanzaría todavía a `attendance_reminder` como producto.

Primero haría una de estas dos validaciones/correcciones:

1. Confirmar en producción si `service_role` puede leer `push_subscriptions` y actualizar `notifications` vía Supabase client server-side.
2. Hacer prueba manual con navegador real y subscription real.

Si producción muestra el mismo `permission denied`, corregir grants antes de seguir. Si producción funciona, entonces el gap es local-only y se puede documentar.

VEREDICTO: FUNCIONA PARCIALMENTE
