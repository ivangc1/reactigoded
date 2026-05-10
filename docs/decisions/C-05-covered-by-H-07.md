# C-05 — `state.css` 713 KB gz: reinventando Tailwind opt-in

**Fecha**: 2026-05-10
**Estado**: cerrada como duplicado de **H-07**

## Contexto

`docs/RC1_GATE_REVIEW.md § VI` (línea 1358) documenta C-05 como decisión cuestionada:

> ## C-05 — `state.css` 713 KB gz: reinventando Tailwind opt-in
>
> Cubierto en H-07.

El propio review lo marca como duplicado de **H-07** (HIGH). El bundle de `state.css` (713 KB gz) implementa utilities pseudo-class (`hover:`, `focus:`, etc) propias del DS — solapamiento con Tailwind si el consumer lo usa. La decisión sobre mantener / eliminar / fragmentar este artefacto se toma en H-07.

## Decisión

Cerrar C-05 sin acción separada. La resolución se aplicará al cerrar **H-07** ("Decidir futuro de state.css").

## Trade-off documentado en H-07

H-07 ya tiene 4 opciones técnicas (mantener / fragmentar / retirar / mover a opt-in puro). C-05 aporta el ángulo de "evitar reinventar Tailwind" como criterio de decisión, no introduce opciones adicionales.

## Reapertura

No aplica. Si H-07 se cierra y C-05 sigue siendo relevante (ej: H-07 decide "fragmentar" pero el size total sigue siendo problemático), este doc se actualiza.
