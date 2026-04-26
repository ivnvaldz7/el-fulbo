# feat-001 — Onboarding del usuario

## Objetivo

Llevar a un usuario desde "nunca entró a El Fulbo" hasta "tiene carta pendiente de aprobación en un grupo", sin fricción innecesaria. Es el primer contacto con el producto; acá se gana o se pierde al usuario.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 1 (Signup), §Flow 3 (Unirse), §Flow 4 (Self-assessment).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §1 (Stats y Overall), §3 (Flujo de stats iniciales), §16 (Validaciones).
- **Entidades:** [`entities.md`](../01-domain/entities.md) — `User`, `Player`, `Group`, `PlayerStatChangeLog`.
- **Tipos:** [`types.ts`](../04-contracts/types.ts) — `CreatePlayerStatsInput`, `PlayerStats`, `FieldStats`, `GoalkeeperStats`, `PlayerPosition`, `Tier`.
- **Errores:** [`error-model.md`](../04-contracts/error-model.md) — `INVITE_CODE_INVALID`, `VALIDATION_ERROR`, `STATS_PENDING_APPROVAL`, `PLAYER_GROUP_LIMIT_REACHED`, `USER_PLAYER_GROUPS_LIMIT_REACHED`.
- **Schema:** [`db-schema.md`](../04-contracts/db-schema.md) — tablas `users`, `players`, `player_stat_change_logs`.
- **Decisiones del engram:** `dec-019`, `dec-020`, `dec-021`, `dec-022`, `dec-024`, `dec-025`, `dec-038` a `dec-044`.

---

## Alcance

### Incluye

- Landing con preview animado de cards FIFA + 2 CTAs.
- Login con Google OAuth vía Supabase Auth (pantalla intermedia).
- Redirect post-login según estado del User (con grupos / sin grupos).
- Aceptación de invitación por link directo o código pegado.
- Preview del grupo al aceptar ("Te invitaron a {nombre}").
- Wizard de 2 pasos para cargar stats iniciales (self-assessment).
- Persistencia del draft en `localStorage`.
- Carta en estado `pending_approval` al enviar.
- Mensajes al usuario sobre el estado de aprobación.

### No incluye (son otros features)

- Creación de grupos (va en `feat-002-create-group.md`).
- Aprobación de stats por el Admin (va en `feat-004-admin-approve-stats.md`).
- Solicitud de revisión de stats (`feat-004`).
- Gestión de perfil del User post-signup (edición de nombre, foto).
- Notificaciones push (va en `feat-012-notifications.md`).

---

## Flujo completo

### Etapa 1 — Landing (sin sesión)

**Ruta:** `/`

**UI:**

- Logo "El Fulbo" arriba.
- Preview animado (Framer Motion): loop suave de 4 cards FIFA rotando (bronce → plata → oro simple → oro), con stats apareciendo en secuencia. Dura 4-6 segundos, se repite.
- Pitch abajo: **"Organizá tu fulbito sin salir de una sola app."** (1 frase, font grande, bold).
- Sub-pitch: *"Evento, confirmaciones, sorteo y cards FIFA para cada jugador. Todo junto."* (1 línea, font normal).
- 2 botones grandes:
  - **"Crear un grupo"** (primary, color principal).
  - **"Unirme a un grupo"** (secondary, outline).
- Footer chico: link a `/about`, email de soporte, link de donación si aplica (lo ajusta el propio Iván después).

**Comportamiento:**

- Detecta sesión activa al cargar (via Supabase Auth cookie). Si hay sesión y el User tiene ≥1 Group → redirect a `/dashboard`. Si hay sesión pero sin Groups → redirect a `/welcome`. Si no hay sesión → mostrar landing.
- Tocar "Crear un grupo" → redirect a `/auth?intent=create`.
- Tocar "Unirme a un grupo" → redirect a `/join`.

---

### Etapa 2 — Unirse con código (sin link directo)

**Ruta:** `/join`

**UI:**

