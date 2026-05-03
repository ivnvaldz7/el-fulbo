# El Fulbo

> La app que reemplaza todo el quilombo de organizar fulbito en WhatsApp.

## Qué es esto

El Fulbo es una PWA para grupos de fútbol amateur. Reemplaza encuestas, listas, eventos y mensajes sueltos de WhatsApp con una sola experiencia: **evento → confirmación → sorteo → resultado → cards FIFA**.

**Usuarios objetivo:** 16 a 50+ años. Grupos de fulbito F5/F6/F8/F11. Organizador + hasta 10 jugadores por grupo (extendible).

## Estructura del repo

```
el-fulbo/
├── specs/          ← "qué hacer" (inmutable una vez auditado)
├── context/        ← "dónde estamos" (muta por sesión)
├── engram/         ← "por qué" (log inmutable de decisiones)
├── src/            ← código (lo genera Claude Code)
└── supabase/       ← migrations (lo genera Claude Code)
```

## Orquestación multi-agente

Este proyecto se construye con tres roles de agentes:

1. **Designer (Claude):** escribe specs, debate con el usuario, actualiza Engram.
2. **Implementer (Claude Code / Codex):** implementa features según spec aprobado.
3. **Auditor (Claude):** revisa que el código cumpla el spec antes de merge.

**Reglas no negociables:**
- No hay código sin spec.
- No hay agente sin contexto.
- No hay cierre sin auditoría.
- El chat NO es memoria — todo lo importante va a archivos.

## Cómo retomar el proyecto (o empezar una nueva sesión)

Cualquier agente que arranque sesión **lee en este orden**:

1. `context/handoff.md` → estado actual del proyecto.
2. `specs/_v2-vision.md` → el norte del producto (V2).
3. `engram/decisions.json` → decisiones históricas (solo las active).
4. `context/agent-prompts.md` → prompt específico según rol.

Al **cerrar sesión**, actualizá `context/handoff.md` y snapshot-eá el anterior en `context/handoff-history/`.

## Stack técnico

- **Frontend:** Next.js 14 App Router + TypeScript strict + Tailwind
- **Backend:** Supabase (PostgreSQL + Auth Google OAuth + Storage)
- **Estado:** Zustand + TanStack Query
- **PWA:** next-pwa con Web Push API
- **Hosting:** Vercel

Detalle en `specs/00-foundation/architecture-decisions.md`.

## Notas

- Producto en fase de specs. Todavía no hay código.
- Versión activa: **V2** (pivote del 2026-04-20).
- V1 archivado en `specs/_archive/v1/` como referencia histórica.
- Email de soporte: `ivnvldz7@gmail.com`.

## Cómo contribuir (cuando empiece la implementación)

1. Abrir issue con feature a implementar.
2. Designer escribe spec en `specs/03-features/`.
3. Usuario aprueba spec.
4. Implementer codea en branch propio.
5. Auditor valida contra spec.
6. Merge a main.

Ver `context/agent-prompts.md` para prompts exactos de cada rol.
