# Teams Module Specification

## Purpose

Este módulo introduce **Equipos** como segunda sección principal de la aplicación.

`Grupos` mantiene el flujo actual.
`Equipos` modela equipos con roster fijo, pertenencia múltiple de jugadores, partidos organizados por admins, inscripción de jugadores a esos partidos, carga de stats por partido terminado por parte del jugador, aprobación de esas stats por el admin y una card compartible del equipo.
La app entry MUST act as a selector hub that sends the user to `Grupos` or `Equipos`.

## ADDED Requirements

### Requirement: Two top-level sections

El sistema MUST mostrar dos secciones principales en la navegación de la app: `Equipos` y `Grupos`.

`Equipos` MUST llevar al módulo nuevo.
`Grupos` MUST conservar el comportamiento actual.

#### Scenario: Main navigation exposes both sections

- GIVEN un usuario autenticado entra a la app
- WHEN ve la navegación principal
- THEN encuentra accesos claros a `Equipos` y `Grupos`
- AND entrar a `Grupos` conserva el comportamiento actual

### Requirement: App entry selector

El sistema MUST mostrar una pantalla inicial que permita elegir entre `Grupos` y `Equipos`.

La selección MUST llevar al dashboard correspondiente.

#### Scenario: User chooses groups

- GIVEN un usuario entra a la app
- WHEN elige `Grupos`
- THEN el sistema lo lleva al dashboard de grupos

#### Scenario: User chooses teams

- GIVEN un usuario entra a la app
- WHEN elige `Equipos`
- THEN el sistema lo lleva al hub de equipos

#### Scenario: User enters the app

- GIVEN un usuario autenticado
- WHEN abre la aplicación
- THEN ve una navegación clara con acceso a `Equipos` y `Grupos`
- AND puede entrar a cada sección sin perder el contexto de la otra

#### Scenario: User returns to the current workflow

- GIVEN un usuario que solo quiere seguir usando partidos de grupos
- WHEN entra a `Grupos`
- THEN encuentra el comportamiento actual sin cambios funcionales

### Requirement: Teams as fixed-roster entities

El sistema MUST modelar cada equipo como una entidad independiente con nombre, identidad visual y roster fijo.

Un jugador MAY pertenecer a más de un equipo.

La pertenencia a equipos MUST ser independiente de los grupos.
Each player MUST keep the existing primary position and optional secondary position from the current app.
Those positions SHOULD help admins assemble teams.

#### Scenario: Player belongs to multiple teams

- GIVEN un jugador ya pertenece al Equipo A
- AND el mismo jugador también pertenece al Equipo B
- WHEN el sistema muestra la lista de miembros de cada equipo
- THEN el jugador aparece en ambos equipos sin conflicto
- AND las estadísticas de cada equipo se calculan de forma independiente

#### Scenario: Team is not tied to a group

- GIVEN un usuario administra un equipo
- WHEN navega a ese equipo
- THEN el equipo se gestiona sin depender del módulo `Grupos`
- AND su roster y partidos viven dentro del contexto del equipo

### Requirement: Team membership is admin-managed

El sistema MUST permitir que los admins del equipo agreguen o quiten miembros del roster fijo.

Los jugadores MUST NOT autoincorporarse al roster de un equipo por sí mismos.

El sistema MUST reutilizar el esquema existente de invitación para que un jugador pueda registrarse o ingresar al equipo.

#### Scenario: Admin adds a player to a team

- GIVEN un admin abre la administración del Equipo A
- WHEN agrega al jugador Juan al roster
- THEN Juan pasa a ser miembro del Equipo A
- AND Juan puede participar en sus partidos

#### Scenario: Non-admin cannot change roster

- GIVEN un jugador común intenta editar la composición del equipo
- WHEN intenta agregar o quitar miembros
- THEN el sistema rechaza la acción

#### Scenario: Player joins through invitation

- GIVEN un admin genera una invitación al Equipo A
- WHEN el jugador abre el enlace o código de invitación
- THEN el sistema lo guía por el mismo esquema de registro/ingreso ya usado en la app
- AND, si acepta, pasa a ser miembro del equipo

### Requirement: Team match management

El sistema MUST permitir que los admins del equipo organicen partidos del equipo.

Cada partido MUST pertenecer a un único equipo.

#### Scenario: Admin schedules a team match

- GIVEN un admin del Equipo A
- WHEN crea un partido con fecha, hora y detalles básicos
- THEN el partido queda asociado al Equipo A
- AND aparece disponible para inscripción de miembros

#### Scenario: Non-admin cannot schedule team matches

- GIVEN un jugador que no es admin del equipo
- WHEN intenta crear un partido
- THEN el sistema bloquea la acción

### Requirement: Player match sign-up

El sistema MUST permitir que los jugadores miembros de un equipo se anoten a los partidos futuros de ese equipo.

Solo los miembros del equipo MAY inscribirse.

#### Scenario: Team member signs up for a match

