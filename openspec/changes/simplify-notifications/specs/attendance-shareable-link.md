# Spec: attendance-shareable-link

## Overview

Cuando un evento transiciona a estado `confirming`, el admin puede copiar un link compartible. Los jugadores que reciben el link pueden confirmar asistencia mediante un overlay modal.

## Requirements

- **UR1**: El admin debe poder copiar un link para compartir la confirmación de asistencia
- **UR2**: El link debe abrir un overlay modal de confirmación sin requerir navegación adicional
- **UR3**: Si el usuario no está autenticado, debe loguearse y luego ser redirigido al overlay
- **UR4**: El overlay debe mostrar las opciones "Voy / No voy / Tal vez"

## Scenarios

### Scenario 1: Admin copia link de confirmación
**Given** un evento en estado `confirming`
**And** el usuario es admin/owner del grupo
**When** el usuario hace clic en "Copiar link de confirmación"
**Then** se copia al portapapeles la URL: `/groups/{id}/events/{event_id}?confirmar={event_id}`

### Scenario 2: Player confirma desde link
**Given** un player logueado recibe el link
**When** abre el link en el navegador
**Then** la página del evento se muestra con un overlay modal de confirmación
**And** el overlay tiene botones "Voy", "No voy", "Tal vez"
**When** selecciona "Voy"
**Then** se llama al RPC `update_attendance` con status `going`
**And** el overlay se cierra
**And** se muestra un toast de éxito

### Scenario 3: Player no logueado abre link
**Given** un player NO logueado recibe el link
**When** abre el link
**Then** el middleware de auth redirige al login de Google
**After** login exitoso, redirige a la URL original con `?confirmar={event_id}`
**Then** el overlay modal se muestra correctamente

### Scenario 4: Admin en evento sin estado confirming
**Given** un evento en estado `drawn` o `played`
**When** el admin ve la página del evento
**Then** NO se muestra el botón "Copiar link de confirmación"
