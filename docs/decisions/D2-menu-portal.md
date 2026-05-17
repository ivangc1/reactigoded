# D2 — Menu Full FUI portal (`<FloatingPortal>` + `floatingStyles` + data-attributes)

**Fecha**: 2026-05-17
**Estado**: ✅ DONE en beta.24 (B1-PR3).
**Origen**: gate review § B-04 + CONV-3 + EXC-A1-17 + sesión Bloque 0 sprint D2.

## Decisión

**Opción A canónica con refinement Radix**: full FUI primitive con
`<FloatingPortal>` + `floatingStyles` inline + data-attributes split
(`data-side` + `data-align` + `data-state`, NO composite `data-placement`).

Acopla con D7 (file move + namespace reorganization).

## Pre-D2 (hybrid)

Pre-fix Menu ya consumía FUI internals (`useFloating`, `useDismiss`,
`useRole`, `useListNavigation`, `useTypeahead`, `useClick`,
`FloatingFocusManager`, `FloatingNode`) — pero **descartaba** el output
más valioso: `floatingStyles`. Positioning era CSS-driven via modifier
classes `.ig-menu-up` / `.ig-menu-right` + visibility via
`.ig-menu.ig-menu-open` y `:focus-within` JS-less fallback.

Resultado: flip middleware corría pero su output no se aplicaba. Menu
cerca de viewport edge no flipeaba. Ancestor `overflow:hidden` clipaba
el menu sin portal escape. 25 tests Menu existían pero **cero
validaban flip/shift/floatingStyles/cascade dismiss real**.

JSDoc del componente lo admitía explícitamente como deuda diferida:

> "**Positioning**: actualmente CSS-driven (la clase `.ig-menu-open` +
> `.ig-menu-right`/`.ig-menu-up` controla layout). FUI computa
> `floatingStyles` internamente para el caso futuro (overflow:hidden
> de ancestor) pero no se aplican porque el patrón actual del DS es
> inline-positioned. Si en 1.1+ aparece overflow-clipping reportado,
> se activa `FloatingPortal` y `floatingStyles` como opt-in."

Filtro agresivo Bloque 0 rebatió: deuda admitida en JSDoc + audit A2
BLOCKER explícito = el contrato canónico del namespace `floating/`
exige portal real, no half-implementation. Pre-rc.1 es el momento.

## Cambios D2

### MenuContext.ts (interface extension)

```ts
interface MenuContextValue {
  // ... existing fields ...
  /** Inline floatingStyles computado por useFloating (top/left/position) */
  floatingStyles: CSSProperties;
}
```

### Menu.tsx (provider)

```ts
const { refs, context, floatingStyles } = useFloating({ ... });
// Pasar floatingStyles al context via ctxValue.

// Wrapper SIN modifier classes pre-D2:
return (
  <MenuContext.Provider value={ctxValue}>
    <div ref={ref} className={cn("ig-menu", className)} {...rest}>
      {children}
    </div>
  </MenuContext.Provider>
);
```

Modifier classes eliminadas (`ig-menu-right`, `ig-menu-up`, `ig-menu-open`).

### MenuContent.tsx (rewrite)

```tsx
import { FloatingFocusManager, FloatingNode, FloatingPortal, useMergeRefs } from "@floating-ui/react";

function parseSide(placement: string): "top" | "bottom" | "left" | "right" {
  return placement.split("-")[0] as ...; // helper
}
function parseAlign(placement: string): "start" | "end" | "center" {
  return placement.split("-")[1] ?? "center";
}

export function MenuContent({ className, children, ref, ...rest }) {
  const { menuId, triggerId, open, setFloating, getFloatingProps, context, floatingStyles, nodeId } = useMenu();
  const refMerged = useMergeRefs([setFloating, ref ?? null]);

  // Unmount-on-close (Radix pattern). Pre-D2 keeping DOM con CSS hide
  // + :focus-within fallback. Post-D2 no DOM cuando !open.
  if (!open) return null;

  const side = parseSide(context.placement);
  const align = parseAlign(context.placement);

  const inner = (
    <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus>
      <div
        {...getFloatingProps(rest)}
        ref={refMerged}
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
        data-side={side}
        data-align={align}
        data-state="open"
        style={floatingStyles}
        className={cn("ig-menu-content", className)}
      >
        {children}
      </div>
    </FloatingFocusManager>
  );

  const portaled = <FloatingPortal>{inner}</FloatingPortal>;

  return nodeId === undefined ? portaled : <FloatingNode id={nodeId}>{portaled}</FloatingNode>;
}
```

