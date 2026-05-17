# D7 — `floating/` namespace reorganization (Menu file move + barrel agrupado + `useFloatingNode` internal)

**Fecha**: 2026-05-17
**Estado**: ✅ DONE en beta.24 (B1-PR3).
**Origen**: gate review § H-04 + sesión Bloque 0 sprint D7 (8 sub-decisiones).

## Sub-decisiones implementadas

### D7.1 — File path: Menu → `floating/Menu/`

`src/components/Menu/` movido a `src/components/floating/Menu/` para
coherencia con el namespace `floating/` (que ya contenía `primitives/`
+ `Tooltip/`). Post-D2 (B1-PR3 simultáneo) Menu cualifica como FUI
primitive completo — pertenece al namespace.

Migration:
- Internal imports relativos `./MenuContext`, etc. siguen válidos
  (intra-directory).
- Internal cross-component imports `@/components/Menu/...` actualizados
  a `@/components/floating/Menu/...`.
- Public API root barrel `reactigoded` sin cambio — el símbolo `Menu`
  se sigue exportando idéntico al consumer.

### D7.4 — `useFloatingNode` retirado del wildcard

JSDoc declaraba `@example interno` pero `floating/primitives/index.ts`
hacía `export { useFloatingNode } from "./useFloatingNode"` que vía la
cadena `src/components/index.ts → ./floating → ./primitives` exponía
el hook al bundle root.

Anti-pattern paralelo a D4 (useSidebar JSDoc-vs-bundle mismatch) y D1
(banner `"use client"` source-vs-build). Fix mecánico: eliminar del
re-export. Internal consumers (Menu post-D2, Tooltip) ya importan via
path directo `@/components/floating/primitives/useFloatingNode`.

Solo `FloatingTreeRoot` queda público desde primitives.

### D7.5 — `floating/index.ts` agrupado

Creado `src/components/floating/index.ts`:

```ts
export * from "./primitives";
export * from "./Tooltip";
export * from "./Menu";
```

`src/components/index.ts` se colapsa de 3 wildcards floating sueltos
(línea 18 `./Menu` + línea 39 `./floating/primitives` + línea 40
`./floating/Tooltip`) a un único `export * from "./floating"`. Más
legible + control en un solo sitio.

### D7.6 — `floating/README.md` documentado

Creado `src/components/floating/README.md` documentando:
- Criterio mecánico de pertenencia ("consume primitives/" via grep
  testeable).
- Members actuales (FloatingTreeRoot, Tooltip, Menu post-D2).
- Política futuros (Popover, HoverCard, ContextMenu, Combobox van aquí;
  Drawer, BottomSheet van flat por usar `<dialog>` nativo).
- Internal helpers no re-exportados.
- Estructura de archivos visual.

### D7.7 — Acoplamiento con D1 P1 server-safe list

Post-D7.1 move, `RSC_SERVER_SAFE_COMPONENTS.md` (gestionado en D1 P1)
necesita paths actualizados: `src/components/Menu/MenuSeparator.tsx` →
`src/components/floating/Menu/MenuSeparator.tsx`, etc. Mecánico.

Asignado a B1 D1 P1 implementation task (#120). Cuando se materialice
el server-safe marker suite, regenerar lista con nuevos paths.

### D7.8 — `NavbarMenuButton` confirmado flat

Verificado in situ: `NavbarMenuButton` es button con visibility
responsive via CSS, NO consume primitives. Queda en `src/components/Navbar/`.
Confirmación, no decisión.

### Sub-decisiones D7.2 (NativeSelect) + D7.3 (criterio mecánico)

- D7.2: NativeSelect sin cambio (post-#41 ya correcto, no relacionado
  con floating/).
- D7.3: criterio MECÁNICO "consume primitives/" articulado en
  `floating/README.md`. NO inferencial ("usa FUI") porque el wrapper
  reactigoded de FUI es lo que define el namespace, no FUI raw.

## Colapso colaterales

- **D7 colapsa H-04 audit** (Menu rename collision): no hay colisión
  porque Menu **ES** el primitive canónico floating/menu/.
- **D7.4 cierra D11 sub-decisión** sobre `useFloatingNode` disposition:
  internal definitivo confirmado, no más ambigüedad.

## Acoplamientos

- **D2 (Menu Full FUI portal)**: simultáneo con D7 en B1-PR3.
- **D1 P1**: lista server-safe necesita paths actualizados.
- **C-03 status DONE**: doc actualizado tras D2+D7.
- **B-04 audit BLOCKER**: cerrado por D2+D7.

## Reapertura

Reabrir si:
- Algún consumer en main accidentalmente importaba `useFloatingNode`
  desde `"reactigoded"` y reporta breakage. Mitigación: el JSDoc del
  hook ya marcaba @example interno — uso era unintended.
- Si el namespace `floating/` crece a >10 components, considerar
  sub-namespaces (`floating/overlays/`, `floating/popovers/`, etc.).
- Si un component nuevo no encaja claramente en flat ni en `floating/`
  por el criterio mecánico — revisitar la regla.
