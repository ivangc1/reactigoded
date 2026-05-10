# H-01 — Tooltip `FloatingTree` para cascada dismiss

**Fecha**: 2026-05-10
**Estado**: known limitation en RC1, implementar en 1.1+
**Origen**: gate review § IV.2 línea 694

## Contexto

`<Tooltip>` no usa `<FloatingTree>` de `@floating-ui/react`. Sin árbol, en jerarquías anidadas (Tooltip → Popover → Modal), un `Escape` sobre el float más interno cierra **todos** los floats en cascada en lugar de solo el más cercano.

Hoy el roadmap aún no tiene Popover/HoverCard/OptionsMenuContent FUI, pero el escenario nested se materializa cuando lleguen.

## Decisión

**Documentar como known limitation en RC1**. Implementar `FloatingTree` envuelto + `useFloatingNodeId` en Tooltip + futuros componentes en 1.1+ junto con `floating/primitives/` (B-03).

## Por qué NO ahora

- Sin Popover/HoverCard/OptionsMenuContent en RC1, el bug del cascade dismiss es **teórico**. No hay reportes ni casos reales.
- Implementar requiere ~30 LOC + 1 test, pero la decisión arquitectónica correcta es hacerlo en bloque con la capa `floating/primitives/` (B-03) para que TODOS los componentes futuros consuman el mismo árbol.

## Plan 1.1+

1. Construir `floating/primitives/FloatingTreeProvider` que envuelve el árbol de la app.
2. Tooltip pasa a usar `useFloatingParentNodeId()` opcional.
3. Cero impacto consumer-side: API pública del Tooltip (`text`, `placement`, `variant`, `container`) no cambia.
4. Tests específicos de cascade dismiss (Tooltip dentro de Popover dentro de Modal).

## Documentación al consumer (RC1)

Nota en JSDoc del Tooltip: si tu use case incluye nested floats con dismiss en cascada por `Escape`, esperar a 1.1+. **Caso típico no afectado**: Tooltip top-level (un solo float), patrón mayoritario.

## Asociado a

- **B-03** (floating/primitives layer): la implementación efectiva vive ahí.
- **C-02** (Tooltip-en-Modal): no relacionado al cascade dismiss; ese es portal target, ya cerrado en C-02.

## Reapertura

Reabrir si:
- Aparece consumer con use case nested floats reportando el bug.
- Llegan Popover/HoverCard a 1.0.x antes de 1.1+ (entonces el FloatingTree es prerequisite).

## Cierra parcialmente

- **H-01** (HIGH del gate review § IV.2)
