// D7.5 (RC1 gate review beta.24): barrel agrupado del namespace
// `floating/`. Antes existía como dos `export *` sueltos en
// `src/components/index.ts` (línea 39 primitives + 40 Tooltip). Con
// el move de Menu a `floating/Menu/` (D7.1), tres exports sueltos era
// proliferación de wildcards. Agrupar bajo un único `floating` barrel:
//
//   1. `src/components/index.ts` se colapsa a un solo `export * from
//      "./floating"`.
//   2. Cada miembro del namespace floating se documenta en
//      `floating/README.md` (criterio mecánico de pertenencia).
//
// Criterio mecánico para añadir un component a este namespace:
// **components que consumen `@/components/floating/primitives/`**.
// Testeable via grep, NO inferencial. Si un component nuevo en el
// roadmap (Popover, HoverCard, ContextMenu, Combobox) usa
// FloatingPortal / FloatingFocusManager / floatingStyles / useFloatingNode,
// va aquí. Si no (Drawer, BottomSheet que usan `<dialog>` HTML nativo,
// o components 100% CSS), va flat en `src/components/`.
//
// D7.4: `useFloatingNode` retirado del re-export `floating/primitives`.
// El hook es internal (consumido por Menu + Tooltip via path directo
// `@/components/floating/primitives/useFloatingNode`). Solo
// `FloatingTreeRoot` queda público desde primitives.

export * from "./primitives";
export * from "./Tooltip";
export * from "./Menu";
