# Proposal: Lista de faltantes de confirmación

## Intent

Reducir incertidumbre antes del partido mostrando, en la lista de confirmación, qué jugadores aprobados del grupo todavía no respondieron. Hoy la UI muestra quienes van, no van, tal vez o están en espera, pero oculta el universo de jugadores habilitados que siguen sin respuesta.

## Scope

### Incluye
- Agregar la sección `Faltan confirmar` en la lista de asistencia del evento.
- Calcular faltantes como jugadores activos y aprobados del grupo que no tienen fila en `event_attendances` para ese evento.
- Hacer la sección visible para todos los miembros que ya pueden ver la página del evento.
- Mantener sin cambios las secciones actuales: `Van`, `Lista de espera`, `No van`, `Tal vez`.

### No incluye
- Nuevos estados en `attendance_status`.
- Notificaciones, recordatorios ni automatizaciones.
- Cambios de permisos para confirmar asistencia.
- Implementación de app en este cambio de planificación.

## Capabilities

### New Capabilities
- `event-confirmation`: comportamiento visible de la lista de confirmación del evento, incluyendo jugadores con y sin respuesta.

### Modified Capabilities
- None.

## Approach

Extender el modelo de lectura del evento para traer, junto con asistentes, los jugadores aprobados del grupo sin respuesta. La UI debe renderizar esa colección como una sección adicional del componente de lista, sin mezclarla con los estados persistidos.

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/lib/services/events.service.ts` | Modified | Consulta y normalización de jugadores pendientes de respuesta. |
| `src/components/event-attendees-list/event-attendees-list.tsx` | Modified | Nueva sección `Faltan confirmar`. |
| `src/app/groups/[id]/events/[event_id]/page.tsx` | Modified | Pasar los faltantes al componente de lista. |
| `tests/integration/` | Modified | Cobertura opcional si la consulta/RLS requiere validación real. |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Doble conteo entre respondidos y faltantes | Medium | Tests de servicio con jugadores con y sin `event_attendances`. |
| Filtrar jugadores no aprobados o externos incorrectamente | Medium | Tests con `pending_approval`, `rejected`, archivados y otro grupo. |
| Sobrecargar la página con queries adicionales | Low | Reutilizar `event.group_id` y consultar solo campos necesarios. |

## Rollback Plan

Revertir los cambios de lectura y UI. Como no hay migración ni nuevos datos persistidos, el rollback elimina la sección y vuelve al comportamiento actual.

## Dependencies

- RLS actual de `players` y `event_attendances` debe permitir lectura a miembros del grupo.
- `event.group_id` debe estar disponible antes de calcular faltantes.

## Success Criteria

- [ ] La lista muestra `Faltan confirmar: N` para miembros visibles del evento.
- [ ] Solo aparecen jugadores aprobados, activos y del mismo grupo sin fila en `event_attendances`.
- [ ] No cambian los conteos ni el render de `Van`, `Lista de espera`, `No van`, `Tal vez`.