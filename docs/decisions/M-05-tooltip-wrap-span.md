# M-05 — Tooltip envuelve siempre en `<span>`

**Fecha**: 2026-05-10
**Estado**: ✅ **IMPLEMENTADO en RC1** (re-clasificado de "status quo + Slot diferido a 1.1+")
**Origen**: gate review § IV.3 línea 1114

## Contexto

`<Tooltip>` envolvía su `children` en un `<span class="ig-tooltip-wrapper">` para gestionar refs, listeners, y `aria-describedby` vía `cloneElement`. El span añadía un nodo `inline` que **rompía block-level layouts** del consumer:

```tsx
<Tooltip text="…">
  <div style={{ display: "block" }}>...</div>  // quedaba dentro de un span inline
</Tooltip>
```

## Decisión final (2026-05-10)

**Implementar pre-RC1** vía Slot pattern (D-01). El wrapper `<span class="ig-tooltip-wrapper">` se elimina. El sr-only span persistente queda como sibling del child clonado en un Fragment.

Resultado: el child mantiene su contexto de layout original sin nodo `inline` silencioso.

## Por qué adelantarlo (cambio respecto al plan inicial)

Iván vetó originalmente eliminar el wrap pre-RC1 ("decisión arquitectónica del Slot pattern merece tratarse en bloque, no en pieza suelta"). El 2026-05-10 cambió de criterio: cerrar TODOS los deferrals factibles pre-RC1 en lugar de exponerlos a major bump 2.0.

El bloque coordinado (B-03 primitives + H-01 FloatingTree + D-01 Slot + M-05 wrap) se ejecuta en un único PR.

## Implementación efectiva

```tsx
// Antes (pre-RC1):
return (
  <span className="ig-tooltip-wrapper">
    {child}
    <span id="..." role="tooltip" className="ig-sr-only">{text}</span>
    {isOpen && <FloatingPortal>...</FloatingPortal>}
  </span>
);

// Ahora (RC1, Slot pattern):
return (
  <>
    {child}
    <span id="..." role="tooltip" className="ig-sr-only" inert>{text}</span>
    <FloatingNode id={nodeId}>
      {isOpen && <FloatingPortal>...</FloatingPortal>}
    </FloatingNode>
  </>
);
```

## Asociado a

- **D-01** (Slot refactor): ✅ implementado pre-RC1.
- **B-03** (primitives layer): ✅ implementado pre-RC1, base de este refactor.
- **H-01** (FloatingTree): ✅ implementado en el mismo bundle.
- **M-01** (polymorphic `as`): independiente; sigue diferido a 2.0.

## Cierra

- **M-05** (MEDIUM del gate review § IV.3): ✅ implementado pre-RC1.
