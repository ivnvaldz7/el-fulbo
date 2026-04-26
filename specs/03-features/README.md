# /specs/03-features/

> Specs individuales de features V2. Este directorio es parte del contrato de implementacion.

---

## Features V2 cerradas (en orden)

Ver `/specs/_v2-vision.md` para el norte del producto. Orden operativo:

1. `feat-001-onboarding-user.md` - signup con Google OAuth + self-assessment de stats.
2. `feat-002-create-group.md` - Admin crea grupo.
3. `feat-003-join-group.md` - jugador entra a un grupo por invitacion.
4. `feat-004-admin-dashboard.md` - Admin resuelve pendientes desde un dashboard unificado.
5. `feat-005-create-event.md` - crear partido con fecha/hora/Maps.
6. `feat-006-confirm-attendance.md` - jugadores confirman voy / no voy / tal vez.
7. `feat-007-check-in-and-draw.md` - check-in en cancha + sorteo con animacion.
8. `feat-008-load-result-and-mvp.md` - cargar resultado + elegir MVP.
9. `feat-009-boost-system.md` - aplicar boosts post-partido.
10. `feat-010-share-card.md` - card FIFA compartible via Web Share API.
11. `feat-011-manage-owners.md` - designacion de Owners fijos + temporales.
12. `feat-012-notifications.md` - Web Push + email + badge in-app.
13. `feat-013-phantom-player.md` - Admin crea fantasma para completar equipo.
14. `feat-014-export-data.md` - backup JSON/CSV.
15. `feat-015-player-stats.md` - stats individuales agregadas.

---

## Regla de implementacion

Implementar feature por feature, en orden. No saltar features sin aprobacion explicita, porque los contratos de DB, tipos y permisos se acumulan.

Cada implementacion debe referenciar:

- `context/handoff.md`
- La spec del feature
- `specs/04-contracts/types.ts`
- `specs/04-contracts/db-schema.md`
- `specs/04-contracts/error-model.md`
- Flows y business rules relevantes

---

## Template de un feature nuevo

```markdown
# feat-XXX - [Titulo]

## Objetivo
1 frase con el valor que aporta al usuario.

## Referencias
- Flow: /specs/02-flows/core-flows.md
- Reglas: /specs/01-domain/business-rules.md
- Tipos: /specs/04-contracts/types.ts
- Errores: /specs/04-contracts/error-model.md
- Schema: /specs/04-contracts/db-schema.md

## Input / Output
Tipo TS del input exacto. Tipo TS del output (Result<T, E>).

## Flujo detallado
Paso a paso, incluyendo estados intermedios.

## UI minima
Descripcion textual de pantallas. Que ve el usuario en cada paso.

## Validaciones
Lista de validaciones client-side y server-side.

## Errores esperados
Que pasa si X falla (network, permisos, estado invalido, etc.).

## Tests obligatorios
Unit + integration tests que debe tener el PR.

## Criterios de aceptacion
Checkboxes que la auditoria valida al revisar.

## Fuera de alcance
Que NO se hace en este feature.
```
