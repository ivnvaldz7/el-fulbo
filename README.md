# El Fulbo

> La app que reemplaza todo el quilombo de organizar fulbito en WhatsApp.

## Que es esto

El Fulbo es una PWA para grupos de futbol amateur. Reemplaza encuestas, listas, eventos y mensajes sueltos de WhatsApp con una sola experiencia: **evento -> confirmacion -> sorteo -> resultado -> cards FIFA**.

**Usuarios objetivo:** 16 a 50+ anos. Grupos de fulbito F5/F6/F8/F11. Organizador + hasta 10 jugadores por grupo en MVP, extendible.

## Estructura del repo

```text
el-fulbo/
├── specs/          <- que hacer
├── context/        <- donde estamos
├── engram/         <- por que se decidio
├── src/            <- codigo de la app (se crea en bootstrap)
└── supabase/       <- migrations y config local (se crea en bootstrap)
```

## Orquestacion

El proyecto usa tres roles logicos:

1. **Designer:** escribe specs, debate con Ivan, actualiza Engram.
2. **Implementer (Codex):** implementa bootstrap y features segun spec aprobado.
3. **Auditor:** revisa que el codigo cumpla el spec antes de cerrar.

**Reglas no negociables:**
- No hay codigo sin spec.
- No hay agente sin contexto.
- No hay cierre sin auditoria.
- El chat no es memoria: todo lo importante va a archivos.

## Como retomar el proyecto

Leer en este orden:

1. `context/handoff.md` -> estado actual del proyecto.
2. `specs/_v2-vision.md` -> norte del producto.
3. `engram/decisions.json` -> decisiones historicas, usando las active.
4. `context/agent-prompts.md` -> flujo operativo segun rol.

Al cerrar una sesion, actualizar `context/handoff.md` y guardar snapshot previo en `context/handoff-history/`.

## Stack tecnico

- **Frontend:** Next.js 14 App Router + TypeScript strict + Tailwind.
- **Backend:** Supabase (PostgreSQL + Auth Google OAuth + Storage).
- **Estado:** Zustand + TanStack Query.
- **PWA:** next-pwa con Web Push API.
- **Hosting:** Vercel.

Detalle en `specs/00-foundation/architecture-decisions.md`.

## Estado actual

- Producto con specs cerradas y bootstrap tecnico completado.
- Version activa: **V2**.
- Features escritas: **15 de 15**.
- Bootstrap tecnico: **completado**.
- Implementacion desde ahora: **Codex en esta carpeta**.
- V1 archivado en `specs/_archive/v1/` como referencia historica.
- Email de soporte: `ivnvldz7@gmail.com`.

## Como contribuir cuando empiece la implementacion

1. Elegir feature en orden desde `specs/03-features/README.md`.
2. Implementer codea contra spec.
3. Auditor valida contra spec, contratos y tests.
4. Se actualiza handoff.
5. Se commitea una unidad cerrada.

Ver `context/agent-prompts.md` para prompts exactos.
