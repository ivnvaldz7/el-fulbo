# Proposal: notifications-v3-vercel-hobby

## Intent

Redefinir la arquitectura y los requerimientos de notificaciones para que el sistema sea portable, auditable y compatible con Vercel Hobby.

El problema actual no es Web Push en sí: el deploy falla porque `vercel.json` intentó correr `/api/jobs/maintenance` cada 3 horas (`0 */3 * * *`), y Vercel Hobby solo permite cron jobs diarios. La solución no puede ser “meter más crons”; tiene que respetar la plataforma.

## Scope

### In Scope

- Documentar la arquitectura objetivo: `dominio -> notifications outbox -> dispatcher inmediato server-side -> cron diario fallback`.
- Mantener `public.notifications` como source of truth para feed, outbox, auditoría, dedupe y diagnóstico.
- Cubrir los tipos críticos de partido:
  - `event_created`
  - `attendance_changed`
  - `attendance_reminder`
- Definir UI mínima: feed/campana existente, deep-links y preferencia `push_enabled`.
- Documentar restricciones de Vercel Hobby y criterios de aceptación de deploy.
- Actualizar specs/docs versionados para continuar el trabajo desde otra máquina.

### Out of Scope

- Rediseño visual completo de `/notifications`.
- Emails/digests.
- Preferencias granulares por tipo.
- Lógica de “70%”.
- Temporary owners, MVP/stats/owners/reintegration push.
- Cambio a Vercel Pro como requisito.

## Capabilities

### New Capability

- Dispatch inmediato server-side para rows pushables recién creadas, sin depender de cron frecuente.

### Modified Capability

- `feat-012-notifications` pasa de una spec amplia con Edge Functions/digests a una spec realista para Vercel Hobby.

## Success Criteria

- `vercel.json` no define ningún cron más frecuente que diario.
- Toda notificación pushable nace como row en `public.notifications`.
- Los flujos críticos disparan un dispatcher server-side inmediato después de crear rows en outbox.
- `/api/jobs/maintenance` queda como fallback diario para retry y tareas batch.
- `pushed_at` solo se setea cuando `sent > 0`.
- Las specs versionadas explican cómo seguir el trabajo desde otra máquina sin depender de Engram.

