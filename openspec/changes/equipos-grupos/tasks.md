# Tasks: Equipos y Grupos

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas estimadas | 900-1400 |
| Riesgo presupuesto 400 líneas | High |
| Chained PRs recomendados | Yes |
| Split sugerido | PR 1 dominio/DB → PR 2 servicios/RPCs → PR 3 UI/share |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Work Units sugeridos

| Unidad | Objetivo | PR probable | Notas |
|------|------|-----------|-------|
| 1 | Modelo de datos, RLS e invitaciones de equipos | PR 1 | Base para pertenencia, admins y partidos |
| 2 | Servicios/RPCs con stats aprobadas y progresión | PR 2 | TDD con tests de integración como eje |
| 3 | UI de equipos, moderación y card compartible | PR 3 | Consume contratos ya verificados |

## Fase 1: Dominio y persistencia

- [ ] 1.1 RED: crear tests de integración para tablas/RLS de equipos, miembros, partidos, inscripciones y stats pendientes/aprobadas/rechazadas.
- [ ] 1.2 GREEN: agregar migración Supabase para entidades de equipos, membresías/admins, partidos, inscripciones y submissions con estados.
- [ ] 1.3 REFACTOR: ajustar políticas/RPCs para separar permisos de `Equipos` y `Grupos` sin acoplar flujos existentes.

## Fase 2: Servicios y reglas de negocio

- [ ] 2.1 RED: cubrir en integración creación de equipo, invitación, alta/baja de roster, creación de partido e inscripción solo de miembros.
- [ ] 2.2 GREEN: crear `src/lib/services/teams.service.ts` y `src/lib/validations/teams.ts` con validaciones Zod y permisos admin.
- [ ] 2.3 RED: probar submissions por posición, rechazo de tipo incorrecto y agregados solo con stats aprobadas.
- [ ] 2.4 GREEN: implementar lifecycle `pending/approved/rejected`; rejected no agrega, no prueba participación y no progresa.
- [ ] 2.5 RED: probar progresión global por MVPs múltiplos de 3 y rachas con participación aprobada.
- [ ] 2.6 GREEN: aplicar mejoras automáticas por posición, cap 99 y tier visual por overall.

## Fase 3: UI e integración

- [ ] 3.1 RED: tests de flujo para selector inicial `Grupos`/`Equipos` y navegación sin alterar grupos.
- [ ] 3.2 GREEN: modificar `src/app/page.tsx` y `src/lib/routes.ts`; crear `/teams` y detalle con tabs Members, Matches, Stats, Card, Moderation.
- [ ] 3.3 RED: tests de UI para roster admin, inscripción, carga de stats y aprobación/rechazo.
- [ ] 3.4 GREEN: construir pantallas `src/app/teams/*` conectadas al servicio y estados de moderación.
- [ ] 3.5 GREEN: crear `TeamCardArtwork` y `TeamShareableCard` con agregados aprobados y datos públicos seguros.

## Fase 4: Verificación y refactor

- [ ] 4.1 Ejecutar tests de integración cuando estén disponibles y usarlos como criterio principal de confianza.
- [ ] 4.2 Ejecutar `npm run typecheck`, `npm run test:unit` y Playwright smoke para selector/equipos.
- [ ] 4.3 REFACTOR: dividir commits por work unit manteniendo tests junto al comportamiento y preparar chained PRs.