- Header con botón "Volver" a la izquierda.
- Título: **"Unite con un código"**.
- Input grande:
  - Placeholder: `FULBO-XXXXXX`.
  - Autouppercase al escribir.
  - Auto-inserción del guion después de `FULBO`.
  - Validación client-side: formato `FULBO-[A-Z0-9]{6}`.
- Texto chico debajo: *"¿No tenés código? Pedile el link a quien organiza el grupo."*
- Botón **"Continuar"** (primary), deshabilitado hasta que el formato sea válido.

**Comportamiento:**

- Al tocar "Continuar", llamar al backend `POST /api/invite/validate` con el código.
- Si el código es válido → redirect a `/invite/{invite_code}`.
- Si es inválido → mostrar mensaje inline debajo del input: *"No encontramos ese código. Revisá que esté bien escrito, o pedile el link a quien te invitó."* (error style). El input se mantiene con lo que escribió para que corrija.

**Errores posibles:**
- `INVITE_CODE_INVALID` → mensaje inline, input editable.
- `NETWORK_ERROR` → toast "Problemas de conexión, reintentá".

---

### Etapa 3 — Preview del grupo + login

**Ruta:** `/invite/{invite_code}`

Esta ruta es accesible por 2 vías:
1. Desde `/join` después de validar código.
2. Desde link directo compartido por un Admin (WhatsApp, etc.).

**UI (sin sesión activa):**

- Header con botón "Volver" a `/`.
- Card del grupo:
  - Logo del Group (si tiene) o placeholder.
  - Nombre del Group.
  - Modalidad por default (ej: "F8").
  - Cantidad de jugadores activos: *"12 jugadores"*.
  - Nombre del admin: *"Organizado por Juan Pérez"*.
- Texto: **"Te invitaron a unirte a este grupo."**
- Botón grande: **"Entrar con Google para unirme"**.
- Texto chico abajo: *"Usamos tu cuenta de Google para guardar tu carta y tus partidos."*

**Comportamiento:**

- Al tocar el botón: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback?next=/invite/{invite_code}' } })`.
- Flow de Google OAuth en popup (no full redirect, mantener estado).
- Al volver a `/auth/callback`, backend:
  1. Upsertea en `public.users` con datos de Google.
  2. Redirect a `/invite/{invite_code}`.

**UI (con sesión activa, primer visita a la ruta):**

- Mismo preview del grupo.
- Botón: **"Unirme al grupo"**.
- Al tocar → ejecuta `accept_invite(invite_code)` (RPC del schema).
- Si ya es miembro activo (existe `player` con `user_id` y `group_id` matching y `archived_at is null`): **redirect silencioso** a `/groups/{id}/dashboard` **sin pasar por el preview**. El usuario nunca ve esta pantalla si ya es miembro.
- Si es miembro archivado con `is_expelled=false` y `archived_at < 365 días`: redirect a `/invite/{invite_code}/reactivate` (cubierto en `feat-003`).
- Si es nuevo miembro: crea `Player` con `stats_status='pending_approval'`, stats default `{todas: 5}`, sin posición elegida todavía. Redirect a `/groups/{id}/onboarding-stats`.

**Errores posibles:**
- `INVITE_CODE_INVALID` → redirect a `/join` con toast "Ese link no es válido".
- `PLAYER_GROUP_LIMIT_REACHED` (si el Group llegó a 50) → mensaje: "Este grupo llegó al límite. Contactá al admin para que archive alguno."
- `USER_PLAYER_GROUPS_LIMIT_REACHED` (User ya está en 10 Groups como Player) → mensaje: "Llegaste al máximo de 10 grupos. Salí de alguno para sumar este."

---

### Etapa 4 — Wizard de stats iniciales

**Ruta:** `/groups/{id}/onboarding-stats`

Wizard de 2 pasos. Draft persistido en `localStorage` con key `onboarding-draft-{group_id}`.

#### Paso 1 — ¿Dónde jugás?

**UI:**

- Header: "Paso 1 de 2".
- Título: **"¿En qué posición jugás?"**
- 4 botones grandes, 2 filas de 2 columnas en mobile, grid en desktop:
  - `ARQ` — Arquero (con ilustración).
  - `DEF` — Defensor.
  - `MED` — Mediocampista.
  - `DEL` — Delantero.
