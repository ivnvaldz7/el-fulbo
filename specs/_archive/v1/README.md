# /specs/_archive/v1/ — Specs V1 archivadas

> **Esto es V1 congelado.** No modificar.
> Queda como referencia histórica para entender decisiones pasadas y justificar el pivote a V2.

---

## Por qué existe este archive

El 2026-04-20, después de 4 entrevistas con usuarios, Iván decidió pivotear el producto.

**V1 era:** app de sorteo inteligente (sorteador + ratings + roster).
**V2 es:** PWA completa que reemplaza el flujo de organización en WhatsApp.

Las specs V1 están aquí porque:
1. **Auditoría de decisiones**: varias decisiones V2 se justifican por la ausencia de algo que V1 sí tenía (y por qué no lo recuperamos).
2. **Continuidad técnica**: parte del stack, la metodología y algunas reglas del dominio (formaciones, comodín MED, algoritmo de balanceo conceptual) se preservan.
3. **Historia del proyecto**: entender cómo llegamos acá.

---

## Qué había en V1

- `00-foundation/product.md` — producto descripto como "sorteador inteligente".
- `00-foundation/glossary.md` — con User/Player separados.
- `00-foundation/architecture-decisions.md` — stack + restricciones.
- `01-domain/entities.md` — modelo User/Player separado, sin boost temporal.
- `01-domain/business-rules.md` — con Rating Interno oculto tipo ELO.
- `01-domain/balancing-algorithm.md` — algoritmo usando Rating Interno.
- `02-flows/core-flows.md` — 12 flows centrados en parseo de WhatsApp y sorteo.
- `02-flows/edge-cases.md` — 23 edge cases.
- `03-features/feature-create-group.md` — único feature escrito (draft).
- `04-contracts/db-schema.md` — schema con tablas y Rating Interno.
- `04-contracts/types.ts` — tipos V1.
- `04-contracts/error-model.md` — modelo de errores.
- `05-quality/testing-strategy.md` — estrategia de testing.
- `05-quality/observability.md` — observabilidad.
- `_backlog.md` — ideas para futuro.

---

## Qué se conserva del V1 (pasa a V2)

- Stack técnico (Next.js 14 + Supabase + Vercel + Tailwind).
- Metodología SDD + estructura de carpetas.
- Orquestación multi-agente (Designer / Implementer / Auditor).
- Formaciones por modalidad (F5/F6/F8/F11).
- MED como posición comodín.
- Algoritmo de balanceo conceptual (cupos + greedy).
- Multi-grupo.
- PWA instalable, offline-first.
- Export de datos.
- Email de soporte `ivnvldz7@gmail.com`.
- Patrón `Result<T, E>`.
- RLS estricto.

---

## Qué se descarta de V1 (NO pasa a V2)

| Descartado | Reemplazo en V2 | Ver decisión |
|------------|------------------|--------------|
| Parseo de listas de WhatsApp | Confirmación individual en app | dec-019 |
| Rating Interno oculto ELO | Boost temporal visible | dec-023 |
| Modelo User/Player separado | Cada Player tiene User | dec-021 |
| Magic link como auth principal | Google OAuth | dec-020 |
| Invitados +1 sin cuenta | Player fantasma (admin lo crea) | dec-028 |
| Sucesión compleja con magic link | Owners temporales automáticos | dec-027 |

---

## Nota importante

**Los archivos V1 aquí estaban listos antes del pivote pero solo se escribieron parcialmente en la sesión de diseño.** En particular:
- Foundation V1: escrito completo.
- Domain V1: escrito completo.
- Flows V1: escrito completo.
- Features V1: solo draft de create-group.
- Contracts V1: escrito completo.
- Quality V1: escrito completo.

Si alguien quiere reconstruir el V1 textualmente, todo está en el transcript de la sesión original (2026-04-20). Los detalles conceptuales quedaron en las decisiones dec-001 a dec-018 del engram.

---

**Para el estado actual, volver a:** `/specs/` (V2 activo).
