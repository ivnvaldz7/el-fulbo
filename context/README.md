# /context/ — Estado mutable del proyecto

> Lo que cambia por sesión. Al contrario del engram (inmutable), este directorio se actualiza seguido.

---

## Archivos

### `handoff.md`
**Archivo crítico.** Lo primero que cualquier agente lee al arrancar.
- Estado actual del proyecto.
- Qué está listo y qué falta.
- Decisiones importantes cerradas en la última sesión.
- Cosas a tener en cuenta.
- Próxima acción.

**Al cerrar sesión**: snapshot-ear el anterior en `handoff-history/YYYY-MM-DD-milestone.md` antes de reescribir.

### `current-state.md`
Vista rápida/tabla del estado. Para ojeada rápida sin leer todo el handoff.

### `agent-prompts.md`
Prompts exactos para arrancar sesión según el rol:
- **Designer** (Claude escribiendo specs).
- **Implementer** (Claude Code / Codex).
- **Auditor** (Claude revisando código).

Copiar, pegar, enviar.

### `handoff-history/`
Snapshots de handoffs anteriores. Sirve para ver la evolución del proyecto.

---

## Flujo recomendado

1. **Arrancás sesión** → leés `handoff.md`, `current-state.md` y `agent-prompts.md`.
2. **Trabajás** → modificás specs / engram / código según corresponda.
3. **Cerrás sesión** →
   - Copiar el `handoff.md` actual a `handoff-history/YYYY-MM-DD-milestone.md`.
   - Reescribir `handoff.md` con el nuevo estado.
   - Actualizar `current-state.md` para reflejar lo hecho.
   - Actualizar `CHANGELOG.md` si hubo avance verificable.
   - Si hay decisiones nuevas, agregarlas al engram.

## Regla operativa nueva

**Antes de cada pasada** hay que dejar registro actualizado del estado real del proyecto.

Checklist mínimo:
- `context/current-state.md`
- `context/handoff.md`
- `CHANGELOG.md` si hubo avance o corrección relevante
- snapshot de `handoff.md` en `handoff-history/` antes de reescribir

---

## Qué NO va en context

- Decisiones cerradas → van al engram.
- Specs del producto → van a `/specs/`.
- Código → va a `/src/`.

Context es solo para **"dónde estamos ahora"**.
