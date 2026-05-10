# FREEZE-CHECK — 1.0.0-rc.1

**Fecha**: 2026-05-10
**Origen**: gate review § V (`docs/RC1_GATE_REVIEW.md` líneas 1299-1331)
**Propósito**: revisión consciente de las 18 freeze decisions + 2 bonus que el reviewer marca como **API surface inmutable post-RC1**.

## Cómo leer este doc

Cada ítem tiene 4 columnas:

- **Estado actual**: qué hay en el código hoy (verificación literal contra `src/`).
- **Bloqueado por**: si depende de otra task pending del backlog.
- **Confirmación**: una de:
  - ✅ **Confirmado** — listo para freeze RC1, código verificado.
  - ⏸ **Bloqueado** — no se puede confirmar hasta cerrar otra task.
  - ⚠ **Requiere input** — decisión pendiente del usuario.
- **Notas**: contexto, link a decision doc, o pregunta abierta.

Iván firma cada ítem en la columna "Iván confirma" tras revisar el estado.

---

## Matriz de los 18 + 2

### 1. Naming de los 32 componentes raíz

| | |
|---|---|
| **Estado actual** | 32 directorios en `src/components/` (`Accordion`, `Alert`, ..., `Toast`, `floating/Tooltip`). Listado verificado. |
| **Bloqueado por** | **B-01** (pending): "Renombrar Dropdown/Select para evitar colisión con roadmap floating/" |
| **Confirmación** | ⏸ **Bloqueado** |
| **Notas** | Si B-01 decide renombrar `Dropdown` → `MenuList` (o similar) y `Select` → `SelectField`, los nombres cambian. Confirmar tras cerrar B-01. |

### 2. Naming de los 42 compound children y wrappers públicos

| | |
|---|---|
| **Estado actual** | Sub-componentes documentados: `AccordionItem/Header/Content`, `CardBody/Header/Footer/Image/Divider`, `ModalHeader/Body/Footer/Close`, `Tab/TabList/TabPanel`, `TabsContent`, `Sidebar*` (7), `Navbar*` (5), `Table*` (7), `BreadcrumbItem`, `AvatarGroup`, `IconButton`, `InputAddon/InputGroup`, `ErrorText/Helper/Label`, `Skeleton/SkeletonContainer`, `Step/Stepper`, `TimelineItem`, `ToastProvider`, `Dropdown*` (5). |
| **Bloqueado por** | Parcialmente B-01 si afecta naming Dropdown/Select compound. |
| **Confirmación** | ⚠ **Requiere input** |
| **Notas** | El recuento exacto del review (42) no coincide 1:1 con mi inventario. Iván debería verificar el listado completo en `src/components/index.ts` + sub-barrels. Sin re-naming pendiente, el set actual es freezable. |

### 3. Set de hooks públicos

| | |
|---|---|
| **Estado actual** | Barrel root `src/index.ts` exporta: `useTheme`, `useControllableState`, `cn`. Sub-barrels exportan `useAccordion`, `useAccordionItem`, `useDropdown`, `useSidebar`, `useTabs`, `useToast` + sus 6 ContextValues paired. |
| **Bloqueado por** | **B-04** (pending): "Resolver inconsistencia hooks públicos (README vs src/index.ts vs dist)". C-04 cerrado como dup de B-04. |
| **Confirmación** | ⏸ **Bloqueado** |
| **Notas** | Tras B-04 el set queda definido. Probable resolución: solo `useTheme` + `useControllableState` + `cn` permanecen públicos; los `useFoo` se retiran de los barrels. Ver `docs/decisions/L-10-no-bundle-types.md` § Coupling con C-04. |

### 4. Naming de callbacks de cambio de estado

| | |
|---|---|
| **Estado actual** | Mezcla actual: `onChange`, `onValueChange`, `onCheckedChange`, `onActiveChange`, etc. |
| **Bloqueado por** | **B-02** (pending): "Estandarizar callbacks de cambio de estado a `onValueChange<T>`" |
| **Confirmación** | ⏸ **Bloqueado** |
| **Notas** | Si B-02 estandariza a `onValueChange<T>`, naming cambia en TODA la API pública. Confirmar tras cerrar B-02. |

### 5. Firma del prop controlled por componente

