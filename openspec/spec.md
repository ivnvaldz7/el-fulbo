# Spec: implementa la logica de la fase 5 (feat-005)

## 1. Overview
Esta especificación detalla la implementación de la Fase 5: Organización de Partidos (Eventos). Habilita a administradores y dueños a crear, editar y cancelar partidos, notificando automáticamente a los jugadores con carta de jugador aprobada.

## 2. Requirements

### 2.1 User Requirements
- **UR1 (Creación)**: Los administradores y dueños de grupo deben poder crear un nuevo evento (partido) especificando fecha, hora, lugar y modalidad.
- **UR2 (Autocompletado)**: Al crear un evento, el formulario debe sugerir opciones lógicas por defecto (e.g., próximo sábado a las 20:00).
- **UR3 (Borrador)**: Los administradores deben poder cerrar el navegador y recuperar el progreso no guardado del formulario (borrador).
- **UR4 (Edición y Cancelación)**: Los administradores deben poder modificar detalles de un partido futuro o cancelarlo completamente.
- **UR5 (Notificaciones)**: Los jugadores del grupo con "carta aprobada" deben ser notificados automáticamente cuando se crea, edita o cancela un evento.
- **UR6 (Visualización)**: Los usuarios deben poder visualizar los detalles del próximo partido en el Dashboard del grupo y en una página dedicada al evento.

### 2.2 System Requirements
- **SR1**: La persistencia de borradores de eventos debe realizarse localmente en el cliente usando `localStorage`.
- **SR2**: La creación de eventos debe resolverse a nivel base de datos utilizando una función RPC (`create_event`) para asegurar atomicidad transaccional entre la creación del evento y la generación de las notificaciones.
- **SR3**: El borrador local debe limpiarse tras una inserción exitosa y deshabilitar los botones de submit para evitar duplicados en la red.
- **SR4**: Las modificaciones de eventos deben ejecutar un RPC (`update_event`) que evalúe si los cambios requieren emitir notificaciones actualizadas (ej. cambios de hora o ubicación).
- **SR5**: Las notificaciones solo deben generarse para jugadores con estado `stats_status = 'approved'`.

## 3. Scenarios

### Scenario 1: Creación de Partido Exitoso
**Given** un usuario que es administrador del grupo "Fulbo Jueves"
**And** existen 10 jugadores en el grupo con estado `approved` y 2 con estado `pending`
**When** el usuario completa el formulario de creación de evento para el próximo sábado y presiona "Crear"
**Then** el sistema guarda el evento en la base de datos
**And** limpia el borrador del `localStorage`
**And** el sistema emite 10 notificaciones in-app atadas a los jugadores `approved` (ignorando los `pending`)
**And** el usuario es redirigido a la página de detalles del nuevo evento.

### Scenario 2: Recuperación de Borrador de Evento
**Given** un administrador comienza a crear un evento
**And** llena el título y la fecha
**When** el administrador cierra la pestaña accidentalmente
**And** vuelve a entrar a la ruta `src/app/groups/[id]/events/new/page.tsx`
**Then** el formulario se autocompleta con los valores previamente guardados del `localStorage`.

### Scenario 3: Prevención de Eventos Duplicados
**Given** un administrador completa el formulario de creación
**When** hace clic rápidamente dos veces en el botón "Crear"
**Then** la UI desactiva el botón tras el primer clic
**And** solo se ejecuta una llamada a la función RPC `create_event`
**And** solo se crea un único registro de evento.

### Scenario 4: Edición de un Evento (Con Notificación)
**Given** un partido ya programado para el próximo sábado a las 20:00
**When** el administrador edita el partido para cambiar el horario a las 19:00
**Then** la base de datos se actualiza a través de `update_event`
**And** el sistema emite una notificación de "Actualización" a los jugadores `approved`
**And** la vista del dashboard y la página del evento reflejan la nueva hora.

### Scenario 5: Cancelación de Partido
**Given** un evento futuro que está activo
**When** el administrador presiona el botón "Cancelar Partido"
**And** confirma la acción
**Then** el evento cambia su estado a `cancelled` a través de `cancel_event`
**And** se despacha una notificación de cancelación a todos los jugadores notificados originalmente
**And** la vista del dashboard muestra el evento como cancelado y lo elimina de "próximos partidos activos".