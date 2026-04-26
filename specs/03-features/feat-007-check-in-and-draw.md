# feat-007 — Check-in y sorteo

## Objetivo

Permitir al Admin/Owner hacer check-in físico en la cancha y ejecutar el sorteo balanceado de equipos. Este es **el momento de verdad** del producto: el usuario ve si el balanceo funciona y si la experiencia vale la pena.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 8 (Check-in), §Flow 10 (Sorteo).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §6 (Formaciones), §7 (Algoritmo de balanceo), §8 (Ciclo del Event).
- **Balanceo:** [`balancing-algorithm.md`](../01-domain/balancing-algorithm.md).
- **Entidades:** `Event`, `EventAttendance`, `MatchParticipation`, `Player`.
- **Tipos:** `DrawInput`, `DrawResult`, `DrawAssignment`, `DrawWarning`, `ParticipationTeam`.
- **Decisiones del engram:** `dec-102` a `dec-111`.

---

## Alcance

### Incluye

- UI de check-in desde la página del Event.
- Botón grande "Marcar todos los 'voy'" + toggles individuales.
- Agregar player fantasma durante check-in (reutilizando `feat-013`).
- Ejecución del algoritmo de balanceo 100% en cliente.
- Animación del sorteo (Framer Motion).
- UI de resultado: 2 equipos lado a lado con players por posición.
- Re-sortear con nueva semilla.
- Edición manual drag-and-drop entre equipos.
- Confirmación final del sorteo (status → `drawn`).
- Compartir imagen del sorteo.
- Warnings visuales (sin arquero, imbalance, etc.).

### No incluye

- Carga de resultado (`feat-008`).
- Aplicación de boost (`feat-009`).
- Re-edición después de confirmado el sorteo (requiere revertir, fuera de MVP).

---

## Flujo

### Etapa 1 — Entrada al check-in

**Permisos:** Admin, Owner fijo, Owner temporal confirmado con event.id dentro de su expiración.

**Ubicación:** página del Event (`/groups/{id}/events/{event_id}`), sección visible solo para admin/owners.

**UI:**

- Badge de status del Event: *"Programado"*, *"Esperando check-in"* (si faltan <2h), *"En check-in"* (si ya se tocó el botón), *"Sorteo listo"* (post-draw), *"Jugado"* (post-result), *"Cancelado"*.
- Botón grande **"Hacer check-in"** visible si:
  - Status = `scheduled` o `confirming`.
  - `scheduled_at - now() < 4 horas` (activación 4h antes).
  - User es Admin u Owner.

**Restricción de tiempo:** el botón no aparece para un partido que todavía está a 3 días. Aparece cuando queda <4h para el partido. Evita que se hagan check-ins accidentales de partidos futuros.

### Etapa 2 — Pantalla de check-in

**Ruta:** `/groups/{id}/events/{event_id}/check-in`

**UI:**

- Header con botón "Volver" y título *"Check-in"*.
- Info rápida del Event: *"F5 · 20:00 · La Boquita"*.
- **Contador superior:** *"N checked / X necesarios (F5 necesita 10)"*.
- **Botón destacado:** *"Marcar todos los 'voy'"*. Al tocar, marca como `checked_in=true` a todos los que tienen `attendance_status='going'`. 1 click para el 80% de los casos.
- **Lista de confirmados (going + maybe)**:
  - Para cada Player: foto chica + nombre + posición primaria como badge (`ARQ`, `DEF`, `MED`, `DEL`) + toggle grande estilo iOS.
  - Toggle ON = checked_in=true; OFF = checked_in=false.
  - Visualmente separados "Van" (grupo arriba) y "Tal vez" (grupo abajo).
  - Si un `maybe` lo marcan como checked, sube visualmente a "Van" en tiempo real.
- **Sección "Agregar jugador"**:
  - Link *"Agregar jugador fantasma"* → abre modal de `feat-013`.
  - Al crear, aparece en la lista con badge "FANTASMA" y ya marcado como checked.
- **Botón principal al pie:** *"Ir al sorteo"*:
  - Deshabilitado si `count(checked_in) < team_size * 2`.
  - Habilitado cuando hay cupo mínimo.
  - Muestra validaciones pendientes (ej: *"Faltan 2 jugadores para F5"*).

**Comportamiento:**

- Cada toggle dispara `update_checkin(event_id, player_id, checked_in)` inmediatamente (RPC).
- Persistencia en tiempo real: si el admin cambia de device o se refresca la página, el estado se mantiene.
- Al tocar "Ir al sorteo", se pasa status del Event a `checked_in` y se navega al sorteo.

### Etapa 3 — Ejecución del sorteo

**Ruta:** `/groups/{id}/events/{event_id}/draw`

**Carga inicial (antes de ejecutar el algoritmo):**

