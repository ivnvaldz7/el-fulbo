# Proposal: implementa la logica de la fase 5 (feat-005)

## Intent

Habilitar a los administradores y dueños de grupos para crear, editar y cancelar partidos (Eventos) de forma rápida y sencilla. Esto resuelve la necesidad central de organizar los partidos, notificando automáticamente a los jugadores con su carta de jugador aprobada.

## Scope

### In Scope
- Formulario de creación de evento en UI con precarga inteligente (próximo sábado, 20:00, modalidad por defecto).
- Guardado de borrador (draft) en `localStorage`.
- Funciones RPC en base de datos para `create_event`, `update_event`, y `cancel_event`.
- Despacho de notificaciones a los jugadores (creación, reprogramación, actualización, cancelación).
- Visualización de evento en el Dashboard y la vista dedicada del partido.
- Soporte para múltiples partidos el mismo día.

### Out of Scope
- Confirmación de asistencia (feat-006).
- Check-in físico en la cancha (feat-007).
- Sorteo y rellenado de huecos (feat-007).
- Carga de resultados y MVP (feat-008).
- Partidos recurrentes (series).

## Capabilities

### New Capabilities
- `event-management`: Creación, edición, y cancelación de partidos por parte de un administrador o dueño del grupo, con persistencia de estado y validación de reglas de negocio temporales.
- `event-notifications`: Emisión y envío de notificaciones de creación y cambio de estado de partidos a los jugadores activos y aprobados.

### Modified Capabilities
- None

## Approach

Implementaremos el endpoint de UI en `src/app/groups/[id]/events/new/page.tsx` para el formulario de creación, gestionando el borrador localmente con `localStorage`. En la base de datos, escribiremos las funciones RPC (`create_event`, `update_event`) requeridas para que, en una misma transacción, se inserte el evento y se creen los registros de notificaciones in-app para los jugadores aplicables. La página del evento (`src/app/groups/[id]/events/[event_id]/page.tsx`) se construirá para presentar la información generada.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/groups/[id]/events/` | New | Rutas de UI para crear, ver y editar partidos |
| `src/app/groups/[id]/dashboard/` | Modified | Integración del próximo partido destacado |
| `supabase/migrations/` | New | RPC functions para `create_event`, `update_event`, `cancel_event` |
| `src/lib/services/events.service.ts`| New | Llamadas a API |
| `tests/integration/` | New | Tests del flujo de creación y cancelación |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Inconsistencia de notificaciones si falla la red | Low | Las notificaciones se generarán en la misma transacción SQL vía la función RPC `create_event`. |
| Jugadores en estado pending reciben invitaciones | Low | La consulta SQL de inserción filtrará explícitamente `stats_status = 'approved'`. |
| Eventos duplicados por submits paralelos | Low | Bloquear UI durante el submit y limpiar borrador local inmediatamente. |

## Rollback Plan

Revertiremos el commit o rama correspondiente. Si la migración de BD se ejecutó, se publicará una migración inversa borrando la función RPC y volviendo a la versión previa del esquema.

## Dependencies

- Configuración actual del modelo de `Group` y `Player` (validación de carta aprobada).

## Success Criteria

- [ ] Un Admin puede crear exitosamente un partido y guardarlo en la base de datos.
- [ ] Los jugadores con carta aprobada reciben la notificación correspondiente en la misma transacción.
- [ ] La UI guarda drafts en localStorage y valida inputs correctamente.
- [ ] El partido se puede editar o cancelar y notifica apropiadamente.
