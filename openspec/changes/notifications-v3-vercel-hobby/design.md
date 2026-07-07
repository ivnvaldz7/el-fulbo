# Design: Notifications v3 for Vercel Hobby

## Technical Approach

La arquitectura objetivo conserva el outbox y agrega un disparador inmediato controlado desde servidor:

```text
domain event
  -> public.notifications rows
  -> immediate server-side dispatcher trigger
  -> web-push delivery
  -> daily maintenance fallback/retry
```

Esto evita el falso dilema entre UX inmediata y compatibilidad con Hobby. El cron diario no es el mecanismo principal para notificaciones críticas; es red de seguridad.

## Architecture Decisions

### Decision: Mantener outbox como source of truth

**Choice**: Toda notificación pushable nace en `public.notifications`.

**Rationale**: Permite feed in-app, auditoría, dedupe, retries y diagnóstico. Push directo desde React, SQL o servicios de feature dispersos rompe trazabilidad.

### Decision: Dispatcher inmediato server-side

**Choice**: Después de acciones críticas, una capa server-side autorizada invoca el dispatcher para procesar tipos específicos recién creados.

**Rationale**: Vercel Hobby no permite cron frecuente. El dispatcher inmediato entrega buena UX sin violar límites de plataforma.

### Decision: Cron diario solo como fallback

**Choice**: `/api/jobs/maintenance` queda diario y procesa pendientes/retries, además de tareas batch existentes.

**Rationale**: Mantiene compatibilidad de deploy. Si falla el trigger inmediato, las rows siguen en outbox y el fallback las procesa.

## Data Flow

### `event_created`

```text
Admin/owner crea evento
  -> RPC create_event inserta notifications.event_created por recipient
  -> API/server action post-RPC llama dispatcher event_created
  -> dispatcher claimea rows pendientes
  -> sendPushToUser entrega a subscriptions activas
  -> pushed_at se marca si sent > 0
```

### `attendance_changed`

```text
Jugador cambia asistencia
  -> RPC update_attendance inserta notifications.attendance_changed para admin + owners fijos
  -> API/server action post-RPC llama dispatcher attendance_changed
  -> dispatcher excluye actor por diseño de la RPC
  -> delivery se audita en notifications
```

### `attendance_reminder`

```text
Maintenance diario
  -> detecta eventos en ventana 0-24h
  -> crea rows notifications.attendance_reminder idempotentes
  -> llama dispatcher attendance_reminder
  -> si el timing del cron llega tarde, no duplica por dedupe_key
```

## Interfaces / Contracts

### Dispatcher service

- Debe aceptar `limit` y `maxAttempts`.
- Debe validar VAPID antes de claimar.
- Debe procesar solo tipos allowlisted.
- Debe registrar `push_last_error` si no hay envío exitoso.
- Debe marcar `pushed_at` solo cuando `sent > 0`.

### Immediate trigger

- Debe ejecutarse únicamente server-side.
- Debe usar service role internamente.
- Debe ser best-effort: si falla el push, no revierte el evento de dominio.
- Debe devolver métricas mínimas: `claimed`, `sent`, `failed`, `staleDeleted`, `errors`.

### Vercel config

- Todo cron en `vercel.json` debe ser diario en Hobby.
- No usar expresiones como `0 */3 * * *`, `0 * * * *` o `*/30 * * * *`.

## Rollout

1. Documentar specs y estado actual.
2. Revertir el cron de `maintenance` a frecuencia diaria antes de deploy.
3. Implementar trigger inmediato por tipo crítico.
4. Agregar `attendance_reminder` como outbox idempotente.
5. Validar con unit/integration y prueba real de browser.

