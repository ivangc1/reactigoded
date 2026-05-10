# D-01 — Refactor Tooltip a Slot pattern

**Fecha**: 2026-05-10
**Estado**: ✅ **IMPLEMENTADO en RC1** (re-clasificado de "diferido a 1.1+")
**Origen**: gate review § IV.5 línea 1292

## Contexto

> D-01: Refactor a `Slot` pattern para `<Tooltip>` (impone breaking de `ig-tooltip-wrapper`).

El Slot pattern (estilo Radix `<Slot asChild>`) elimina el `<span class="ig-tooltip-wrapper">` que envolvía el child del Tooltip. Soluciona M-05 (rompe block-level) pero requiere breaking de la clase CSS pública `ig-tooltip-wrapper`.

## Decisión final (2026-05-10)

**Implementar pre-RC1**. Tooltip refactor:

- Devuelve un Fragment con `{cloneElement(child)}` + sr-only span sibling + portal flotante.
- **Cero wrapper**. La clase `.ig-tooltip-wrapper` ya no se emite.
- `TooltipProps` deja de extender `HTMLAttributes<HTMLSpanElement>`. Pierde `className`, `ref`, `...rest` HTML props.

Documentado como breaking en CHANGELOG `[Unreleased] § Breaking`.

## Por qué adelantarlo (cambio respecto al plan inicial)

Iván decidió 2026-05-10 cerrar todos los deferrals factibles pre-RC1. El argumento clave: D-01 es breaking de CSS público. Hacerlo en 1.1+ obligaría a major bump (2.0). Pre-RC1 todavía hay margen — ahora o nunca sin major.

Asociado al refactor coordinado en `floating/primitives/` (B-03), también adelantado.

## Implementación efectiva

```tsx
return (
  <>
    {child}
    <span id={tooltipId} role="tooltip" className="ig-sr-only" inert>
      {text}
    </span>
    <FloatingNode id={nodeId}>
      {isOpen && <FloatingPortal>...</FloatingPortal>}
    </FloatingNode>
  </>
);
```

El sr-only span persistente se renderiza como sibling sin portal — sigue siendo SSR-friendly y mantiene aria-describedby estable.

## Migration guide (en CHANGELOG breaking)

- Consumer con CSS dirigida a `.ig-tooltip-wrapper` debe migrar al child directo o a un wrapper manual.
- Consumer con `<Tooltip className="..." ref={...}>` recibe TS error. Esos props no tenían destino fiable post-Slot. Migrar a wrapping manual del child.

## Asociado a

- **B-03** (`floating/primitives/`): ✅ implementado RC1.
- **M-05** (Tooltip wrap span): ✅ cerrado por este Slot.
- **H-01** (FloatingTree): ✅ cerrado por este refactor.

## Cierra

- **D-01** (DEFERRED del gate review § IV.5): ✅ implementado pre-RC1.
