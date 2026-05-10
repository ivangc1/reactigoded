# H-01 — Tooltip `FloatingTree` para cascada dismiss

**Fecha**: 2026-05-10
**Estado**: ✅ **IMPLEMENTADO en RC1** (re-clasificado de "known limitation 1.1+")
**Origen**: gate review § IV.2 línea 694

## Contexto

`<Tooltip>` no usaba `<FloatingTree>` de `@floating-ui/react`. Sin árbol, en jerarquías anidadas (Tooltip → Popover → Modal), un `Escape` sobre el float más interno NO cerraba el ancestro — quedaba un comportamiento inconsistente.

## Decisión final (2026-05-10)

**Implementar pre-RC1** sobre la capa `floating/primitives/` (B-03 también adelantada). Tooltip ahora:

1. Llama `useFloatingNode()` → obtiene `{ nodeId, parentId }`.
2. Pasa `nodeId` a `useFloating({ nodeId, ... })`.
3. Envuelve el portal flotante en `<FloatingNode id={nodeId}>`.

Funcionamiento gradual:

- **Sin `<FloatingTreeRoot>` ancestor** (consumer típico): el Tooltip se registra pero el árbol no tiene padre — funciona independiente, igual que antes (cero regresión).
- **Con `<FloatingTreeRoot>` ancestor**: floats anidados (Tooltip dentro de Popover/HoverCard/Dropdown FUI) comparten dismiss. `Escape` cierra el más interno y propaga al ancestro.

## Por qué adelantarlo (cambio respecto al plan inicial)

Iván decidió 2026-05-10 cerrar todos los deferrals factibles pre-RC1. El argumento clave: el bug "teórico" se vuelve real en cuanto Popover/HoverCard/Dropdown FUI lleguen — pre-RC1 pagar el coste evita una migración post-1.0 con compatibility surface ya congelada.

Coste real: ~30 LOC en Tooltip + tests específicos (`FloatingTreeRoot` opcional). Trivial una vez B-03 está.

## Tests añadidos (RC1)

- `funciona stand-alone sin FloatingTreeRoot (no rompe)`: regresión.
- `funciona dentro de FloatingTreeRoot (cierra con Escape)`: integración con tree.
- `aria-describedby sigue conectando al sr-only span dentro de tree`: a11y intacta con el wrapper.

## Asociado a

- **B-03** (floating/primitives layer): ✅ implementado RC1; aporta `FloatingTreeRoot` + `useFloatingNode`.
- **C-02** (Tooltip-en-Modal): no relacionado (portal target).
- **D-01** / **M-05** (Slot pattern): empaquetados en el mismo PR de RC1.

## Cierra

- **H-01** (HIGH del gate review § IV.2): ✅ implementado pre-RC1.
