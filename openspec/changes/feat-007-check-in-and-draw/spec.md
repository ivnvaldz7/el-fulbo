## Especificaciones Detalladas: feat-007: Check-in and Draw

### 1. Requisitos Generales

*   **R1.1**: Implementar un mecanismo de "check-in y sorteo" robusto y en tiempo real para los partidos.
*   **R1.2**: Permitir a los jugadores confirmar su preparación para un partido.
*   **R1.3**: Facilitar el sorteo de nuevos partidos una vez que un conjunto de jugadores esté listo.
*   **R1.4**: Asegurar una distribución justa y equilibrada de los equipos.
*   **R1.5**: Mejorar la experiencia del usuario proporcionando un flujo claro desde la preparación del partido hasta el juego activo.

### 2. Especificaciones de Check-in de Jugadores

#### 2.1. Requisitos de UI (Conceptual - Fuera de Alcance Detallado)

*   **UI.R2.1**: Cuando un partido es propuesto, el cliente debe mostrar una notificación clara o un prompt al jugador para "check-in".
    *   **Escenario UI.S2.1.1**: El usuario recibe una invitación a un partido. La UI presenta un botón "Check-in" o similar.
    *   **Escenario UI.S2.1.2**: El usuario hace clic en "Check-in". La UI actualiza su estado a "Checked-in" y potencialmente muestra los estados de los otros jugadores.

#### 2.2. RPCs / Eventos de Cliente a Servidor

*   **RPC.R2.2**: El cliente debe enviar un evento `CHECK_IN` al servidor cuando un jugador confirme su preparación.
    *   **Endpoint/Evento**: `WS /match/{matchId}/check-in` (vía WebSocket, asumiendo un canal específico para partidos)
    *   **Payload de Request**: `{ "userId": "UUID_del_jugador" }`
    *   **Autenticación/Autorización**: Solo jugadores autenticados y que pertenecen al partido propuesto pueden hacer check-in.
    *   **Validación**: `matchId` y `userId` válidos y existentes.

### 3. Especificaciones de Seguimiento de Preparación en Tiempo Real

#### 3.1. Requisitos del Servidor

*   **SV.R3.1**: El servidor debe mantener el estado de los check-ins para cada partido propuesto.
    *   **SV.R3.1.1**: Rastrea qué jugadores han hecho check-in.
    *   **SV.R3.1.2**: Almacenar el `checkInTimestamp` para cada jugador.
*   **SV.R3.2**: El servidor debe transmitir actualizaciones en tiempo real a todos los participantes.
    *   **Evento de Servidor a Cliente**: `WS /match/{matchId}/ready-status-update`
    *   **Payload**: `{ "checkedInPlayers": ["UUID_jugador_1", "UUID_jugador_2"], "totalPlayersRequired": 10, "timeoutRemainingMs": 60000 }`
*   **SV.R3.3**: Implementar un tiempo de espera configurable.
    *   **SV.R3.3.1**: Si todos (o el número suficiente) los jugadores no hacen check-in dentro del plazo, el partido se cancela.
        *   **Escenario SV.S3.3.1.1**: Tiempo de espera expira. El servidor marca el partido como `CANCELLED_NO_CHECKIN`.
    *   **SV.R3.3.2**: Los jugadores deben ser notificados de la cancelación.
        *   **Evento de Servidor a Cliente**: `WS /match/{matchId}/status-update`
        *   **Payload**: `{ "status": "CANCELLED_NO_CHECKIN", "message": "Not enough players checked in." }`
    *   **SV.R3.3.3**: Los jugadores pueden ser re-encolados para otro partido (fuera del alcance directo de esta `feat`, pero considerar la implicación).

### 4. Especificaciones de Lógica de Sorteo de Partidos

#### 4.1. Requisitos del Servidor (Orquestación del Sorteo)

