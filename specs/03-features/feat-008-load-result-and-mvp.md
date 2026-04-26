# feat-008 — Cargar resultado y MVP

## Objetivo

Permitir al Admin (u Owner) cargar el resultado del partido (score + MVP) después del sorteo, disparando la aplicación de boosts y actualizando las cards de los jugadores.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 11 (Cargar resultado + MVP).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §5 (Boost), §8.5 (Resultado).
- **Balanceo:** [`balancing-algorithm.md`](../01-domain/balancing-algorithm.md) §Aplicación del boost.
- **Entidades:** `Event`, `MatchParticipation`, `Player`, `CurrentBoost`.
- **Tipos:** `LoadMatchResultInput`, `BoostReason`.
- **Decisiones del engram:** `dec-112` a `dec-117`.

---

## Alcance

### Incluye

- Form de resultado disponible post-sorteo.
- 2 inputs de score (0-99).
- Selector de MVP entre los participantes.
- Notas opcionales.
- Aplicación atómica de boosts según `business-rules §5`.
- Update de cards de todos los jugadores.
- Notifications de MVP y boosts aplicados.
- Transición del Event a status `played`.
- Soporte para "empate" y "partidos sin goles" (0-0).

### No incluye

- Votación comunitaria del MVP (queda para v2.1, ver dec-035).
- Stats individuales del partido (goles, asistencias, tarjetas) — fuera de MVP.
- Re-carga del resultado después de confirmado (requiere deshacer boosts, fuera de MVP).
- Carga parcial (score sin MVP) — obligatorio elegir MVP en MVP.

---

## Flujo

### Etapa 1 — Entrada

**Ubicación:** página del Event (`/groups/{id}/events/{event_id}`), después de que el sorteo está confirmado.

**Permisos:** Admin, Owner fijo, Owner temporal confirmado.

**UI:**

- Si `status=='drawn'`: botón grande **"Cargar resultado"** visible para admin/owner.
- Si `status=='played'`: muestra el resultado ya cargado (read-only para todos los miembros).
- Si `status=='cancelled'`: mensaje *"Este partido fue cancelado."*

### Etapa 2 — Pantalla de carga

**Ruta:** `/groups/{id}/events/{event_id}/result`

**UI:**

- Header con botón "Volver" y título *"Resultado del partido"*.
- Info rápida del Event (fecha, cancha).

**Sección "Score":**

- Visual de scoreboard estilo FIFA/PES:
  - Nombre **"Equipo A"** (del `team_a_name`) a la izquierda.
  - Input numérico grande en el centro-izquierda: `[ 0 ]`.
  - Separador `-`.
  - Input numérico grande en el centro-derecha: `[ 0 ]`.
  - Nombre **"Equipo B"** a la derecha.
- Inputs aceptan 0-99.
- Botones `+` / `-` grandes debajo de cada número para tocar desde la cancha sin tener que teclear.
- Validación: ambos scores deben ser ≥ 0.

**Sección "MVP":**

- Título *"¿Quién fue la figura?"*.
- Texto chico: *"Elegí un jugador de cualquier equipo."*
- Grid con fotos chicas + nombre + equipo de todos los participantes (excluyendo suplentes).
- Seleccionable con tap (single select).
- Visualmente el seleccionado queda con un halo dorado (pre-visualización de la card MVP).

**Sección "Notas" (opcional):**

- Textarea corto (max 300 chars) con contador.
- Placeholder: *"Algo memorable del partido (opcional)"*.

**Botón al pie:**

- **"Confirmar resultado"** (verde, grande).
- Al lado: *"Cancelar"* link secundario → vuelve al evento sin guardar.

**Draft en localStorage:**

- Key `event-result-draft-{event_id}`.
- Guarda scores, MVP, notas al tipear.
- Se limpia al confirmar.
- Al retomar: toast *"Retomamos el resultado que estabas cargando"*.

### Etapa 3 — Confirmar resultado

**Validaciones pre-submit:**

1. `teamAScore` y `teamBScore` números entre 0-99.
2. `mvpPlayerId` no nulo y pertenece a un Player con participation en este event con team ∈ {A, B} (no substitute).
3. Si alguna validación falla: error inline.

