# Handoff — 2026-05-02 (ESTADO CORREGIDO POST-VERIFICACIÓN)

> **Archivo crítico.** Lo primero que cualquier agente lee al arrancar sesión.

---

## Estado del proyecto

**Fase:** specs V2 completas + bootstrap del repo **YA realizado** + features críticas con cobertura real en curso.
**Próxima fase:** continuar con feat-009 o pulidos finos, manteniendo registro antes de cada pasada.

**Versión activa:** **V2**.

**V1 archivado** en `/specs/_archive/v1/`. No tocar.

---

## Qué está listo

### Todas las áreas de specs
- ✅ Foundation, Domain, Flows, Contracts, Quality completos.
- ✅ Engram con **144 decisiones** activas.
- ✅ Visión central `_v2-vision.md`.
- ✅ Bootstrap técnico ya presente en el repo y verificado con código.

### 15 Features completos
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
- ✅ `feat-015-player-stats.md` (stats individuales MVP).

### UI & UX (Nocturnal Pitch)
- ✅ Primitives `ImmersiveScreen` y `FloatingPanel`.
- ✅ Landing, `/welcome`, `/join` y onboarding de stats.
- ✅ Todas las pantallas de invitación (`/invite/[code]/*`) migradas.
- ✅ `GroupDashboardInitialState` y `/admin-tasks`.
- ✅ Verificado con `tests/integration/join-group.test.ts`.

### RPCs críticas blindadas
- ✅ `update_attendance` con test real por `supabase.rpc(...)`.
- ✅ `confirm_draw` con test real por `supabase.rpc(...)`.
- ✅ `load_match_result` con test real por `supabase.rpc(...)`.

---

## Corrección de estado en esta sesión

- Se verificó que `context/current-state.md` y este `handoff.md` habían quedado desactualizados.
- Ambos ya reflejan ahora el estado real de las features críticas y sus RPCs.
- El código demuestra que la base Next.js + Supabase + migración inicial ya existía y que `feat-008` ya quedó cerrada.
- Se establece como regla operativa: **antes de cada pasada hay que dejar registro actualizado**.

**Impacto:**
- El próximo paso ya NO es “cerrar feat-008”.
- El próximo paso es feat-009 o, si hace falta, refinamiento visual/documental de lo ya cerrado.

---

## Próximos pasos (por orden)

1. **Antes de cada pasada**, actualizar `CHANGELOG.md`, `context/current-state.md` y `context/handoff.md` si cambió el estado.
2. **RPCs críticas ya blindadas**:
   - `update_attendance`
   - `confirm_draw`
   - `load_match_result`
3. **Continuar implementación** sobre el repo actual, sin repetir bootstrap.
4. **Última pasada cerrada:** cierre de `feat-008` + documentación sincronizada.
5. **Base ya implementada en fase inicial:**
   - RPC `validate_invite_code`
   - resolución server-side de estados base del invite flow
   - redirects/pantallas para `invalid`, `archived`, `group-full`, `user-limit`
   - ramificación correcta para `anonymous`, `active_member` y `new`
6. **Implementado en fase 2:**
   - `voluntary_returner` con pantalla `welcome-back` y reactivación real
   - `expelled_can_request` con formulario server-side
   - `expelled_pending_request`
   - `expelled_cooldown`
   - `request-sent`
   - nuevas RPCs `reactivate_player` y `create_reintegration_request`
7. **Implementado en feat-007:**
   - check-in + sorteo + equipos
   - cleanup de helpers legacy de permisos
8. **Verificación hecha:**
   - unit tests de `invite.service` pasando
   - `npm run typecheck` pasando
   - `tests/integration/join-group.test.ts` pasando luego de aplicar migraciones locales
   - bugfix aplicado en migration `20260502170000_feat_003_invite_validation.sql` por uso inválido de `SELECT ... INTO`
7. **Mantener auditoría**:
   - verificar contra specs
   - registrar descubrimientos no obvios en engram
   - snapshotear `handoff.md` en `handoff-history/` antes de reescribir

### Guardrail nuevo para RPCs de Supabase

Cuando aparezca `NOT_FOUND` sobre una RPC recién migrada:

1. Confirmar existencia en catálogo (`pg_proc`) y firma exacta.
2. Confirmar que la app use los mismos nombres de parámetros que la función.
3. Confirmar si el test está usando SQL directo o `supabase.rpc(...)`.
4. Ejecutar primero `NOTIFY pgrst, 'reload schema'`.
5. Reprobar la llamada real por Supabase autenticado.
6. Recién después revisar grants o considerar cambios de firma.

NO cambiar enums a `text` para “probar”. Eso degrada el contrato sin demostrar causa.

### Estado actual de `feat-008`

- RPC `load_match_result` implementada y verificada.
- UI de carga de resultado implementada en `/groups/[id]/events/[event_id]/result`.
- Resumen post-partido visible en `/groups/[id]/events/[event_id]` cuando el estado es `played`.
- Cobertura real de Supabase RPC agregada para `update_attendance`, `confirm_draw` y `load_match_result`.

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
9. **Estrategia Opción A CUMPLIDA:** los 15 features están escritos.
10. **Diseño visual pendiente:** sesiones dedicadas con preguntas al usuario.
11. **Nueva regla operativa:** antes de cada pasada se deja registro actualizado del estado real.
12. **Nueva regla operativa para RPCs:** un test SQL directo NO valida exposición PostgREST; si el bug es de `supabase.rpc`, hay que reprobar por el camino real.

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

**Siguiente sesión / siguiente pasada:**
- **feat-009 (Boost System)**: continuar con el siguiente feature sobre la base de `load_match_result`.
- Si hace falta, pulir visualmente `feat-008` sin tocar el contrato transaccional ya cerrado.
