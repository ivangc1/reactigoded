# M-05 — Tooltip envuelve siempre en `<span>`

**Fecha**: 2026-05-10
**Estado**: status quo + doc limitation, refactor a Slot diferido a 1.1+
**Origen**: gate review § IV.3 línea 1114

## Contexto

`<Tooltip>` envuelve su `children` en un `<span class="ig-tooltip-wrapper">` para gestionar refs, listeners, y `aria-describedby` vía `cloneElement`. El span añade un nodo `inline` que **rompe block-level layouts** del consumer:

```tsx
<Tooltip text="…">
  <div style={{ display: "block" }}>...</div>  // queda dentro de un span inline
</Tooltip>
```

## Decisión

**Mantener wrap en RC1**. Documentar la limitación en JSDoc del prop `children`. Refactor a Slot pattern (Radix-style) diferido a 1.1+.

## Por qué NO eliminar wrap pre-RC1 (opción C inicialmente considerada)

Discutido en sesión: yo voté C (eliminar wrap, requerir `display:inline-block` del child) por ser pre-RC1 el momento óptimo de breaking. Iván vetó: el riesgo de cambio comportamental sin breaking explícito y la decisión arquitectónica del Slot pattern (que afecta a Tooltip + futuros Popover/HoverCard) merece tratarse en bloque, no en pieza suelta.

## Plan post-RC1 (1.1+)

Refactor coordinado a Slot pattern:
- Tooltip absorbe el ref + handlers del child sin envolver.
- `ig-tooltip-wrapper` se deprecia con CHANGELOG explícito.
- API pública (`text`, `placement`, `variant`, `container`) no cambia.

Asociado a:
- D-01 (refactor Tooltip a Slot): cerrado como done en este doc.
- B-03 (floating/primitives layer): el Slot vive en la capa primitives compartida.
- M-01 (polymorphic `as`): patrón análogo, decidible en bloque.

## Documentación al consumer

JSDoc del prop `children` del Tooltip ya menciona la limitación implícitamente (caveat L-03 sobre `<button disabled>`). Sin nota específica sobre block-level. **TODO opcional pre-RC1**: añadir frase explícita "no envolver elementos `display: block`" en el JSDoc — ver si vale la pena dado que el patrón Slot llega en 1.1.

## Reapertura

Reabrir si:
- ≥3 consumers reportan el bug del wrap rompiendo layouts.
- Decisión interna de adelantar el Slot pattern a 1.0.x.

## Cierra parcialmente

- **M-05** (MEDIUM del gate review § IV.3)