| | |
|---|---|
| **Estado actual** | Patrón consistente: `value` (controlled) + `defaultValue` (uncontrolled) + `onChange`/`onValueChange` (callback). |
| **Bloqueado por** | Parcialmente B-02 (si renombra el callback, afecta la firma). |
| **Confirmación** | ⚠ **Requiere input** |
| **Notas** | El patrón existe pero hay inconsistencias menores (Stepper presentational con `active` requerido, ThemeSwitch con `theme`/`onThemeChange`). Iván decide si se acepta tal cual o se uniforma post-B-02. |

### 6. Discriminated union de `useControllableState`

| | |
|---|---|
| **Estado actual** | `UseControllableStateInternalOptions<T>` ⨯ `UseControllableStateDerivedOptions<T>` con `derive?: never` / `defaultValue?: never`. Verificado en `src/hooks/useControllableState.ts:96-98`. |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | Discriminated union sólida con `never` enforcing. C-07 ya añadió Symbol-keyed escape hatch sin tocar la unión. |

### 7. 8 entrypoints CSS

| | |
|---|---|
| **Estado actual** | `package.json#exports` tiene 9 subpaths CSS: `tokens.css`, `base.css`, `components.css`, `design.css`, `fonts.css`, `reset.css`, `state.css`, `all.css`, + wildcard `./styles/state/*.css`. Los 8 + wildcard. |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | El review cuenta el wildcard como bonus (item bonus 1). Los 8 directos están firmes. |

### 8. Naming de las clases CSS públicas (~250 en CSSAPI.mdx)

| | |
|---|---|
| **Estado actual** | `docs/CSSAPI.mdx` existe (877 líneas). Inventario: 250 clases aproximadas. |
| **Bloqueado por** | — |
| **Confirmación** | ⚠ **Requiere input** |
| **Notas** | El inventario es grande para validar uno a uno. Recomendación: confirmar el contrato CSSAPI.mdx como **freeze incondicional** (las clases están allí, son visibles, RC1 = inmutables). Si Iván detecta typos puntuales, fix antes de RC1; si no, freeze tal cual. |

### 9. Set de tokens `--ig-*` documentados como públicos

| | |
|---|---|
| **Estado actual** | `src/styles/igoded-tokens.css` define el set completo. Los expuestos como API pública están listados en `docs/DesignTokens.mdx`. |
| **Bloqueado por** | — |
| **Confirmación** | ⚠ **Requiere input** |
| **Notas** | Como item 8: confirmar el contrato `DesignTokens.mdx` como freeze. Cualquier token no documentado allí se considera privado. |

### 10. Tooltip API completa

| | |
|---|---|
| **Estado actual** | `TooltipProps`: `text` (string \| ReactNode post-C-01), `placement`, `variant`, `children` (ReactElement), `openDelay`, `closeDelay`, `container`, `ref`. JSDoc completo. |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | C-01 y C-02 ya cerrados. API estable post-fixes. |

### 11. Modal API

| | |
|---|---|
| **Estado actual** | `ModalProps`: `open`, `onClose`, `size`, `backdrop`, `closeOnBackdrop`, `closeOnEsc`, `loading`, `ref`. + sub-componentes `ModalHeader/Body/Footer/Close`. |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | API completa documentada. C-02 (Tooltip-en-Modal) deja la integración como manual con trigger documentado. |

### 12. Política `"use client"` global en barrel (H-09)

| | |
|---|---|
| **Estado actual** | `src/index.ts:1` tiene `"use client";`. Banner global aplicado a todo el bundle (`vite.lib.config.ts:142`). |
| **Bloqueado por** | **H-09** (pending): "use client" granular en lugar de global |
| **Confirmación** | ⏸ **Bloqueado** |
| **Notas** | Si H-09 decide granular (per-component file), cambia el patrón. Si H-09 decide mantener global, freeze. |

### 13. Peer-dep ranges (H-06)

| | |
|---|---|
| **Estado actual** | `package.json#peerDependencies`: `@floating-ui/react ^0.27.0`, `react >=19.0.0`, `react-dom >=19.0.0`. |
| **Bloqueado por** | — (H-06 ya cerrado) |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | H-06 cerró el rango de `@floating-ui/react` a `^0.27.0`. React 19+ asumido. |

### 14. Patrón compound vs prop-based para floating futuro

| | |
|---|---|
| **Estado actual** | Patrón actual del DS: **compound** (`<Modal><ModalHeader/></Modal>`, `<Tabs><Tab/></Tabs>`). Tooltip es **prop-based** (`<Tooltip text="...">child</Tooltip>`) por su naturaleza wrapper. |
| **Bloqueado por** | — |
| **Confirmación** | ⚠ **Requiere input** |
| **Notas** | Para futuros `Popover`/`HoverCard`/`Combobox` (1.1.0+), ¿se mantiene compound? El review pide explicitar el commitment. Recomendación: **compound** para todos excepto wrappers de descripción simple (Tooltip estilo). |