### CSS cleanup (`igoded-components.css`)

Reglas eliminadas:
- `.ig-menu-right .ig-menu-content { left: auto; right: 0; }`
- `.ig-menu-up .ig-menu-content { top: auto; bottom: 100%; ... }`
- `.ig-menu.ig-menu-open .ig-menu-content { opacity: 1; visibility: visible; ... }`
- `.ig-menu:focus-within .ig-menu-content { opacity: 1; ... }`

`.ig-menu-content` queda solo con visual base (color, padding, border,
shadow, radius, z-index). top/left/position vienen de inline style FUI.

## `data-side` + `data-align` split (Radix-style) sobre composite `data-placement`

Verificado en sesión Bloque 0: Radix usa `data-side` / `data-align`
separados. Mantine y MUI también. Patrón split más ergonómico para CSS
hooks porque consumers reaccionan a side OR align independientemente:

```css
/* Animation origin keyed on side */
.ig-menu-content[data-side="bottom"] { transform-origin: top center; }
.ig-menu-content[data-side="top"]    { transform-origin: bottom center; }

/* Edge styles keyed on align */
.ig-menu-content[data-align="end"] { border-top-right-radius: 0; }

/* State for transitions */
.ig-menu-content[data-state="open"] { animation: fade-in 150ms; }
```

Composite `data-placement="top-end"` requeriría `[data-placement^="top-"]`
substring matching — menos ergonómico. Split es elección Radix-canon.

## Por qué A canónica + data-attributes (no E con CSS vars)

Sesión Bloque 0 D2 evaluó opción E (CSS custom properties
`--ig-menu-x`/`--ig-menu-y` en lugar de inline `top`/`left`).
Conclusión: E inventaba un patrón "DS theming model" que el DS no
soportaba — override de geometría calculada por FUI no es theming
legítimo (ARIA APG anti-pattern equivalent). Industry-canon
(Radix/Mantine/MUI) usa inline styles + data-attributes. A canónica.

## Acoplamientos

- **D7 (file move)**: Menu pasa a `floating/Menu/` simultáneo con D2.
  Single PR (B1-PR3).
- **D7.4 (useFloatingNode internal)**: retirado del wildcard re-export
  primitives/index.ts. Menu sigue importando via path directo.
- **C-03 status DONE**: doc actualizado tras migración.
- **B-04 BLOCKER (audit)**: cerrado por D2.
- **EXC-A1-17 (Menu tests no validan flip/shift)**: cerrado por tests
  nuevos en D2 cobertura del comportamiento portal+positioning.

## Costes honestos

Breaking changes documentados en CHANGELOG:
1. `.ig-menu-right`, `.ig-menu-up`, `.ig-menu-open` modifier classes
   eliminadas. Consumers que styleaban via estos selectors rompen.
   Migration: usar `[data-side]` / `[data-align]` attribute selectors
   en MenuContent (el portal-target).
2. `.ig-menu:focus-within` JS-less fallback eliminado. Menu requiere
   JS (alineado con Tooltip/Dialog/Accordion del DS).
3. MenuContent ya NO descendant de `.ig-menu` en DOM (portal). CSS
   rules con `.ig-menu .ig-menu-content` adjacency rompen.

## Reapertura

Reabrir si:
- Algún consumer reporta degradación de UX en flip/shift behavior
  (improbable, FUI middleware es estable).
- Tests de portal/cascade fallan en algún navegador específico.
- POST_RC1_BACKLOG: si en 1.1+ se añade `<MenuPortal>` opt-out
  componente, reabrir para articular interface.
