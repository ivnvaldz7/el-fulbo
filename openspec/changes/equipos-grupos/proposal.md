# Proposal: equipos-grupos

## Intent

La aplicación deja de estar pensada solo como organizador de grupos y suma un segundo eje funcional: **Equipos**.

`Grupos` conserva el comportamiento actual.
`Equipos` introduce equipos con roster fijo, card compartible y estadísticas basadas en partidos terminados.

## Scope

### In Scope
- Pantalla inicial que actúa como selector entre `Grupos` y `Equipos`
- Nueva sección de navegación principal: `Equipos`
- Módulo de equipos con roster fijo
- Un mismo jugador puede pertenecer a varios equipos
- Administración de miembros del equipo por parte de admins
- Invitación para registrarse/ingresar al equipo usando el mismo esquema actual de la app
- Organización de partidos por equipo
- Anotación/inscripción de jugadores a partidos de equipo
- Carga post-partido de stats que el jugador ingresa y el admin aprueba según rol:
  - Delanteros → goles
  - Mediocampistas → asistencias
  - Defensores → quites
- Card compartible del equipo
- Agregación de stats del equipo a partir de partidos terminados
- Reutilización de la posición primaria y secundaria ya existente en la app para ayudar al armado de equipos
- Progresión global de la carta base por hitos del jugador
- MVP de equipo temporal hasta el siguiente partido, con nueva votación post-partido
- Asignación automática de mejoras a las stats correspondientes según posición
- Tope máximo de 99 por stat progresada
- Progresión en cada múltiplo de 3 MVPs y cada nueva racha válida de 3 victorias
- La racha de 3 victorias solo cuenta para el jugador si participó en esas victorias
- La participación se prueba mediante stats post-partido cargadas por el jugador, pero solo cuenta para progresión si el admin las aprueba; si las rechaza, se consideran falseadas o incorrectas y no suman.
- Color de card por tier calculado desde el overall: bronce, plata, oro y oro premium

### Out of Scope
- Reemplazar o eliminar el módulo actual de `Grupos`
- Cambiar el flujo actual de sorteos de grupos
- Transferencias entre equipos
- Torneos, ligas o tablas de posiciones
- Chat, comentarios o red social
- Reescritura del player card individual existente

## Capabilities

### New Capabilities
- `teams-module`

## Approach

1. Definir `Equipos` como dominio nuevo y separado de `Grupos`.
2. Introducir roster fijo por equipo y pertenencia múltiple de jugadores.
3. Permitir que los admins creen y organicen partidos del equipo.
4. Habilitar la inscripción de jugadores a partidos futuros.
5. Reutilizar el esquema de invitación/ingreso existente para sumar jugadores al equipo.
6. Capturar stats post-partido ingresadas por el jugador y validadas por el admin; solo las aprobadas agregan al equipo y cuentan para progresión.
7. Exponer una card compartible y stats agregadas del equipo.
8. Aplicar progresión global permanente a la carta base por hitos acumulados: 3 MVPs y 3 victorias consecutivas.
9. Mantener el MVP de equipo como reconocimiento temporal hasta el siguiente partido.
10. Asignar automáticamente las mejoras a las stats relevantes para la posición del jugador.
11. Respetar un máximo de 99 por stat al aplicar progresión.
12. Aplicar progresión en cada múltiplo válido: 3, 6, 9 MVPs, y nuevas rachas de 3 victorias consecutivas donde el jugador participó; la participación se prueba con stats cargadas, pero solo stats aprobadas habilitan progresión.
13. Actualizar el tier visual de la card según su overall: bronce, plata, oro u oro premium.

## Risks

- Hay una frontera conceptual delicada entre `Grupos` y `Equipos`; si se mezcla, la navegación se vuelve confusa.
- La carga de stats por rol necesita validaciones estrictas y estados pendiente/aprobado/rechazado para evitar inconsistencias y progresión basada en datos falseados.
- La pertenencia múltiple de jugadores puede complicar permisos y vistas si no se separa bien por equipo.

## Success Criteria

- El usuario distingue claramente `Equipos` de `Grupos`.
- Un jugador puede estar en más de un equipo sin conflicto.
- Un admin puede organizar partidos de un equipo.
- Los jugadores pueden anotarse a esos partidos.
- Las stats post-partido se cargan, moderan y solo agregan/progresan cuando el admin las aprueba.
- La card compartible del equipo refleja los datos acumulados del módulo.



