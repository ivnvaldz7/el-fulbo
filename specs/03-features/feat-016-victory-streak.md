# feat-016 — Racha de victorias (progresión permanente)

## Objetivo

Recompensar la consistencia: un player que encadena **3 victorias consecutivas** fija un +1 permanente en sus stats principales. Esto convive con el boost temporal (feat-009) y no lo reemplaza.

---

## Referencias

- **Business rules:** `business-rules.md` §5 (Sistema de boost), §7 (Progresión).
- **Boost system:** `feat-009-boost-system.md` — boost temporal, `partidos_remaining`, `calculate_boost`.
- **Entidades:** `Player.current_boost`, nueva columna `Player.legacy_boost` (o equivalente para permanentes).
- **Tipos:** `CurrentBoost`, `BoostReason`, `PlayerStats`.

---

## Alcance

### Incluye

- Nueva columna `players.perm_boost` — almacena los +1 permanentes acumulados por racha.
- Actualización de `load_match_result` para contar streak y otorgar perm_boost.
- Visualización en la card: badges diferenciados para boost temporal vs permanente.
- Tope de +6 por stat.
- Notificación al jugador cuando gana un +1 permanente.

### No incluye

- MVP card especial en dashboard (se trata en feature separado).
- Reset manual de racha por admin.
- Historial de rachas rotas.
- Competencias entre equipos fijos (fuera de alcance).

---

## Diseño del juego

### Reglas de racha

```
Partido 1: VICTORIA → streak = 1
Partido 2: VICTORIA → streak = 2
Partido 3: VICTORIA → streak = 3 → +1 PERMANENTE, streak resetea a 0
Partido 4: VICTORIA → streak = 1 (arranca nueva)
```

| Evento | Efecto en streak |
|--------|------------------|
| Victoria | streak += 1 |
| Empate | Sin cambios |
| Derrota | streak = 0 |
| MVP | Cuenta como victoria (si su equipo ganó o empató) |
| No juega | Sin cambios |
| Ausente / Suplente | Sin cambios |

### Stats que suben

Las mismas stats principales del boost temporal por posición:

| Posición | Stats principales |
|----------|------------------|
| ARQ | `han`, `ref` |
| DEF | `def`, `phy` |
| MED | `pas`, `dri` |
| DEL | `pac`, `sho` |

Cada vez que se completa una racha de 3, **ambas stats** reciben +1 permanente (simétrico). No se puede elegir una sola.

### Topes

- **+6 por stat** — cuando una stat llega a +6, las victorias consecutivas dejan de sumar permanentemente para esa stat.
- Si una stat ya está en tope y la otra no, la racha solo suma en la que tenga espacio.
- Si ambas están en tope, la racha no otorga nada (el jugador juega por el boost temporal nomás).

### Convivencia con boost temporal

El sistema de stats finales por partido se calcula así:

```
stat_efectiva = stat_base + perm_boost + boost_temporal
```

```
Ejemplo DEF con stat_base=5:

  perm_boost:  +2 (de rachas anteriores)
  boost_temp:  +1 (victoria actual, 3 partidos)
  ─────────────────────────────
  Efectiva:    8

Cuando expira el boost temporal:

  perm_boost:  +2 (sigue)
  boost_temp:  0
  ─────────────────────────────
  Efectiva:    7
```

El overall visible en la card usa `stat_efectiva`. El tier también. Todo clamp a 99 igual que hoy.

---

## Modelo de datos

### Nueva columna

```sql
alter table public.players
  add column perm_boost jsonb not null default '{}'::jsonb;
```

`perm_boost` guarda solo los acumulados por racha:

```json
{
  "pac": 2,
  "sho": 1,
  "pas": 0,
  "dri": 3,
  "def": 0,
  "phy": 0
}
```

Para ARQ el esquema es el mismo pero con sus stats:

```json
{
  "div": 0,
  "han": 1,
  "kic": 0,
  "ref": 2,
  "spd": 0,
  "pos": 0
}
```

### Nueva columna para streak

```sql
alter table public.players
  add column win_streak integer not null default 0;
```

Contador de victorias consecutivas. Se resetea a 0 con derrota, se incrementa con victoria, se resetea a 0 cuando llega a 3 y se otorga el permanente.

### Tipos TypeScript

```ts
// src/lib/types.ts

export type PermBoost = Partial<Record<StatKey, number>>;

// Player:
//   perm_boost: PermBoost;
//   win_streak: number;
```

---

## Lógica core

### Pseudocódigo del streak (dentro de `load_match_result`)

```sql
-- Por cada jugador que participó (team IN ('A', 'B'))
-- Determinar si su equipo ganó
if team_score > opponent_score then
  -- Victoria
  win_streak := coalesce(player.win_streak, 0) + 1;

  if win_streak >= 3 then
    -- Otorgar +1 permanente en stats principales
    perm_boost := apply_perm_boost(
      player.perm_boost,
      player.primary_position,
      player.stats  -- para saber qué keys aplican
    );
    win_streak := 0;  -- resetear racha

    -- Notificar
    insert into notifications (...) values (
      player.user_id,
      'perm_boost_gained',
      jsonb_build_object(
        'player_id', player.id,
        'modifiers', perm_boost_modifiers
      )
    );
  end if;

elsif team_score < opponent_score then
  -- Derrota: resetear racha
  win_streak := 0;
end if;
-- Empate: no tocar win_streak

-- Guardar
update public.players
set win_streak = win_streak,
    perm_boost = perm_boost
where id = player.id;
```

### Función `apply_perm_boost`

