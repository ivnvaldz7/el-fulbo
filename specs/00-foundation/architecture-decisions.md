# Architecture Decisions V2

## Stack técnico

- **Frontend:** Next.js 14+ (App Router) + TypeScript strict + Tailwind CSS.
- **UI animación:** Framer Motion (para animación del sorteo y transiciones de cards).
- **Generación de card compartible:** `html-to-image` + Web Share API.
- **Estado cliente:** Zustand (liviano) + TanStack Query (sync con Supabase).
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- **Auth:** Supabase Auth con **Google OAuth**. Sin passwords propios. Recuperación delegada a Google.
- **Storage:** Supabase Storage (bucket público para fotos de perfil y logos, URLs firmadas).
- **Base de datos:** PostgreSQL gestionado por Supabase, con Row Level Security en todas las tablas.
- **PWA:** `next-pwa` con Workbox. Service worker con estrategias offline-first para roster y sorteo. Sync cuando vuelve conexión.
- **Notificaciones push:** **Web Push API** con VAPID keys. Supabase Edge Function procesa el envío.
- **Email transaccional:** Supabase SMTP integrado (para resumen semanal, alertas de owner temporal, aprobaciones).
- **Hosting:** Vercel (deploy automático desde GitHub).
- **Algoritmo de balanceo:** heurístico (satisfacción de cupos + greedy), ejecutado 100% en cliente.
- **Diseño visual:** Stitch (Google) como herramienta. Export a Figma. Reconstrucción manual en React + Tailwind.

---

## Restricciones

- **No cambiar stack sin decisión explícita en Engram.**
- **No agregar dependencias pesadas (>50kb gzipped) sin justificación escrita.**
- **Stats base solo las edita el Admin.** Ningún otro rol puede mutar stats vía API.
- **Carta "pendiente de aprobación" nunca se muestra públicamente** en el grupo hasta que el Admin la apruebe.
- **Boost nunca es negativo.** La tabla de detonantes está fija en business-rules V2; no se permiten "boosts por derrota" en código.
- **Log público de cambios de stats es inmutable.** Se registra en `stat_change_log`, nunca se borra.
- **No hay tracking de analytics de terceros** (Google Analytics, Posthog, etc.).
- **No hay ads. Nunca.**
- **No hay backend propio (Node/Express).** Todo vía Supabase (RPC + Edge Functions).
- **Los datos de un Group nunca se cruzan con otro** (RLS estricto).
- **Integraciones de pago: ninguna en MVP.** Donación = link externo (Cafecito/MercadoPago link).
- **Chat: prohibido diseñar arquitectura pensando en chat.** Si llega, se agrega como módulo.

---

## Decisiones explícitas cerradas en V2

### Auth
- **Google OAuth único método.** Sin magic link como flujo principal (solo para player fantasma → cuenta, export, recuperación excepcional).
- **Sin passwords propios.** Recuperación delegada a Google.

### Modelo usuario
- **Cada jugador = un User.** No hay "fichas sin cuenta" salvo player fantasma.
- **Roles por Group:** Admin + 0-2 Owners. Admin puede editar stats, Owners no.
- **Un User puede ser Admin de hasta 3 Groups** y Player en hasta 10 Groups en total.

### Stats y cards
- **6 stats de campo:** PAC, SHO, PAS, DRI, DEF, PHY.
- **6 stats de arquero (diferentes):** DIV, HAN, KIC, REF, SPD, POS.
- **Escala híbrida:** 1-10 en DB, 1-99 en UI (multiplicar ×10 al mostrar).
- **Overall:** promedio ponderado según posición (tabla en business-rules).
- **Tiers:** bronce ≤65 / plata 66-75 / oro simple 76-83 / oro ≥84.

### Flujo de stats iniciales
- **Self-assessment por el jugador + aprobación del Admin.**
- Carta queda en estado `pending_approval` hasta que Admin la revise.
- Después, solo Admin edita; jugador puede solicitar revisión.

### Sistema de boost (reemplaza ELO)
- **Boost temporal visible**, dura 3 partidos del jugador.
- **Nunca penaliza derrota.** Solo victoria y MVP generan boost.
- Aplicación atómica post-resultado vía Supabase RPC.

### Owners temporales
- **Designación automática** si Admin no confirma + no hay Owners fijos.
- Criterio: 2 jugadores con más antigüedad + confirmación. Si nadie confirma, sistema escala por antigüedad.
- **Poderes duran 24h post-partido** (cronjob de expiración).
- **Notificación push + email** al designarse; requiere confirmación explícita.

### Player fantasma
- Admin crea en el momento para completar equipo.
- Stats default 6/6/6/6/6/6, posición MED, sin User vinculado.
- Post-partido (7 días max): decisión del Admin → real / archive / delete.

### Notificaciones
- **Web Push** como canal principal.
- **Badge in-app** como fallback visual.
- **Email transaccional** para eventos críticos.
- **Sin SMS** en MVP.

### Histórico y retención
- **Jugador voluntario:** soft delete, histórico 1 año, vuelve sin fricción.
- **Jugador expulsado:** soft delete con flag, si vuelve requiere aprobación Admin.
- **Grupo huérfano:** archivado 30 días, luego hard delete.

### Donaciones
- **Link externo** (Cafecito / MercadoPago Link). Sin integración de pagos.

### Modelo ausente (chat)
- **No se diseña arquitectura para chat.** Si se agrega en v3, se evalúa como módulo independiente.

---

## Convenciones de código

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- ESLint + Prettier + commit hooks.
- Componentes: PascalCase.
- Hooks: camelCase con prefijo `use`.
- Stores (Zustand): `useXStore`.
- Archivos de spec: en `/specs/NN-area/`.
- Migraciones DB: `/supabase/migrations/YYYYMMDDHHMMSS_name.sql`.
- Tests: al lado del archivo (`thing.ts` → `thing.test.ts`), excepto integration tests de RLS que van en `/tests/integration/`.

---

## Patrones de diseño obligatorios

### Result<T> en lugar de throw
Todos los services devuelven `Result<T, AppError>`. Nunca `throw`. Capa UI pattern-matchea.

### RLS estricto, siempre
Todas las tablas tienen RLS habilitado. Policies por rol (Admin/Owner/Player). Auditado en `tests/integration/rls.test.ts`.

### Rating interno NO existe
A diferencia del V1, no hay rating oculto. El overall actual (base + boost) es todo lo que usa el algoritmo. Transparente.

### Stats inmutables post-aprobación
Una vez aprobadas las stats iniciales, el jugador NO las puede cambiar. Solo solicita revisión (proceso del Admin).

### Log inmutable de cambios de stats
Tabla `stat_change_log` con inserts only. Cualquier ajuste aprobado por Admin queda ahí con autor, fecha y valores anteriores/nuevos.

---

## Límites operativos (hard)

- 50 players activos por Group.
- 3 Groups como Admin por User.
- 10 Groups como Player (incluye Admin) por User.
- 2 Owners fijos por Group.
- Hasta 2 Owners temporales automáticos por evento.
- 365 días de soft-delete antes de hard delete (jugador).
- 30 días para grupos huérfanos.
- 7 días para decidir sobre player fantasma.
- 3 partidos de duración del boost temporal.

---

## Seguridad y privacidad

- **Email de otros jugadores** solo visible para Admin.
- **Stats** son visibles para todos los miembros del grupo (transparencia del algoritmo).
- **Log de cambios** público para todos los miembros del grupo.
- **Foto de perfil** visible para miembros del mismo Group.
- **No hay leaderboard público entre grupos.**
- **Exports** incluyen todo menos emails de otros jugadores (anonimizados).
