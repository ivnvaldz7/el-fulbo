# Handoff - 2026-04-26 (LISTO PARA BOOTSTRAP CON CODEX)

> **Archivo critico.** Lo primero que cualquier agente lee al arrancar sesion.

---

## Estado del proyecto

**Fase:** specs V2 completas y normalizadas para implementacion.
**Proxima fase:** bootstrap tecnico desde Codex en esta misma carpeta.

**Version activa:** **V2**.

**V1 archivado** en `/specs/_archive/v1/`. No tocar.

---

## Que esta listo

### Todas las areas de specs
- Foundation, Domain, Flows, Contracts, Quality completos.
- Engram con **146 decisiones registradas**.
- Vision central `_v2-vision.md`.
- Changelog actualizado hasta `0.1.1`.

### 15 Features completos
- `feat-001-onboarding-user.md` (signup + self-assessment).
- `feat-002-create-group.md` (creacion de grupo).
- `feat-003-join-group.md` (unirse, con reintegros y reactivacion).
- `feat-004-admin-dashboard.md` (resolucion unificada de pendientes).
- `feat-005-create-event.md` (creacion de partido).
- `feat-006-confirm-attendance.md` (confirmacion individual).
- `feat-007-check-in-and-draw.md` (check-in + sorteo + animacion).
- `feat-008-load-result-and-mvp.md` (resultado + MVP + boosts).
- `feat-009-boost-system.md` (sistema de boost completo).
- `feat-010-share-card.md` (compartir card FIFA).
- `feat-011-manage-owners.md` (owners fijos + temporales automaticos).
- `feat-012-notifications.md` (push + email + in-app + digest).
- `feat-013-phantom-player.md` (player fantasma + conversion).
- `feat-014-export-data.md` (backup ZIP JSON + CSV).
- `feat-015-player-stats.md` (stats agregadas individuales).

---

## Decisiones de la ultima normalizacion

Se consolida el estado real del repo antes del bootstrap:

- `feat-015-player-stats.md` queda oficialmente dentro del paquete de specs V2.
- `dec-141` a `dec-146` consolidan el estado operativo actual.
- El flujo operativo deja de depender de Claude Code: Codex pasa a ser el Implementer principal desde `C:\Users\Usuario\Desktop\el-fulbo`.
- El ciclo Designer / Implementer / Auditor se mantiene como disciplina de trabajo, pero se ejecuta dentro de esta conversacion cuando corresponda.

**Notable:**
- **dec-137:** queda superseded por `dec-145`; el bootstrap ahora es con Codex.
- **dec-138:** queda superseded por `dec-146`; el orden lineal ahora llega hasta `feat-015`.
- **dec-139:** los criterios de testing siguen vigentes antes de cerrar cada feature.
- **dec-141 a dec-144:** stats individuales agregadas forman parte de la migration inicial via VIEW `player_stats_aggregate`.
- **dec-145:** Codex reemplaza a Claude Code como Implementer operativo.
- **dec-146:** scope operativo consolidado en 15 features antes del bootstrap.

---

## Proximos pasos (por orden)

1. Crear commit base con specs y documentacion normalizada.
2. Bootstrap tecnico desde Codex:
   - Inicializar Next.js 14 con TypeScript strict.
   - Instalar dependencias cerradas.
   - Configurar Tailwind, ESLint, Prettier y scripts.
   - Crear estructura `/src`, `/supabase/migrations` y clientes Supabase.
   - Copiar `/specs/04-contracts/types.ts` a `/src/lib/types.ts`.
   - Generar migration inicial desde `/specs/04-contracts/db-schema.md`, incluyendo `player_stats_aggregate`.
3. Post-bootstrap, implementar features en orden:
   - `feat-001` -> `feat-002` -> ... -> `feat-015`.
   - Cada feature se implementa contra su spec, con tests y auditoria antes de cerrar.
4. Diseno visual especifico queda para sesiones dedicadas con preguntas al usuario.

---

## Invariantes criticas del producto

Estas son la verdad ultima del producto. Si un agente duda, ganan estas:

