# D4 — Sidebar API (callback rename + SidebarItem a11y + useSidebar JSDoc)

**Fecha**: 2026-05-17
**Estado**: ✅ DONE en beta.24.
**Origen**: gate review § B-06.2 + sesión Bloque 0 sprint D4.

## Decisión

Tres sub-decisiones acopladas:

### D4.1 — Callback rename `onCollapsedChange`

- Prop `collapsed?: boolean` queda. Prop `defaultCollapsed?: boolean` queda.
- Callback `onValueChange?: (collapsed: boolean) => void` →
  `onCollapsedChange?: (collapsed: boolean) => void`.
- Param signature `(collapsed: boolean)` queda.

Coherente con D3 C.2 DS-wide pattern: callback aligned al prop name local.

### D4.2 — `useSidebar` internal definitive + JSDoc rewrite

`useSidebar` está retired del bundle público desde B-04 RC1 (verificado:
`node -e "import('./dist/index.js').then(m => console.log(typeof m.useSidebar))"`
devuelve `undefined`). Pero el JSDoc pre-D4 sugería uso público con
ejemplo `PersistSidebar` (localStorage + router sync). Anti-pattern:
docs mienten sobre status público mientras bundle no lo expone.

Fix:
- JSDoc reescrito articulando explícitamente "Hook **interno**".
- Eliminado `@example PersistSidebar` (sugería uso público).
- Pointer a README sección "Persisting Sidebar state" (a añadir en B1-PR1
  README sweep) con patrón **controlled mode external**: useState +
  guard SSR-safe en localStorage initializer + pasar `collapsed` +
  `onCollapsedChange` al `<Sidebar>`.
- Articula regla DS-wide D11.4: hooks que requieren ancestor lanzan
  (consistent con useMenu, useTabs, useAccordion, useDialog post-D6).

### D4.3 — `SidebarItem` aria-label conditional via `useSidebar()`

ARIA APG anti-pattern detectado pre-D4: `SidebarItem` aplicaba
`aria-label` SIEMPRE que `children` era string, incluso en sidebar
expanded. Eso duplicaba el accessible name (texto visible + aria-label
con mismo valor), violando recomendación "if visible text serves as
accessible name, do not add aria-label".

Real DOM behavior verificado in situ:
- CSS `.ig-sidebar-collapsed .ig-sidebar-text { display: none }` — saca
  el texto del a11y tree completamente en collapsed.
- Sin `aria-label` en collapsed: SidebarItem queda sin nombre accesible
  (icono es `aria-hidden`).
- Sin `aria-label` en expanded: el texto del `<span>` ES el nombre
  accesible. `aria-label` lo duplicaría.

Fix:
- `SidebarItem` añade `"use client"` directiva.
- Consume `useSidebar()` para obtener `collapsed` state.
- `fallbackLabel = ariaLabel ?? (collapsed && typeof children === "string" ? children : undefined)`.
- Override explícito de `aria-label` siempre tiene prioridad.

**Implicaciones**:
- SidebarItem sale de candidatos `@server-safe` D1 P1 (es client).
- SidebarItem REQUIERE estar dentro de `<Sidebar>` (useSidebar throws
  si no hay ancestor). Breaking para uso standalone.

**Tests nuevos en `Sidebar.test.tsx`** cubren 4 escenarios:
- Expanded: aria-label ausente.
- Collapsed: aria-label presente con texto.
- Explicit aria-label prevalece en ambos estados.
- SidebarItem standalone (sin Sidebar) lanza error útil.

## Migration consumer

```diff
- <Sidebar onValueChange={setCollapsed}>...</Sidebar>
+ <Sidebar onCollapsedChange={setCollapsed}>...</Sidebar>
```

Si consumer usaba SidebarItem standalone (raro): debe envolver en
`<Sidebar>`. Si solo quería el estilo `.ig-sidebar-item` sin context,
puede usar la clase CSS directamente sin el componente React.

## Por qué A (collapsed) sobre B (expanded)

Análisis Bloque 0 D4 articuló:
- AntDesign Sider (referente rail-style más usado): `collapsed`/`defaultCollapsed`/`onCollapse`.
- Radix Collapsible (referente disclosure puro): `open`/`defaultOpen`/`onOpenChange`.
  Sidebar reactigoded NO es disclosure — es rail (content cambia a icon-only, no desaparece).
  AntDesign es el referente correcto.
- CSS modifier pattern: `.ig-sidebar-collapsed` aplicada al estado especial.
  `collapsed` prop name matches el modifier name (positive boolean → modifier).
  Cambiar a `expanded` requeriría negación en className construction
  o rename anti-pattern de modifier.
- Default ergonomics: `<Sidebar defaultCollapsed>` es shorthand positivo
  para el override común. `<Sidebar defaultExpanded={false}>` sería
  negación awkward.

## Acoplamientos

- D3 (callback rename C.2) Sidebar es uno de los 4 components.
- D7 (floating namespace) sin impacto Sidebar (no es floating).
- B1-PR1 (README sweep) añade sección "Persisting Sidebar state"
  reemplazando el ejemplo PersistSidebar eliminado del JSDoc.

## Reapertura

Reabrir si:
- AntDesign Sider deja de ser el referente predominante en rail-style
  sidebars de 2026+ (improbable).
- Consumer reporta uso legítimo de `useSidebar()` que no encaja en
  controlled mode external (improbable — el patrón cubre todos los
  casos articulados en gate review).
