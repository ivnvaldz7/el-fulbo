# Handoff — 2026-04-23 (FASE DE DISEÑO CERRADA)

> **Archivo crítico.** Lo primero que cualquier agente lee al arrancar sesión.

---

## Estado del proyecto

**Fase:** diseño de specs V2 **COMPLETADA**. Los 14 features están escritos.
**Próxima fase:** bootstrap con Claude Code.

**Versión activa:** **V2**.

**V1 archivado** en `/specs/_archive/v1/`. No tocar.

---

## Qué está listo

### Todas las áreas de specs
- ✅ Foundation, Domain, Flows, Contracts, Quality completos.
- ✅ Engram con **140 decisiones** activas.
- ✅ Visión central `_v2-vision.md`.

### 14 Features completos
- ✅ `feat-001-onboarding-user.md` (signup + self-assessment).
- ✅ `feat-002-create-group.md` (creación de grupo).
- ✅ `feat-003-join-group.md` (unirse, con reintegros y reactivación).
- ✅ `feat-004-admin-dashboard.md` (resolución unificada de pendientes).
- ✅ `feat-005-create-event.md` (creación de partido).
- ✅ `feat-006-confirm-attendance.md` (confirmación individual).
- ✅ `feat-007-check-in-and-draw.md` (check-in + sorteo + animación).
- ✅ `feat-008-load-result-and-mvp.md` (resultado + MVP + boosts).
- ✅ `feat-009-boost-system.md` (sistema de boost completo).
- ✅ `feat-010-share-card.md` (compartir card FIFA).
- ✅ `feat-011-manage-owners.md` (owners fijos + temporales automáticos).
- ✅ `feat-012-notifications.md` (push + email + in-app + digest).
- ✅ `feat-013-phantom-player.md` (player fantasma + conversión).
- ✅ `feat-014-export-data.md` (backup ZIP JSON + CSV).

---

## Decisiones de la última sesión (feat-005 a feat-014)

53 decisiones nuevas agregadas (`dec-088` a `dec-140`), en modalidad delegada (Claude aplicando recomendaciones por default según lo acordado con Iván).

**Notable:**
- **dec-088:** Permitir múltiples eventos el mismo día (pedido explícito de Iván).
- **dec-104, dec-107:** Sorteo y resultado son irreversibles en MVP (simplicidad).
- **dec-110:** Compartir card solo la propia, no ajena (privacidad).
- **dec-116:** Notificaciones opt-in contextual (no al signup).
- **dec-132:** Invariante consolidada: owners NO editan stats ni aprueban cosas sensibles.
- **dec-136:** Diseño visual queda pendiente para sesiones dedicadas con preguntas.
- **dec-137:** Próximo paso es bootstrap con Claude Code.
- **dec-140:** Cierre de fase de diseño.

---

## Próximos pasos (por orden)

1. **Iván revisa el paquete** completo con los 14 features. Marca decisiones a ajustar (si hay).
2. **Si algo falla**, discutimos en una próxima sesión y ajustamos specs + engram.
3. **Si todo OK**, arranca bootstrap con Claude Code:
   - Iván abre Claude Code en la carpeta `el-fulbo/`.
   - Usa el prompt de `context/agent-prompts.md` §2 (Bootstrap inicial).
   - Claude Code inicializa Next.js 14, instala deps, arma estructura, copia `types.ts` a `/src/lib/`, genera primera migration desde `db-schema.md`, setea Supabase local.
4. **Post-bootstrap**, implementación feature por feature en orden:
   - Por cada feature: Designer (Claude) prepara prompt detallado → Implementer (Claude Code) codea en branch → Auditor (Claude) revisa PR → merge.
5. **Paralelo:** sesiones de diseño visual específico cuando cada feature esté implementada.

---

## Invariantes críticas del producto (consolidadas)

Estas son la verdad última del producto. Si un agente duda, ganan estas:

