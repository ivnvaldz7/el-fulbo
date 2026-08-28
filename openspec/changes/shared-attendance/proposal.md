# Proposal: Asistencia compartida

## Intent

Dar a los miembros logueados una vista rápida, compartible por WhatsApp, para consultar y actualizar la convocatoria de un partido sin navegar por el dashboard completo.

## Scope

### Incluye

- Nueva ruta `/asistencia-compartida?eventId={id}`.
- Vista compacta con fecha, cancha, estado y resumen de convocatoria.
- Estados visibles: van, no van, tal vez, lista de espera y sin responder.
- Confirmación de asistencia desde la misma vista.
- Actualización en tiempo real mediante Supabase Realtime.
- Reutilización de `EventsService`, RLS, RPC `update_attendance` y estilos existentes.
- Validación de `eventId` y estado controlado para partidos inexistentes.

### No incluye

- Acceso anónimo o enlaces públicos.
- Nuevos estados, tablas, RPCs o cambios en la lógica de Grupos.
- Cambios al flujo de login o a las reglas de permisos existentes.

## Success criteria

- Un miembro logueado puede abrir el enlace y ver la convocatoria actualizada.
- Puede confirmar, rechazar o marcar “Tal vez” desde la vista.
- Otro cambio de asistencia aparece sin recargar manualmente.
- Un enlace inválido muestra un mensaje controlado y no produce un error de null.