- GIVEN un partido futuro del Equipo A
- AND un jugador miembro del Equipo A
- WHEN el jugador se anota al partido
- THEN su inscripción queda registrada para ese equipo y ese partido

#### Scenario: Non-member cannot sign up

- GIVEN un partido futuro del Equipo A
- AND un jugador que no pertenece al Equipo A
- WHEN intenta anotarse
- THEN el sistema rechaza la inscripción

#### Scenario: Player in multiple teams signs up independently

- GIVEN un jugador que pertenece al Equipo A y al Equipo B
- WHEN se anota al partido del Equipo A
- AND luego se anota al partido del Equipo B
- THEN ambas inscripciones se registran de forma independiente

### Requirement: Post-match stat submission by player and approval by admin

Cuando un partido de equipo termina, el sistema MUST permitir que el jugador cargue sus stats según su rol en ese equipo.

La carga MUST seguir estas reglas:
- Delanteros / jugadores con perfil de ataque → goles
- Mediocampistas / jugadores con perfil mixto → asistencias
- Defensores / jugadores con perfil defensivo → quites

Las stats cargadas MUST quedar en estado `pending` hasta que un admin del equipo las apruebe.

Solo las stats aprobadas MUST impactar en los agregados del equipo, la card compartible y cualquier progresión global.

El sistema MUST usar la posición primaria y secundaria existente del jugador para validar y sugerir el tipo de stat permitido.

#### Scenario: Forward submits goals

- GIVEN un partido terminado del Equipo A
- AND un jugador con posición primaria de ataque
- WHEN carga sus stats post-partido
- THEN el sistema acepta goles como stat válida
- AND deja la carga pendiente de aprobación
- AND persiste el valor para ese partido

#### Scenario: Midfielder submits assists

- GIVEN un partido terminado del Equipo A
- AND un jugador con posición primaria de mediocampo
- WHEN carga sus stats post-partido
- THEN el sistema acepta asistencias como stat válida
- AND deja la carga pendiente de aprobación

#### Scenario: Defender submits tackles

- GIVEN un partido terminado del Equipo A
- AND un jugador con posición primaria defensiva
- WHEN carga sus stats post-partido
- THEN el sistema acepta quites como stat válida
- AND deja la carga pendiente de aprobación

#### Scenario: Wrong stat type is rejected

- GIVEN un jugador con rol Defensor
- WHEN intenta cargar goles como stat principal
- THEN el sistema rechaza la carga

### Requirement: Admin approval for team stats

El sistema MUST permitir que el admin del equipo apruebe o rechace las stats cargadas por un jugador.

Solo las stats aprobadas MUST contar para los agregados del equipo, para la card compartible y para la progresión de carta base.

Si el admin rechaza una carga, el sistema MUST tratar esa carga como falseada o incorrecta para efectos de cómputo: no agrega, no prueba participación válida y no habilita progresión.

#### Scenario: Admin approves pending stat

- GIVEN una stat post-partido en estado pendiente
- WHEN el admin la aprueba
- THEN la stat pasa a estado `approved`
- AND comienza a contar en los agregados del equipo

#### Scenario: Admin rejects pending stat

- GIVEN una stat post-partido en estado pendiente
- WHEN el admin la rechaza
- THEN la stat pasa a estado `rejected`
- AND no impacta en los agregados del equipo
- AND no cuenta como participación válida para progresión

### Requirement: Team stats are aggregated from finished matches

El sistema MUST calcular las stats del equipo a partir de sus partidos terminados y de las cargas post-partido de sus jugadores.

La card y la vista de detalle del equipo MUST reflejar esos agregados.

#### Scenario: Team card reflects aggregated history

- GIVEN un equipo con varios partidos terminados
- WHEN el usuario abre la card compartible del equipo
- THEN ve el total acumulado de partidos y stats del equipo
- AND la información coincide con los partidos ya cerrados y aprobados

#### Scenario: Stats update after a finished match

- GIVEN un partido recién cerrado
- WHEN los jugadores cargan sus stats y el admin las aprueba
- THEN la card del equipo y su detalle actualizan los agregados
- AND el resultado queda visible en el módulo de Equipos

### Requirement: Global base card progression

El sistema MUST evolucionar la carta base global del jugador con hitos acumulados del jugador.

Los hitos de progresión de carta base MUST contar de manera global, no solo dentro de un equipo específico.

Las mejoras ganadas por hitos MUST ser permanentes sobre la carta base.

El sistema MUST aplicar progresión por estos hitos:
- 3 MVPs acumulados → mejora de stats correspondiente a la posición del jugador
- 3 victorias consecutivas → +1 en hasta 3 stats relevantes

Una victoria MUST contar para la racha global del jugador solo si el jugador participó en ese partido.

La participación del jugador MUST probarse mediante su carga de stats post-partido para ese partido, pero MUST contar para progresión solo cuando un admin aprueba esa carga.

La regla de MVPs MUST dispararse en cada múltiplo de 3 MVPs: 3, 6, 9, 12, etc.

