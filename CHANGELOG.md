# Changelog

Registro de cambios importantes del proyecto. Formato: `[versión] - YYYY-MM-DD`.

## [0.1.2] - 2026-04-26 - Normalizacion para Codex

- Codex queda como Implementer operativo desde `C:\Users\Usuario\Desktop\el-fulbo`.
- Actualizados `handoff.md`, `current-state.md`, `agent-prompts.md`, `README.md` y README de features.
- Agregadas decisiones `dec-145` y `dec-146` al engram.
- `dec-131`, `dec-134`, `dec-137`, `dec-138` y `dec-140` marcadas como superseded por el cambio de scope/implementer.
- Total: 15 features, 146 decisiones.
- Snapshot previo guardado en `context/handoff-history/2026-04-26-pre-codex-normalization.md`.

## [0.1.1] - 2026-04-24 — feat-015 agregada (stats individuales)

- Agregada `feat-015-player-stats.md` con alcance MVP básico (contadores individuales).
- VIEW `player_stats_aggregate` a incluir en migration inicial.
- 4 decisiones nuevas al engram (`dec-141` a `dec-144`):
  - Visibilidad pública para todos los miembros del grupo.
  - VIEW no-materializada para cálculo.
  - MVP básico: contadores individuales, rankings/gráficos van a v2.1.
  - Bajas tardías incluida como métrica pública.
- Total: 15 features, 144 decisiones.
- Scope agregado justo antes del bootstrap inicial para que la migration incluya la VIEW desde día 1.

## [0.1.0] - 2026-04-23 — FASE DE DISEÑO CERRADA ✅

- Los 10 features restantes escritos en modalidad delegada (feat-005 a feat-014):
  - `feat-005-create-event.md` — crear partido con fecha/hora/Maps/modalidad.
  - `feat-006-confirm-attendance.md` — confirmar asistencia (voy/no voy/tal vez).
  - `feat-007-check-in-and-draw.md` — check-in + sorteo con animación.
  - `feat-008-load-result-and-mvp.md` — resultado + MVP + triggers de boost.
  - `feat-009-boost-system.md` — sistema de boost completo (cálculo, aplicación, visualización).
  - `feat-010-share-card.md` — compartir card FIFA con Web Share API.
  - `feat-011-manage-owners.md` — owners fijos + temporales automáticos.
  - `feat-012-notifications.md` — push + email + in-app + digest.
  - `feat-013-phantom-player.md` — fantasma para completar equipos.
  - `feat-014-export-data.md` — backup ZIP con JSON + CSV.
- 53 decisiones nuevas al engram (`dec-088` a `dec-140`).
- **Total: 140 decisiones activas, 14 features escritos.**
- Fase de diseño cerrada. Próximo paso: bootstrap con Claude Code.
- Handoff del 2026-04-23 (feat-004) archivado.

## [0.0.8] - 2026-04-23 — feat-004 escrito + 16 decisiones

- `feat-004-admin-dashboard.md` escrito completo.
- Dashboard unificado para pendientes del admin: stats iniciales, revisiones, reintegros en un solo lugar.
- 16 decisiones nuevas al engram (`dec-072` a `dec-087`):
  - Secciones colapsables por tipo de pendiente.
  - Orden por urgencia (reintegros → cartas → revisiones).
  - Resolución híbrida (inline para cartas, pantalla dedicada para el resto).
  - Widget + /admin-tasks + /my-admin global.
  - Optimistic locking multi-device.
  - Agrupamiento por antigüedad con umbral 7 días.
  - Sin cambios al tope de 8 ni invariantes existentes.
- Schema: nuevos RPCs, nuevos notification types, cronjobs de cleanup.
- Handoff del 2026-04-22 (feat-003) archivado.

## [0.0.7] - 2026-04-22 — feat-003 escrito + 11 decisiones