**Modal de confirmación (porque esta acción es irreversible en MVP):**

- Título: *"¿Confirmás el resultado?"*
- Texto: *"Una vez cargado, se van a aplicar los boosts a los jugadores. Esto no se puede deshacer fácilmente."*
- Botones: *"Revisar otra vez"* / *"Sí, confirmar"*.

**Al confirmar:**

1. RPC `load_match_result(event_id, team_a_score, team_b_score, mvp_player_id, notes)`.
2. Dentro del RPC, transacción:
   - `UPDATE events SET team_a_score, team_b_score, mvp_player_id, notes, status='played', played_at=now()`.
   - Para cada `match_participation` con `team ∈ {A, B}`:
     - Calcular boost según `business-rules §5.2`.
     - Si hay boost nuevo:
       - `UPDATE players SET current_boost = nuevo_boost`.
     - Si el player tenía boost activo y NO ganó boost nuevo:
       - Decrementar `partidos_remaining -= 1`.
       - Si llega a 0: `current_boost = NULL`.
   - Crear notifications:
     - `mvp_awarded` al Player MVP (push + in-app).
     - `boost_applied` a cada Player que recibió boost (in-app only, no push — dec-033).
     - `match_result_loaded` a todos los miembros del Group (in-app only).

### Etapa 4 — Pantalla post-resultado

**Ruta:** `/groups/{id}/events/{event_id}` (la página del event, ahora con resultado cargado).

**UI:**

- Card grande con scoreboard final.
- Card del MVP con halo dorado y animación de entrada.
- Lista de boosts aplicados:
  - *"Juan subió 2 puntos en PAC."*
  - *"Pedro subió 3 puntos en SHO y ganó su card dorada."*
- Comentarios del admin (si hay notas).
- Participaciones por equipo con overall final (pre-boost del partido, no post).
- Botón *"Compartir resumen"*: genera imagen del scoreboard + MVP + lista de boost changes.

### Etapa 5 — Impacto en las cards

- Todos los Players con boost activo muestran el badge "+N" en las stats afectadas.
- Tier puede cambiar (plata → oro simple, etc.).
- La card MVP se muestra con efecto dorado especial durante los 3 partidos que dura el boost.

---

## Algoritmo de cálculo de boost (referencia)

Ver `balancing-algorithm.md §calculate_boost`. Reglas según `business-rules §5.2`:

| Situación | Stats principales | Stats secundarias |
|-----------|-------------------|-------------------|
| Victoria + MVP | +3 | +1 a todas las demás |
| Victoria sin MVP | +1 | 0 |
| Empate + MVP | +1 | 0 |
| Derrota + MVP | +1 | 0 |
| Empate/derrota sin MVP | 0 | 0 |

Las stats principales varían por posición (ver `business-rules §1.4`).

---

## Contratos

```ts
interface LoadMatchResultInput {
  eventId: EventId;
  teamAScore: number;
  teamBScore: number;
  mvpPlayerId: PlayerId;
  notes: string | null;
}

type LoadMatchResultOutput = Result<{
  boostsApplied: Array<{
    playerId: PlayerId;
    playerName: string;
    reason: BoostReason;
    modifiers: BoostModifiers;
  }>;
}, AppError>;
```

---

## Notification types

| Tipo | Push | Email | In-app |
|------|------|-------|--------|
| `mvp_awarded` | ✅ | ❌ | ✅ |
| `boost_applied` | ❌ | ❌ | ✅ |
| `match_result_loaded` | ❌ | ❌ | ✅ (todos los miembros) |

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Score 0-0 con MVP | Permitido. El MVP recibe boost de "empate + MVP". |
| Score 10-0 | Permitido. Victoria de Equipo A + MVP recibe boost de victoria+MVP. |
| Admin intenta cargar resultado de un Event `scheduled` (no `drawn`) | RPC retorna `CONFLICT`. Mensaje: *"El partido todavía no tuvo sorteo."*. |
| Admin intenta cargar 2 veces el resultado | RPC detecta `status='played'` y retorna `CONFLICT`. Mensaje: *"Este partido ya tiene resultado cargado."*. |
| Admin intenta elegir MVP que no jugó (suplente) | Validación client rejects. |
| Admin elige MVP que estaba en la participación pero el player se archivó | Permitido. El MVP queda registrado, la card MVP se muestra mientras el player esté archivado (no activa). Si vuelve, recupera la card MVP si todavía está en los 3 partidos. |
| Partido cancelado después del sorteo | El botón "Cargar resultado" no aparece. Events cancelados no se cargan. |
| Network error durante el load | Draft se mantiene. Toast de error. Admin puede reintentar. |
| Un Player del partido tenía boost activo (partidos_remaining=2) | Después del partido, si NO gana boost nuevo → 1. Si GANA → reemplaza por 3 con nuevos modifiers. |
| MVP es un player fantasma | Permitido. Recibe boost igual (aunque no tenga cuenta). Las modificaciones se guardan en `current_boost` del fantasma. |

