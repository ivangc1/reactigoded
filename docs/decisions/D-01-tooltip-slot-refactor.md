# D-01 — Refactor Tooltip a Slot pattern

**Fecha**: 2026-05-10
**Estado**: diferido a 1.1+ (cubierto por B-03)
**Origen**: gate review § IV.5 línea 1292

## Contexto

> D-01: Refactor a `Slot` pattern para `<Tooltip>` (impone breaking de `ig-tooltip-wrapper`).

El Slot pattern (estilo Radix `<Slot asChild>`) elimina el `<span class="ig-tooltip-wrapper">` que envuelve el child del Tooltip. Soluciona M-05 (rompe block-level) pero requiere breaking de la clase CSS pública `ig-tooltip-wrapper`.

## Decisión

**Diferir a 1.1+** como parte del refactor coordinado en `floating/primitives/` (B-03).

## Por qué NO ahora

- M-05 (block-level wrap) es la motivación principal. Diferida con doc explícita.
- El Slot pattern es decisión arquitectónica que afecta a Tooltip + futuros Popover/HoverCard. Hacerlo en bloque con el primitive (B-03) es más coherente.
- Breaking de `.ig-tooltip-wrapper` es API CSS pública. Pre-RC1 todavía hay margen, pero no vale la pena hacerlo aislado del Slot pattern global.

## Plan 1.1+

Asociado a:
- **B-03** (`floating/primitives/`): el Slot vive en el primitive.
- **M-05** (Tooltip wrap span): se elimina al refactor.

CHANGELOG explícito al hacer el refactor con migration guide:
- Consumer que usaba `.ig-tooltip-wrapper` para layout debe ajustar.
- Consumer típico no se ve afectado (el wrap era invisible CSS-wise).

## Cierra

- **D-01** (DEFERRED del gate review § IV.5)
