# feat-002 — Runtime Context

## Objetivo operativo

Implementar creación de Group para un User autenticado.

Resultado principal:

- Group creado.
- GroupMembership admin creado.
- Player del Admin creado con stats pending.
- Admin completa wizard reutilizado de feat-001 con `?as=admin`.
- Al finalizar, su Player queda `stats_status='approved'`.
- Redirect a dashboard del Group.

## Fuentes obligatorias

- specs/00-foundation/product.md
- specs/00-foundation/architecture-decisions.md
- specs/01-domain/business-rules.md
- specs/01-domain/entities.md
- specs/02-flows/core-flows.md
- specs/03-features/feat-001-onboarding-user.md
- specs/03-features/feat-002-create-group.md
- specs/04-contracts/db-schema.md
- specs/04-contracts/error-model.md
- specs/04-contracts/types.ts
- specs/05-quality/testing-strategy.md
- current-state.md

## Dependencia

feat-002 reutiliza el wizard de feat-001.

No duplicar wizard.
No crear otro flujo paralelo de stats.

## Alcance recomendado de ejecución

### Fase A obligatoria

- `/groups/new`
- create group form
- draft `create-group-draft`
- validaciones Zod
- RPC `create_group`
- service `groups.service.ts`
- redirect a `/groups/{id}/onboarding-stats?as=admin`
- wizard admin autoaprueba al submit
- dashboard banner si players activos < 2
- compartir link con Web Share API + clipboard fallback

### Fase B posterior

- `/groups/{id}/settings`
- update name/default modality/donation link
- upload logo
- remove logo
- crop 512x512 WebP

## Reglas duras

- Supabase only.
- No Node/Express.
- No writes directos desde client components.
- Mutaciones sensibles vía RPC o API route server-side delegando en services.
- Services devuelven `Result<T, AppError>`.
- No usar throw como flujo normal.
- RLS obligatorio.
- User no puede crear más de 3 Groups como Admin.
- Un Group tiene exactamente 1 Admin.
- Owners no aplican en feat-002.
- El Admin no puede autoasignarse stats 9-10.
- Onboarding del Admin mantiene tope 8.
- Query param `?as=admin` solo cambia UX; el backend debe validar rol admin real.

## Decisiones cerradas

### RPC create_group

Crear RPC:

`create_group(p_name text, p_modality modality)`

Debe hacer atómicamente:

1. Validar `auth.uid()`.
2. Validar límite de 3 Groups como Admin.
3. Insert en `groups`.
4. Insert en `group_memberships` con `role='admin'`.
5. Insert en `players` para el Admin:
   - `primary_position='MED'`
   - `secondary_position=null`
   - `stats_status='pending_approval'`
   - stats field default en 5.

Retorna `group_id`.

### Wizard Admin

Si la ruta es `/groups/{id}/onboarding-stats?as=admin`:

- botón final: `Crear mi carta`
- submit debe validar que el user actual es Admin del Group
- al completar:
  - `stats_status='approved'`
  - insertar `player_stat_change_logs`
  - `changed_by_user_id = user.id`
  - `requested_by_user_id = user.id`
  - `reason = 'admin_self_creation'`
- redirect a `/groups/{id}/dashboard`

### Stats del Admin

- Tope 8 siempre en este flujo.
- No permitir 9-10 en autoedición ni auto-creación.
- La frase “via edición posterior” queda restringida:
  - Admin puede editar stats de otros en feat-004.
  - Admin no puede editar sus propias stats por encima de 8.

### Duplicate names

El check de duplicado es UX, no constraint DB.
Si hay duplicado, mostrar modal.
Si user confirma “Crear igual”, permitir.

### Draft

Usar:

`create-group-draft`

Contenido:

```ts
{
  name: string;
  modality: Modality;
}
```
