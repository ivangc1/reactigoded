# `floating/` — components con Floating UI primitives

Namespace agrupado para components del DS que consumen
`@floating-ui/react` (FUI) — positioning automático con collision
detection (flip + shift + offset), portal escape, focus management, y
cascade dismiss via FloatingTree.

## Criterio mecánico de pertenencia

Un component pertenece a `floating/` si **consume
`@/components/floating/primitives/`** (al menos uno de los símbolos
exportados desde ese path interno o via subpath directo). Testeable via
grep:

```bash
grep -rln "@/components/floating/primitives" src/components/ \
  | xargs dirname | sort -u
```

NO inferencial ("usa Floating UI"). El criterio observable es
mecánico: el component importa del primitive layer del DS.

## Members actuales (beta.24)

| Component | Path | Razón |
|---|---|---|
| `FloatingTreeRoot` | `floating/primitives/` | Provider opt-in para cascade dismiss cross-componente. |
| `Tooltip` | `floating/Tooltip/` | useFloating + FloatingPortal + middleware. |
| `Menu` (+ MenuTrigger / MenuContent / MenuItem / MenuSeparator / MenuLabel) | `floating/Menu/` | Post-D2 (beta.24) full FUI primitive: portal real + floatingStyles + flip/shift. |

## Política para futuros components

Componentes del roadmap que **van aquí** porque usarán FUI primitives:
- `Popover` (1.1.0): FloatingPortal + click trigger + arrow.
- `HoverCard` (1.1.0): FloatingPortal + hover trigger + delay.
- `ContextMenu` (1.1.0): FloatingPortal + right-click trigger + cascade Submenu.
- `Submenu` / `MenuBar` (1.1.0): FloatingTree para cascade dismiss anidado.
- `Combobox` / `floating/Select` (1.1.0+): FloatingPortal + list nav + typeahead.
- `DatePicker` / `TimePicker` / `ColorPicker` (1.x+): FloatingPortal + custom UI.

Componentes que **NO van aquí** aunque sean overlays:
- `Dialog` (post-D6 beta.24): usa `<dialog>` HTML nativo (top-layer
  browser) + showModal. NO consume FUI primitives.
- `AlertDialog` (post-D8): mismo `<dialog>` HTML nativo + role override.
- `Drawer` / `BottomSheet` (1.x+): probable `<dialog>` HTML nativo o
  custom portal sin FUI middleware (positioning fijo, no collision).
- `Toast` / `ToastProvider`: portal custom + fixed position por
  variant. No collision detection.

## Internal helpers no re-exportados

`useFloatingNode` (consumed por Menu + Tooltip) NO está re-exportado
desde `primitives/index.ts` (D7.4 RC1 gate review beta.24). Internal
consumers importan via path directo:

```ts
import { useFloatingNode } from "@/components/floating/primitives/useFloatingNode";
```

Regla DS-wide D11.4 aplicada: hooks con requirement de ancestor son
internal. Solo `FloatingTreeRoot` queda público desde primitives.

## Estructura archivos

```
src/components/floating/
├── README.md              ← este documento
├── index.ts               ← barrel agrupado (export * from primitives + Tooltip + Menu)
├── primitives/
│   ├── index.ts           ← export FloatingTreeRoot only (useFloatingNode internal post-D7.4)
│   ├── FloatingTreeRoot.tsx
│   └── useFloatingNode.ts ← internal, import via path directo
├── Tooltip/
│   ├── index.ts
│   ├── Tooltip.tsx
│   └── Tooltip.{test,stories}.tsx
└── Menu/                  ← post-D7.1 move desde src/components/Menu/
    ├── index.ts
    ├── Menu.tsx
    ├── MenuContent.tsx (post-D2 FloatingPortal + floatingStyles + data-attrs)
    ├── MenuTrigger.tsx
    ├── MenuItem.tsx
    ├── MenuSeparator.tsx
    ├── MenuLabel.tsx
    ├── MenuContext.ts     ← internal (useMenu hook lanza si fuera de Menu)
    ├── menuSelectors.ts
    └── Menu.{test,stories}.tsx
```

## Referencias

- D2 decision doc: `docs/decisions/D2-menu-portal.md`.
- D7 decision doc: `docs/decisions/D7-floating-namespace.md`.
- C-03 status (post-D2 DONE): `docs/decisions/C-03-dropdown-hand-rolled-defer.md`.
