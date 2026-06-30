# Spec: maintenance-cron

## Overview

Cron diario unificado que reemplaza los crons `create-recurring-events`, `event-transitions`, `daily-digest`, `weekly-digest` y `push-delivery`. Corre una vez al día y maneja: creación de eventos recurrentes, transiciones de estado de eventos, y recordatorios push.

## Requirements

- **UR1**: El cron debe ejecutarse una vez al día (Vercel Hobby)
- **UR2**: Debe crear eventos desde schedules recurrentes dentro de su ventana `days_ahead`
- **UR3**: Debe transicionar eventos de `scheduled` a `confirming` cuando falten 24-48h
- **UR4**: Debe enviar push recordatorio a jugadores que no confirmaron cuando falten 0-24h
- **UR5**: No debe crear eventos duplicados

## Scenarios

### Scenario 1: Creación de eventos recurrentes
**Given** un grupo con schedule recurrente activo (lunes 21:00, days_ahead=4)
**When** el cron se ejecuta y detecta que el próximo lunes está dentro de days_ahead
**And** no existe un evento duplicado en la ventana de ±2h
**Then** crea el evento con status `scheduled`
**And** notifica a los jugadores aprobados vía `createNotification('event_created')`

### Scenario 2: Transición a confirming
**Given** un evento con status `scheduled` y `scheduled_at` entre now+24h y now+48h
**When** el cron se ejecuta
**Then** actualiza el evento a status `confirming`

### Scenario 3: Recordatorio push a no confirmados
**Given** un evento con status `confirming` y `scheduled_at` entre now y now+24h
**When** el cron se ejecuta
**Then** consulta los players aprobados del grupo
**And** consulta sus attendances para este evento
**And** filtra los que NO tienen status `going`
**And** envía `sendPushToUser()` a cada uno con título "Faltan 24hs para el partido"

### Scenario 4: Sin eventos pendientes
**Given** no hay eventos elegibles para ninguna de las 3 operaciones
**When** el cron se ejecuta
**Then** retorna `{ eventsCreated: 0, eventsTransitioned: 0, remindersSent: 0 }`
