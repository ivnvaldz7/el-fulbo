# Event Confirmation Specification

## Purpose

Define el comportamiento de la lista de confirmación del evento para miembros del grupo, incluyendo jugadores que ya respondieron y jugadores aprobados que todavía no respondieron.

## ADDED Requirements

### Requirement: Lista de faltantes de confirmación

El sistema MUST mostrar una sección `Faltan confirmar` en la lista de confirmación del partido para todos los miembros del grupo que pueden ver la página del evento.

#### Scenario: Miembro ve jugadores sin respuesta

- GIVEN un evento visible para un miembro del grupo
- AND existen jugadores aprobados activos del mismo grupo sin fila en `event_attendances` para ese evento
- WHEN el miembro abre la página del evento
- THEN la lista de confirmación MUST mostrar `Faltan confirmar` con esos jugadores
- AND la sección MUST mostrar el conteo correcto.

#### Scenario: Jugador ya respondió

- GIVEN un jugador aprobado del grupo tiene una fila en `event_attendances` para el evento
- WHEN se calcula la sección `Faltan confirmar`
- THEN el jugador MUST NOT aparecer en `Faltan confirmar`
- AND MUST permanecer únicamente en su sección de respuesta actual.

### Requirement: Filtros de elegibilidad de faltantes

El sistema MUST calcular faltantes únicamente con jugadores activos, aprobados y pertenecientes al grupo del evento.

#### Scenario: Jugadores no elegibles quedan excluidos

- GIVEN hay jugadores `pending_approval`, rechazados, archivados o de otro grupo
- WHEN se calcula la sección `Faltan confirmar`
- THEN esos jugadores MUST NOT aparecer en la sección
- AND el cálculo MUST NOT depender de permisos admin-only.

#### Scenario: Sin faltantes

- GIVEN todos los jugadores aprobados activos del grupo tienen respuesta para el evento
- WHEN se renderiza la lista
- THEN `Faltan confirmar` MUST mostrar conteo 0
- AND SHOULD usar un empty state claro.

### Requirement: Secciones existentes preservadas

El sistema MUST preservar las secciones actuales `Van`, `Lista de espera`, `No van` y `Tal vez` sin cambiar su semántica ni sus conteos.

#### Scenario: Respuestas existentes no cambian

- GIVEN el evento tiene asistentes con estados `going`, `waitlist`, `not_going` y `maybe`
- WHEN se agrega la sección `Faltan confirmar`
- THEN cada asistente MUST seguir apareciendo en la misma sección que antes
- AND los conteos existentes MUST mantenerse correctos.