- Debajo, colapsable opcional: **"¿Tenés segunda posición?"** → abre las mismas 4 opciones (sin la primary, deshabilitada).
- Botón **"Siguiente"** al pie (primary, disabled hasta elegir primary).

**Comportamiento:**

- Al tocar una posición primaria, queda seleccionada (visual feedback).
- Si la segundaria está abierta, pueden elegir una (o no). La primary no puede ser secundaria.
- Al tocar "Siguiente":
  - Guardar en `localStorage`: `{ step: 2, primary_position, secondary_position, stats: {todas: 5} }`.
  - Avanzar al paso 2.

**Validación:**
- `primary_position` obligatoria.
- Si `secondary_position` existe, debe ser ≠ `primary_position`.

#### Paso 2 — Armá tu carta

**UI:**

- Header: "Paso 2 de 2" + botón "Atrás".
- Mobile: **Preview de la card sticky arriba** (ocupa ~40% del viewport). Sliders abajo.
- Desktop: split 50/50. Card a la izquierda, sliders a la derecha.
- Preview de la card:
  - Usa el componente canónico `<Card />` que el producto usa en todos lados.
  - Se renderiza con foto del User (Google), nombre del User (Google), posición elegida en paso 1, stats del estado actual, tier calculado en vivo, sin boost.
  - Se actualiza en tiempo real mientras el usuario mueve sliders.
- Sliders (6 totales, los de la posición elegida — campo o arquero):
  - Cada slider tiene:
    - Nombre corto a la izquierda (ej: `PAC`).
    - Descripción a la derecha (ej: *"Velocidad"*).
    - Valor numérico actual (ej: `7`).
    - Slider 1-10 con paso 1.
    - **Máximo = 8.** No deja pasar de 8.
  - Si el usuario intenta pasar de 8: el slider se queda en 8, y aparece un toast discreto una sola vez (primera vez): *"Para desbloquear 9 y 10, el admin te tiene que ajustar o ganás partidos."*
- Descripciones por stat (copy propuesto):
  - **Jugador de campo:**
    - `PAC` — Velocidad: qué tan rápido corrés.
    - `SHO` — Tiro: tu patada al arco.
    - `PAS` — Pase: qué tan bien tirás pelotas al compañero.
    - `DRI` — Regate: gambeta, control cortito.
    - `DEF` — Defensa: capacidad de marcar y cortar.
    - `PHY` — Físico: fuerza, aguante, pelota dividida.
  - **Arquero:**
    - `DIV` — Estirada: capacidad de volar.
    - `HAN` — Manos: qué tan seguro con la pelota.
    - `KIC` — Saque: patada de salida.
    - `REF` — Reflejos: reacción rápida al tiro.
    - `SPD` — Velocidad: para salir a cortar bajas.
    - `POS` — Colocación: elegir el lugar justo.
- Botón grande al final: **"Mandar al admin"** (primary).

**Comportamiento:**

- Cada cambio en un slider actualiza el estado y guarda en `localStorage`.
- Al retomar el wizard (abrir la ruta con draft existente): toast discreto *"Retomamos donde te quedaste"*.
- Toque de "Mandar al admin":
  1. Validación final client-side (todos los sliders 1-8, posición definida).
  2. `UPDATE players SET primary_position, secondary_position, stats = {...}, stats_status = 'pending_approval' WHERE id = player.id`.
  3. Crear notification para el Admin del Group con type `stats_pending_approval` (solo in-app badge, sin push ni email por item — ver §Tema notificaciones abajo).
  4. Limpiar `localStorage`.
  5. Redirect a `/groups/{id}/pending` (siguiente etapa).

**Errores posibles:**
- `VALIDATION_ERROR` → toast "Revisá los valores y reintentá" (no debería pasar con validación client-side, pero por las dudas).
- `NETWORK_ERROR` → toast "Problemas de conexión. Los datos están guardados, reintentá más tarde." Los datos siguen en localStorage.

