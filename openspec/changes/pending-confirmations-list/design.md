# Design: Lista de faltantes de confirmación

## Technical Approach

Extender la lectura de la página del evento con una colección separada de jugadores aprobados sin respuesta. `event_attendances` sigue siendo la fuente para respuestas explícitas; los faltantes se derivan por diferencia contra `players` activos aprobados del `group_id` del evento.

## Architecture Decisions

| Decisión | Elección | Alternativas consideradas | Rationale |
|----------|----------|---------------------------|-----------|
| Faltantes derivados, no persistidos | Calcular por query al cargar el evento | Agregar estado `pending` en `event_attendances` | Evita migraciones y no inventa respuestas: ausencia de fila ya representa falta de respuesta. |
| Modelo separado en servicio | Agregar tipo/colección `pendingConfirmationPlayers` | Mezclar pendientes dentro de `EventAttendee` con status falso | Mantiene intacta la semántica de `AttendanceStatus` y reduce riesgo sobre listas actuales. |
| Visibilidad por RLS existente | Consultar desde cliente como miembro del grupo | Endpoint admin-only o service role | El requisito es visible para todos los miembros, no solo administradores. |

## Data Flow

```text
Event page
  ├─ getEventById(eventId) ──→ event.group_id
  ├─ getEventAttendees(eventId) ──→ respuestas explícitas
  └─ getPendingConfirmationPlayers(groupId, eventId)
       ├─ players: approved + active + same group
       └─ event_attendances: event_id
       = players sin attendance para ese evento

EventAttendeesList
  ├─ Faltan confirmar
  ├─ Van
  ├─ Lista de espera
  ├─ No van
  └─ Tal vez
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/services/events.service.ts` | Modify | Agregar tipo `PendingConfirmationPlayer`, normalizador y método para jugadores aprobados sin respuesta. |
| `src/lib/services/events.service.test.ts` | Modify | Tests unitarios de cálculo/filtros de faltantes. |
| `src/components/event-attendees-list/event-attendees-list.tsx` | Modify | Aceptar `pendingConfirmationPlayers` y renderizar `Faltan confirmar` sin alterar secciones actuales. |
| `src/components/event-attendees-list/event-attendees-list.test.tsx` | Create | Tests de componente para sección nueva y preservación de secciones existentes. |
| `src/app/groups/[id]/events/[event_id]/page.tsx` | Modify | Cargar faltantes con `event.group_id` y pasarlos a la lista. |
| `tests/integration/pending-confirmations-list.test.ts` | Create if needed | Validar query/RLS si el filtro por miembro no queda cubierto por unidad. |

## Interfaces / Contracts

```ts
interface PendingConfirmationPlayer {
  playerId: PlayerId;
  userId: UserId | null;
  displayName: string;
  photoUrl: string | null;
  joinedAt: string | null;
}
```

`EventAttendeesList` recibirá `attendees` para respuestas explícitas y `pendingConfirmationPlayers` para faltantes. La sección `Faltan confirmar` no usa `AttendanceStatus`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit service | Jugadores aprobados sin attendance, exclusión de pending/rejected/archivados/otro grupo | RED con Supabase mock/chained query; GREEN implementando método. |
| Component | Render de `Faltan confirmar` y preservación de `Van`, `Lista de espera`, `No van`, `Tal vez` | React Testing Library. |
| Integration | RLS/query real para miembros del grupo si el método requiere join complejo | Test Supabase local con usuario miembro no admin. |

## Migration / Rollout

No migration required. El cambio es derivado de datos existentes y puede desplegarse como una mejora de lectura/UI.

## Open Questions

- [ ] Confirmar durante implementación si la query más segura es `players` + anti-join en cliente o RPC read-only para evitar limitaciones de Supabase nested filters.