- `feat-003-join-group.md` escrito completo.
- 11 decisiones nuevas al engram (`dec-061` a `dec-071`):
  - Jugador voluntario vuelve: pantalla con preview de carta previa.
  - Reactivación preserva stats + histórico, descarta boost activo.
  - Expulsado puede solicitar reintegro con mensaje opcional.
  - Cooldown 30 días post-rechazo de reintegro.
  - Hard delete +365 días: tratar como jugador nuevo, sin rastro.
  - Grupo archivado huérfano: bloquear con link a soporte.
  - Grupo lleno (50 players): bloquear con sugerencia.
  - Link de invitación sobrevive a cambios de admin.
- Schema: agregada tabla `reintegration_requests` + notification types `player_returned` y `reintegration_request`.
- Handoff del 2026-04-22 (feat-002) archivado.

## [0.0.6] - 2026-04-22 — feat-002 escrito + 9 decisiones

- `feat-002-create-group.md` escrito completo.
- 9 decisiones nuevas al engram (`dec-052` a `dec-060`):
  - Form mínimo (solo nombre + modalidad).
  - Admin carga stats en el momento al crear (autoaprobadas, tope de 8).
  - Invariante: Admin no puede auto-editar sus stats a 9-10.
  - Modalidad default F5.
  - Duplicados con modal de confirmación.
  - Form validation al tocar Crear con error inline.
  - Errores con localStorage + mensajes específicos.
  - Settings con crop centrado automático del logo.
- Handoff del 2026-04-22 (feat-001) archivado.

## [0.0.5] - 2026-04-22 — feat-001 escrito + 14 decisiones

- `feat-001-onboarding-user.md` escrito completo.
- 14 decisiones nuevas al engram (`dec-038` a `dec-051`):
  - Landing con preview animado.
  - Acceso vía código pegado.
  - Perfil post-login sin formulario.
  - Tope duro de 8 en self-assessment (refina dec-025).
  - Wizard 2 pasos con preview en vivo.
  - Cambio de posición híbrido.
  - Admin aprueba + corrige en una sola pantalla.
  - Aviso al admin solo via badge + digest diario.
  - Sección pública "Esperando aprobación" con ≥3 días.
  - Draft del wizard en localStorage.
  - Redirect silencioso si ya es miembro.
- Ajustes en `business-rules.md §3.3` (tope de 8) y tabla de notificaciones §14.2.
- Actualizado `EC-10` de `edge-cases.md`.
- Handoff del 2026-04-21 archivado.

## [0.0.4] - 2026-04-22 — Ajuste canal de log de stats

- `dec-037` agregada al engram: el feed público de cambios de stats se comunica solo vía in-app, sin push ni email.
- Actualizada tabla de notificaciones en `business-rules.md §14.2`.
- Agregado tipo `stats_changed_log` en `NotificationType` de `types.ts`, `entities.md` y `db-schema.md`.

## [0.0.3] - 2026-04-21 — Foundation V2 completa

- Foundation V2 escrita en `specs/00-foundation/` con la nueva visión.
- Domain V2 escrito en `specs/01-domain/` (entities, business-rules, balancing-algorithm).
- Flows V2 iniciales en `specs/02-flows/`.
- Contracts V2 iniciales en `specs/04-contracts/`.
- Quality V2 escrito en `specs/05-quality/`.
- 10 decisiones abiertas cerradas con el usuario.
- Agregadas 7 decisiones nuevas al Engram (dec-030 a dec-036).

## [0.0.2] - 2026-04-20 — Pivote a V2

- Producto pivotado después de 4 entrevistas con usuarios.
- V1 archivado en `specs/_archive/v1/`.
- `specs/_v2-vision.md` escrito como nuevo norte del producto.
- 11 decisiones nuevas al Engram (dec-019 a dec-029).
- 7 decisiones V1 marcadas como `superseded`.

## [0.0.1] - 2026-04-20 — Foundation V1 inicial

- Setup inicial del sistema SDD según starter pack del usuario.
- Foundation V1, Domain V1, Flows V1, Contracts V1, Quality V1.
- Primera feature V1 (`feat-001 create-group`) en draft.
- Orquestación multi-agente establecida.

**Nota:** V1 archivado. Ver `specs/_archive/v1/README.md`.