---

### Etapa 5 — Pendiente de aprobación

**Ruta:** `/groups/{id}/pending`

**UI:**

- Header normal del Group (nombre, logo).
- Card grande al centro: el preview de la carta que el usuario mandó, con badge **"Pendiente de aprobación"** (label amarillo o gris) superpuesto.
- Texto: **"Tu carta está esperando que el admin la apruebe."**
- Sub-texto: *"Vas a poder confirmar asistencia a partidos cuando tu carta esté aprobada. Mientras tanto, podés ver el grupo."*
- Botón grande: **"Explorar el grupo"** → redirect a `/groups/{id}/dashboard`.

**Comportamiento del dashboard con carta pendiente:**

- Navegación completa habilitada: puede ver roster, ver cards de otros, ver eventos pasados, ver eventos próximos.
- **No** puede confirmar asistencia a eventos. Los botones de "Voy / No voy / Tal vez" están deshabilitados con tooltip: *"Esperá que aprueben tu carta para confirmar."*
- En el roster, **no aparece** hasta que la carta esté aprobada (consistente con la regla).
- Banner persistente arriba del dashboard del grupo: *"Tu carta está pendiente. Cuando el admin la apruebe, vas a aparecer en el roster."*

---

## Contratos de datos

### Input del wizard (paso 2 submit)

```ts
interface SubmitOnboardingStatsInput {
  groupId: GroupId;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  stats: PlayerStats;  // FieldStats o GoalkeeperStats según primaryPosition
}
```

### Output

```ts
type SubmitOnboardingStatsOutput = Result<
  { playerId: PlayerId; status: 'pending_approval' },
  AppError
>;
```

### Service

```ts
// /src/lib/services/onboarding.ts
async function submitOnboardingStats(
  input: SubmitOnboardingStatsInput
): Promise<SubmitOnboardingStatsOutput>
```

---

## Validaciones (Zod schemas)

```ts
const fieldStatsSchema = z.object({
  pac: z.number().int().min(1).max(8),
  sho: z.number().int().min(1).max(8),
  pas: z.number().int().min(1).max(8),
  dri: z.number().int().min(1).max(8),
  def: z.number().int().min(1).max(8),
  phy: z.number().int().min(1).max(8),
});

const goalkeeperStatsSchema = z.object({
  div: z.number().int().min(1).max(8),
  han: z.number().int().min(1).max(8),
  kic: z.number().int().min(1).max(8),
  ref: z.number().int().min(1).max(8),
  spd: z.number().int().min(1).max(8),
  pos: z.number().int().min(1).max(8),
});

const submitOnboardingStatsSchema = z.object({
  groupId: z.string().uuid(),
  primaryPosition: z.enum(['ARQ', 'DEF', 'MED', 'DEL']),
  secondaryPosition: z.enum(['ARQ', 'DEF', 'MED', 'DEL']).nullable(),
  stats: z.union([fieldStatsSchema, goalkeeperStatsSchema]),
}).refine(
  (data) => data.primaryPosition !== data.secondaryPosition,
  { message: 'La posición secundaria debe ser distinta a la primaria' }
).refine(
  (data) => data.primaryPosition === 'ARQ'
    ? 'div' in data.stats
    : 'pac' in data.stats,
  { message: 'Las stats no coinciden con la posición' }
);
```

**Importante:** el tope de 8 se valida client-side **y** server-side. En DB, el schema de `players.stats` permite hasta 10 (porque el Admin puede subir a 9-10). El tope de 8 aplica solo al input de onboarding del jugador.

---

## Edge cases resueltos