```sql
create or replace function apply_perm_boost(
  current_perm jsonb,
  p_position player_position
) returns jsonb language plpgsql as $$
declare
  keys text[];
  updated jsonb := current_perm;
  val int;
begin
  if p_position = 'ARQ' then
    keys := array['han', 'ref'];
  elsif p_position = 'DEF' then
    keys := array['def', 'phy'];
  elsif p_position = 'MED' then
    keys := array['pas', 'dri'];
  else
    keys := array['pac', 'sho'];
  end if;

  for i in 1..array_length(keys, 1) loop
    val := coalesce((updated->>keys[i])::int, 0);
    if val < 6 then
      updated := jsonb_set(
        updated,
        array[keys[i]],
        to_jsonb(val + 1)
      );
    end if;
  end loop;

  return updated;
end;
$$;
```

### Cálculo de stat final

```ts
function computeEffectiveStats(
  baseStats: PlayerStats,
  permBoost: PermBoost,
  tempBoost: CurrentBoost | null,
): PlayerStats {
  const result = { ...baseStats };

  for (const key of Object.keys(result) as StatKey[]) {
    const perm = permBoost[key] ?? 0;
    const temp = tempBoost?.modifiers?.[key] ?? 0;
    result[key] = Math.min(result[key] + perm + temp, 10); // clamp DB
    // Display: result[key] * 10, clamp a 99
  }

  return result;
}
```

---

## Visualización en UI

### Badges diferenciados

| Tipo | Color | Display |
|------|-------|---------|
| Boost temporal | Verde / Dorado | `+1` (verde), `+3` (dorado) |
| Permanente por racha | Azul / Celeste | `+1` azul con tooltip "Racha" |

En la card de jugador:

```
PAC  7  +2   +1
     ↑     ↑
     base  perm temp
```

Donde:
- `7` es el valor base ×10
- `+2` en azul = permanente por racha
- `+1` en verde = boost temporal

O, si es mucho ruido visual, se puede mostrar como un badge único en la card:

```
🔥 Racha: 2/3   → cuando está en progreso
⭐ +3 PERMANENTE → cuando acaba de ganar uno
```

### Indicador de streak actual

En el dashboard del jugador (o en su card):

| Estado | Display |
|--------|---------|
| 0 victorias consecutivas | *(nada)* |
| 1 victoria | `🔥 1/3` |
| 2 victorias | `🔥 2/3` |
| 3 victorias → +1 permanente | `⭐ +1 PERMANENTE` (animación) + resetea |

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Player gana 3 partidos pero no juega el 4to | La racha se mantiene. No juega = no modifica streak. |
| Player gana 3, después pierde | Streak = 0. El +1 permanente ya se otorgó, se queda. |
| Player llega a +6 en `def` pero `phy` está en +3 | La racha solo suma a `phy` hasta que llegue a +6. |
| Player llega a +6 en ambas stats | La racha no otorga nada permanentemente. Sigue sumando streak normal por si después se expande el tope. |
| Player fantasma gana 3 seguidos | Recibe perm_boost igual. Si después se vincula a un user real, el perm_boost viaja con él. |
| Player cambia de posición (ej: DEF → MED) | El `perm_boost` se mantiene en las stats viejas (no se pierde). Las nuevas stats empiezan en 0. Se podría migrar manualmente por admin en el futuro. |
| Empate en racha de 2 | No suma, no rompe. Sigue en 2. |
| MVP en partido perdido | Es derrota → streak = 0. El MVP no salva la racha. |
| Player se va del grupo (archivado) y vuelve | `win_streak` se resetea a 0. `perm_boost` se mantiene (es permanente). |

---

## Tests

### Unit

- `computeEffectiveStats`: base + perm + temp → valor esperado.
- `computeEffectiveStats`: clamp a 10 (DB) y 99 (display).
- `computeEffectiveStats`: perm_boost vacío y temp boost null → base.
- `applyPermBoost`: simula 3 llamadas consecutivas → cada stat sube hasta 3.
- `applyPermBoost`: stat ya en 6 → no se incrementa.
- `applyPermBoost`: una stat en 6, otra en 4 → solo sube la que tiene espacio.

### Integration

- Player gana 3 partidos seguidos → `perm_boost` incrementa en +1 ambas stats principales.
- Player gana 3, después pierde → `perm_boost` se queda, `win_streak` = 0.
- Player gana 2, empata, gana 1 → streak = 3 (el empate no rompió).
- Player no juega por 5 partidos → streak se mantiene.
- Player llega a +6 → racha no otorga más permanentes pero sigue contando.

---

## Copy

- Badge permanente: `+N` (azul)
- Badge temporal: `+N` (verde/dorado según magnitud)
- Indicador streak: `🔥 2/3` / `🔥 1/3`
- Al ganar permanente: notificación *"¡Racha de 3 victorias! Subiste {stat1} y {stat2} permanentemente."*
- Tooltip badge permanente: *"Por racha de victorias"*

---

## Estado de implementación real

- **No implementado.** Espec en estado de planificación.

## Criterios de aceptación

- [ ] `perm_boost` se almacena en DB y persiste entre partidos.
- [ ] Racha de 3 victorias consecutivas otorga +1 permanente en ambas stats principales.
- [ ] Derrota resetea `win_streak` a 0.
- [ ] Empate no modifica `win_streak`.
- [ ] Tope de +6 por stat respetado.
- [ ] Stats finales = base + perm_boost + boost_temporal, clamp a 10/99.
- [ ] Badges en UI diferencian permanente de temporal.
- [ ] Notificación al ganar permanente.
- [ ] El streak no se pierde si el player no juega un partido.
- [ ] Al cambiar de posición, los permanentes viejos se conservan.