*   **SV.R4.1**: El servidor debe iniciar el proceso de "sorteo" una vez que un número suficiente de jugadores haya hecho check-in (e.g., todos los jugadores requeridos).
    *   **SV.R4.1.1**: Antes de iniciar el sorteo, el servidor envía los datos necesarios de los jugadores (e.g., ratings de habilidad, preferencias) a los clientes para la ejecución del algoritmo de balanceo.
        *   **Evento de Servidor a Cliente**: `WS /match/{matchId}/start-balancing`
        *   **Payload**: `{ "players": [{ "userId": "UUID", "skillRating": 1500, "preferredPosition": "DEL" }, ...], "matchConfig": { "teamSize": 5 } }`

#### 4.2. RPCs / Eventos de Cliente a Servidor (Resultados del Balanceo)

*   **RPC.R4.2**: Después de ejecutar el algoritmo de balanceo, el cliente debe enviar las asignaciones de equipo propuestas al servidor.
    *   **Endpoint/Evento**: `WS /match/{matchId}/submit-team-assignments`
    *   **Payload de Request**:
        ```json
        {
          "assignedTeams": [
            { "teamId": "UUID_equipo_1", "players": ["UUID_jugador_A", "UUID_jugador_B"] },
            { "teamId": "UUID_equipo_2", "players": ["UUID_jugador_C", "UUID_jugador_D"] }
          ],
          "balancingAlgorithmVersion": "1.0.0"
        }
        ```
    *   **Autenticación/Autorización**: Solo los clientes participantes y autorizados (o el que fue designado para ejecutar el algoritmo, si aplica) pueden enviar los resultados.
    *   **Validación**:
        *   **SV.R4.2.1**: El servidor debe validar la integridad de los equipos propuestos:
            *   Todos los jugadores que hicieron check-in están asignados.
            *   No hay duplicados de jugadores.
            *   El número de jugadores por equipo coincide con la configuración del partido.
        *   **SV.R4.2.2**: El servidor debe validar la "equidad" básica de los equipos (e.g., la suma de ratings de habilidad es similar entre equipos, si esta lógica no se hace explícitamente en el cliente). Esto es CRÍTICO para prevenir manipulaciones.
        *   **SV.R4.2.3**: Si la validación falla, el servidor debe rechazar la propuesta, notificar a los clientes y posiblemente re-iniciar el proceso de sorteo o cancelar el partido.

#### 4.3. Requisitos del Servidor (Finalización del Sorteo)

*   **SV.R4.3**: Una vez que las asignaciones de equipo propuestas son validadas exitosamente, el servidor debe finalizarlas.
    *   **SV.R4.3.1**: Persistir las asignaciones de equipo en la base de datos (ver sección 6).
    *   **SV.R4.3.2**: Actualizar el estado del partido a `IN_PROGRESS` o similar.
    *   **SV.R4.3.3**: Generar IDs únicos para los equipos dentro del contexto del partido si no se generaron en el cliente.

### 5. Especificaciones de Integración del Balanceo en el Lado del Cliente

#### 5.1. Requisitos del Cliente

*   **CL.R5.1**: El cliente debe recibir los datos de los jugadores del servidor.
*   **CL.R5.2**: El cliente debe ejecutar el algoritmo de balanceo pre-explorado.
    *   **CL.R5.2.1**: El algoritmo tomará como entrada la lista de jugadores que hicieron check-in con sus atributos (e.g., habilidad, posición).
    *   **CL.R5.2.2**: La salida del algoritmo serán las asignaciones de jugadores a equipos (`assignedTeams`).
*   **CL.R5.3**: El cliente debe enviar las asignaciones de equipo propuestas al servidor.

### 6. Especificaciones de Actualizaciones de Base de Datos

#### 6.1. Nuevos Tipos de Notificación

*   **DB.R6.1**: Actualizar la tabla `notifications` (o modelo `Notification`) para incluir un nuevo `type`: `MATCH_READY`.
    *   **DB.R6.1.1**: El `payload` de la notificación `MATCH_READY` debe incluir `matchId`, `eventName`, `requiredPlayersCount`, `timeoutExpiresAt`.
    *   **DB.R6.1.2**: El `recipientId` será el `userId` del jugador invitado.
    *   **Escenario DB.S6.1.2.1**: Cuando un partido alcanza el estado de "listo para check-in", se envía una notificación `MATCH_READY` a cada jugador involucrado.

#### 6.2. Cambios en Tablas Existentes / Nuevas Tablas

