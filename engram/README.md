# /engram/ — Memoria persistente del proyecto

> **Log inmutable de decisiones.** Append-only. Las decisiones no se borran: se supersedean.

---

## Qué hay acá

### `decisions.json`
Archivo principal. Cada entrada es una decisión cerrada del proyecto con:

- `id`: único (dec-001, dec-002, …).
- `date`: fecha en que se cerró.
- `version`: a qué versión del producto pertenece (v1, v2, …).
- `title`: corto, descriptivo.
- `context`: qué problema estábamos resolviendo.
- `decision`: qué decidimos exactamente.
- `alternatives_considered`: opcional.
- `rationale`: por qué esta opción y no las otras.
- `status`: `active` | `superseded` | `deprecated`.
- `superseded_by`, `superseded_at`, `superseded_reason`: si aplica.

---

## Reglas

1. **Nunca borrar una decisión.** Si ya no aplica: `status='superseded'` + linkear a la que la reemplaza.
2. **Nunca editar una decisión existente** salvo para marcarla superseded o agregar una `note`.
3. **Las decisiones `active` son la verdad del proyecto hoy.** Si el código contradice una decisión `active`: el código está mal.
4. **Agregar una decisión = debate cerrado con Iván + escritura en este archivo.** No existen decisiones "acordadas verbalmente" que no estén acá.

---

## Cómo leer el engram al arrancar sesión

1. Filtrar por `status = 'active'`.
2. Ordenar por `id` (cronológico).
3. Leer secuencialmente.

Eso te da el estado mental completo del proyecto en unos minutos.

---

## Histórico

- V1 (sorteador): decisiones dec-001 a dec-018. Varias superseded.
- V2 (reemplazo de WhatsApp): decisiones dec-019 a dec-036. Todas active.

---

## Futuro (ideas, no implementado)

- `decisions.yaml` como formato alternativo más legible.
- Script para generar vista filtrada (solo active, solo por versión, etc.).
- Integración con un dashboard para visualizar linaje de decisiones.

Por ahora: JSON + leer a ojo.