| Caso | Comportamiento |
|------|----------------|
| Jugador cambia de posición primaria en paso 1 (todavía no llegó al paso 2) | Sin efecto, solo cambia la selección. |
| Jugador en paso 2 con stats cargadas, vuelve al paso 1, cambia de DEF a MED | Mantiene stats. Al avanzar al paso 2 ve las mismas stats pero los "principales" cambiaron (se recalculan pesos al renderizar overall). |
| Jugador en paso 2 con stats cargadas, vuelve al paso 1, cambia de DEL a ARQ | Modal: *"Vas a cambiar a arquero. Las stats cambian, vas a tener que cargarlas de nuevo. ¿Seguís?"*. Si acepta: stats reinician a `{div:5, han:5, kic:5, ref:5, spd:5, pos:5}`. |
| Jugador cierra browser en paso 1 | Al volver, abre en paso 1 con la selección previa (si había). |
| Jugador cierra browser en paso 2 | Al volver, toast "Retomamos donde te quedaste", abre en paso 2 con todas las stats cargadas como estaban. |
| Jugador cierra el navegador, limpia cookies y vuelve | Pierde sesión (requiere re-login Google) y draft (localStorage limpio). Arranca de cero. |
| Jugador usa un link de invitación al Group en el que ya es miembro activo | Redirect silencioso a `/groups/{id}/dashboard`. |
| Jugador usa link de invitación a Group donde estuvo archivado | Redirect a flow de reactivación (otro feature). |
| Jugador está en paso 2 y llega a la pantalla de "Confirmar asistencia" a un evento antes de aprobación | Los botones están deshabilitados con tooltip explicativo. |
| Admin del Group se autoelimina antes de aprobar al nuevo Player | Ver flujo huérfano en `business-rules.md §13`. El nuevo Player queda con carta pendiente hasta que haya Admin nuevo. |
| Jugador completa el wizard pero la notification al Admin falla | La carta queda pending igual. El admin la ve cuando entra al dashboard (badge persistente). |
| Jugador en el paso 2 con conexión intermitente | Cambios se guardan en localStorage. Al enviar con red recuperada, se manda. |
| Código de invitación cambió después de que lo compartieron | El endpoint `accept_invite` retorna `INVITE_CODE_INVALID`. El usuario pide link nuevo. |

---

## UI/UX específicos

### Responsive

- **Mobile (< 768px):** todo vertical, preview de card sticky arriba en paso 2.
- **Tablet (768-1024px):** 2 columnas en paso 2 (card izq, sliders der), ratio 40/60.
- **Desktop (> 1024px):** 2 columnas, ratio 50/50, con max-width 1200px centrado.

### Accesibilidad (baseline)

- Tab order coherente.
- Labels asociados a sliders.
- Contraste mínimo AA.
- `aria-live` en la card preview para que cambios sean leídos por screen readers.

### Performance

- Imágenes de cards optimizadas (WebP).
- Componente `<Card />` es pesado (animaciones + gradientes), debe estar memoizado (`React.memo`).
- Persistencia en localStorage debounced (200ms).

---

## Tests obligatorios

### Unit

- `src/lib/services/onboarding.test.ts`:
  - Submit happy path con field stats.
  - Submit happy path con goalkeeper stats.
  - Submit con posición primaria=ARQ pero stats de campo → `VALIDATION_ERROR`.
  - Submit con slider en 9 → `VALIDATION_ERROR` (el tope de 8).
  - Submit con secondary === primary → `VALIDATION_ERROR`.

- `src/lib/validations/onboarding.test.ts`:
  - Schema de FieldStats con todos en 8 → OK.
  - Schema con un 9 → fail.
  - Schema con un 0 → fail.

- `src/components/wizard/__tests__/Step2.test.tsx`:
  - Slider respeta tope 8.
  - Preview de card se actualiza al mover slider.
  - Cambio de posición en paso 1 se refleja al volver al paso 2.
  - localStorage se persiste al cambiar sliders.

### Integration

- `tests/integration/onboarding-flow.test.ts`:
  - Usuario acepta invitación, crea Player con pending_approval.
  - Stats se submitean, player.stats se actualiza y notification se crea para el Admin.
  - Intento de usuario que ya es miembro → redirect, no crea nuevo Player.
  - Intento de invitación a Group con 50 players activos → `PLAYER_GROUP_LIMIT_REACHED`.

### RLS

