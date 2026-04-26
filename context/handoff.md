# Handoff - 2026-04-26 (BOOTSTRAP CODEX COMPLETADO)

> **Archivo critico.** Lo primero que cualquier agente lee al arrancar sesion.

---

## Estado del proyecto

**Fase:** bootstrap tecnico completado.
**Proxima fase:** implementar `feat-001-onboarding-user`.

**Version activa:** **V2**.

**V1 archivado** en `/specs/_archive/v1/`. No tocar.

---

## Que esta listo

### Specs y contexto
- Foundation, Domain, Flows, Contracts, Quality completos.
- Engram con **146 decisiones registradas**.
- 15 features V2 escritos (`feat-001` a `feat-015`).
- Handoff previo snapshot-eado en `context/handoff-history/2026-04-26-pre-bootstrap.md`.

### Bootstrap tecnico
- Next.js 14 App Router + React 18.
- TypeScript strict con `noUncheckedIndexedAccess`.
- Tailwind CSS.
- ESLint + Prettier.
- TanStack Query provider.
- Clientes Supabase base:
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
- PWA con `next-pwa` y `public/manifest.json`.
- Vitest + Testing Library + Playwright config.
- Supabase CLI instalado como dev dependency y `supabase init` ejecutado.
- Migration inicial creada:
  - `supabase/migrations/20260426000000_initial_schema_v2.sql`
- Contrato copiado:
  - `specs/04-contracts/types.ts` -> `src/lib/types.ts`

---

## Ajustes hechos durante bootstrap

- Se agrego `PlayerStatsAggregate` al contrato TS porque `feat-015` lo referenciaba pero el archivo de contratos no lo tenia.
- Se amplio `NotificationType` con los enums acumulados en handoff/specs.
- Se agrego `ReintegrationRequest` al contrato TS para alinear `feat-003` y schema.
- Se corrigio un cast TS en `applyBoostToStats` para compatibilidad con TypeScript 5.9.
- Se agrego harness inicial de tests unitarios e integration.

---

## Verificaciones corridas

Pasan:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run build`

No completado:

- `npx supabase start` fallo porque Docker Desktop no esta iniciado:
  - error: falta pipe `dockerDesktopLinuxEngine`.

---

## Riesgos tecnicos abiertos

1. **Supabase local pendiente de validar.**
   - Docker esta instalado, pero Docker Desktop no esta corriendo.
   - Proxima accion tecnica: abrir Docker Desktop y correr `npx supabase start`.

2. **Audit npm con vulnerabilidades conocidas.**
   - `npm audit --omit=dev` reporta issues en Next 14 y `next-pwa`/Workbox.
   - No se actualiza a Next 16 porque contradice el stack cerrado.
   - Decision recomendada: aceptar el riesgo durante MVP local y reevaluar antes de deploy productivo.

3. **Migration inicial necesita validacion real en Postgres.**
   - Build y TS pasan, pero SQL todavia no fue aplicado localmente por el bloqueo de Docker Desktop.

---

## Invariantes criticas

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

## Proxima accion

Implementar `feat-001-onboarding-user`.

Antes de tocar la feature:

1. Leer `specs/03-features/feat-001-onboarding-user.md`.
2. Abrir Docker Desktop y correr `npx supabase start`.
3. Validar/aplicar la migration inicial.
4. Recién ahi avanzar con auth Google OAuth + self-assessment.
