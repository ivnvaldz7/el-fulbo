# Spec: Asistencia compartida

## Requirements

### Requirement: Vista autenticada de convocatoria

The system MUST expose `/asistencia-compartida?eventId={id}` for authenticated app members.

#### Scenario: Miembro abre un enlace válido

- GIVEN un miembro autenticado recibe el enlace de un evento existente
- WHEN abre la ruta compartida
- THEN ve los datos del partido y el resumen de convocatoria
- AND ve las personas que van, no van, están en duda, en espera y sin responder

#### Scenario: Usuario no autenticado

- GIVEN un usuario no autenticado abre el enlace
- WHEN se carga la ruta
- THEN no se muestran datos del evento
- AND se muestra el acceso Google existente para continuar autenticándose

### Requirement: Confirmación desde la vista compartida

The system MUST allow the current member to select `going`, `not_going` or `maybe` from the shared view when attendance is editable.

#### Scenario: Jugador actualiza su respuesta

- GIVEN un jugador miembro ve un evento en estado `scheduled` o `confirming`
- WHEN selecciona una respuesta
- THEN se invoca `update_attendance`
- AND la vista refresca el estado actual y los conteos

### Requirement: Actualización en tiempo real

The system MUST update attendance data when another member changes their response.

#### Scenario: Cambio de otro jugador

- GIVEN dos miembros tienen abierta la vista compartida del mismo evento
- WHEN uno actualiza su asistencia
- THEN el otro recibe los datos actualizados sin recargar la página

### Requirement: Enlace inválido controlado

The system MUST show a controlled error for invalid or missing event identifiers.

#### Scenario: Evento inexistente

- GIVEN el `eventId` no existe o no es un UUID válido
- WHEN se abre la ruta
- THEN se muestra un mensaje de partido no encontrado
- AND no ocurre una excepción por normalizar una respuesta `null`