- `tests/integration/rls.test.ts` (sección onboarding):
  - User puede UPDATE su propio `players.stats` solo si `stats_status='pending_approval'`.
  - User NO puede UPDATE su propio `players.stats` si `stats_status='approved'`.
  - User NO puede UPDATE `players.stats` de otro Player.

---

## Copy (textos) — versión final argentino coloquial

- Landing pitch: *"Organizá tu fulbito sin salir de una sola app."*
- Landing sub: *"Evento, confirmaciones, sorteo y cards FIFA para cada jugador. Todo junto."*
- CTAs landing: *"Crear un grupo"* / *"Unirme a un grupo"*.
- Input /join placeholder: `FULBO-XXXXXX`.
- Ayuda input /join: *"¿No tenés código? Pedile el link a quien organiza el grupo."*
- Error código inválido: *"No encontramos ese código. Revisá que esté bien escrito, o pedile el link a quien te invitó."*
- Preview del Group: *"Te invitaron a unirte a este grupo."*
- Botón login: *"Entrar con Google para unirme"*.
- Aclaración login: *"Usamos tu cuenta de Google para guardar tu carta y tus partidos."*
- Botón post-login con sesión: *"Unirme al grupo"*.
- Título paso 1 wizard: *"¿En qué posición jugás?"*
- Opcional paso 1: *"¿Tenés segunda posición?"*
- Título paso 2 wizard: *"Armá tu carta"*.
- Botón final wizard: *"Mandar al admin"*.
- Toast tope 8: *"Para desbloquear 9 y 10, el admin te tiene que ajustar o ganás partidos."*
- Toast retomo draft: *"Retomamos donde te quedaste"*.
- Pantalla pending: *"Tu carta está esperando que el admin la apruebe."*
- Sub pending: *"Vas a poder confirmar asistencia a partidos cuando tu carta esté aprobada. Mientras tanto, podés ver el grupo."*
- Banner del dashboard pending: *"Tu carta está pendiente. Cuando el admin la apruebe, vas a aparecer en el roster."*
- Tooltip botón confirmar deshabilitado: *"Esperá que aprueben tu carta para confirmar."*

---

## Criterios de aceptación (Auditor checklist)

- [ ] Usuario sin sesión ve landing con preview de cards + 2 CTAs.
- [ ] Tocar "Unirme" sin código lleva a `/join` con input válido.
- [ ] Código inválido muestra mensaje inline sin perder lo escrito.
- [ ] Código válido → redirect a preview del grupo.
- [ ] Login Google funciona y crea row en `public.users`.
- [ ] Link de invitación directo funciona con sesión existente.
- [ ] Redirect silencioso si ya es miembro activo.
- [ ] Player se crea con `stats_status='pending_approval'` al aceptar invitación.
- [ ] Wizard paso 1 permite elegir primaria + secundaria opcional.
- [ ] Wizard paso 2 muestra preview en vivo de la card.
- [ ] Sliders respetan tope de 8 (client + server).
- [ ] Cambio de posición DEF↔MED↔DEL mantiene stats.
- [ ] Cambio de posición campo↔ARQ muestra modal y reinicia stats al confirmar.
- [ ] Draft persiste en localStorage y retoma con toast.
- [ ] Submit exitoso crea log `stats_pending_approval` + notification in-app al Admin.
- [ ] Pantalla `pending` se muestra post-submit.
- [ ] Dashboard con carta pendiente: navegación libre, confirmación de asistencia deshabilitada.
- [ ] Banner persistente visible en dashboard con carta pending.
- [ ] En roster, el Player con carta pending NO aparece.
- [ ] Todos los tests unit, integration y RLS pasan.
- [ ] Copy final en español argentino, sin slang ni formalismo.

---

## Fuera de alcance

- Edición de perfil (nombre, foto) post-signup — queda para `feat-015-user-profile.md` (backlog).
- Notificación push al Admin — queda para `feat-012-notifications.md`. En feat-001, solo in-app badge via tabla `notifications`.
- Flow de reactivación de miembro archivado — queda para `feat-003-join-group.md`.
- Diseño visual detallado — queda para fase de UI, usando Stitch + reconstrucción manual según `architecture-decisions.md`.
