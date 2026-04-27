# feat-001 — Runtime Context

## Objetivo

Onboarding completo:
Landing → Join → Invite → Wizard → Pending

Resultado:
Player creado con stats y status 'pending_approval'.

## Backend

- Supabase only
- Writes server-side (RPC o route handlers)
- RLS obligatorio

## Services

src/lib/services/

- invite.service.ts
- onboarding.service.ts
- player.service.ts
- auth.service.ts

Todos devuelven Result<T, AppError>

## Invite

RPC: accept_invite_for_user

Crea Player:

- primary_position = 'MED'
- stats default 5
- stats_status = 'pending_approval'

## Wizard

- Paso 1: posición
- Paso 2: stats
- Tope 8

## Draft

onboarding-draft-v1-${groupId}

## Submit

- valida con Zod
- update player
- notification best-effort

## Reglas críticas

- pending no visible públicamente
- no puede jugar
- admin aprueba en feat-004

## Done

- user entra
- crea player
- completa wizard
- queda pending