*   **DB.R6.2**: Actualizar la tabla `matches` (o modelo `Match`) para rastrear el estado del check-in y del sorteo.
    *   **DB.R6.2.1**: Añadir un campo `status` a la tabla `matches` (si no existe) con estados como `PROPOSED`, `CHECK_IN_OPEN`, `BALANCING_IN_PROGRESS`, `IN_PROGRESS`, `CANCELLED_NO_CHECKIN`, `COMPLETED`.
    *   **DB.R6.2.2**: Añadir un campo `check_in_timeout_expires_at` (TIMESTAMP WITH TIME ZONE, nullable) para registrar cuándo expira el período de check-in.
*   **DB.R6.3**: Podría ser necesaria una nueva tabla `match_player_checkins` o `match_participants` si el modelo de `EventAttendance` no es suficiente para la granularidad requerida para el check-in de partidos.
    *   **Si `match_player_checkins` es nueva**:
        *   `checkinId`: UUID (PK)
        *   `matchId`: UUID (FK a `matches.id`)
        *   `userId`: UUID (FK a `users.id`)
        *   `isCheckedIn`: Boolean (default `false`)
        *   `checkinTimestamp`: TIMESTAMP WITH TIME ZONE (nullable, se setea al hacer check-in)
        *   `createdAt`, `updatedAt`
        *   **Unique Index**: `(matchId, userId)`
*   **DB.R6.4**: Almacenar los resultados del sorteo de equipos.
    *   **DB.R6.4.1**: Si la tabla `matches` no tiene ya campos para esto, añadir campos como `team_assignments` (JSONB) para almacenar la estructura de equipos y jugadores asignados, o una tabla `match_teams` y `match_team_players`.
    *   **Opción A: Campo `team_assignments` en `matches` (JSONB)**:
        ```json
        {
          "teams": [
            {"teamName": "Team Alpha", "players": ["UUID_player_1", "UUID_player_2"]},
            {"teamName": "Team Beta", "players": ["UUID_player_3", "UUID_player_4"]}
          ]
        }
        ```
    *   **Opción B: Nuevas tablas `match_teams` y `match_team_players` (más granular)**:
        *   `match_teams`: `id`, `matchId` (FK), `teamName`, `createdAt`, `updatedAt`
        *   `match_team_players`: `id`, `teamId` (FK), `userId` (FK), `createdAt`, `updatedAt`
*   **DB.R6.5**: Se escribirán scripts de migración de base de datos para aplicar estos cambios de esquema de forma segura en entornos de producción.
*   **DB.R6.6**: **NO se realizará verificación del entorno de base de datos local**, siguiendo el modo de entrega `auto-chain`.

### 7. Especificaciones de Notificaciones en Tiempo Real

#### 7.1. Requisitos de Notificaciones

*   **NT.R7.1**: Los jugadores deben recibir notificaciones en tiempo real sobre los cambios de estado del partido.
    *   **NT.R7.1.1**: **Invitaciones/Prompt de Check-in**: Notificación `MATCH_READY` (ver DB.R6.1).
    *   **NT.R7.1.2**: **Estado de Check-in de Otros Jugadores**: Actualizaciones de `ready-status-update` (ver SV.R3.2).
    *   **NT.R7.1.3**: **Cancelación del Partido**: Notificación de `status-update` a `CANCELLED_NO_CHECKIN` (ver SV.R3.3.2).
    *   **NT.R7.1.4**: **Asignaciones de Equipo Finales y Comienzo del Partido**: Después del sorteo, enviar una notificación a todos los jugadores participantes.
        *   **Evento de Servidor a Cliente**: `WS /match/{matchId}/team-assignment-finalized`
        *   **Payload**: `{ "matchId": "UUID", "teamName": "Team Alpha", "teamMembers": ["UUID_A", "UUID_B"], "opposingTeamMembers": ["UUID_C", "UUID_D"], "matchStartTime": "DateTime" }`
        *   **Escenario NT.S7.1.4.1**: El servidor finaliza el sorteo. Los jugadores reciben una notificación con los equipos, miembros del equipo y el momento de inicio del partido.`