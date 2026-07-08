# Real Browser Attendance Changed Push Test

`attendance_changed` quedó validado end-to-end con Chrome real, Supabase local y el dispatcher real de `/api/jobs/maintenance`.

## Resultado

✅ **Aprobado** — Chrome generó una `PushSubscription` real contra FCM y `maintenance` entregó la push con `sent: 1`.

## Evidencia

| Check | Resultado |
| --- | --- |
| Browser | Google Chrome real |
| Permission | `granted` |
| Push endpoint | `fcm.googleapis.com` |
| Notification type | `attendance_changed` |
| Estado probado | `going` |
| Notifications before dispatch | `pushed_at: null`, `push_attempt_count: 0` |
| Maintenance status | `200` |
| Dispatcher result | `claimed: 1`, `sent: 1`, `failed: 0`, `skipped: false`, `errors: []` |
| Notifications after dispatch | `pushed_at` seteado, `push_attempt_count: 1`, `push_last_error: null` |

## Comando ejecutado

```bash
npm run supabase:reset
npm run local:check
node .test-scripts/attendance-push-real.mjs
```

## Alcance

Esta prueba valida:

- generación real de `PushSubscription` en Chrome;
- endpoint real FCM;
- guardado de subscription para un usuario local;
- creación de `notifications.attendance_changed` desde `update_attendance`;
- claim real por `claim_attendance_changed_push_notifications`;
- envío real por `web-push`;
- actualización de `pushed_at` solo cuando `sent > 0`.

## Limitación

El click físico sobre la notificación del sistema operativo no fue automatizado. La evidencia cerrada es delivery real aceptado por FCM + estado persistido por el dispatcher.

## Próximo paso

Con `attendance_changed` cerrado técnicamente, el siguiente bloque recomendado es `attendance_reminder` 24h idempotente.
