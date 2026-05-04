# Design: implementa la logica de la fase 5

## Technical Approach

El enfoque principal es construir un módulo de administración de eventos en Next.js (App Router) integrado con Supabase. Utilizaremos funciones RPC (PL/pgSQL) para encapsular la lógica transaccional de crear/editar un evento y despachar simultáneamente las notificaciones a los jugadores con `stats_status = 'approved'`, garantizando consistencia de datos sin depender de webhooks o funciones Edge. La persistencia de borradores se manejará en el cliente usando `localStorage` en los Server/Client Components.

## Architecture Decisions

| Decision | Tradeoffs | Rationale |
|----------|-----------|-----------|
| **Notificaciones vía RPC en BD** | Pro: Atomicidad, evita race-conditions e inconsistencias de red.<br>Con: Carga lógica en la base de datos (PL/pgSQL). | Un fallo de red entre crear el evento y notificar podría dejar a los jugadores desinformados. RPC en la misma transacción es la opción más robusta y simple para Supabase. |
| **Borrador en LocalStorage** | Pro: Implementación rápida, zero backend cost.<br>Con: Borrador atado al dispositivo actual. | Considerando que la creación del partido es un flujo corto, una persistencia compleja en Redis/BD no se justifica. `localStorage` cubre la mitigación de pérdida por cierre accidental de pestaña. |
| **Generación de Notificaciones síncrona** | Pro: Simplicidad, data inmediata.<br>Con: Puede tomar tiempo si el grupo tiene miles de usuarios. | En el contexto de grupos de fútbol (10 a 50 jugadores promedio), la inserción masiva en tabla `notifications` será imperceptible y mantiene la lógica simple sin usar queues asíncronas. |

## Data Flow

```text
  Client (Admin)                Next.js (Server)                  Supabase (DB)
        │                              │                               │
        │ 1. Completa Form (Draft)     │                               │
        │                              │                               │
        │ 2. Submit form               │                               │
        ├─────────────────────────────>│ 3. Server Action / Route      │
        │                              ├──────────────────────────────>│ 4. RPC `create_event`
        │                              │                               │  - Insert Event
        │                              │                               │  - Select Approved Players
        │                              │                               │  - Insert Notifications
        │                              │<──────────────────────────────┤ 5. Return Event ID
        │<─────────────────────────────┤ 6. Redirect to Event Page     │
        │ 7. Clear localStorage        │                               │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp]_feat_005_events.sql` | Create | Crea RPCs `create_event`, `update_event`, `cancel_event` y políticas RLS relacionadas. |
| `src/app/groups/[id]/events/new/page.tsx` | Create | UI del formulario de creación con persistencia de borrador en `localStorage`. |
| `src/app/groups/[id]/events/[event_id]/page.tsx` | Create | Vista de detalles del partido. |
| `src/lib/services/events.service.ts` | Create | Cliente y métodos para interactuar con eventos (crear, obtener, cancelar). |
| `src/app/groups/[id]/dashboard/page.tsx` | Modify | Integrar un query para mostrar el próximo partido pendiente o activo del grupo. |

## Interfaces / Contracts

```typescript
// src/lib/types/events.types.ts
export interface EventDraft {
  title: string;
  date: string;
  time: string;
  location: string;
  modality: '5v5' | '7v7' | '11v11';
}

export interface RPC_CreateEventPayload {
  p_group_id: string;
  p_title: string;
  p_date_time: string; // ISO-8601
  p_location: string;
  p_modality: string;
  p_created_by: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Formulario Evento | Tests en React Testing Library para validar autocompletado y limpieza de borrador. |
| Integration | Creación de Eventos | Mockear Supabase client para validar payload enviado. Verificar prevention de doble submit. |
| E2E | Flujo RPC & Notificaciones | Insertar data en BD test, crear evento, y verificar notificaciones de jugadores approved. |

## Migration / Rollout

No data migration required para registros existentes. Se crearán tablas `events` (si no existen) y funciones RPC en una nueva migración.

## Open Questions

- [ ] ¿Hay algún diseño específico para la vista del partido individual (`events/[event_id]/page.tsx`), o usamos una tarjeta simple por ahora?
- [ ] ¿Los eventos cancelados se pueden revivir, o son definitivos? (Se asumirá estado final definitivo por simplicidad a menos que se indique lo contrario).