---

## Validaciones

```ts
const loadMatchResultSchema = z.object({
  eventId: z.string().uuid(),
  teamAScore: z.number().int().min(0).max(99),
  teamBScore: z.number().int().min(0).max(99),
  mvpPlayerId: z.string().uuid(),
  notes: z.string().trim().max(300).nullable(),
});
```

---

## Tests

### Unit
- `calculate_boost` para cada combinación (victoria, empate, derrota) × (MVP, no MVP) × (ARQ, DEF, MED, DEL).
- Boost remplaza a anterior si gana nuevo.
- Boost decrementa si no gana y ya tenía.
- Boost clamp: base 98 + boost +5 → overall clamp a 99.

### Integration
- Cargar resultado completo: events updated, participations con boost_applied, notifications creadas.
- Race condition: 2 owners cargan simultáneamente → 1 gana, otro recibe CONFLICT.
- Cancelado no acepta resultado.

### RLS
- Solo admin/owner pueden ejecutar load_match_result.
- Player regular no puede hacer UPDATE directo a events.

---

## Copy

- Botón entrada: *"Cargar resultado"*
- Título pantalla: *"Resultado del partido"*
- Sección score: scoreboard visual (sin título)
- Sección MVP título: *"¿Quién fue la figura?"*
- Sección MVP subtítulo: *"Elegí un jugador de cualquier equipo."*
- Sección notas: *"Notas"*, placeholder *"Algo memorable del partido (opcional)"*
- Botón submit: *"Confirmar resultado"*
- Link cancelar: *"Cancelar"*
- Modal confirmación título: *"¿Confirmás el resultado?"*
- Modal confirmación texto: *"Una vez cargado, se van a aplicar los boosts a los jugadores. Esto no se puede deshacer fácilmente."*
- Modal botones: *"Revisar otra vez"* / *"Sí, confirmar"*
- Error CONFLICT 1: *"El partido todavía no tuvo sorteo."*
- Error CONFLICT 2: *"Este partido ya tiene resultado cargado."*
- Notif MVP: *"¡Fuiste la figura del partido! Tu card se actualiza."*
- Notif boost (in-app): *"Subiste de nivel en {stat}."* o *"Subiste {N} puntos en {stat}."*
- Toast retomo draft: *"Retomamos el resultado que estabas cargando"*
- Botón compartir: *"Compartir resumen"*

---

## Criterios de aceptación

- [ ] Botón "Cargar resultado" solo visible para admin/owner después del sorteo.
- [ ] Scoreboard con inputs 0-99 + botones +/-.
- [ ] Selector de MVP con grid de players con participación en el event.
- [ ] MVP obligatorio (no hay opción "sin MVP" en MVP).
- [ ] Modal de confirmación antes de guardar.
- [ ] RPC transaccional: events + players (boost) + notifications en 1 transacción.
- [ ] Empate/derrota sin MVP no genera boost.
- [ ] Victoria+MVP aplica +3 en principales, +1 en demás.
- [ ] Boost reemplaza al anterior si gana nuevo.
- [ ] Tier de cards puede cambiar post-boost.
- [ ] Notif MVP con push al jugador.
- [ ] Notif boost solo in-app.
- [ ] Draft en localStorage.
- [ ] Status 'played' impide re-carga.
- [ ] Tests pasan.
