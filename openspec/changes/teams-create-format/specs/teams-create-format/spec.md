# Especificación: creación de Equipos por formato

## Escenario: seleccionar formato

- Dado un usuario autenticado con Card Global
- Cuando abre `/teams/new`
- Entonces puede elegir F5, F6, F7, F8, F9 o F11
- Y no se le solicita su posición

## Escenario: crear equipo

- Dado un usuario autenticado con Card Global
- Cuando crea un equipo con un formato válido
- Entonces el equipo guarda ese formato
- Y el miembro administrador recibe las posiciones de su Card Global

## Escenario: Card Global faltante

- Dado un usuario autenticado sin Card Global
- Cuando intenta crear un equipo
- Entonces la operación falla con `TEAM_CARD_REQUIRED`
