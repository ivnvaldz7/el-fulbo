# feat-009 — Sistema de boost (implementación)

## Objetivo

Implementar la mecánica completa del boost temporal: aplicación, decremento, visualización en cards y en feeds, e invariantes. Este feature es **transversal**: alimenta a `feat-008` (carga de resultado), al balanceo de sorteo y a la visualización de cards.

---

## Referencias

- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §5 (Sistema de boost).
- **Balanceo:** [`balancing-algorithm.md`](../01-domain/balancing-algorithm.md) §Aplicación del boost.
- **Entidades:** `Player.current_boost`, `MatchParticipation.boost_applied`.
- **Tipos:** `CurrentBoost`, `BoostModifiers`, `BoostReason`.
- **Decisiones del engram:** `dec-023`, `dec-043` y afines.

---

## Alcance

### Incluye

- Función `calculate_boost(is_winner, is_draw, is_mvp, position) → BoostPayload | null`.
- Función `apply_match_outcome(event_id)` ya implementada parcialmente (ver balancing-algorithm V2).
- Lógica de decremento del boost por participación.
- Reemplazo de boost activo por uno nuevo.
- Clamp a 99 en overall visible.
- Componente `<CardWithBoost />` que muestra badges "+N" en stats modificadas.
- Feed de cambios de boost en dashboard del grupo.
- Invariantes: boost nunca negativo, partidos_remaining en {0, 1, 2, 3}.

### No incluye

- Votación comunitaria del MVP (cambiaría reglas de boost, es v2.1).
- Boost por categorías distintas (ej: por asistencias, por goles) — fuera de MVP.
- Stats individuales del partido — fuera de MVP.

---

## Lógica core

### `calculate_boost`

Input: `is_winner`, `is_draw`, `is_mvp`, `position`.

Output: `{ partidos_remaining: 3, modifiers: {...}, reason: '...' }` o `null`.

**Principales por posición** (ver `business-rules §1.4`):

```ts
const PRINCIPAL_STATS = {
  ARQ: ['han', 'ref'],
  DEF: ['def', 'phy'],
  MED: ['pas', 'dri'],
  DEL: ['pac', 'sho'],
};
```

**Tabla de boost**:

```ts
function calculateBoost(args: {
  isWinner: boolean;
  isDraw: boolean;
  isMvp: boolean;
  position: PlayerPosition;
}): CurrentBoost | null {
  const { isWinner, isDraw, isMvp, position } = args;
  const principal = PRINCIPAL_STATS[position];

  // Victoria + MVP: boost grande
  if (isWinner && isMvp) {
    return {
      partidosRemaining: 3,
      modifiers: {
        [principal[0]]: 3,
        [principal[1]]: 3,
        ...otherStatsPlusOne(position),  // +1 a las otras 4 stats
      },
      reason: 'victory_mvp',
    };
  }

  // Victoria sin MVP: boost chico en principales
  if (isWinner) {
    return {
      partidosRemaining: 3,
      modifiers: {
        [principal[0]]: 1,
        [principal[1]]: 1,
      },
      reason: 'victory',
    };
  }

  // Empate + MVP
  if (isDraw && isMvp) {
    return {
      partidosRemaining: 3,
      modifiers: {
        [principal[0]]: 1,
        [principal[1]]: 1,
      },
      reason: 'draw_mvp',
    };
  }

  // Derrota + MVP
  if (!isWinner && !isDraw && isMvp) {
    return {
      partidosRemaining: 3,
      modifiers: {
        [principal[0]]: 1,
        [principal[1]]: 1,
      },
      reason: 'loss_mvp',
    };
  }

  // Empate/derrota sin MVP: nada
  return null;
}
```

### `apply_match_outcome`

RPC server-side que se ejecuta desde `feat-008` cuando el admin carga resultado. Pseudocódigo:

```sql
create or replace function apply_match_outcome(p_event_id uuid)
returns void language plpgsql security definer as $$
declare
  event_rec public.events%rowtype;
  participation record;
  new_boost jsonb;
  is_winner boolean;
  is_draw boolean;
  is_mvp boolean;
  team_score int;
  opponent_score int;
begin
  select * into event_rec from public.events where id = p_event_id;

  for participation in
    select mp.*, p.primary_position, p.current_boost, p.stats
    from public.match_participations mp
    join public.players p on p.id = mp.player_id
    where mp.event_id = p_event_id and mp.team in ('A', 'B')
  loop
    -- Determinar si ganó, empató o perdió
    if participation.team = 'A' then
      team_score := event_rec.team_a_score;
      opponent_score := event_rec.team_b_score;
    else
      team_score := event_rec.team_b_score;
      opponent_score := event_rec.team_a_score;
    end if;

    is_winner := team_score > opponent_score;
    is_draw := team_score = opponent_score;
    is_mvp := participation.player_id = event_rec.mvp_player_id;

    -- Calcular boost nuevo
    new_boost := calculate_boost(is_winner, is_draw, is_mvp, participation.primary_position);

    if new_boost is not null then
      -- Reemplazar boost activo por nuevo
      update public.players
      set current_boost = new_boost || jsonb_build_object('applied_at_match_id', p_event_id)
      where id = participation.player_id;

      -- Notification al jugador si es in-app only
      insert into public.notifications (user_id, type, payload)
      select p.user_id, 'boost_applied', jsonb_build_object(
        'event_id', p_event_id,
        'modifiers', new_boost->'modifiers',
        'reason', new_boost->>'reason'
      )
      from public.players p where p.id = participation.player_id and p.user_id is not null;

    elsif participation.current_boost is not null then
      -- No ganó boost nuevo pero tenía uno activo: decrementar
      update public.players
      set current_boost = jsonb_set(
        current_boost,
        '{partidos_remaining}',
        to_jsonb((current_boost->>'partidos_remaining')::int - 1)
      )
      where id = participation.player_id;

      -- Si llegó a 0: limpiar
      update public.players
      set current_boost = null
      where id = participation.player_id
      and (current_boost->>'partidos_remaining')::int <= 0;
    end if;

    -- Guardar snapshot en match_participations
    update public.match_participations
    set boost_applied = (
      select current_boost from public.players where id = participation.player_id
    )
    where id = participation.id;
  end loop;
end;
$$;
```

