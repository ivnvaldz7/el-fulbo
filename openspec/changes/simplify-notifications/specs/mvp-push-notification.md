# Spec: mvp-push-notification

## Overview

Cuando el admin cierra la votación MVP, además de las notificaciones in-app existentes (`mvp_awarded`, `boost_applied`), se envía un push notification al ganador.

## Requirements

- **UR1**: El ganador del MVP debe recibir un push notification
- **UR2**: El push debe enviarse solo al ganador (no a todos los participantes)
- **UR3**: El push debe enviarse inline (no vía cron) cuando el admin cierra la votación

## Scenarios

### Scenario 1: Push al ganador
**Given** una votación MVP con ganador definido (sin empate)
**When** el admin ejecuta `closeMvpVoting()` en el service
**Then** el RPC `close_mvp_voting` se ejecuta (crea notifs in-app)
**And** el service lee el evento actualizado para obtener `mvp_player_id`
**And** el service lee el `user_id` del player ganador
**And** se llama `sendPushToUser()` con payload `{ title: "¡Sos el MVP!", body: "..." }`

### Scenario 2: Sin ganador (empate sin tiebreaker)
**Given** hay un empate en la votación
**When** el admin ejecuta `closeMvpVoting()` sin tiebreaker
**Then** el RPC lanza excepción `EMPATE`
**And** NO se envía push notification

### Scenario 3: Ganador sin push habilitado
**Given** el ganador del MVP no tiene push habilitado
**When** se llama a `sendPushToUser()`
**Then** la función detecta que no hay subscriptions activas
**And** no se envía el push (sin error)
**And** las notificaciones in-app se crearon correctamente