El sistema MUST asignar automáticamente esas mejoras a las stats correspondientes según la posición primaria del jugador.

El jugador MUST NOT elegir manualmente qué stats suben por progresión.

Ninguna stat progresada MUST superar 99.

La card MUST reflejar visualmente su tier según overall: bronce, plata, oro u oro premium.

#### Scenario: Player earns global progression through MVPs

- GIVEN un jugador alcanza un múltiplo válido de 3 MVPs
- WHEN el sistema procesa la progresión
- THEN la carta base global recibe una mejora de stats ligada a su posición
- AND el sistema asigna automáticamente qué stats suben
- AND ninguna stat supera 99
- AND esa mejora viaja con el jugador a nuevos equipos

#### Scenario: MVP progression repeats at every multiple

- GIVEN un jugador ya recibió progresión por 3 MVPs
- WHEN alcanza 6 MVPs válidos
- THEN el sistema vuelve a aplicar una mejora de stats ligada a su posición
- AND el mismo comportamiento se repite en 9, 12 y siguientes múltiplos válidos

#### Scenario: Player earns global progression through win streak

- GIVEN un jugador participa en 3 victorias consecutivas válidas
- AND el jugador cargó stats post-partido en cada una
- AND el admin aprobó esas cargas
- WHEN el sistema procesa la progresión
- THEN la carta base global recibe +1 en hasta 3 stats relevantes
- AND el sistema asigna automáticamente esas stats según la posición del jugador
- AND ninguna stat supera 99
- AND esa mejora viaja con el jugador a nuevos equipos

#### Scenario: Non-participated win does not count for streak

- GIVEN el equipo de un jugador gana un partido
- AND el jugador no tiene stats post-partido aprobadas en ese partido
- WHEN el sistema calcula la racha global del jugador
- THEN esa victoria no cuenta para su racha de progresión

#### Scenario: Rejected stats do not prove valid participation

- GIVEN un jugador cargó stats post-partido para una victoria
- AND el admin rechaza esa carga por falseada o incorrecta
- WHEN el sistema calcula progresión y rachas
- THEN esa carga no cuenta como participación válida
- AND la victoria no suma a la racha del jugador

#### Scenario: Card tier changes with overall

- GIVEN la progresión modifica el overall o stats de la carta base
- WHEN la card se renderiza
- THEN el color visual corresponde al tier calculado por overall
- AND los tiers disponibles son bronce, plata, oro y oro premium

#### Scenario: Team-local progression does not replace base progression

- GIVEN un jugador progresa dentro de un equipo
- WHEN entra a otro equipo
- THEN entra con su carta base global actualizada
- AND no arrastra variaciones locales del equipo anterior

### Requirement: Team MVP is temporary

El sistema MUST tratar el MVP de equipo como un reconocimiento temporal.

El MVP de equipo MUST durar hasta el siguiente partido del equipo.

Después de cada partido terminado, el equipo MUST poder votar o definir un nuevo MVP post-partido.

El MVP temporal MAY contribuir al contador global de MVPs, pero MUST NOT ser por sí mismo una mejora permanente de stats hasta cumplir una regla de progresión.

#### Scenario: Team MVP expires at next match

- GIVEN un jugador fue elegido MVP del último partido del equipo
- WHEN el equipo juega el siguiente partido
- THEN el MVP anterior deja de ser el MVP vigente
- AND el equipo debe votar o definir un nuevo MVP post-partido

#### Scenario: MVP contributes to base progression counter

- GIVEN un jugador es elegido MVP de equipo
- WHEN el sistema actualiza los hitos del jugador
- THEN ese MVP cuenta para la regla global de 3 MVPs
- AND solo al completar la regla se aplica progresión permanente a la carta base

### Requirement: Team card is shareable

El sistema MUST permitir compartir la card del equipo como imagen o preview compartible.

La card SHOULD mantener la esencia visual de las cards del producto: identidad clara, stats visibles y foco en el equipo.

#### Scenario: Share team card

- GIVEN un usuario miembro de un equipo
- WHEN abre la card del equipo y toca compartir
- THEN el sistema genera una representación compartible de ese equipo
- AND el usuario puede enviarla por el mecanismo nativo de compartir o descargarla

#### Scenario: Non-member cannot share private management data

- GIVEN una persona que no pertenece al equipo
- WHEN accede a una vista privada del módulo
- THEN no ve datos de gestión interna
- BUT if the team card is shared externally, only the public-safe card contents are exposed

### Requirement: Team data remains separate from group data

El sistema MUST mantener separados los datos, vistas y permisos de `Equipos` y `Grupos`.

Las acciones sobre un módulo MUST NOT alterar el comportamiento del otro salvo en la navegación principal.

#### Scenario: Team actions do not change group flow

- GIVEN un usuario usa el módulo `Equipos`
- WHEN crea un partido de equipo o carga stats del equipo
- THEN el flujo de `Grupos` sigue intacto
- AND los sorteos de grupos no cambian por esta nueva funcionalidad