---

## Visualización de boost en UI

### Componente `<CardWithBoost />`

**Props:**

```ts
interface CardWithBoostProps {
  player: Player;
  showBoostIndicator?: boolean;  // default true
}
```

**Comportamiento:**

- Calcula `overall_actual = overall(stats + boost.modifiers)` con clamp a 99.
- Calcula `tier` basado en `overall_actual`.
- Renderiza la card con fondo según tier.
- Si hay boost activo, muestra badge "+N" al lado de cada stat modificada.
- Si el player es MVP actual (boost activo por MVP): aplica visual especial (halo dorado).

### Visual badge de boost

- Color: verde (+2), dorado (+3 o más).
- Posición: al lado del valor del stat, ligeramente más chico.
- Animación: al recibir boost nuevo, badge aparece con spring animation.

### Indicador de partidos restantes

- Chip chico abajo de la card: *"Boost: 2 partidos más"*.
- Al llegar al último: *"Boost: último partido"*.
- Color cambia según cantidad (verde → amarillo).

---

## Feed del grupo

Cuando `apply_match_outcome` termina, se puede renderizar un "resumen del partido" en el feed del grupo:

**Feed item tipo "match_played":**

```
⚽ Partido del sábado 26
Equipo A 3 — 1 Equipo B
🏆 Juan fue la figura.
📈 Subieron de nivel: Juan (+3 PAC), Pedro (+1 PAS), Laura (+1 DEF).
```

**Ubicación del feed:** dashboard del grupo, sección "Últimos partidos" colapsable.

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Player no juega pero estaba en el grupo | Sin cambios. Su boost (si tenía) se mantiene: el decremento es POR PARTIDO JUGADO, no por partido del grupo. |
| Player con boost partidos_remaining=1 juega y gana nuevo boost | El nuevo boost reemplaza al anterior (3 partidos frescos). |
| Player con boost partidos_remaining=1 juega y no gana boost | Decrementa a 0 → `current_boost = NULL`. |
| Player fantasma gana MVP | Recibe boost normal (guarda en `current_boost`). Si después se convierte en real (feat-013), el boost se mantiene. |
| Base 98 + boost modifier +5 → ¿overall 103? | Clamp a 99. |
| Admin carga resultado 2 veces (race con dos devices) | `load_match_result` con optimistic locking (feat-008). Si gana el segundo, el primero recibe CONFLICT y no aplica boost. |
| Player archivado durante el partido (raro) | Sigue con su `match_participation`. Si no está archivado al momento del load, recibe boost. |
| `apply_match_outcome` falla parcialmente | Toda la lógica está en transacción. Si falla algo, rollback completo. |

---

## Tests

### Unit
- `calculateBoost` para las 24 combinaciones (3 resultados × 2 mvp × 4 posiciones).
- Edge: derrota sin MVP → null.
- Edge: victoria+MVP delantero → `{pac:3, sho:3, pas:1, dri:1, def:1, phy:1}`.
- Edge: empate+MVP arquero → `{han:1, ref:1}`.
- Overall clamping: 98 base + 5 boost → 99.

### Integration
- `apply_match_outcome` aplica boost correctamente a todos los participantes.
- Decremento funciona: partidos_remaining 3 → 2 → 1 → 0.
- Reemplazo funciona: gana nuevo boost, los remaining se resetean a 3.
- Notifications `boost_applied` solo se crean para players que recibieron boost.
- Snapshot en `match_participations.boost_applied` se guarda.

---

## Copy (solo para notifications/UI)

- Badge sobre stat: `+3` (sin texto)
- Chip partidos restantes: *"Boost: X partidos más"* / *"Boost: último partido"*
- Notification boost (in-app): *"Subiste {N} puntos en {STAT}"*
- Feed item: *"Subieron de nivel: {nombres con detalles}"*
- MVP feed: *"{nombre} fue la figura del partido"*

---

## Criterios de aceptación

- [ ] `calculateBoost` retorna valores correctos para todas las combinaciones.
- [ ] Boost nunca es negativo.
- [ ] Clamp overall a 99 aplicado consistentemente.
- [ ] Decremento solo al JUGAR (match_participation con team ≠ substitute).
- [ ] Reemplazo completo del boost al ganar uno nuevo.
- [ ] Componente `<CardWithBoost />` renderiza con badges visibles.
- [ ] Feed del grupo muestra resumen del partido post-load.
- [ ] Tests unit e integration pasan.
