# REAL_BROWSER_EVENT_CREATED_PUSH_TEST.md

## Veredicto ejecutivo

Prueba ejecutada contra Supabase local porque `.env.local` apunta a Supabase remoto/producción y no se mutó ese entorno.

Resultado: el push real de `event_created` fue aceptado por FCM, `maintenance` reportó `sent: 1`, `notifications.pushed_at` quedó seteado y Chrome mostró la notificación vía service worker.

## Entorno usado

- App: `http://localhost:3000`
- Supabase: local
- Browser: Chrome real vía Playwright
- VAPID: claves locales de test
- Variables confirmadas sin imprimir valores:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: set en runtime local
  - `VAPID_PUBLIC_KEY`: set en runtime local
  - `VAPID_PRIVATE_KEY`: set en runtime local
  - `CRON_SECRET`: set en runtime local
  - `SUPABASE_SERVICE_ROLE_KEY`: set en runtime local
  - `NEXT_PUBLIC_SUPABASE_URL`: local override
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: local override

## Validaciones

1. Usuario/grupo/evento de prueba: creado en DB local.
2. `Notification.permission`: `granted`.
3. Service worker registrado:
   - scope: `http://localhost:3000/`
   - controller activo: `true`
4. `push_subscriptions`: endpoint real creado en Chrome:
   - host: `fcm.googleapis.com`
   - endpoint completo redactado.
5. `user_notification_preferences.push_enabled`: `true`.
6. Evento futuro creado vía `create_event`.
7. Notification `event_created` creada con:
   - `pushed_at: null`
   - `push_attempt_count: 0`
   - payload con `event_id`, `group_id`, `field_name`, `scheduled_at`.
8. `/api/jobs/maintenance` ejecutado con `CRON_SECRET`.
9. Dispatcher:
   - `claimed: 1`
   - `sent: 1`
   - `failed: 0`
   - `errors: []`
10. DB post-dispatch:
   - `pushed_at`: no null
   - `push_attempted_at`: no null
   - `push_attempt_count`: `1`
   - `push_last_error`: null
11. Notificación real visible para Chrome:
   - title: `Nuevo partido`
   - body: `Se creó un partido en tu grupo.`
12. Deeplink en notification data:
   - `/groups/{group_id}/events/{event_id}`

## Response de maintenance

```json
{
  "ok": true,
  "data": {
    "eventsCreated": 0,
    "eventsTransitioned": 1,
    "remindersSent": 0,
    "eventCreatedPushDispatch": {
      "claimed": 1,
      "sent": 1,
      "failed": 0,
      "staleDeleted": 0,
      "skipped": false,
      "errors": []
    },
    "errors": []
  }
}
```

## Estado final relevante

```json
{
  "type": "event_created",
  "pushed_at": "2026-07-06T04:17:39.318Z",
  "push_attempted_at": "2026-07-06T04:17:38.338Z",
  "push_attempt_count": 1,
  "push_last_error": null
}
```

## Click de la notificación

No se hizo click físico sobre la notificación del sistema operativo desde la automatización. Sí se verificó que la notificación mostrada por Chrome contiene:

```json
{
  "url": "/groups/{group_id}/events/{event_id}"
}
```

Y `src/app/sw.ts` usa `notificationclick` para abrir `notification.data.url`. Por código y payload, el deeplink está alineado; el click físico queda como verificación manual final.

## Comandos ejecutados

```bash
npm run supabase db reset
node .tmp-real-browser-event-created-push-test.cjs
```

## Notas

- No se usó producción.
- No se tocaron migrations.
- No se tocó UI.
- No se tocó service worker.
- No se cambió lógica de negocio.
- No se agregaron dependencias permanentes.
- La prueba asoció la subscription real de Chrome al usuario de prueba local vía DB para aislar el canal push. No validó login OAuth real de Google.

VEREDICTO: PUSH REAL FUNCIONA
