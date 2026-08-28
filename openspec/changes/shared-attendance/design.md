# Design: Asistencia compartida

## Technical approach

La ruta server-side valida la sesión y el parámetro `eventId`. Si el usuario no está autenticado, muestra el acceso de Google existente con un `nextPath` hacia la ruta compartida. Una vez autenticado, un componente cliente carga el evento y sus datos de asistencia a través de `EventsService`.

La suscripción Realtime escucha cambios de `event_attendances` filtrados por `event_id` e invalida la query local. La mutación usa el RPC existente `update_attendance`, por lo que se conservan cupos, lista de espera y permisos.

## Decisions

| Decisión              | Elección                                                  | Motivo                                                                    |
| --------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Identidad del partido | Query param `eventId`                                     | Mantiene una única ruta corta y evita exponer datos en un endpoint nuevo. |
| Acceso                | Usuarios autenticados y miembros existentes               | Cumple privacidad y reutiliza RLS actual.                                 |
| Fuente de datos       | `EventsService`                                           | Evita duplicar consultas y reglas de dominio.                             |
| Tiempo real           | Supabase Realtime existente                               | Ya está probado en la página de evento.                                   |
| UI                    | `ImmersiveScreen`, `FloatingPanel` y `EventAttendeesList` | Mantiene el lenguaje visual actual sin rediseño.                          |
| Evento inexistente    | Resultado `NOT_FOUND` controlado                          | Evita normalizar `null` y previene errores de runtime.                    |

## Data flow

```text
WhatsApp link
  -> /asistencia-compartida?eventId=...
  -> auth check
  -> EventsService: event + attendees + pending + current player
  -> compact attendance panel
  -> Realtime event_attendances
  -> invalidate query
```

## Rollback

Revertir la ruta, el panel, el helper de enlace y el guard `NOT_FOUND`. No hay migraciones ni datos persistidos nuevos.