- Pantalla "Preparando sorteo" con spinner, 1-2 segundos.
- Cliente ejecuta el algoritmo (ver `balancing-algorithm.md`).
- **Fase 0 — validación de viabilidad**. Si falla:
  - **No enough goalkeepers** (0 o 1 arqueros entre checked-in):
    - Modal: *"Falta/n arquero/s"*.
    - Opciones:
      1. *"Convertir a MED → ARQ"* (se elige automáticamente el MED con menor overall).
      2. *"Agregar jugador fantasma ARQ"* (abre flujo de feat-013 con posición pre-seleccionada).
      3. *"Cancelar sorteo"* → vuelve a check-in.
  - **Cantidad impar**:
    - Modal: *"Hay un jugador impar. ¿Qué hacemos?"*.
    - Opciones:
      1. *"Un equipo con 1 más"*.
      2. *"Dejar a {nombre} como suplente"* (elige por criterio: menor antigüedad primero).
      3. *"Agregar fantasma para emparejar"*.
      4. *"Cancelar"*.
  - **Cantidad insuficiente**:
    - Modal: *"Faltan X jugadores para completar {modalidad}"*.
    - Opciones: agregar fantasma(s) o cancelar.
  - **Cantidad excesiva (más que team_size × 2)**:
    - Modal: *"Sobran X jugadores. ¿Quiénes quedan afuera?"*.
    - Opciones:
      1. *"Sistema elige suplentes automáticamente"* (criterio: menor antigüedad en el grupo).
      2. *"Elegir a mano"* → permite al admin desmarcar check-in en los que van a quedar como suplentes.

### Etapa 4 — Animación del sorteo

**Una vez resueltas las validaciones**, se ejecuta el algoritmo y comienza la animación:

- Pantalla en negro suave (fondo oscuro para destacar las cards).
- Sonido opcional (pelota rebotando) — silenciable.
- Las cards de los players aparecen desde arriba de a una con interval ~150ms.
- Cada card "rueda" con animación hacia su equipo correspondiente (izquierda o derecha).
- Durante el rolling, la posición asignada se revela (ARQ, DEF, MED, DEL).
- Duración total: **~4 segundos** para un F8 (16 players).
- Al final, las cards quedan organizadas en 2 columnas.

**Skip button:** link chico arriba a la derecha *"Saltar animación"* para admins apurados.

### Etapa 5 — Pantalla de resultado

**UI:**

- Dos columnas verticales en mobile (en desktop: lado a lado).
- Cada columna tiene:
  - Nombre del equipo editable: default *"Equipo A"* / *"Equipo B"*.
  - Badge de overall promedio: *"Overall: 72"*.
  - Lista de players agrupados por posición (ARQ, DEF, MED, DEL):
    - Foto chica + nombre + overall.
    - Si `playedPrimaryPosition === false`, badge chico *"Fuera de posición"*.
- Entre ambas columnas, un badge destacado: *"Diff: 3"* (diferencia de overall entre equipos).
  - Verde si ≤5, amarillo si 6-10, rojo si >10.

**Warnings visibles arriba** (si hay):
- *"Un equipo tiene 1 jugador más."*
- *"Hay jugadores fuera de su posición primaria."*
- *"Imbalance de {N}: los equipos no están parejos."*
- *"Arquero forzado: {nombre} es MED, juega de ARQ en este partido."*

**Botones al pie:**

1. **"Confirmar sorteo"** (verde, grande): bloquea el resultado y avanza el flow.
2. **"Re-sortear"** (secundario): regenera con semilla nueva, nueva animación.
3. **"Editar manualmente"** (secundario): activa modo drag-and-drop.

### Etapa 6 — Modo edición manual

**UI:**

- Cada player card se vuelve draggable.
- Puede arrastrarse entre equipos (drop zones visibles).
- Puede arrastrarse a "Banco" (suplente).
- Overalls y diff se recalculan en vivo.
- Botón *"Listo"* para salir del modo edición.
- Botón *"Deshacer cambios"* para volver al resultado original del algoritmo.

**Warning**: si el admin mueve un player a una posición donde no es primaria ni secundaria, aparece badge *"Fuera de posición"*. Sin bloqueo.

### Etapa 7 — Confirmar sorteo

**Al tocar "Confirmar sorteo":**

1. RPC `confirm_draw(event_id, assignments, seed)`.
2. RPC ejecuta transacción:
   - `UPDATE events SET status='drawn', draw_seed=seed, drawn_by_user_id=auth.uid()`.
   - Por cada assignment, insert en `match_participations`:
     - `event_id`, `player_id`, `team`, `assigned_position`, `played_primary_position`, `boost_applied` (snapshot del boost activo del Player en este momento).
3. Notifications a todos los participantes: `match_ready` (push + in-app) con *"Tu equipo está listo. Jugás en Equipo A como DEF."*.
4. Redirect a `/groups/{id}/events/{event_id}/teams` (pantalla de equipos confirmados).

### Etapa 8 — Pantalla de equipos confirmados

**Ruta:** `/groups/{id}/events/{event_id}/teams`

**UI:**

- Dos columnas con equipos finales.
- Botón *"Compartir imagen"* arriba a la derecha:
  - Usa `html-to-image` para capturar el componente.
  - Abre Web Share API con PNG generado.
  - Fallback: descarga la imagen al dispositivo.
- Link *"Volver al evento"* al pie.

