# Spec: mvp-shareable-link

## Overview

Cuando el admin carga el resultado de un partido, puede copiar un link para compartir la votación MVP. Los jugadores que reciben el link pueden votar mediante un overlay modal.

## Requirements

- **UR1**: El admin debe poder copiar un link para compartir la votación MVP después de cargar el resultado
- **UR2**: El link debe abrir un overlay modal de votación
- **UR3**: La votación debe respetar las reglas existentes (24h, no auto-voto, etc.)

## Scenarios

### Scenario 1: Admin comparte votación MVP
**Given** el admin acaba de cargar el resultado del partido exitosamente
**When** la página de resultado muestra el botón "Compartir votación MVP"
**And** el admin hace clic
**Then** se copia la URL: `/groups/{id}/events/{event_id}?votar-mvp={event_id}`

### Scenario 2: Player vota desde link
**Given** un player logueado abre el link con `?votar-mvp={event_id}`
**And** el evento está en estado `played`
**And** no votó previamente
**When** se monta el overlay de votación MVP
**Then** se muestra la lista de participantes (excluyendo al votante)
**When** selecciona un jugador y presiona "Votar"
**Then** se llama al RPC `submit_mvp_vote`
**And** el overlay se cierra con toast de éxito

### Scenario 3: Player ya votó
**Given** el player ya emitió su voto para este evento
**When** abre el link con `?votar-mvp={event_id}`
**Then** el overlay muestra un mensaje "Ya votaste" sin opción de votar de nuevo

### Scenario 4: Votación cerrada
**Given** el admin ya cerró la votación (MVP asignado)
**When** un player abre el link
**Then** el overlay muestra mensaje "La votación ya cerró"
