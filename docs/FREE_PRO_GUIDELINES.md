# FREE_PRO_GUIDELINES.md

## 1. Principio central

El Fulbo es un producto freemium orientado al organizador del grupo.

Free debe permitir organizar un partido real.
Pro debe reducir carga operativa, automatizar seguimiento y evitar persecución por WhatsApp.

Frase guía:

**Free = organizado.**
**Pro = piloto automático.**

## 2. Comprador inicial

El comprador inicial es el organizador del grupo.

No vender inicialmente por jugador individual.

El valor Pro debe explicarse como:

- menos mensajes manuales;
- menos gente colgada;
- menos seguimiento;
- mejor armado del partido;
- más automatización para admin/owners.

## 3. Precio inicial de referencia

Precio documental inicial:

**USD 4.99/mes por grupo.**

Este precio es una hipótesis de producto, no implementación.

## 4. Reglas del plan Free

Free debe incluir:

- crear grupo;
- invitar jugadores;
- crear evento;
- confirmar asistencia;
- ver lista de jugadores;
- ver confirmados;
- sortear equipos;
- stats/cards básicas;
- MVP básico;
- notificaciones esenciales de baja frecuencia o best effort.

Free no debe sentirse roto.

Free debe poder reemplazar parte del caos de WhatsApp, aunque no automatice todo.

## 5. Reglas del plan Pro Grupo

Pro Grupo vende automatización.

Debe incluir, en futuro:

- notificaciones rápidas;
- recordatorios automáticos de asistencia;
- alertas cuando alguien se baja;
- alerta de falta gente;
- resumen post-partido;
- automatizaciones para admin/owners;
- menor carga operativa para cerrar el partido.

Pro no vende “push”.
Pro vende “menos trabajo para organizar”.

## 6. Clasificación funcional

Clasificar cada futura función como:

### Core

Función central que no debería bloquearse.

Ejemplos:

- crear grupo;
- crear evento;
- confirmar asistencia;
- sortear equipos;
- ver cards básicas.

### Essential notification

Notificación necesaria para que el producto base funcione.

Puede existir en Free, con baja frecuencia o best effort.

### Automation

Notificación o acción que ahorra trabajo al organizador.

Candidata a Pro.

### Premium insight

Resumen, análisis, predicción o insight avanzado.

Candidato a Pro.

## 7. Clasificación de notificaciones

Cada nueva notificación debe declarar:

- type;
- nivel: essential / automation / premium;
- plan: free / pro;
- destinatario;
- evento que la dispara;
- frecuencia esperada;
- riesgo de spam;
- costo operativo;
- si requiere push rápido o puede ser best effort;
- dedupe_key;
- deeplink/copy;
- tests mínimos.

Mantener contrato técnico:

- toda notificación nace en `public.notifications`;
- no push directo desde UI/RPC/components;
- dispatcher separado;
- dedupe obligatorio;
- preferencias obligatorias cuando aplique;
- `push_enabled` respetado;
- `pushed_at` sólo si envío exitoso.

## 8. Matriz inicial sugerida

Esta matriz es guía de producto, no implementación.

| Notificación | Nivel | Free | Pro |
| --- | --- | --- | --- |
| `event_created` | essential | permitido, baja frecuencia/best effort | rápido |
| `event_cancelled` / `event_rescheduled` | essential | permitido | rápido |
| `attendance_changed` para admin/owners | automation | in-app o limitado | push rápido |
| `attendance_reminder` | automation | limitado o manual | automático |
| `someone_dropped` | automation | in-app o limitado | push rápido |
| falta gente / completar cupo | automation/premium | no prioritario | sí |
| resumen post-partido | premium | básico o no disponible | sí |
| `weekly_digest` | premium | no prioritario | sí |

## 9. Qué NO bloquear en Free

No bloquear:

- crear grupo;
- crear evento;
- confirmar asistencia;
- ver grupo;
- sortear equipos;
- cards básicas;
- MVP básico.

Si se bloquean estas funciones, el producto gratis pierde adopción.

## 10. Futuro diseño técnico pendiente

No implementar ahora.

Diseño futuro posible:

- `group_subscriptions`;
- `group_plan`;
- `entitlements`;
- `notification_tier`;
- `dispatch_policy`;
- frequency caps;
- billing provider;
- plan checks centralizados en service layer.

Regla:

No hardcodear paywalls dispersos en componentes.

## 11. Validación de producto

Antes de agregar una automatización, responder:

1. ¿El usuario gratis puede organizar un partido real?
2. ¿El organizador entiende por qué pagaría Pro?
3. ¿Esta función ahorra trabajo real?
4. ¿Tiene costo operativo?
5. ¿Genera spam?
6. ¿Debe ser inmediata o puede ser best effort?
7. ¿Qué pasa si el grupo es Free?
8. ¿Qué pasa si el grupo es Pro?

## 12. Estado actual

Este documento no cambia comportamiento actual.
No implementa pricing.
No implementa pagos.
No implementa paywall.
Sólo fija lineamientos de producto.
