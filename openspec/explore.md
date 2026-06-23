## Exploration: implementa la logica de la fase 5

### Current State
El sistema actualmente no tiene una "Fase 5" explícitamente definida en la documentación de negocio. Sin embargo, basándonos en el estado del proyecto y la terminología del dominio, hay tres posibles interpretaciones para "la lógica de la fase 5":

1. **Paso 5 del Algoritmo de Balanceo (Fase 1):** El documento `specs/01-domain/balancing-algorithm.md` define un "Paso 5: rellenar huecos con comodines" dentro de la Fase 1 del algoritmo. Requiere lógica específica (`best_candidate_for_position`) para asignar jugadores a posiciones vacantes basándose en posiciones secundarias y comodines (MED). Actualmente el algoritmo completo no está implementado en el código base.
2. **Implementación de la pasada 5 (feat-005 - Create Event):** Según `context/handoff.md` y `context/current-state.md`, el estado actual del proyecto indica que la próxima pasada a implementar es el `feat-005` (Creación de partido). Es muy probable que "fase 5" sea una referencia a esta etapa o "feature 5" del roadmap.
3. **Lógica de la modalidad F5 (Fútbol 5):** Las validaciones de cupos para F5 (1 ARQ, 1 DEF, 2 MED, 1 DEL). 

### Affected Areas
Las áreas afectadas dependen completamente de la intención del requerimiento:

- **Si es feat-005:**
  - `src/app/groups/[id]/events/new/page.tsx` — Formulario de creación
  - `supabase/migrations/` — Nueva migración con la RPC `create_event`
  - `src/lib/services/events.service.ts` — Llamadas a la API
- **Si es el Algoritmo (Paso 5):**
  - `src/lib/services/balancing.service.ts` (a crear) — Lógica core del sorteo y partición inicial.

### Approaches

1. **Enfoque A: Proceder con feat-005 (Creación de Eventos)** — *Recomendado si es roadmap*
   - Implementar el form de creación, la persistencia en localStorage de drafts, validaciones Zod, y la RPC `create_event` que lanza notificaciones.
   - *Pros*: 100% alineado con lo que dicta `handoff.md` como próxima acción del proyecto.
   - *Cons*: Requiere varias capas (DB, UI, Services).
   - *Effort*: Medium

2. **Enfoque B: Implementar el Paso 5 del Sorteo (Comodines)** — *Recomendado si es algoritmo*
   - Escribir la lógica pura en TypeScript para `best_candidate_for_position` que resuelva huecos priorizando posiciones secundarias o MEDs como comodines.
   - *Pros*: Resuelve el corazón del balanceo.
   - *Cons*: No se puede aislar; requiere programar las Fases 0, 1, 2 y 3 del algoritmo para poder probarlo íntegramente.
   - *Effort*: High

### Recommendation
Recomiendo consultar primero con el usuario a qué se refiere "fase 5". Mi principal sospecha es que se refiere al **feat-005 (Create Event)** dado que es la acción listada como "Próxima" en el `handoff.md`. En caso de que se refiera a rellenar huecos en el sorteo (Paso 5 del algoritmo de balanceo), el approach debe cambiar hacia la capa de dominio puro.

### Risks
- Escribir código en la dirección incorrecta debido a la ambigüedad del término "fase 5".
- Si se requiere el algoritmo, implementar solo el "Paso 5" de la Fase 1 dejaría un sistema inconcluso e intesteable.

### Ready for Proposal
No. El orchestrator debe pedir aclaración al usuario: "¿Te referís a la implementación de la creación de partidos (feat-005) o a la lógica de comodines del algoritmo de sorteo (Paso 5)?"