1. `internal_rating` del V1 NO existe en V2. Transparente via `overall_actual = base + boost`.
2. Tope de 8 en self-assessment. Aplica a TODOS incluido el Admin (dec-043).
3. Admin NO puede auto-aumentar sus stats a 9-10 (dec-054, dec-079). Solo via boost.
4. Log publico de cambios de stats: in-app only (dec-037).
5. Admin inactivo: peer pressure via seccion publica >=3 dias (dec-048). Sin auto-aprobacion.
6. Redirect silencioso si ya es miembro (dec-051).
7. Modalidad default no afecta events existentes (dec-060).
8. Link de invitacion sobrevive cambios de admin (dec-071).
9. Boost descartado al reactivar un Player (dec-062, dec-083).
10. Cooldown 30 dias post-rechazo de reintegro (dec-065).
11. Hard delete es hard delete: sin rastro (dec-068).
12. Contadores de pendientes visibles solo al admin (dec-077).
13. Owners NO editan stats ni aprueban cosas sensibles (dec-026, dec-132).
14. Optimistic locking en todas las resoluciones (dec-085).
15. Umbral atraso dashboard admin: 7 dias (dec-087).
16. Permitir multiples eventos el mismo dia (dec-088).
17. Sorteo y resultado irreversibles en MVP (dec-104, dec-107).
18. Compartir card solo la propia (dec-110).
19. Notificaciones opt-in contextual (dec-116). No al signup.
20. Diseno visual queda pendiente, se hace con preguntas (dec-136).
21. Stats agregadas individuales son visibles para todos los miembros activos del grupo (dec-141).
22. `player_stats_aggregate` se implementa como VIEW no-materializada en MVP (dec-142).
23. Rankings, graficos y comparaciones quedan fuera del MVP (dec-143).
24. Bajas tardias son metrica publica visible (dec-144).
25. Codex es el Implementer operativo desde esta carpeta (dec-145).
26. El scope operativo listo para bootstrap es `feat-001` a `feat-015` (dec-146).

---

## Schema changes acumulados

Total de cambios al schema desde V1 base:

- Nuevas tablas: `reintegration_requests` (feat-003).
- VIEW nueva: `player_stats_aggregate` (feat-015).
- Nuevos enums de notification: `player_returned`, `reintegration_request`, `reintegration_approved`, `reintegration_rejected`, `stats_changed_log`, `event_rescheduled`, `event_updated`, `match_ready`, `owner_assigned`, `owner_removed`, `owner_temporary_accepted`, `owner_temporary_rejected`, `owner_temporary_no_one_accepted`.
- Columnas `updated_at` en `stat_revision_requests` y `reintegration_requests` (optimistic locking).
- RPCs nuevos: ~20 funciones (ver features para detalle).
- Cronjobs nuevos: cleanup orphans, archive phantom players, temporary owners expiration, digest diario, recordatorios de partidos, designacion de owners temporales.
- Storage buckets: `group-logos`, `player-photos`.

---

## Cosas a tener en cuenta

1. Ivan tiene la carpeta localmente en Windows + PowerShell.
2. Git existe y debe usarse como base de trazabilidad desde este punto.
3. Stack cerrado: Next.js 14 App Router + TS strict + Tailwind + Supabase + Vercel + next-pwa + Web Push. No cambiar.
4. Email de soporte: `ivnvldz7@gmail.com`.
5. Idioma: espanol argentino coloquial.
6. Filosofia: "tan fluido como una encuesta de WhatsApp".
7. Prohibido: discutir chat en detalle tecnico.
8. Prohibido: cambiar invariantes sin aprobacion explicita.
9. Estrategia Opcion A cumplida y ampliada: 15 features escritos. Proximo paso: bootstrap.
10. Diseno visual pendiente: sesiones dedicadas con preguntas al usuario.

---

## Para auditoria

Checklist general al revisar cualquier feature:

- Los tipos de `/src/lib/types.ts` coinciden con `/specs/04-contracts/types.ts`.
- Tests unit, integration y RLS pasan.
- No se agregaron dependencias pesadas sin justificar.
- RLS cubre todos los casos del spec del feature.
- El codigo usa `Result<T, E>`, nunca `throw` en services.
- Boosts se calculan segun `business-rules.md` y `feat-009`.
- Validaciones cumplen rangos del `error-model.md`.
- Log de cambios se crea cuando corresponde.
- Invariantes criticas respetadas.
- Copy en espanol argentino coloquial, sin slang juvenil ni formalismo.

---

## Proxima accion

**Codex:** ejecutar bootstrap tecnico en esta carpeta cuando Ivan lo indique.

**Ivan:** validar decisiones visuales cuando toque diseno especifico; no hace falta borrar ni mover la carpeta.