1. **`internal_rating` del V1 NO existe en V2.** Transparente vía `overall_actual = base + boost`.
2. **Tope de 8 en self-assessment.** Aplica a TODOS incluido el Admin (dec-043).
3. **Admin NO puede auto-aumentar sus stats a 9-10** (dec-054, dec-079). Solo via boost.
4. **Log público de cambios de stats: in-app only** (dec-037).
5. **Admin inactivo: peer pressure vía sección pública ≥3 días** (dec-048). Sin auto-aprobación.
6. **Redirect silencioso si ya es miembro** (dec-051).
7. **Modalidad default no afecta events existentes** (dec-060).
8. **Link de invitación sobrevive cambios de admin** (dec-071).
9. **Boost descartado al reactivar un Player** (dec-062, dec-083).
10. **Cooldown 30 días post-rechazo de reintegro** (dec-065).
11. **Hard delete es hard delete: sin rastro** (dec-068).
12. **Contadores de pendientes visibles solo al admin** (dec-077).
13. **Owners NO editan stats ni aprueban cosas sensibles** (dec-026, dec-132).
14. **Optimistic locking en todas las resoluciones** (dec-085).
15. **Umbral atraso dashboard admin: 7 días** (dec-087).
16. **Permitir múltiples eventos el mismo día** (dec-088).
17. **Sorteo y resultado irreversibles en MVP** (dec-104, dec-107).
18. **Compartir card solo la propia** (dec-110).
19. **Notificaciones opt-in contextual** (dec-116). No al signup.
20. **Diseño visual queda pendiente, se hace con preguntas** (dec-136).

---

## Schema changes acumulados

Total de cambios al schema desde V1 base:

- Nuevas tablas: `reintegration_requests` (feat-003).
- Nuevos enums de notification: `player_returned`, `reintegration_request`, `reintegration_approved`, `reintegration_rejected`, `stats_changed_log`, `event_rescheduled`, `event_updated`, `match_ready`, `owner_assigned`, `owner_removed`, `owner_temporary_accepted`, `owner_temporary_rejected`, `owner_temporary_no_one_accepted`.
- Columnas `updated_at` en `stat_revision_requests` y `reintegration_requests` (optimistic locking).
- RPCs nuevos: ~20 funciones (ver features para detalle).
- Cronjobs nuevos: cleanup orphans, archive phantom players, temporary owners expiration, digest diario, recordatorios de partidos, designación de owners temporales.
- Storage buckets: `group-logos`, `player-photos` (ya existentes).

---

## Cosas a tener en cuenta

1. **Iván tiene la carpeta localmente**, Windows + PowerShell.
2. **Git setup pendiente** (opcional, para facilitar syncs).
3. **Stack cerrado:** Next.js 14 App Router + TS strict + Tailwind + Supabase + Vercel + next-pwa + Web Push. No cambiar.
4. **Email de soporte:** `ivnvldz7@gmail.com`.
5. **Idioma:** español argentino coloquial.
6. **Filosofía:** "tan fluido como una encuesta de WhatsApp".
7. **Prohibido:** discutir chat en detalle técnico.
8. **Prohibido:** cambiar invariantes sin aprobación explícita.
9. **Estrategia Opción A CUMPLIDA:** los 14 features están escritos. Próximo: bootstrap.
10. **Diseño visual pendiente:** sesiones dedicadas con preguntas al usuario.

---

## Para el Auditor (cuando empiece implementación)

Checklist general al revisar cualquier PR:

- Los tipos de `/src/lib/types.ts` coinciden con `/specs/04-contracts/types.ts`.
- Tests unit, integration y RLS pasan.
- No se agregaron dependencias pesadas sin justificar.
- RLS cubre todos los casos del spec del feature.
- El código usa `Result<T, E>`, nunca `throw`.
- Boosts se calculan según `business-rules.md §5.2` y `feat-009`.
- Validaciones cumplen rangos del `error-model.md`.
- Log de cambios se crea cuando corresponde.
- Invariantes (las 20 de arriba) están respetadas.
- Copy en español argentino coloquial, sin slang juvenil ni formalismo.

---

## Próxima acción

**Iván:** revisar el paquete completo. Decidir:
- Opción A: todo OK, arrancar bootstrap.
- Opción B: algún ajuste necesario, debatimos en próxima sesión.

**Claude Designer (próxima sesión):** dependiendo de decisión de Iván:
- Si bootstrap: preparar prompt para Claude Code + supervisar.
- Si ajustes: discutir y ajustar specs + engram.