**La imagen compartida incluye:**
- Logo del grupo (si tiene).
- Nombre del grupo.
- Fecha del partido.
- Modalidad.
- Dos equipos con cards chicas (foto + nombre + overall + posición).
- Footer chico: *"El Fulbo"*.

---

## Contratos

```ts
interface DrawExecutionInput {
  eventId: EventId;
  seed: string;
}

interface ConfirmDrawInput {
  eventId: EventId;
  seed: string;
  assignments: DrawAssignment[];
  teamAName: string;
  teamBName: string;
}

type ConfirmDrawOutput = Result<void, AppError>;
```

---

## Notification types nuevos

| Tipo | Push | Email | In-app |
|------|------|-------|--------|
| `match_ready` | ✅ | ❌ | ✅ |

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Admin abandona check-in y vuelve después | Estado se mantiene, continúa desde donde dejó. |
| Todos los confirmados hacen checked_in pero siguen siendo pocos | Modal con opciones (fantasma o cancelar). |
| Admin empieza el sorteo, modal de "falta arquero", convierte MED→ARQ | El sorteo se ejecuta con ese MED reasignado a ARQ con overall recalculado. |
| Admin re-sortea 5 veces | Cada vez con semilla nueva, sin límite de reintentos. |
| Admin edita manualmente y crea un imbalance gigante (>15 puntos) | Warning visible. Admin puede confirmar igual. |
| Player se baja **durante** el check-in (admin ya tocó el botón) | Si todavía no se confirmó el sorteo, el admin puede desmarcar al que se bajó y re-sortear. |
| Admin confirma el sorteo y se da cuenta que hay error | En MVP, no se puede revertir. Hay que cargar resultado 0-0 y empezar de nuevo. Feature futura. |
| Player con boost activo entra al sorteo | `overallActual = base + boost` se usa en el balanceo. Snapshot se guarda en `match_participations.boost_applied`. |
| PWA offline durante el sorteo | Algoritmo corre 100% en cliente. Confirmación del sorteo se encola para cuando vuelva internet. |
| Dos owners simultáneamente hacen check-in en dispositivos distintos | Toggles se sincronizan vía Supabase Realtime. Última acción gana por tipo de toggle. |

---

## Validaciones

```ts
const confirmDrawSchema = z.object({
  eventId: z.string().uuid(),
  seed: z.string().min(1),
  assignments: z.array(z.object({
    playerId: z.string().uuid(),
    team: z.enum(['A', 'B', 'substitute']),
    assignedPosition: z.enum(['ARQ', 'DEF', 'MED', 'DEL']).nullable(),
    playedPrimaryPosition: z.boolean(),
  })).min(1),
  teamAName: z.string().trim().min(1).max(30),
  teamBName: z.string().trim().min(1).max(30),
});
```

---

## Tests

### Unit
- Algoritmo de balanceo (ya cubierto en `balancing-algorithm.md §Tests`).
- `confirmDraw` crea `match_participations` correctamente.
- `update_checkin` respeta permisos.

### Integration
- Flow completo: check-in → sorteo → confirmar → participations creadas.
- Realtime en check-in entre 2 devices.
- Warnings de balanceo aparecen cuando corresponden.

### E2E
- Admin hace check-in y sortea un F5 con 10 players.

---

## Copy

- Botón check-in: *"Hacer check-in"*
- Header: *"Check-in"*
- Contador: *"X checkeados / Y necesarios"*
- Marcar todos: *"Marcar todos los 'voy'"*
- Agregar fantasma: *"Agregar jugador fantasma"*
- Botón sorteo: *"Ir al sorteo"*
- Deshabilitado: *"Faltan X jugadores para {modalidad}"*
- Skip animación: *"Saltar animación"*
- Confirmar sorteo: *"Confirmar sorteo"*
- Re-sortear: *"Re-sortear"*
- Editar: *"Editar manualmente"*
- Listo edición: *"Listo"*
- Deshacer: *"Deshacer cambios"*
- Diff: *"Diff: X"*
- Warning arquero: *"Falta arquero"*
- Warning imbalance: *"Los equipos no están parejos"*
- Warning fuera posición: *"Fuera de posición"*
- Notif match ready: *"Tu equipo está listo. Jugás en {equipo} como {posición}."*
- Compartir: *"Compartir imagen"*

---

## Criterios de aceptación

- [ ] Check-in solo disponible 4h antes del partido, para admin/owner.
- [ ] Botón "Marcar todos" funciona en 1 tap.
- [ ] Toggles individuales persistidos en vivo.
- [ ] Player fantasma agregable durante check-in.
- [ ] Validación de viabilidad pre-sorteo con opciones claras.
- [ ] Animación del sorteo dura ~4 segundos, saltable.
- [ ] Resultado muestra 2 equipos, warnings, overall diff.
- [ ] Re-sortear genera resultado distinto.
- [ ] Edición manual drag-and-drop funciona.
- [ ] Confirmar sorteo crea `match_participations` y notifica a todos.
- [ ] Compartir imagen funciona en mobile (Web Share) y desktop (descarga).
- [ ] Tests pasan incluyendo offline del sorteo.