### 15. Skeleton ARIA pattern post-beta.22

| | |
|---|---|
| **Estado actual** | `Skeleton` (decorativo, `aria-hidden`) + `SkeletonContainer` (a11y wrapper con `role="status"`). Patrón split de beta.22. |
| **Bloqueado por** | **M-02** (pending): "Soak Skeleton ARIA breaking change beta.22" |
| **Confirmación** | ⏸ **Bloqueado** |
| **Notas** | M-02 evalúa si el split aguanta uso real. Si feedback del soak revela problemas, el patrón puede revertirse. Confirmar tras M-02. |

### 16. Bundle layout monolítico (`dist/index.js` único)

| | |
|---|---|
| **Estado actual** | `dist/index.js` (ESM) + `dist/index.cjs` (CommonJS). Sin sub-bundles per-component. |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | Decisión consciente: 1 entry point + tree-shaking del consumer (verificado L-10). Si el roadmap necesita per-component imports, requeriría 2.0. |

### 17. CSSAPI.mdx como contrato CSS público formal

| | |
|---|---|
| **Estado actual** | `docs/CSSAPI.mdx` (877 líneas). Existente y referenciado desde Storybook. |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | El doc es el contrato. Cualquier clase no listada allí se considera implementación privada. |

### 18. CI gate `[reactigoded]` no en bundle

| | |
|---|---|
| **Estado actual** | `.github/workflows/verify.yml:77-78`: `test "$(grep -cF '[reactigoded]' dist/index.js \|\| true)" = "0"` (mismo para `.cjs`). |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | Guardrail CI activo. Si un nuevo `console.warn` con prefijo `[reactigoded]` se cuela al bundle prod, CI falla. Higiene asegurada. |

---

## Bonus

### Bonus 1 — Wildcard subpath `./styles/state/*.css` firma 28 fragmentos

| | |
|---|---|
| **Estado actual** | `src/styles/state/` tiene 28 archivos `.css`. Subpath wildcard en `package.json#exports`: `"./styles/state/*.css": "./dist/styles/state/*.css"`. |
| **Bloqueado por** | — |
| **Confirmación** | ✅ **Confirmable** |
| **Notas** | Cada archivo es un opt-in del consumer (`reactigoded/styles/state/hover.css`). 28 fragmentos firmados como API. |

### Bonus 2 — Flujo SSR `useSyncExternalStore` con `serverSnapshot=false`

| | |
|---|---|
| **Estado actual** | `ToastProvider` usa el patrón. El resto de componentes con portales NO lo replica explícitamente. |
| **Bloqueado por** | — |
| **Confirmación** | ⚠ **Requiere input** |
| **Notas** | El review apunta riesgo de hydration mismatches si futuros componentes con portales no siguen el patrón. Decisión: ¿documentar el patrón como obligatorio para todo nuevo componente con portal? Recomendación: añadir nota a `docs/POST_RC1_BACKLOG.md` con el patrón canónico para que sirva de checklist al añadir nuevos floating components. |

---

## Resumen

| Estado | Count | Items |
|---|---:|---|
| ✅ **Confirmable hoy** | 9 | 6, 7, 10, 11, 13, 16, 17, 18, bonus 1 |
| ⏸ **Bloqueado por task pending** | 5 | 1 (B-01), 3 (B-04), 4 (B-02), 12 (H-09), 15 (M-02) |
| ⚠ **Requiere input de Iván** | 6 | 2, 5, 8, 9, 14, bonus 2 |

## Plan de cierre

1. **Iván firma los 9 ✅** (sin cambio de código necesario, solo confirmación explícita).
2. **Iván responde los 6 ⚠** (input requerido sobre naming compound, contrato CSS, tokens, patrón compound futuro, SSR pattern).
3. **Los 5 ⏸ se cierran progresivamente** al cerrar las tasks bloqueantes (B-01, B-02, B-04, H-09, M-02). Cuando cada task se mergee, este doc se actualiza con el estado final.
4. Cuando los 20 estén ✅, el FREEZE-CHECK queda completo y RC1 puede tagearse.

## Próxima revisión

- **Cada vez que se cierre B-01, B-02, B-04, H-09, M-02**: actualizar este doc.
- **Antes de tag `1.0.0-rc.1`**: revisar matriz completa.
- **Post-RC1**: este doc es histórico, no se modifica.
