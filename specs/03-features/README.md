# /specs/03-features/

> **Directorio vacío a propósito.** Acá van las specs de features individuales del V2.

---

## Features V2 planeadas (en orden)

Ver `/specs/_v2-vision.md §11` para el roadmap completo. Resumen:

1. `feat-001-onboarding-user.md` — signup con Google OAuth + self-assessment de stats.
2. `feat-002-create-group.md` — Admin crea grupo.
3. `feat-003-join-group.md` — jugador entra a un grupo por invitación.
4. `feat-004-admin-dashboard.md` — dashboard admin unificado para cartas nuevas, revisiones y reintegros.
5. `feat-005-create-event.md` — crear partido con fecha/hora/Maps.
6. `feat-006-confirm-attendance.md` — jugadores confirman "voy / no voy / tal vez".
7. `feat-007-check-in-and-draw.md` — check-in en cancha + sorteo con animación.
8. `feat-008-load-result-and-mvp.md` — cargar resultado + elegir MVP.
9. `feat-009-boost-system.md` — aplicar boosts post-partido.
10. `feat-010-share-card.md` — card FIFA compartible vía Web Share API.
11. `feat-011-manage-owners.md` — designación de Owners fijos + temporales.
12. `feat-012-notifications.md` — Web Push + email + badge in-app.
13. `feat-013-phantom-player.md` — Admin crea fantasma para completar equipo.
14. `feat-014-export-data.md` — backup JSON/CSV.

---

## Template de un feature (para cuando escribamos uno)

```markdown
# feat-XXX — [Título]

## Objetivo
1 frase con el valor que aporta al usuario.

## Referencias
- Flow: /specs/02-flows/core-flows.md §Flow N
- Reglas: /specs/01-domain/business-rules.md §M
- Tipos: /specs/04-contracts/types.ts (interfaces X, Y, Z)
- Errores: /specs/04-contracts/error-model.md (códigos relevantes)
- Schema: /specs/04-contracts/db-schema.md (tablas tocadas)

## Input / Output
Tipo TS del input exacto. Tipo TS del output (Result<T, E>).

## Flujo detallado
Paso a paso, incluyendo estados intermedios.

## UI mínima
Descripción textual de pantallas. Qué ve el usuario en cada paso.

## Validaciones
Lista de validaciones client-side y server-side.

## Errores esperados
Qué pasa si X falla (network, permisos, estado inválido, etc.).

## Tests obligatorios
Unit + integration tests que debe tener el PR.

## Criterios de aceptación
Checkboxes que el Auditor valida al revisar el PR.

## Fuera de alcance
Qué NO se hace en este feature (aunque suene relacionado).
```

---

**Orden de escritura:** no avanzar a feat-002 hasta que feat-001 esté escrito y aprobado por Iván. Uno por uno.
