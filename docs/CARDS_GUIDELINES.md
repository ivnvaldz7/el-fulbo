# CARDS_GUIDELINES.md

## Auditoría previa resumida

- El flujo actual de `stat_revision_requests` representa revisión de stats dentro de un grupo.
- No existe todavía una separación limpia entre card global y stats por grupo.
- No se encontró UI/service activo claro para solicitar revisión post-aprobación.
- La aprobación actual es esencialmente admin-only.
- No existe aprobación doble admin + owner.
- Veredicto previo: `REQUIERE DECISIÓN DE PRODUCTO`.
- La decisión tomada ahora es separar carta de grupo y carta global.

## MVP card lifecycle

- La carta MVP activa dura hasta el siguiente partido del grupo.
- Cuando se vota un nuevo MVP, reemplaza visualmente al MVP anterior.
- El MVP anterior queda en el historial del jugador.
- MVP no mejora automáticamente la carta global.
- MVP puede servir como evidencia para una revisión global futura.

## Group card vs Global card

- No mezclar revisión de stats de grupo con mejora de carta global.
- `stat_revision_requests` debe considerarse revisión de stats dentro de un grupo.
- La carta global representa reputación acumulada del jugador en El Fulbo.
- Si hace falta implementar revisión global, debe diseñarse un flujo propio, por ejemplo `global_card_review_requests`.

## Global card upgrade rules

Una mejora global requiere:

- grupo activo;
- jugador con mínimo de partidos;
- solicitud formal;
- aprobación del admin del grupo;
- aprobación de al menos un owner fijo del grupo;
- admin y owner como usuarios distintos;
- auditoría obligatoria.

No aplica:

- autoaprobación del jugador;
- owners temporales;
- grupos sin owner fijo.

## Approval requirements

- Admin del grupo y owner fijo del grupo deben aprobar.
- Admin y owner fijo deben ser usuarios distintos.
- El jugador no puede aprobar su propia mejora global.
- Temporary owners no cuentan.
- Si el grupo no tiene owner fijo, no puede aprobar mejoras globales hasta asignar uno.
- Toda aprobación o rechazo global debe quedar auditado.

## Eligibility criteria

Criterios mínimos recomendados para solicitar revisión global:

- grupo con al menos 3 partidos `played` en los últimos 60 días;
- grupo con al menos 6 jugadores reales aprobados, no phantoms;
- jugador con al menos 5 partidos jugados en ese grupo;
- jugador activo en los últimos 60 días;
- sin upgrade global aprobado en los últimos 30 días;
- motivo obligatorio;
- evidencia mínima: MVPs, asistencia, partidos jugados, racha o stats aprobadas.

## Notifications for global review requests

Cuando un jugador solicite revisión global:

- notificar admin + owners fijos;
- canal: in-app + push si el tipo se declara pushable;
- siempre usar `notifications` como outbox;
- no mandar push directo;
- no usar temporary owners.

Naming recomendado:

- no reutilizar `stats_revision_requested` para carta global;
- diseñar tipos nuevos:
  - `global_card_review_requested`
  - `global_card_review_approved`
  - `global_card_review_rejected`

## Open technical design pending

No implementar todavía:

- tabla `global_card_review_requests`;
- notification types globales;
- dispatcher para revisión global;
- UI de solicitud;
- UI de aprobación doble;
- migrations de aprobación global.

El próximo diseño debe definir:

- entidad canónica de revisión global;
- payload y dedupe de notificaciones;
- estados de aprobación admin/owner;
- reglas de elegibilidad;
- auditoría;
- tests de permisos, destinatarios y dedupe.
