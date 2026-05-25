# D12 — Defaults de strings en español (i18n del DS)

**Fecha decisión original**: 2026-05-04 (beta.20, Bloque C i18n)
**Fecha de este doc**: 2026-05-25 (formalización tras 2 gate reviews que marcaron la decisión como falso hallazgo)
**Estado**: ✅ **DECIDIDO y VIGENTE**. Reevaluación condicionada a 1.1.0.
**Origen**: acuerdo Iván + Claude Code en beta.20. Registrado entonces en CHANGELOG + `docs/CSSAPI.mdx` sección "i18n y a11y strings". Este doc lo eleva a decision doc dedicado porque dos auditorías independientes (GPT Codex 2026-05-25, Claude Opus 4.7 v2 2026-05-20) lo reportaron como hallazgo HIGH/pendiente al no encontrarlo desde el flujo de auditoría.

## Decisión

El DS sirve todos los strings user-facing (a11y labels + texto visible mínimo) con **defaults en español**. Es deliberado, NO descuido ni deuda técnica.

**Razón** (Mandamiento 2 — lo tangible manda): la audience real e inmediata es hispanohablante (InfiniteRol y consumers ES). Optimizar para una audience anglo hipotética antes de que se materialice sería invertir en metafísica sobre lo tangible.

Cada string user-facing **expone override** (prop dedicada o `aria-label` HTML estándar) para que la migración a cualquier idioma sea trivial sin breaking change.

## Reevaluación (gate de cambio)

Cambiar defaults a EN se evalúa en 1.1.0, **solo si**:
- 5 o más issues pidiendo EN en los primeros 6 meses post-1.0.0, **o**
- un consumer real anglo lo justifica.

Si no, defaults ES permanentes. El cambio, si llega, es additive (los overrides ya existen; solo cambia el valor por defecto).

## Inventario de strings ES + override (verificado 2026-05-25)

| Componente | String ES default | Override | Estado |
|---|---|---|---|
| Alert | `"Cerrar"` (botón close) | `closeLabel` | ✅ OK |
| Chip | `"Eliminar"` (botón remove) | `removeLabel` | ✅ OK |
| DialogClose | `"Cerrar"` (aria-label) | `aria-label` (HTML std) | ✅ OK |
| Pagination | `"Anterior"` / `"Siguiente"` | `prevLabel`, `nextLabel` | ✅ OK |
| Progress | `"Cargando"` / formato `"X por ciento completado"` | `loadingLabel`, `formatLabel` | ✅ OK |
| Stepper | `"Progreso"` (aria-label grupo) | `aria-label` (HTML std, prop renombrada internamente a `ariaLabelOverride`) | ✅ OK |
| Toast | `"Cerrar"` (botón close) | `closeLabel` | ✅ OK |
| Avatar (status) | `"en línea"` / `"sin conexión"` / `"ocupado"` / `"ausente"` | `statusLabel` | ✅ OK |
| SkeletonContainer | `"Cargando contenido…"` | `label` | ✅ OK |
| Rating (grupo) | `"Puntuación"` | `aria-label` (HTML std, prop renombrada internamente a `ariaLabelOverride`) | ✅ OK |
| **Rating (por estrella)** | `"N estrella(s)"` | **`getStarLabel`** (nuevo en este PR) | ✅ Cerrado en D12 |

**Hueco previo a este PR**: `Rating.tsx:198` — el aria-label *por estrella individual* estaba hardcoded sin override mientras el del grupo sí era overrideable. Inconsistencia interna. Cerrado en este PR con prop `getStarLabel?: (n: number) => string`.

## Cómo evitar que vuelva a saltar como hallazgo

1. **Este decision doc**: los reviewers leen `docs/decisions/` antes de auditar.
2. **Comment marker en código** junto a cada string ES (~10 sitios):
   ```ts
   // i18n: ES default deliberado (D12). Override: closeLabel.
   ```
3. **Tabla actualizada en `docs/CSSAPI.mdx`** (sección "i18n y a11y strings") con las 11 filas + nota apuntando a D12.
4. **Mención en el prompt de gate review futuro**: "defaults ES (D12) son deliberados, NO reportar como i18n pendiente".

## Cierra / corrige

- Corrige **Codex BLOCKER 4 → HIGH 5 i18n** (gate review v3 beta.25): la decisión defaults ES ya estaba tomada en beta.20, no era pendiente.
- Corrige **Claude Opus 4.7 v2 MISS-3**: idéntico falso positivo.
- Cierra el único accionable real que ambos reviewers señalaron correctamente: el aria-label por estrella sin override en Rating.
