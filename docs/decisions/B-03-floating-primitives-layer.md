# B-03 — `floating/primitives/` layer

**Fecha**: 2026-05-10
**Estado**: diferido a 1.1+
**Origen**: gate review § IV.1 línea 524

## Contexto

`<Tooltip>` (subfamilia `floating/`) importa directamente de `@floating-ui/react`: `FloatingPortal`, `useFloating`, `useHover`, `useFocus`, `useDismiss`, `useInteractions`, `autoUpdate`, `flip`, `offset`, `shift`. **No usa `FloatingTree` ni `useFloatingNodeId`**.

Roadmap post-RC1: `Popover`, `HoverCard`, `OptionsMenuContent` (FUI), `Submenu`, `MentionMenu`, `SlashCommand`. Todos floating con anidamiento. Sin primitive base compartido, cada componente futuro duplica setup.

## Decisión

**Diferir a 1.1+**. Construir `src/components/floating/primitives/` con:

- `FloatingPrimitive` base: portal target, controlled/uncontrolled open state, shared middleware.
- `FloatingTreeProvider` + `useFloatingNodeId()` para nested floats.
- Virtual anchors helpers (cursor-aligned tooltips, popover from arbitrary point).

Tooltip + futuros componentes consumen el primitive.

## Por qué NO ahora

- Construir el primitive requiere reescritura del Tooltip + tests de regresión completos. Pre-RC1 ya tiene scope grande (BLOCKERs B-01/B-02/B-04 cerrados).
- La decisión correcta es hacer el primitive **junto con** Popover/HoverCard (1.1+), no antes en abstracto.
- En RC1 el Tooltip funciona sin primitive — los tests verde, la API es pública estable.

## Plan 1.1+

1. **Iteración 1**: construir `FloatingPrimitive` base.
2. **Iteración 2**: refactor Tooltip a usar el primitive (cero breaking API consumer-side).
3. **Iteración 3**: añadir `Popover` + `HoverCard` consumiendo primitive.
4. **Iteración 4**: añadir `FloatingTreeProvider` + cascade dismiss (cierra H-01).
5. **Iteración 5**: añadir `floating/menu/Dropdown` (FUI) + `Submenu` (cierra C-03 plan post-RC1).

## Asociado a

- **H-01** (Tooltip FloatingTree): la implementación efectiva vive en el primitive.
- **M-05** (Tooltip wrap span): el Slot pattern del primitive elimina el wrap.
- **D-01** (Tooltip Slot refactor): cerrado en bloque con el primitive.
- **C-03** (Dropdown FUI): el plan post-RC1 depende del primitive.

## Reapertura

Reabrir si:
- 1.1+ no llega a construir Popover/HoverCard (entonces el primitive es prematuro).
- Aparece bug en Tooltip que solo el primitive resuelve.

## Cierra parcialmente

- **B-03** (BLOCKER del gate review § IV.1)
