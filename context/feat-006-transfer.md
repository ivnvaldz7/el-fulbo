# feat-006 — transferencia operativa

## Estado real

`feat-006` quedó alineado al modelo canónico actual del repo.

### Source of truth

- UI: `src/app/groups/[id]/events/[event_id]/page.tsx`
- Lista en vivo: `src/components/EventAttendeesList/EventAttendeesList.tsx`
- Service layer: `src/lib/services/events.service.ts`
- RPC vigente: `supabase/migrations/20260504013000_feat_006_update_attendance_rpc.sql`
- Test focal: `tests/integration/feat-006-attendance-rpc.test.ts`

## Dominio válido

- `AttendanceStatus`: `going | not_going | maybe`
- Tabla: `public.event_attendances`
- Campo de check-in que consume feat-007: `checked_in`
- RPC vigente: `public.update_attendance(p_event_id, p_status)`

## Qué hace hoy

1. El player entra a `/groups/{id}/events/{event_id}`.
2. Ve 3 acciones: `Voy`, `No voy`, `Tal vez`.
3. La UI hace optimistic update.
4. El service llama al RPC `update_attendance`.
5. El detalle del evento queda suscripto a realtime sobre `event_attendances`.
6. La lista visible se recompone desde DB y filtra solo players `approved`.

## Reglas ya implementadas

- Solo se puede editar asistencia si el evento está en `scheduled` o `confirming`.
- Si el player tiene `stats_status = 'pending_approval'`, no puede confirmar.
- El RPC hace upsert sobre `(event_id, player_id)`.
- Si el player pasa de `going/maybe` a `not_going` y faltan menos de 6 horas, se crea `notification.type = 'someone_dropped'` para el admin.

## Qué se limpió

Estos artefactos ya NO forman parte de feat-006 y no deben revivirse:

- `src/components/ConfirmAttendance.jsx`
- `src/lib/services/eventAttendees.ts`
- migraciones stale de feat-006 incompatibles con el modelo actual

## Evidencia verificada

- `tests/integration/feat-006-attendance-rpc.test.ts` cubre:
  - upsert de asistencia
  - bloqueo por `pending_approval`
  - notificación `someone_dropped`
- El último rerun local del test falló por entorno:
  - `ECONNREFUSED 127.0.0.1:54322`
  - eso indica DB local no levantada, NO regresión lógica del RPC

## Riesgos / notas para quien siga

- `context/current-state.md` y `context/handoff.md` ya reflejan este estado.
- `openspec/changes/archive/2026-05-04-feat-006-confirm-attendance/*` quedó conceptualmente viejo frente al modelo real; sirve como historial, NO como verdad operativa.
- Si alguien retoma `feat-007`, debe partir de `checked_in` sobre `event_attendances`, no inventar otro dominio.

## Qué monitorear

- Que `update_attendance` siga siendo el único camino de escritura para confirmación individual.
- Que no reaparezcan estados legacy como `confirmed/declined/pending`.
- Que `feat-007` consuma `checked_in` sin romper `feat-006`.
