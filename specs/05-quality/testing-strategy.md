# Testing Strategy V2

Pirámide de testing priorizada para El Fulbo V2.

---

## Pirámide

```
         ┌──────────────┐
         │    E2E       │  ← pocos, críticos, Playwright
         │   (smoke)    │
         ├──────────────┤
         │ Integration  │  ← RPC, RLS, flows completos
         │              │
         ├──────────────┤
         │    Unit      │  ← dominio, algoritmo, helpers
         │              │
         └──────────────┘
```

---

## Unit tests (prioridad alta)

### Algoritmo de balanceo
Archivo: `src/lib/draw/__tests__/balancing.test.ts`.

Tests obligatorios:
- F5 con 10 players balanceados → diff ≤ 3.
- F8 con 1 solo arquero → retorna feasibility error `not_enough_goalkeepers`.
- Cantidad impar → retorna `odd_count`.
- Reproducibilidad: mismo seed + players → mismo resultado.
- Comodín MED como DEF con `playedPrimaryPosition=false`.
- Player fantasma (overall 55) se balancea con resto.
- Clamp a 99: base 98 + boost +5 → overall 99.
- Player sin posición secundaria va al pool general.

### Cálculo de overall
Archivo: `src/lib/stats/__tests__/overall.test.ts`.

- Overall DEL con stats balanceadas (todas 7) → ~70.
- Overall GK con stats mixtas.
- `applyBoostToStats` suma correctamente.
- `getTier` retorna banda correcta para cada overall.

### Boost calculator
Archivo: `src/lib/boost/__tests__/calculator.test.ts`.

- Victoria + MVP + delantero → `{pac:3, sho:3, pas:1, dri:1, def:1, phy:1}`.
- Victoria sin MVP + mediocampista → `{pas:1, dri:1}`.
- Derrota sin MVP → null.
- Empate + MVP + defensor → `{def:1, phy:1}`.
- Reemplazo de boost activo: gana nuevo, el viejo se pisa.
- Decremento: partidos_remaining 3 → 2 → 1 → 0 → null.

### Validaciones (Zod schemas)
Archivo: `src/lib/validations/__tests__/*.test.ts`.

Un test por schema confirmando paths happy y edge.

---

## Integration tests (prioridad alta)

### Row Level Security
Archivo: `tests/integration/rls.test.ts`.

Escenarios:
- User A no puede leer players de Group donde no es miembro.
- User miembro del Group puede leer players aprobados.
- Player con `stats_status='pending_approval'` no es visible salvo para él y el Admin.
- Solo Admin puede UPDATE de stats de otros Players.
- Owner puede INSERT de events, UPDATE hasta marcar `played`.
- Temporary Owner confirmado tiene poderes equivalentes hasta `expires_at`.
- Temporary Owner expirado NO puede crear events.
- User no puede ver notifications de otro User.

### Flows completos
Archivo: `tests/integration/flows/*.test.ts`.

1. **Crear Group → unirse como Player → cargar stats → Admin aprueba → stats públicas.**
2. **Crear Event → 10 confirman → check-in → sortear → cargar resultado con MVP → boost aplicado.**
3. **Jugador pide revisión → Admin aprueba → stats cambian + log público creado.**
4. **Admin no confirma + no hay Owners → sistema designa 2 temporales → 1 acepta, otro rechaza → escala al siguiente.**
5. **Player fantasma → pasa 7 días → cronjob archiva.**
6. **Player sale voluntariamente → 1 año después → hard delete.**
7. **Group huérfano → Owner se promueve → sigue operativo.**

### Triggers
Archivo: `tests/integration/triggers.test.ts`.

- Admin 4to Group → error `ADMIN_GROUP_LIMIT_REACHED`.
- 51 player activo → error `PLAYER_GROUP_LIMIT_REACHED`.
- 3er Owner → error `OWNER_CAP_REACHED`.
- User en 11er Group como Player → error.

---

## E2E tests (pocos, smoke)

Archivo: `tests/e2e/*.spec.ts` con Playwright.

Flujos críticos:
1. **Login con Google** → dashboard.
2. **Crear Group** → aparece en dashboard.
3. **Aceptar invitación** → cargar stats iniciales → ver card pending.
4. **Admin aprueba stats** → card pública.
5. **Crear Event → confirmar asistencia → sortear (mock) → cargar resultado** (happy path end-to-end).

**No** testear cada edge case en E2E. Eso queda en integration.

---

## Setup

### Libraries
- **Vitest** para unit + integration.
- **Playwright** para E2E.
- **Supabase local** (`supabase start`) para integration tests.
- **MSW** para mockear fetchs externos.

### Fixtures
- `tests/fixtures/users.ts`: seeders de users.
- `tests/fixtures/groups.ts`: seeders de groups con admin/owners/players.
- `tests/fixtures/events.ts`: events en todos los estados.

### Scripts
```json
{
  "test": "vitest",
  "test:unit": "vitest run --dir src",
  "test:integration": "vitest run --dir tests/integration",
  "test:e2e": "playwright test",
  "test:coverage": "vitest run --coverage"
}
```

---

## Criterios de merge

- **Unit coverage ≥ 70% en `/src/lib/`.**
- **Todo test de RLS pasa (integration).**
- **E2E smoke pasa antes de cada deploy a prod.**

---

## Lo que NO testeamos (explícito)

- Diseño visual (side-by-side humano antes de merge).
- Performance del algoritmo (no es crítica en MVP).
- Carga de cientos de Groups simultáneos.
- Push notifications reales (mockeamos endpoint de Web Push).
