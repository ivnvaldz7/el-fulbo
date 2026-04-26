# Balancing Algorithm V2

Algoritmo de balanceo adaptado al modelo V2 (sin Rating Interno oculto, usando `overall_actual = base + boost`).

---

## Contrato

**Input:**
- `modality: Modality` — F5/F6/F8/F11.
- `players: PlayerForDraw[]` — check-ineados al partido, con `overall_actual` calculado (stats + boost).
- `seed: string` — semilla del RNG para reproducibilidad.

**Output:**
- `DrawResult` — assignments + warnings.

**Garantías:**
- Cada player check-ineado termina en `team='A'`, `team='B'`, o `substitute`.
- Ambos equipos respetan cupos mínimos por posición.
- Diff de overall entre equipos ≤ 5 puntos si es matemáticamente posible.

---

## Diferencias vs. V1

1. **No hay Rating Interno oculto.** Todo el balanceo es transparente: usa `overall_actual` directo.
2. **`overall_actual` incluye boost visible.** Un jugador con boost activo es realmente más valioso en este partido, y el algoritmo lo refleja.
3. **Sin RPC `get_players_for_draw`.** Todos los datos necesarios ya son públicos dentro del Group; no hace falta función server-side para leer ratings ocultos.
4. **Player fantasma cuenta como un jugador MED con overall ~55** (stats todas en 6 → overall 55-60 según posición).

---

## Estructura `PlayerForDraw`

```ts
interface PlayerForDraw {
  id: PlayerId;
  name: string;
  primaryPosition: 'ARQ' | 'DEF' | 'MED' | 'DEL';
  secondaryPosition: 'ARQ' | 'DEF' | 'MED' | 'DEL' | null;
  overallActual: number;  // 10-99, ya incluye boost si hay
  isPhantom: boolean;
}
```

---

## Fase 0 — Validación de viabilidad

```
fn validate_feasibility(players, modality) -> ValidationResult:
  team_size = getTeamSize(modality)   // F5=5, F6=6, F8=8, F11=11
  total_needed = team_size * 2
  n = len(players)

  if n < total_needed:
    return { feasible: false, reason: 'not_enough_players', needed: total_needed, got: n }

  arqs = count players where primary_position = 'ARQ'
  if arqs < 2:
    return { feasible: false, reason: 'not_enough_goalkeepers', arqs_found: arqs }

  if n > total_needed:
    return { feasible: false, reason: 'too_many', extra: n - total_needed }

  if n % 2 != 0:
    return { feasible: false, reason: 'odd_count', n: n }

  return { feasible: true }
```

El caller (UI) maneja los non-feasible ofreciendo opciones al usuario (ver edge-cases V2):
- Agregar player fantasma.
- Designar substitute (se marca con `team='substitute'`, no entra al sorteo).
- Cancelar y ajustar convocatoria.

---

## Fase 1 — Satisfacción de cupos

```
fn initial_partition(players, modality, rng) -> Partition:
  slots = FORMATIONS[modality]
  team_a = { ARQ: [], DEF: [], MED: [], DEL: [] }
  team_b = { ARQ: [], DEF: [], MED: [], DEL: [] }

  // Paso 1: arqueros
  arqs = filter players where primary_position = 'ARQ'
  shuffle(arqs, rng)
  team_a.ARQ.push(arqs[0])
  team_b.ARQ.push(arqs[1])
  overflow_arqs = arqs[2:]  // si hay de sobra, van al pool general

  // Paso 2: delanteros puros (snake draft por overall descendente)
  dels = filter players where primary_position = 'DEL'
  dels.sort_by(p => p.overall_actual, desc)
  for i, del in enumerate(dels):
    if i % 2 == 0 and len(team_a.DEL) < slots.DEL:
      team_a.DEL.push(del)
    elif len(team_b.DEL) < slots.DEL:
      team_b.DEL.push(del)
    else:
      remaining_pool.push(del)

  // Paso 3: defensores puros
  defs = filter players where primary_position = 'DEF'
  // misma lógica snake-draft

  // Paso 4: mediocampistas
  meds = filter players where primary_position = 'MED'
  // misma lógica snake-draft

  // Paso 5: rellenar huecos con comodines
  remaining_pool = overflow_arqs + cualquier player no asignado aún

  while hay huecos en team_a o team_b:
    hueco = posición con cupo disponible (priorizar equipo más chico)
    candidato = best_candidate_for_position(remaining_pool, hueco)
    if candidato:
      team_x[hueco].push(candidato)
      remaining_pool.remove(candidato)
      candidato.played_primary_position = (candidato.primary_position == hueco)
    else:
      break  // sin candidatos, warnings

  return { team_a, team_b, warnings: [...] }
```

