# B-03 — `floating/primitives/` layer

**Fecha**: 2026-05-10
**Estado**: ✅ **IMPLEMENTADO en RC1** (re-clasificado de "diferido a 1.1+")
**Origen**: gate review § IV.1 línea 524

## Contexto

`<Tooltip>` (subfamilia `floating/`) importaba directamente de `@floating-ui/react`: `FloatingPortal`, `useFloating`, `useHover`, `useFocus`, `useDismiss`, `useInteractions`, `autoUpdate`, `flip`, `offset`, `shift`. **No usaba `FloatingTree` ni `useFloatingNodeId`**.

Roadmap post-RC1: `Popover`, `HoverCard`, `OptionsMenuContent` (FUI), `Submenu`, `MentionMenu`, `SlashCommand`. Todos floating con anidamiento. Sin primitive base compartido, cada componente futuro duplica setup.

## Decisión final (2026-05-10)

**Implementar pre-RC1**. Construido en `src/components/floating/primitives/`:

- `FloatingTreeRoot` — wrapper opt-in que habilita cascade dismiss.
- `useFloatingNode` — hook compartido que registra cualquier float del DS en el árbol activo (devuelve `{ nodeId, parentId }`).

Implementación deliberadamente **minimal**: solo lo que `Tooltip` (refactor RC1) y `Dropdown` FUI (PR siguiente, C-03) consumen. El "FloatingPrimitive base" más ambicioso del plan original se difiere a 1.1+ si aparecen 3+ consumidores con boilerplate duplicado real.

## Por qué adelantarlo (cambio respecto al plan inicial)

Iván decidió 2026-05-10 ejecutar pre-RC1 todos los deferrals factibles. El argumento pivote: B-03 es la base de C-03 (Dropdown FUI nuevo) y H-01/D-01/M-05 (Tooltip Slot pattern). Empaquetar los cinco en un bundle (PR único + PR Dropdown FUI dependiente) tiene mejor ROI que construirlos disgregados en 1.1+.

Coste real: ~1 día. La idea original ("primitive con todo el patrón") cargaba un componente FloatingPrimitive base que no aporta sin Popover/HoverCard. Recortado a `FloatingTreeRoot` + `useFloatingNode`, el primitive es 50 LOC y suficiente para los consumidores RC1.

## Implementación efectiva

```
src/components/floating/primitives/
├── FloatingTreeRoot.tsx    — opt-in <FloatingTree> wrapper
├── useFloatingNode.ts       — useFloatingNodeId + useFloatingParentNodeId
└── index.ts
```

Consumidores actuales:
- `Tooltip`: refactor RC1 (D-01/M-05 Slot pattern + H-01 cascade dismiss).
- `Dropdown` FUI nuevo: PR siguiente (C-03).

## Asociado a

- **H-01** (Tooltip FloatingTree): ✅ implementado RC1 vía `useFloatingNode` + `<FloatingNode>` en Tooltip.
- **M-05** (Tooltip wrap span): ✅ Slot pattern eliminó el `<span class="ig-tooltip-wrapper">`.
- **D-01** (Tooltip Slot refactor): ✅ cerrado RC1.
- **C-03** (Dropdown FUI): ⚠️ PR dependiente — requiere este primitive como base.

## Cierra

- **B-03** (BLOCKER del gate review § IV.1): ✅ implementado pre-RC1.
