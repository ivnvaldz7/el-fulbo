# Error Model V2

Modelo unificado de errores. Todos los services devuelven `Result<T, AppError>`. Nunca `throw`.

---

## Patrón `Result<T, E>`

```ts
export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export interface AppError {
  code: AppErrorCode;
  message: string;   // user-facing, español argentino
  details?: unknown; // debug, nunca mostrado
}
```

Uso obligatorio:

```ts
// ❌ MAL
async function createGroup(input) {
  if (!input.name) throw new Error('missing name');
  ...
}

// ✅ BIEN
async function createGroup(input): Promise<Result<Group>> {
  if (!input.name) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Falta el nombre del grupo.' } };
  }
  ...
  return { ok: true, data: group };
}
```

---

## Códigos de error

| Código | Cuándo | Mensaje user-facing |
|--------|--------|---------------------|
| `VALIDATION_ERROR` | Input inválido (longitud, tipo, rango). | "Algunos datos no son válidos." |
| `NOT_FOUND` | Recurso no existe. | "No encontramos lo que buscás." |
| `CONFLICT` | Conflicto de estado (ej. nombre duplicado, doble submit). | "Esa acción choca con el estado actual." |
| `FORBIDDEN` | Usuario autenticado pero sin permiso. | "No tenés permiso para esto." |
| `UNAUTHORIZED` | Sin sesión. | "Necesitás iniciar sesión." |
| `RATE_LIMIT` | Demasiados intentos. | "Esperá un toque antes de reintentar." |
| `ADMIN_GROUP_LIMIT_REACHED` | User quiere ser Admin de 4to Group. | "Llegaste al máximo de 3 grupos como admin." |
| `PLAYER_GROUP_LIMIT_REACHED` | Group llegó a 50 players activos. | "Este grupo llegó al límite de 50 jugadores." |
| `USER_PLAYER_GROUPS_LIMIT_REACHED` | User en 10 Groups. | "Llegaste al máximo de 10 grupos." |
| `OWNER_CAP_REACHED` | Admin intenta sumar 3er Owner. | "Ya tenés 2 owners. Remové uno para sumar otro." |
| `STATS_PENDING_APPROVAL` | Acción bloqueada por stats no aprobadas. | "Tus stats están pendientes de aprobación." |
| `REVISION_ALREADY_PENDING` | Ya hay una revisión pendiente. | "Ya pediste una revisión. Esperá a que el admin la resuelva." |
| `INVITE_CODE_INVALID` | Código de invitación no existe. | "Ese link de invitación no sirve." |
| `INVITE_CODE_EXPIRED` | Código caducado (reservado futuro). | "Este link de invitación expiró." |
| `MAGIC_LINK_EXPIRED` | Magic link caducado (24h). | "Este link expiró. Pedí uno nuevo." |
| `MAGIC_LINK_INVALID` | Magic link corrupto/ya usado. | "Este link no es válido." |
| `NETWORK_ERROR` | Falla de red. | "Problemas de conexión. Reintentá." |
| `STORAGE_ERROR` | Falla de Supabase Storage. | "No pudimos subir el archivo. Probá de nuevo." |
| `PUSH_SUBSCRIPTION_FAILED` | Navegador no deja suscribirse a push. | "No pudimos activar notificaciones." |
| `INTERNAL_ERROR` | Cualquier otra falla. | "Algo salió mal. Reportalo." |

---

## Validaciones típicas (client-side + DB)

### User
- `email` válido (regex).
- `displayName` entre 1 y 40 chars, trim.

### Group
- `name` 1-40 chars.
- `defaultModality` en enum.
- `donationLink` si está, formato URL.

### Player
- `displayName` 1-40 chars.
- `primaryPosition` en enum.
- `secondaryPosition` distinto de primary.
- `stats`: objeto con las 6 keys correctas según posición, cada una 1-10.

### Event
- `fieldName` 1-60 chars.
- `scheduledAt` en el futuro (tolerancia -1h para crear eventos "tarde").
- `modality` en enum.
- `fieldMapsUrl` si está: formato URL.

### Attendance
- `status` en enum.
- `eventId` y `playerId` existen y pertenecen al mismo Group.

### Match Result
- `teamAScore`, `teamBScore` ≥ 0, max 99.
- `mvpPlayerId` participó del Event (tiene MatchParticipation con team ∈ {A, B}).

### Stat Revision Request
- `message` 1-200 chars.
- Solo 1 pendiente por Player.

---

## Mapeo de errores de Supabase

| PostgreSQL error | AppErrorCode |
|-------------------|--------------|
| `23505` (unique violation) | `CONFLICT` |
| `23503` (foreign key) | `NOT_FOUND` |
| `23514` (check constraint) | depende del mensaje; muchos custom (`ADMIN_GROUP_LIMIT_REACHED`, etc.) |
| `42501` (insufficient privilege / RLS) | `FORBIDDEN` |
| `PGRST116` (PostgREST: not found) | `NOT_FOUND` |
| `PGRST301` (JWT expired) | `UNAUTHORIZED` |

Helper:

```ts
export function mapSupabaseError(err: unknown): AppError {
  if (!err) return { code: 'INTERNAL_ERROR', message: 'Algo salió mal.' };
  const e = err as { code?: string; message?: string };

  // Custom raised exceptions (ver triggers del schema)
  if (e.message?.includes('ADMIN_GROUP_LIMIT_REACHED')) {
    return { code: 'ADMIN_GROUP_LIMIT_REACHED', message: 'Llegaste al máximo de 3 grupos como admin.' };
  }
  if (e.message?.includes('OWNER_CAP_REACHED')) {
    return { code: 'OWNER_CAP_REACHED', message: 'Ya tenés 2 owners.' };
  }
  if (e.message?.includes('PLAYER_GROUP_LIMIT_REACHED')) {
    return { code: 'PLAYER_GROUP_LIMIT_REACHED', message: 'Este grupo llegó a 50 jugadores.' };
  }

  switch (e.code) {
    case '23505': return { code: 'CONFLICT', message: 'Esa acción choca con el estado actual.' };
    case '23503': return { code: 'NOT_FOUND', message: 'No encontramos el recurso.' };
    case '42501': return { code: 'FORBIDDEN', message: 'No tenés permiso.' };
    case 'PGRST116': return { code: 'NOT_FOUND', message: 'No encontramos lo que buscás.' };
    case 'PGRST301': return { code: 'UNAUTHORIZED', message: 'Iniciá sesión de nuevo.' };
    default: return { code: 'INTERNAL_ERROR', message: 'Algo salió mal.', details: err };
  }
}
```

---

## UI: pattern matching

```tsx
const result = await createGroup(input);
if (!result.ok) {
  toast.error(result.error.message);
  return;
}
router.push(`/groups/${result.data.id}/dashboard`);
```

Nunca mostrar `error.details` al usuario; es solo para logs/Sentry.

---

## Logging

Toda error `code ∈ { INTERNAL_ERROR, STORAGE_ERROR, PUSH_SUBSCRIPTION_FAILED }` debe loggear con contexto (user_id, route, error details) a Sentry/Logflare. Los demás (validación, forbidden) son esperables y no loggean.

Ver `/specs/05-quality/observability.md`.