### `best_candidate_for_position(pool, target_pos)`

Prioridad:
1. Player con `secondary_position == target_pos` y `primary_position == 'MED'`.
2. Player con `secondary_position == target_pos` (cualquier primary).
3. Player con `primary_position == 'MED'` (comodín por default).
4. Cualquier player del pool.

Si el target es `ARQ` y no hay candidatos: elegir el player con menor `overall_actual` en el pool (criterio: el menos "necesario" en campo). Agregar warning `forced_goalkeeper`.

---

## Fase 2 — Optimización greedy

```
fn balance_greedy(team_a, team_b, tolerance=5, max_iter=100) -> OptimizationResult:
  iter = 0
  while iter < max_iter:
    overall_a = avg(p.overall_actual for p in team_a.all())
    overall_b = avg(p.overall_actual for p in team_b.all())
    diff = abs(overall_a - overall_b)
    if diff <= tolerance:
      break

    best_swap = null
    best_improvement = 0

    for position in [ARQ, DEF, MED, DEL]:
      for pa in team_a[position]:
        for pb in team_b[position]:
          // simular swap y calcular nuevo diff
          new_overall_a = overall_a - pa.overall_actual/team_size + pb.overall_actual/team_size
          new_overall_b = overall_b - pb.overall_actual/team_size + pa.overall_actual/team_size
          new_diff = abs(new_overall_a - new_overall_b)
          improvement = diff - new_diff
          if improvement > best_improvement:
            best_improvement = improvement
            best_swap = (pa, pb, position)

    if best_swap == null:
      break

    swap_players(team_a, team_b, best_swap)
    iter += 1

  final_diff = abs(avg(team_a) - avg(team_b))
  return {
    team_a, team_b,
    final_diff,
    iterations: iter,
    converged: final_diff <= tolerance
  }
```

**Nota sobre `overall_actual`:** ya incluye el boost del jugador para este partido. Un jugador con boost +3 cuenta efectivamente más. Esto refleja que "hoy rinde más" y balancea los equipos considerándolo.

**Tolerancia:** 5 puntos de overall promedio. Si no se alcanza, el sistema acepta el resultado con warning `imbalance`.

---

## Fase 3 — Construcción del resultado

```
fn build_draw_result(team_a, team_b, warnings) -> DrawResult:
  assignments = []
  for team_id, team in [('A', team_a), ('B', team_b)]:
    for position in [ARQ, DEF, MED, DEL]:
      for player in team[position]:
        assignments.push({
          playerId: player.id,
          team: team_id,
          assignedPosition: position,
          playedPrimaryPosition: player.primary_position == position,
          boostApplied: player.current_boost  // snapshot del boost activo
        })

  for a in assignments:
    if !a.playedPrimaryPosition:
      warnings.push({ kind: 'out_of_position', ... })

  overall_a_avg = avg(team_a)
  overall_b_avg = avg(team_b)
  if abs(overall_a_avg - overall_b_avg) > 5:
    warnings.push({ kind: 'imbalance', diff: ... })

  return {
    assignments,
    teamAOverallAvg: overall_a_avg,
    teamBOverallAvg: overall_b_avg,
    warnings
  }
```

---

## Reproducibilidad

- `seed` inicializa un PRNG determinista (`seedrandom` de npm).
- Todos los `shuffle()` pasan por este PRNG.
- Misma input + mismo seed → misma salida.
- Cada "re-sortear" genera seed nuevo (`crypto.randomUUID()`).

---

## Aplicación del boost post-partido

Trigger: cuando el Admin/Owner carga `team_a_score`, `team_b_score` y elige `mvp_player_id`, el sistema ejecuta transacción:

```
fn apply_match_outcome(event_id):
  event = fetch event
  participations = fetch participations where event_id and team != 'substitute'
  mvp = event.mvp_player_id

  for p in participations:
    player = p.player
    player_team = p.team
    team_score = event.score for player_team
    opponent_score = event.score for (player_team == 'A' ? 'B' : 'A')
    is_winner = team_score > opponent_score
    is_draw = team_score == opponent_score
    is_mvp = player.id == mvp

    new_boost = calculate_boost(is_winner, is_draw, is_mvp, player.primary_position)

    if new_boost != null:
      player.current_boost = new_boost  // reemplaza cualquier boost anterior
      log notification 'boost_applied' to player.user_id

    save player

  // Decrementar boost de players que NO participaron (no tocar)
  // (el decremento solo ocurre al jugar, por eso no se tocan)

  for p in participations:
    // Decrementar current_boost.partidos_remaining -= 1 si tenía boost entrando al partido
    // Cuidado: si en este partido GANÓ nuevo boost, el decremento del viejo no aplica

  event.status = 'played'
  event.played_at = now()
  save event
```

**Detalle crítico:** el decremento del boost **ocurre al final del partido**, no al principio. Un jugador con boost activo (ej. partidos_remaining=2) que juega este partido:
- Si **no gana nada nuevo**: al final, `partidos_remaining = 1`.
- Si **gana un nuevo boost**: el viejo boost se reemplaza por el nuevo con `partidos_remaining=3`.

---

## `calculate_boost(is_winner, is_draw, is_mvp, position) -> BoostPayload | null`

```
fn calculate_boost(is_winner, is_draw, is_mvp, position) -> BoostPayload | null:
  principal_stats = PRINCIPAL_STATS[position]  // ['pac', 'sho'] para DEL, etc.

  if is_winner and is_mvp:
    // Boost grande
    return {
      partidos_remaining: 3,
      modifiers: {
        principal_stats[0]: 3,
        principal_stats[1]: 3,
        // +1 en todas las demás
        ...other_stats: 1
      },
      reason: 'victory_mvp'
    }

  if is_winner:
    // Boost chico solo en principales
    return {
      partidos_remaining: 3,
      modifiers: {
        principal_stats[0]: 1,
        principal_stats[1]: 1
      },
      reason: 'victory'
    }

  if is_mvp:  // empate o derrota + MVP
    return {
      partidos_remaining: 3,
      modifiers: {
        principal_stats[0]: 1,
        principal_stats[1]: 1
      },
      reason: is_draw ? 'draw_mvp' : 'loss_mvp'
    }

  return null  // sin boost
```

---

## Tests mínimos del algoritmo (V2)

1. **Sorteo F5 con 10 players balanceados:** diff final < 3.
2. **Sorteo F8 con 1 arquero solo:** retorna `not_enough_goalkeepers`.
3. **Overall con boost:** player base 70 con boost +3 en SHO (delantero) tiene overall_actual 73 → el algoritmo lo usa para balancear.
4. **Reproducibilidad:** misma semilla + mismos players → mismo resultado.
5. **Comodín MED:** 10 players con 1 DEF solo, 5 MED, el algoritmo usa un MED como DEF en uno de los equipos, marcado con `played_primary_position=false`.
6. **Player fantasma:** se trata como MED overall 55, balancea normalmente.
7. **Boost por victoria + MVP (delantero):** produce modifiers {pac:3, sho:3, pas:1, dri:1, def:1, phy:1}.
8. **Boost por derrota sin MVP:** null (sin cambio).
9. **Reemplazo de boost:** player con boost activo (partidos_remaining=1) gana nuevo boost → partidos_remaining=3 y modifiers nuevos.
10. **Clamp a 99:** player base 98 con boost +5 → overall_actual=99 (no 103).

---

## Complejidad

- Fase 0: O(n).
- Fase 1: O(n log n) por el sort.
- Fase 2: O(max_iter × posiciones × |team|²). Para F11: ~100 × 4 × 12² ≈ 57600 ops. < 50ms en cliente.
- Fase 3: O(n).

Todo corre **en cliente**. Sin llamadas server-side. Sorteo funciona offline.
