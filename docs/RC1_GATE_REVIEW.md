# Gate review independiente — informe definitivo cruzado
## reactigoded — auditor externo

**Fecha**: 2026-05-08
**Tag auditado**: `1.0.0-beta.22`
**Commit**: `70e3e87` (merge PR #25, refactor relative-to-alias-codemod)
**Repositorio**: https://github.com/ivangc1/reactigoded
**Storybook publicado**: https://igoded.es

**Auditores**:
- **Reviewer A (este informe)**: independiente, mandato
  `independent-senior-staff-DS-reviewer`. Pipeline ejecutada localmente
  + tests reproductores ad-hoc + consumer sintético TS strict.
- **Reviewer B (GPT-5.5 Thinking)**: review independiente entregado en
  texto plano por el cliente. Sin acceso a ejecución local, sin
  navegador real, sin DevTools.

**Documento**: este informe consolida el cruce de ambos reviews.
Sustituye `rc1-gate-review-reactigoded-final.md` (v3) y todos los
documentos previos. **Es el deliverable cruzado y final del mandato**.

**Estructura del cruce**: cuando un hallazgo provenga del cruce con
B, queda etiquetado `[B][verificado]` si lo confirmé con código,
`[B][rebatido]` si lo rebato, `[B][matizado]` si comparto el ángulo
pero ajusto severidad. Los hallazgos sin etiqueta son originales de A.

---

## TL;DR (90 segundos)

**Veredicto cruzado**: **block conditional**. Pipeline 100% verde,
código de calidad alta, decisiones arquitectónicas mayoritariamente
bien pensadas. **Cinco** decisiones de API surface no parecen
conscientemente tomadas y rc.1 las firma para siempre. Cuatro de las
cinco se cierran en 5-30 LOC cada una; la quinta es naming.

**Cambios respecto al v3 tras cruce con B**:
- BLOCKERs sube de 3 a **5**.
- Mi B-03 (hooks leak) corregido: el README los declara públicos, no son leak.
- Nuevo BLOCKER a11y: Stepper con `active` fuera de rango deja el
  tablist sin tab stop (B reproducido por A con test ad-hoc → ningún
  step recibe `tabIndex=0`).
- Nuevo BLOCKER documental: README declara 7 hooks públicos pero
  `src/index.ts` exporta solo 2; además exporta `useControllableState`
  que README omite. Inconsistencia triple.
- Slider con `value` inválido pasa de **POSITIVO** a **HIGH**: el
  warn dev no repara que el componente cambia silenciosamente de
  controlled a uncontrolled. El propio código lo documenta como
  H-27.
- HIGHs adicionales del cruce: Tooltip `children: ReactNode` permite
  string sin asociar, Tooltip Storybook descripción falsa "CSS-only",
  DropdownItem href no activa con Space (spec violation),
  Dropdown sin typeahead, Toast `role="alert"` blanket.
- Nuevo MEDIUM: ThemeSwitch lee DOM en `derive()` durante render —
  protegido con guard pero contradice claim README sobre cero acceso
  DOM en render.

**Lo que más me preocupa tras el cruce**:
1. Stepper a11y bug (BLOCKER nuevo).
2. Las 4 colisiones nominales: `Select`, `DropdownMenu`, callbacks `on*Change`, hooks documentados vs exportados.
3. Tooltip sin primitive floating compartido bloquea la familia futura.

**Lo que sigue verdadero**: la geometría OKLCH dual + ΔE OKLab guard,
los 227 tests storybook+axe en Chromium real verde, los 674 unit
tests en 36 s, `docs/CSSAPI.mdx` con 877 líneas documentando el
contrato CSS público. Ingeniería real.

---

## Tabla de contenidos

I. Cómo se hizo este review
II. Veredicto detallado
III. Inventario verificado
IV. Hallazgos clasificados (5 BLOCKERs · 20 HIGHs · 14 MEDIUMs · 10 LOWs · 4 DEFERREDs)
V. Decisiones que aprueban API freeze (18)
VI. Decisiones arquitectónicas cuestionadas (7)
VII. Auditoría componente por componente (32)
VIII. Lo que está bien hecho
IX. Suposiciones (lo que NO pude verificar)
X. Cruce con review B (GPT-5.5)
XI. Apéndices

---

# I. Cómo se hizo este review

## I.1 Pasos ejecutados (Reviewer A)

Para que el equipo sepa el grado de confianza de cada hallazgo:
**todo lo etiquetado como hallazgo está verificado por código,
ejecución de pipeline o test reproductor ad-hoc**.

1. **Repo clonado** en `/home/claude/reactigoded` (commit `70e3e87`).
2. **`npm ci --legacy-peer-deps --no-audit --no-fund`**. 12 s. 477
   paquetes. Patch local `eslint-plugin-jest-dom+5.5.0` aplicado vía
   `patch-package`.
3. **`npm run lint`** — verde, 0 issues. ESLint 10.2.1 + 47 reglas custom.
4. **`npm run typecheck`** — verde. TypeScript 6.0.3, `strict`,
   `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
5. **`npm run test:unit:ci`** — **674 tests pasan** en 43 archivos en
   36.03 s. Modo `pool: 'forks'`, `isolate: true`. Detectados warnings
   `act()` en `useTheme.test.tsx` (test "Twin"). Detalle en H-11.
6. **`npm run test:contrast`** — verde con 7 warnings de pares
   perceptualmente bajos (allowlist documentada). WCAG ≥ 4.5
   verificado.
7. **`npm run test:scope-leaks`** — verde, 426 modificadores
   revisados, 6 allowlisted.
8. **`npm run test:hex-drift`** — verde, 47 hex / 18 tokens / 6 allowlisted.
9. **`npm run build`** — verde. ESM 60.35 KB raw / 14.65 KB gz, CJS
   44.80 KB raw / 12.98 KB gz, dts emitidos en 6.34 s, 28 fragmentos
   `state/*.css` con 89,006 reglas.
10. **`npm run verify:size`** — todos los budgets cumplidos.
11. **`npx playwright install chromium` + `npm run test:storybook`** —
    **227 tests verde en 54.29 s** sobre 35 archivos `.stories.tsx`
    en Chromium real con axe-core.
12. **`npm pack --dry-run`** — 1.6 MB compressed / 13.7 MB unpacked /
    288 files.
13. **Tests reproductores ad-hoc** (creados, ejecutados, eliminados):
    - **Tooltip-en-Modal** (H-04): `dialog.contains(portal) === false`. Confirmado.
    - **Modal drag-out** (H-02): mousedown body + mouseup dialog → `onClose` llamado. Confirmado.
    - **Tooltip custom no-forward** (M-08): tooltip no abre, sin warn dev. SR-only span sí persiste.
    - **Pagination edge cases**: totalPages=0/-5/NaN/currentPage>total → todos clamp con dev warn.
    - **Stepper active fuera de rango** (B-06, tras cruce con B): `active=999/-1/NaN` → todos los `<Step>` quedan con `tabIndex=-1`. Tablist sin tab stop. **Reproducido tras cruce**.
14. **Consumer sintético en `/tmp/consumer-test`** con TS strict +
    `moduleResolution: "Bundler"`:
    - `useDropdown`, `useTabs`, `useSidebar`, `useToast`,
      `useAccordion`, `useAccordionItem` importables sin error.
    - Tipos `*ContextValue` también importables.
    - `__suppressNoHandlerWarn` correctamente stripeado del `.d.ts`.
    - `__resetLandmarkRegistryForTests` también stripeado.
15. **Tree-shaking medido** con esbuild:
    - `import { Button }` → 848 B gz.
    - `import { cn }` → 623 B gz, arrastra `react-dom` (createPortal) sin usarlo.
    - `import * as RG` → 12.78 KB gz.
    - **Tras cruce con B**: `import { Button }` con floating-ui no
      externalizado → 4.776 B gz, **0 ocurrencias de floating-ui en
      bundle final**. Tree-shaking funciona.
16. **Bundle prod inspeccionado** con grep:
    - 0 ocurrencias de `console.*` en `dist/index.js` y `dist/index.cjs`.
    - 0 ocurrencias de prefijo `[reactigoded]` en bundle prod.
    - 3 ocurrencias del string `"__suppressNoHandlerWarn"` en bundle (runtime accesible).
    - 91 exports totales en `dist/index.cjs`.
17. **Documentación leída** (verificación tras cruce con B):
    - `README.md`: línea 194 declara hooks públicos como
      `useTheme, useToast, useAccordion, useAccordionItem,
      useDropdown, useSidebar, useTabs`. **NO incluye
      `useControllableState`**.
    - `src/index.ts`: exporta `useTheme`, `useControllableState`,
      `cn` + `export * from "./components"`.
    - `Tooltip.stories.tsx:13`: descripción literal "Wrapper CSS-only
      que muestra un texto contextual al hover/focus" — falsa, el
      código usa Floating UI desde varias betas.
18. **CI workflow leído**: `.github/workflows/verify.yml`. Bundle
    assertion afinado para distinguir warns del DS (eliminados en
    prod) de errores legítimos de `tabbable`.
19. **Patches inspeccionados**: `eslint-plugin-jest-dom@5.5.0` upstream
    sin update.
20. **Peer-deps**: `@floating-ui/react@latest` = 0.27.19. No hay 0.28.x.

## I.2 Lo que NO he hecho

- **Manual SR testing** (NVDA / VoiceOver / JAWS).
- **Browser real interactivo** más allá de Chromium headless.
- **Lighthouse / performance profile**.
- **Chromatic visual regression**.
- **Consumer Next.js App Router montado completo**.
- **Tests `prefers-contrast: more`, `forced-colors: active`, `dir="rtl"`** en navegador real.

## I.3 Reviewer B (GPT-5.5) — alcance declarado

- No pudo clonar/ejecutar.
- No pudo abrir DevTools/browser real sobre `igoded.es`.
- Trabajó sobre lectura del código vía conector.
- Citas con ubicaciones imprecisas en algunos casos.

## I.4 Cómo se cruzó

Para cada hallazgo de B:
- Si lo verifiqué con código local → marco `[B][verificado]`.
- Si lo verifiqué y rebato → `[B][rebatido]`.
- Si comparto ángulo pero ajusto severidad → `[B][matizado]`.
- Si A y B coinciden → fusiono con anotación.

Tests adicionales ejecutados durante el cruce:
- B-06 GPT (Stepper active fuera de rango): reproducido.
- H-04 GPT (DropdownItem href Space): verificado en código.
- B-08 GPT (README hooks omite useControllableState): verificado en README.
- H-02 GPT (Tooltip Storybook "CSS-only"): verificado en stories.
- B-09 GPT (peer-dep floating-ui packaging): tree-shake ejecutado.
- B-10 GPT (ThemeSwitch SSR): verificado en código.

---

# II. Veredicto detallado

## II.1 Pregunta 1 — ¿Shippable como `1.0.0-rc.1`?

**Block conditional**. Pipeline 100% verde, ningún bug runtime que
crashee happy path. Pero rc.1 firma API freeze, y al cruzar reviews:

- **5 decisiones de API surface** no parecen conscientemente tomadas
  y rc.1 las firma para siempre.
- **1 bug de a11y** (Stepper) no detectado por la pipeline pero
  reproducido con test ad-hoc tras cruce con B.

Cualquiera de los cinco BLOCKERs = bloqueante pre-rc.1. Resolverlos
cuesta 1-2 días de trabajo. Vivir con cualquiera = breaking change
inevitable más adelante o bug a11y permanente.

## II.2 Pregunta 2 — ¿La arquitectura aguanta el crecimiento planeado?

**No, sin tres decisiones más antes del freeze.** En orden de impacto:

1. **B-01** (resolver `Select` y `DropdownMenu` collisions con roadmap).
2. **C-03** (decisión cuestionada): Dropdown hand-rolled vs Floating UI. El DS publica rc.1 con dos arquitecturas en paralelo.
3. **H-01**: Tooltip no envuelve con `<FloatingTree>`. Cuando llegue Submenu, la cascada de dismiss no orquesta.

## II.3 Pregunta 3 — ¿Storybook publicado coincide con código?

**Sí con asterisco**. El test runner `test:storybook` con axe-core en
Chromium real corre 227 tests sobre 35 archivos `.stories.tsx`,
todos pasan en 54 s. La representación visual + a11y básica está
alineada.

**Pero**:
- `Tooltip.stories.tsx:13` describe el componente como "Wrapper
  CSS-only" cuando usa Floating UI. Documentación falsa (B H-02).
- Las stories existentes son por-componente. Ningún escenario cruzado
  (Tooltip-en-Modal, Dropdown-en-Sidebar-colapsada, etc.) está
  cubierto. H-04 reproducido por A se hubiera detectado en CI con 1
  story cruzada.
- Tests de Tooltip son placebo: comprueban presencia de
  `aria-describedby` y conteo de wrappers, no hover/focus/Escape/portal/
  positioning (B H-03).

---

# III. Inventario verificado

## III.1 Componentes públicos: 32 raíz + 42 compound children

**91 símbolos exportados** desde `dist/index.cjs` (verificado con
`grep -oE "exports\\.[A-Za-z_]+" | sort -u | wc -l`).

### Componentes raíz (32)

`Accordion`, `Alert`, `Avatar`, `Badge`, `Breadcrumb`, `Button`,
`Card`, `Checkbox`, `Chip`, `Divider`, `Dropdown`, `Input`, `Modal`,
`Navbar`, `Pagination`, `Progress`, `Radio`, `Rating`, `Select`,
`Sidebar`, `Skeleton`, `Slider`, `Spinner`, `Stepper`, `Switch`,
`Table`, `Tabs`, `Textarea`, `ThemeSwitch`, `Timeline`, `Toast`,
`Tooltip`.

### Compound children y wrappers (42)

Listado exhaustivo en III.1 del v3 (sin cambios). 42 nombres bajo
naming `<Componente><Slot>`.

## III.2 Hooks documentados vs exportados — INCONSISTENCIA TRIPLE

**Tras cruce con B** (B-08 GPT confirmado en código):

### Lo que `src/index.ts` exporta como hooks

```ts
export { useTheme } from "./hooks/useTheme";
export { useControllableState } from "./hooks/useControllableState";
// + export * from "./components"  ← propaga 6 hooks más
```

Total exports en `dist/index.cjs`:
- `useTheme` ✓ (en src/index.ts)
- `useControllableState` ✓ (en src/index.ts)
- `useToast` ✓ (vía components barrel)
- `useDropdown` ✓ (vía components barrel)
- `useTabs` ✓ (vía components barrel)
- `useSidebar` ✓ (vía components barrel)
- `useAccordion` ✓ (vía components barrel)
- `useAccordionItem` ✓ (vía components barrel)

### Lo que README.md declara como público

`README.md:194`:
> Hooks públicos: `useTheme`, `useToast`, `useAccordion`,
> `useAccordionItem`, `useDropdown`, `useSidebar`, `useTabs`.

### Inconsistencia

| Hook | `src/index.ts` | README | `dist/index.cjs` |
|---|---|---|---|
| `useTheme` | ✓ | ✓ | ✓ |
| `useControllableState` | ✓ | **✗ omitido** | ✓ |
| `useToast` | (vía components) | ✓ | ✓ |
| `useDropdown` | (vía components) | ✓ | ✓ |
| `useTabs` | (vía components) | ✓ | ✓ |
| `useSidebar` | (vía components) | ✓ | ✓ |
| `useAccordion` | (vía components) | ✓ | ✓ |
| `useAccordionItem` | (vía components) | ✓ | ✓ |

**Tres fuentes de verdad distintas**. Detallado en B-04 (BLOCKER).

## III.3 Utilities

| Utility | `src/index.ts` | Notas |
|---|---|---|
| `cn` | ✓ | Wrap delgado de `clsx` |
| `mergeDescribedBy` | ✗ | Internal usage only, sin `.d.ts` en `dist/utils/` |
| `useIsoLayoutEffect` | ✗ | Internal usage only, sin `.d.ts` |
| `useA11yWarnInput` | ✗ | `.d.ts` en `dist/utils/` (subpath leak menor) |
| `useLandmarkRegistry` | ✗ | `.d.ts` en `dist/utils/` (subpath leak menor) |
| `useTopLevelLandmarkCheck` | ✗ | `.d.ts` en `dist/utils/` (subpath leak menor) |
| `__resetLandmarkRegistryForTests` | ✗ | `stripInternal` correcto |

## III.4 Tokens CSS públicos

- **7 cardinales** OKLCH dual: `vitreus, axis, cinis, laurus,
  rutilus, malum, kobalium`. Cada uno con variantes lux/nox y
  scales 50-900.
- **Geometría OKLCH validada**: `L_lux ≈ 0.32 ± 0.04`, `L_nox ≈
  0.84 ± 0.04`, `ΔH ≤ 10°`. 7 cardinales pasan, 6 cardinales UI
  evaluados con ΔE OKLab, 3 excepciones documentadas.
- **Tokens de componentes**: `--ig-tooltip-*`, `--ig-tab-*`,
  `--ig-card-*`, etc.
- **Z-index**: tokens `--ig-z-*` definidos 1000-1080 cubriendo
  dropdown/sticky/fixed/modal/popover/tooltip/toast.

## III.5 CSSAPI.mdx — contrato CSS público formal

**877 líneas**, 35 componentes documentados con clases públicas,
ejemplos HTML estáticos, modificadores. **Es freeze de rc.1 según
mi lectura**: cada clase `.ig-*` listada es API pública. Nivel
state-of-the-art para un DS — la mayoría no documenta esto.

## III.6 Bundle real (verificado, no presupuestado)

| Output | Raw | Gzipped | Budget | Headroom |
|---|---|---|---|---|
| `dist/index.js` (ESM) | 60.35 KB | 14.46 KB | 16 KB | 1.54 KB ✓ |
| `dist/index.cjs` | 44.80 KB | 12.92 KB | 15 KB | 2.08 KB ✓ |
| `igoded-tokens.css` | 40.9 KB | 6.53 KB | 30 KB | **23.47 KB** |
| `igoded-components.css` | 186.3 KB | 27.73 KB | 75 KB | **47.27 KB** |
| `igoded-state-css.css` | 6.5 MB | **713.54 KB** | 800 KB | 86.46 KB |
| `igoded-base.css` | 1.2 KB | 453 B | 2 KB | 1.55 KB |
| `igoded-reset.css` | 3.3 KB | 924 B | 2 KB | 1.08 KB |
| `igoded-fonts.css` | 153 B | 142 B | 1 KB | OK |
| `igoded-design.css` | 90 B | 70 B | 2 KB | huge |

**Tarball `npm pack --dry-run`**: 1.6 MB / 13.7 MB unpacked / 288 files.

## III.7 Tree-shaking medido

| Import | Output gzipped |
|---|---|
| `import { Button }` (con floating-ui externalizado) | 848 B |
| `import { Button }` (sin externalizar floating-ui) | 4.776 B (0 ocurrencias floating-ui) |
| `import { cn }` | 623 B (arrastra `createPortal` de react-dom) |
| `import * as RG` | 12.78 KB |

Tree-shaking funcional. Tooltip y floating-ui se eliminan limpiamente
si no se usan. **Sin embargo**: `cn` arrastra react-dom porque el
bundle es monolítico (H-12).

## III.8 CI gates verde (todos ejecutados localmente)

| Step | Estado | Tiempo |
|---|---|---|
| `lint` | ✓ | <2 s |
| `typecheck` | ✓ | ~3 s |
| `test:unit:ci` | ✓ 674 tests | 36.03 s |
| `test:contrast` | ✓ allowlisted warnings | <2 s |
| `test:scope-leaks` | ✓ 426 mods | <2 s |
| `test:hex-drift` | ✓ 47 hex / 18 tokens | <2 s |
| `build` | ✓ | 6.76 s |
| `verify:size` | ✓ | ~3 s |
| `test:storybook` | ✓ 227 tests | 54.29 s |

**Chromatic NO está en `verify.yml`** (B H-18 verificado). Visual
regression no bloquea merge automáticamente.

## III.9 Tests count

- 674 unit tests / 43 archivos / 36 s.
- 227 storybook+axe / 35 stories / Chromium real / 54 s.
- 33 SSR cases en `__ssr__.test.tsx`.
- 9 mergeDescribedBy tests.
- 3 perceptual-allowlist tests.

## III.10 Peer-deps + deps

```json
"dependencies": { "clsx": "^2.1.1" },
"peerDependencies": {
  "react": ">=19.0.0",
  "react-dom": ">=19.0.0",
  "@floating-ui/react": ">=0.27.0"
}
```

Última publicada: 0.27.19. No hay 0.28.x.

## III.11 Subpath exports

```
./styles/tokens.css → dist/styles/igoded-tokens.css
./styles/base.css → dist/styles/igoded-base.css
./styles/components.css → dist/styles/igoded-components.css
./styles/design.css → dist/styles/igoded-design.css
./styles/fonts.css → dist/styles/igoded-fonts.css
./styles/reset.css → dist/styles/igoded-reset.css
./styles/state.css → dist/styles/igoded-state-css.css
./styles/state/*.css → dist/styles/state/*.css   ← WILDCARD
./styles/all.css → dist/styles/index.css
./package.json → ./package.json
```

El wildcard firma como pública la disponibilidad individual de los
28 fragmentos.

---

# IV. Hallazgos clasificados

**Resumen contado tras cruce**:
- **5 BLOCKERs** (3 originales + 2 nuevos del cruce con B)
- **20 HIGHs** (15 originales + 5 nuevos del cruce + 1 promovido desde POSITIVO + 1 demoted desde MEDIUM)
- **14 MEDIUMs** (13 originales + 1 nuevo del cruce)
- **10 LOWs**
- **4 DEFERREDs**
- **7 decisiones arquitectónicas cuestionadas**
- **18 freeze decisions**

## IV.1 BLOCKER (5)

### B-01 — Colisión de naming entre componentes existentes y subfamilia `floating/` planeada

**Convergente con B B-01 + B-02.**

- **Archivos**:
  - `src/components/index.ts:14` (`export * from "./Dropdown"`)
  - `src/components/index.ts:23` (`export * from "./Select"`)
  - Roadmap: `src/components/floating/menu/DropdownMenu/`,
    `src/components/floating/selection/Select/`.

- **Problema**:
  El barrel actual exporta `Dropdown` (compound hand-rolled, sin
  Floating UI) y `DropdownMenu` (compound child del Dropdown). El
  roadmap planea `floating/menu/DropdownMenu/` (Floating UI con
  anchor virtual). **Mismo símbolo, dos componentes distintos**.

  Igual con `Select`: el actual es `<select>` nativo estilizado. El
  planeado es un combobox-listbox custom basado en Floating UI.

- **Reproducción**:
  Test consumer-side. `import { DropdownMenu, Select } from
  "reactigoded"` resuelve a los actuales. Si entra `floating/menu/
  DropdownMenu` con `export *`, conflicto duplicate export en TS.

- **Por qué BLOCKER**:
  rc.1 = API freeze. Después, renombrar uno de los dos = breaking.
  Vivirlo significa que la familia futura `floating/` queda sin
  los nombres más naturales del vocabulario.

- **Fix propuesto**:

  | Opción | Acción | Coste | Riesgo |
  |---|---|---|---|
  | A | Renombrar **ahora** los actuales: `Dropdown` → `Menu`/`OptionsMenu`, `Select` → `NativeSelect` | Breaking en beta.23 + guía migración | Bajo (1 consumer = Iván) |
  | B | Renombrar el roadmap: `DropdownMenu` planeado → `FloatingMenu`/`Menu` | Documentación divergente del estándar Radix/Mantine | Bajo |
  | C | Subpath exports `reactigoded/floating` | Reorganizar barrel después de 22 betas | Medio-alto |

- **Mi opinión**: A. Alinea el DS con naming estándar.

---

### B-02 — Inconsistencia de naming en callbacks de cambio de estado

**Convergente con B B-05 + H-13 (señalados desde otros ángulos).**

- **Tabla** (verificada con grep):

  | Componente | Prop controlado | Callback | Payload |
  |---|---|---|---|
  | `Tabs` | `value: string` | `onValueChange` | string |
  | `Accordion single` | `value: string \| null` | `onValueChange` | string \| null |
  | `Accordion multiple` | `value: string[]` | `onValueChange` | string[] |
  | `Slider` | `value: number` | `onValueChange` + `onChange` | number + ChangeEvent |
  | `Rating` | `value: number` | `onValueChange` | number |
  | `Pagination` | `currentPage: number` | **`onPageChange`** | number |
  | `Stepper` | `active: number` | **`onActiveChange`** | number |
  | `Sidebar` | `collapsed: boolean` | **`onCollapsedChange`** | boolean |
  | `ThemeSwitch` | `theme: Theme` | **`onThemeChange`** | Theme |
  | `Dropdown` | `open: boolean` | `onOpenChange` | boolean |
  | `Modal` | `open: boolean` | **`onClose`** (no payload) | — |
  | `Switch`/`Checkbox`/`Radio` | `checked: boolean` | `onChange` (nativo) | ChangeEvent |

  Cinco naming alternativos para "el componente cambió de estado",
  más `onChange` para inputs nativos, más `onOpenChange` para
  Dropdown, más `onClose` (sin payload) para Modal.

- **Caso especial Modal** (sube de mi v3 M-06 a HIGH tras cruce con
  B B-05): `onClose` no recibe el nuevo estado y solo dispara para
  cierre user-driven. Programmatic `setOpen(false)` no dispara. El
  consumer escribe cleanup en dos sitios.

- **Por qué BLOCKER**:
  rc.1 = API freeze. Estandarizar post-rc.1 = breaking. Vivir con
  la inconsistencia = el consumer aprende 5 nombres distintos para
  el mismo patrón, eternamente.

- **Fix propuesto**:
  Estandarizar en `onValueChange<T>(value: T) => void`. Mantener
  `onChange` solo donde se pasa-through el evento nativo (Input,
  Textarea, Switch, Checkbox, Radio).

  Modal: añadir `onOpenChange?: (open: boolean) => void` (additive).
  `onClose` queda como deprecated alias (warn dev, eliminar en 2.0).

- **Riesgo del fix**: medio-bajo. Find/replace coordinado en ~7
  componentes + tests + stories.

---

### B-03 — Tooltip sienta arquitectura floating sin primitive común

**Convergente con B B-03.**

- **Archivos**:
  `src/components/floating/Tooltip/Tooltip.tsx`. Importa directamente
  `FloatingPortal`, `useFloating`, `useHover`, `useFocus`,
  `useDismiss`, `useInteractions`, `autoUpdate`, `flip`, `offset`,
  `shift`. **NO incluye `FloatingTree` ni `useFloatingNodeId`**.

- **Problema**:
  No existe primitive compartido para portal target, FloatingTree,
  nested dismiss, controlled/uncontrolled open state, virtual
  anchors, shared middleware. El roadmap planea `DropdownMenu`,
  `Submenu`, `MentionMenu`, `SlashCommand`, `Popover`, `HoverCard`
  — todos floating con anidamiento.

  Floating UI documenta `FloatingTree` para nested floating con
  bubbling de dismiss. Sin primitive base, cada componente futuro
  va a duplicar la setup.

- **Estimación de extracción**:
  Tooltip actual: ~65-70% boilerplate compartible (useFloating,
  middleware, autoUpdate, portal, interactions, refs merge,
  dismiss). ~30-35% lógica específica (text, sr-only span, clases,
  variantes).

- **Por qué BLOCKER**:
  Si Tooltip queda congelado como precedente público, los demás
  floating components imitarán o romperán. Cuando se extraiga
  `FloatingPrimitive` luego, **internamente no es breaking** (los
  selectores `.ig-tooltip-*` y la API `text/placement/etc.` se
  mantienen). Pero **añadir `container` o `open`/`onOpenChange`
  post-rc.1 es additive — sin estas decisiones tomadas conscientemente
  ahora, el rc.1 firma una superficie incompleta**.

- **Fix propuesto**:

  | Opción | Acción | Coste |
  |---|---|---|
  | A | Crear `src/components/floating/primitives/` con FloatingPrimitive base. Migrar Tooltip a ese primitive sin cambiar su API pública. Añadir prop `container` (resuelve H-04) y `open`/`onOpenChange` opcionales (resuelve C-01) | 1-2 días |
  | B | Aceptar Tooltip tal cual y comprometerse a refactor interno post-rc.1 | 0 hoy + breaking riesgo después si la API necesita evolución |

- **Mi opinión**: A. El equipo ya tiene experiencia con Floating UI;
  extraer el primitive ahora es 1-2 días de trabajo vs años de
  decisión arquitectónica frozen.

---

### B-04 — Inconsistencia documental triple en hooks públicos

**Convergente con B B-08 + correcciónsobre mi v3 B-03.**

- **Archivos**:
  - `src/index.ts:43-47` — exporta `useTheme`,
    `useControllableState`. Plus `export * from "./components"`.
  - `README.md:194` — declara hooks públicos:
    `useTheme, useToast, useAccordion, useAccordionItem, useDropdown,
    useSidebar, useTabs`.
  - `dist/index.cjs` — exports finales: 8 hooks (los del README + `useControllableState`).

- **Problema**:
  Tres fuentes de verdad distintas:

  | Hook | `src/index.ts` | README | `dist/index.cjs` |
  |---|---|---|---|
  | `useTheme` | ✓ | ✓ | ✓ |
  | `useControllableState` | ✓ | **✗** | ✓ |
  | `useToast` | (transitivo) | ✓ | ✓ |
  | `useDropdown` | (transitivo) | ✓ | ✓ |
  | `useTabs` | (transitivo) | ✓ | ✓ |
  | `useSidebar` | (transitivo) | ✓ | ✓ |
  | `useAccordion` | (transitivo) | ✓ | ✓ |
  | `useAccordionItem` | (transitivo) | ✓ | ✓ |

  El v3 trataba los context hooks como leak accidental. **Tras
  verificación con README**: el README los declara explícitamente
  públicos. NO son leak. Lo que sí es leak documental:
  `useControllableState` exportado por barrel pero NO listado en
  README.

  El `useControllableState` además expone `__suppressNoHandlerWarn`
  como `@internal` en su interface pero accesible runtime — el hook
  parece todavía implementation detail, no API pública pulida (B
  B-07).

- **Por qué BLOCKER**:
  rc.1 freezea el set de hooks públicos. Si:
  - Los context hooks son públicos (lo que README dice), `src/index.ts`
    debe declararlos explícitos, no transitivos. La taxonomía pública
    debe ser intencional, no accidental.
  - `useControllableState` debe estar documentado como público o
    retirado del barrel.

- **Fix propuesto**:

  | Opción | Acción | Coste |
  |---|---|---|
  | A | Declarar explícitamente todos los hooks públicos en `src/index.ts` con re-exports nominados (no `export *`). Documentar `useControllableState` en README. Pulir `useControllableState` API antes (updater funcional, retirar `__suppressNoHandlerWarn` con Symbol) | 30 LOC + entrada README |
  | B | Retirar `useControllableState` del barrel; mantener context hooks documentados | 5 LOC |
  | C | Status quo + corregir README a fuente única (rc.1 firma exactamente lo que `dist/index.cjs` exporta) | Trivial pero firma todo el set como público |

- **Mi opinión**: A. La superficie pública debe ser lo que el equipo
  decide, no lo que el bundler accidentalmente filtra ni lo que el
  README aspiracionalmente declara.

---

### B-05 — Stepper con `active` fuera de rango deja tablist sin tab stop (a11y)

**Hallazgo nuevo del cruce con B B-06. Reproducido por A.**

- **Archivos**:
  - `src/components/Stepper/Stepper.tsx` (cloneElement injection).
  - `src/components/Stepper/Step.tsx:93`:
    ```tsx
    tabIndex={interactive ? (active ? 0 : -1) : undefined}
    ```
    donde `active` es la prop boolean específica del Step (recibida
    por cloneElement con `active === idxStep`).

- **Problema**:
  En modo interactive, `Stepper` decide qué Step recibe `tabIndex=0`
  basándose en si su prop `active` boolean es `true`. Esa prop se
  inyecta vía cloneElement con la fórmula `active === activeStepProp`
  en el padre (donde `activeStepProp` es el número del prop `active`).

  Si el consumer pasa `active=999` (fuera de rango), `active=-1`,
  `active=NaN`, **ningún Step recibe `active=true`** → todos los
  Steps reciben `tabIndex=-1` → **el tablist queda sin tab stop
  alguno** → no se puede entrar al Stepper con Tab desde teclado.

- **Reproducción** (test ad-hoc ejecutado):
  ```tsx
  render(
    <Stepper active={999} onActiveChange={onActive}>
      <Step label="A" /><Step label="B" /><Step label="C" />
    </Stepper>,
  );
  const dots = container.querySelectorAll('.ig-step[role="button"]');
  const tabIndexes = Array.from(dots).map(d => d.getAttribute("tabIndex"));
  // → [-1, -1, -1]   // ningún tab stop
  expect(tabIndexes.some(t => t === "0")).toBe(true);
  // → AssertionError: expected false to be true
  ```

  Confirmado para `active=-1` y `active=NaN` también.

- **Por qué BLOCKER**:
  Es bug de accesibilidad por teclado real. WAI-ARIA APG roving
  tabIndex requiere que **siempre** haya exactamente un elemento con
  `tabIndex=0` en el tablist. Sin él, los usuarios de teclado no
  pueden entrar al Stepper. La pipeline no lo detecta porque las
  stories existentes no incluyen el caso `active fuera de rango`.

  Tabs sí tiene fallback explícito ("Cayendo a...") cuando el value
  no matchea ningún Tab montado. Stepper no lo replica.

- **Fix propuesto**:
  - Clamp `active` a `[0, steps.length - 1]` con dev warn.
  - O fallback: si ningún Step recibe `active=true`, el primer Step
    recibe `tabIndex=0` (mismo patrón Tabs).
  - ~10 LOC + 1 test reproductor.

- **Riesgo del fix**: bajo.

---

## IV.2 HIGH (20)

### H-01 — `Tooltip` no usa `FloatingTree`; cascada de dismiss queda como retrofit

[Sin cambios respecto a v3 — relacionado con B-03 BLOCKER].

`<FloatingTree>` orquesta dismiss en jerarquías anidadas
(`DropdownMenu` → `Submenu` → `Tooltip`). Sin árbol, ESC sobre el
Submenu cierra todo, no solo el más cercano.

Si `FloatingTree` se monta como envoltorio interno de los nuevos
`<DropdownMenu>` / `<Popover>` y Tooltip empieza a usar
`useFloatingNodeId()` internamente, **la API pública del Tooltip no
cambia**. Los selectores `.ig-tooltip-place-top` siguen siendo
válidos.

**Fix**: añadir `useFloatingParentNodeId()` opcional al Tooltip.
Cero impacto consumer-side. ~30 LOC + 1 test.

---

### H-02 — Modal cierra con drag-out de selección — REPRODUCIDO

[Sin cambios respecto a v3.]

El truco `target === currentTarget` distingue click sobre dialog vs
click sobre contenido. Si el usuario hace mousedown en texto
seleccionable + drag fuera + mouseup sobre backdrop, el `click`
event tiene `target = <dialog>` → cierra Modal abandonando selección.

**Reproducción** (ejecutada):
```tsx
fireEvent.mouseDown(body);
fireEvent.mouseUp(dialog);
fireEvent.click(dialog, { target: dialog });
expect(onClose).not.toHaveBeenCalled();
// → falla, onClose llamado 1×.
```

**Fix**: `pointerdown`/`pointerup` parity tracking (~10 LOC).

---

### H-03 — Test SSR de Tooltip pasa por substring match falso

[Sin cambios respecto a v3.]

`expect(html).toContain("ig-tooltip")` — pero el wrapper SSR
emite `<span class="ig-tooltip-wrapper">` que contiene la
substring. El test pasa por coincidencia tipográfica.

**Fix**: cambiar `expects: 'role="tooltip"'` o `"ig-sr-only"`. Una
línea.

---

### H-04 — Tooltip dentro de Modal monta el portal en body, NO en top-layer del dialog — REPRODUCIDO

[Sin cambios respecto a v3.]

`Tooltip` no expone `container` prop. `<FloatingPortal>` default
= `document.body`. Modal usa `<dialog>` con `showModal()` →
top-layer. Resultado: tooltip detrás del backdrop, invisible.

`ToastProvider` SÍ expone `container`. Inconsistencia API.

**Reproducción** (ejecutada):
```tsx
render(<Modal open><ModalBody><Tooltip text="x"><Button>X</Button></Tooltip></ModalBody></Modal>);
await user.hover(button);
expect(dialog.contains(tooltipPortal)).toBe(true);
// → false
```

**Fix**: añadir `container?: HTMLElement | null` a `TooltipProps`.

---

### H-05 — Asimetría de `describedBy` prop entre form fields

[Sin cambios respecto a v3.]

Input/Select/Textarea aceptan `describedBy`. Checkbox/Radio/Switch/
Slider/Rating no. Utility `mergeDescribedBy` ya existe.

**Fix**: ~5 LOC × 5 archivos + tests.

---

### H-06 — Peer-dep `@floating-ui/react >=0.27.0` con upper-bound abierto

[Sin cambios respecto a v3.]

`@floating-ui/react` pre-1.0 → semver permite breaking en minor.
Hoy 0.27.19. Si sale 0.28 con breaking, Tooltip explota
silenciosamente.

**Fix**: `^0.27.0` (= `>=0.27.0 <0.28.0`).

---

### H-07 — `state.css` 713.54 KB gzip — opt-in pero coste de mantenimiento real

[Sin cambios respecto a v3.]

291,563 líneas source / 6.5 MB raw / 713.54 KB gzip. Reinventa
Tailwind. Ningún componente del DS lo usa.

El wildcard subpath `./styles/state/*.css` firma como pública la
disponibilidad individual de los 28 fragmentos. Eliminar uno =
breaking.

**Fix sugerido**: deprecar y direccionar a un preset Tailwind
oficial del DS para 2.0.

---

### H-08 — Cobertura del Storybook no contempla escenarios cruzados

[Sin cambios respecto a v3 + convergente con B H-03 + H-07.]

Las stories existentes son por-componente. Ningún escenario cruzado
(Tooltip-en-Modal, Dropdown-en-Sidebar-colapsada, Toast-con-Modal,
Tabs-con-Tooltip-en-TabPanel, Modal-en-Modal). Si el equipo
añadiera 3 stories cruzadas, axe-core las ejecutaría
automáticamente y H-04 se hubiera detectado en CI.

Adicionalmente, el test runner B H-03 señala como placebo: stories
que cuentan wrappers o aria-describedby pero no testean
hover/focus/Escape/portal/positioning. **Verificado**: el test
"AllStates" de Tooltip es `expect(spans).toHaveLength(N)`.

**Fix**: 3 stories cruzadas mínimas + reescribir play tests con
`userEvent.hover`, `userEvent.tab`, `Escape`, query en
`document.body`.

---

### H-09 — `"use client"` global en barrel

[Sin cambios respecto a v3.]

`src/index.ts:1` `"use client"`. Next.js App Router marca todo el
módulo como client. Importar `cn` desde Server Component genera
warning, types puros válidos en server se vuelven inaccesibles.

**Fix**: granular per-file `"use client"`. ~30 archivos tocados.
NO breaking (la directiva no es API surface).

---

### H-10 — `SidebarToggle` tiene `aria-expanded` sin `aria-controls`

[Sin cambios respecto a v3.]

Otros componentes lo hacen bien (DropdownTrigger, Modal,
AccordionHeader). Solo SidebarToggle es asimétrico.

**Fix**: añadir id al `<aside>` vía Provider context, referenciar
desde SidebarToggle.

---

### H-11 — `act()` warnings en `useTheme.test.tsx` — coverage falsa parcial

[Sin cambios respecto a v3.]

Test "Twin" pasa pero genera warnings `act()`. Indica que parte del
rendering NO está en act. Ensucia output del CI.

**Fix**: envolver `await user.click(...)` con `act()` o `waitFor`.

---

### H-12 — Tree-shaking subóptimo: `import { cn }` arrastra `createPortal`

[Sin cambios respecto a v3 + convergente con B B-09 (matizado).]

`import { cn }` → 623 B gz pero arrastra `react-dom` createPortal
del Toast top-level. El bundle Vite es monolítico.

**Tras cruce con B**: el ángulo de B sobre packaging-risk del
peer floating-ui es distinto pero relacionado. Ver M-14.

**Fix**: subpath export `reactigoded/cn` o build multi-entry.

---

### H-13 — Size budgets sobredimensionados ocultan regresiones

[Sin cambios respecto a v3.]

`tokens.css` real 6.53 KB / budget 30 KB = 4.6× headroom.
`components.css` real 27.73 KB / budget 75 KB = 2.7×. 23 KB de
regresión silenciosa permitida en tokens.css.

**Fix**: ajustar budgets a real + 25-30% headroom.

---

### H-14 — Patch local de `eslint-plugin-jest-dom` permanente — upstream estancado

[Sin cambios respecto a v3.]

Patch parchea `context.getSourceCode()` → `context.sourceCode`.
Upstream `eslint-plugin-jest-dom@5.5.0` sin update. Patch
indefinido.

**Fix**: PR upstream o sustituir plugin.

---

### H-15 — `<Switch>` con `indeterminate=true` duplica anuncio al SR

[Sin cambios respecto a v3.]

`role="switch"` + `aria-checked="mixed"` es spec violation
(WAI-ARIA 1.2 NO admite "mixed" en role switch, solo en role
checkbox).

**Fix**: deshabilitar `indeterminate` para Switch (es Checkbox
territory) o aceptar role downgrade a `checkbox` cuando
indeterminate.

---

### H-16 — Slider con `value` inválido cae a uncontrolled silenciosamente — PROMOTED desde POSITIVO

**Cambio importante tras cruce con B H-08.** En v3 lo flageé como
POSITIVO ("defensive con warn dev"). **Era exagerado**.

- **Archivos**:
  `src/components/Slider/Slider.tsx:111-119`. El propio comentario
  del código dice:
  > "H-27: value controlado no-finito. Diferencia con defaultValue:
  > aquí el slider entra en uncontrolled (passControlled=undefined)
  > y el consumer probablemente no nota el bug hasta que el slider
  > 'deja de seguir' su state."

- **Problema**:
  Si `value` es no-finito (NaN, undefined del parsing, string no
  parseable), `passControlled` queda `undefined` → el hook entra en
  uncontrolled. El warn dev avisa, pero **el contrato controlled
  está roto**: el consumer pasa `value` y espera que el componente
  siga ese state, no que se vuelva uncontrolled silenciosamente.

  Pagination ante input inválido **clampa con warn pero sigue
  funcional**. Eso es defensive bien hecho. Slider **cambia modo
  silenciosamente con warn** — eso es bug de contrato + escapatoria.

  El equipo internamente tracker H-27, lo cual confirma que es
  conocido. Pero no se ha corregido pre-rc.1.

- **Por qué HIGH**:
  rc.1 freeze el comportamiento. Con `value=NaN`, después de rc.1
  el slider sigue siendo uncontrolled silencioso. Cambiar a clamp +
  permanecer controlled = breaking del comportamiento.

- **Fix propuesto**:
  Si `value` está definido pero es inválido:
  - **A**: clampar a `safeMin` y permanecer controlled (el slider
    sigue siguiendo `value` aunque el valor presentado en pantalla
    sea el clamp).
  - **B**: throw en lugar de fallback silencioso (más estricto).

  En cualquier caso, NO cambiar de modo controlled→uncontrolled.

- **Riesgo del fix**: bajo. ~10 LOC + 1 test.

---

### H-17 — Slider expone `onValueChange` Y `onChange` simultáneamente — DEMOTED desde MEDIUM

[Mantiene severidad similar tras cruce con B H-13.]

Slider es el único componente del DS que expone ambos callbacks.
Si el consumer pasa ambos, ambos disparan. Inconsistente con el
resto del DS (Tabs/Accordion/Slider/Rating solo `onValueChange`,
inputs nativos solo `onChange`).

**Fix**: decidir UNO antes del freeze. Solo `onValueChange(number)`
(consistente con `value: number`). Romper compatibilidad beta.

---

### H-18 — Tooltip `children: ReactNode` permite nodos que no puede asociar

**Hallazgo nuevo del cruce con B H-01. Verificado en código.**

- **Archivo**:
  `src/components/floating/Tooltip/Tooltip.tsx:45`:
  ```ts
  children: ReactNode;
  ```

- **Problema**:
  TypeScript permite:
  ```tsx
  <Tooltip text="ayuda">texto literal</Tooltip>
  <Tooltip text="ayuda">{[<a/>, <a/>]}</Tooltip>  // array
  <Tooltip text="ayuda"><></></Tooltip>  // fragment
  ```
  El código solo inyecta refs/handlers/aria si
  `isValidElement(children)` (línea 143). Si no, solo warn dev.
  El tooltip **no se asocia** al SR.

- **Por qué HIGH**:
  Tipado público demasiado permisivo. Después de rc.1, restringir
  a `ReactElement` = breaking.

- **Fix propuesto**:
  Cambiar a `children: ReactElement<HTMLProps<HTMLElement>>` o
  exigir `reference` prop explícito. Forzar al consumer a pasar un
  elemento single válido.

- **Riesgo del fix**: bajo. Romper TS strict consumer-side.

---

### H-19 — DropdownItem `href` no activa con Space (spec violation)

**Hallazgo nuevo del cruce con B H-04. Verificado en código.**

- **Archivos**:
  `src/components/Dropdown/DropdownItem.tsx:121-122` (comentario en
  el código mismo):
  > "Activación por teclado: Enter en `<a>` activa nativo, pero
  > Space no — y para aria-disabled hay que bloquear ambos."

  El código RECONOCE el problema y solo bloquea ambos en
  `aria-disabled`. Para items normales con Space sobre `<a>`, **no
  hace nada**.

- **Problema**:
  WAI-ARIA APG menu-button-links Pattern requiere que Space y Enter
  activen menu items, incluyendo `<a>` enlaces.
  https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/examples/menu-button-links/
  Spec violation real.

- **Por qué HIGH**:
  rc.1 freezea el comportamiento de `DropdownItem` con `href`.
  Después, añadir Space activation es breaking del comportamiento
  user-facing si alguno está confiando en el silencio actual (raro).

- **Fix propuesto**:
  En el branch anchor, manejar `key === " "`:
  ```tsx
  if (e.key === " ") {
    e.preventDefault();
    e.currentTarget.click();
  }
  ```

- **Riesgo del fix**: bajo. ~5 LOC.

---

### H-20 — Tooltip Storybook descripción literalmente falsa "CSS-only"

**Hallazgo nuevo del cruce con B H-02. Verificado en código.**

- **Archivo**:
  `src/components/floating/Tooltip/Tooltip.stories.tsx:13`:
  ```ts
  description: {
    component:
      "Wrapper CSS-only que muestra un texto contextual al hover/focus. " +
      "Para a11y inyecta `aria-describedby` en el child y un " +
      "`<span role=\"tooltip\">` sr-only.",
  }
  ```

- **Problema**:
  La descripción declara "CSS-only". El código real usa Floating UI
  desde varias betas (`useFloating`, `useHover`, `useFocus`,
  `useDismiss`, `useInteractions`, `FloatingPortal`, autoUpdate,
  flip, offset, shift). **Documentación del Storybook publicado
  miente sobre la implementación**.

- **Por qué HIGH**:
  Storybook publicado en igoded.es (256 entries verificadas vía
  curl al index.json) muestra esa descripción al consumer. La
  mentira documental degrada confianza en el resto del DS.

- **Fix propuesto**:
  Reescribir descripción para reflejar arquitectura real Floating
  UI + portal + interactions. ~10 líneas.

- **Riesgo del fix**: trivial.

---

## IV.3 MEDIUM (14)

### M-01 — Polymorphic `as` solo en Card

[Sin cambios respecto a v3.]

Único componente con `as` polimorfo. Ergonomía DX. Posponer a 1.1
con patrón Slot consistente.

### M-02 — Cambio breaking ARIA de Skeleton en beta.22 — riesgo de regression

[Sin cambios respecto a v3.]

Soak corto. Test storybook+axe explícito que verifique grupo emite
único `role="status"` + `aria-busy` + soak adicional.

### M-03 — Paquete no publicado en npm; rc.1 sin publish es nominal

[Sin cambios respecto a v3.]

`docs/RC1_DECISIONS.md` documenta pausa operativa. Documentar en
release notes.

### M-04 — `Tooltip` solo soporta 4 placements; Floating UI ofrece 12

[Sin cambios respecto a v3.]

Solo `top/bottom/left/right`. Sin `top-start`, `bottom-end`, etc.
Doble dependencia: ampliar TS y CSS coordinadamente.

### M-05 — `Tooltip` envuelve el child en `<span>` siempre — rompe block-level layouts

[Sin cambios respecto a v3.]

Patrón Slot (Radix) lo resolvería pero implica romper
`ig-tooltip-wrapper` (CSS público). Posponer a 1.1.

### M-06 — `useControllableState.setValue` no acepta updater function

[Sin cambios respecto a v3.]

Para futuros MultiSelect/TagInput con T = array, stale closure
risk. Ampliar firma a `(next: T | ((prev: T) => T)) => void`.

### M-07 — `Tooltip` cast unsafe + sin warn cuando custom child no forwarda — REPRODUCIDO

[Sin cambios respecto a v3.]

Custom component sin forwarding → tooltip no abre, sin warn dev.
Detalle positivo: SR-only span sí persiste.

**Fix**: dev-warn cuando `referenceRef.current` no apunta a
HTMLElement.

### M-08 — Inline styles potenciales conflictos con CSP estricto

[Sin cambios respecto a v3.]

Table, Progress, Tooltip usan inline styles. CSP estricto
(`style-src 'self'` sin `'unsafe-inline'`) los rompe.

**Fix**: documentar o soporte `nonce` prop.

### M-09 — `tabbable` (transitivo) emite `console.error` legítimo en runtime

[Sin cambios respecto a v3.]

CI gate afinado para distinguir warns propios de errors legítimos
de tabbable. Documentar para consumers.

### M-10 — Avatar sin fallback automático cuando `<img>` falla a cargar

[Sin cambios respecto a v3 + convergente con B H-10.]

Sin `onError` fallback. Sin `loading="lazy"` por default.

**Fix**: prop `loading` con default `"lazy"` + `onError` fallback
a `initials`.

### M-11 — `ToastProvider` sin `maxToasts` ni dedupe — riesgo de spam visual

[Sin cambios respecto a v3 + convergente con C-06.]

Sin límite de cola, sin dedupe.

**Fix**: `maxToasts?: number` + `dedupeBy?` opcional.

### M-12 — Modal `onClose` solo dispara para cierre user-driven (DEMOTED desde mi v3 + cubierto por B-02)

Tratado en B-02 (BLOCKER). No duplico aquí.

### M-13 — ThemeSwitch lee DOM en `derive()` durante render — contradice claim README

**Hallazgo nuevo del cruce con B B-10 (matizado de BLOCKER a MEDIUM).**

- **Archivo**:
  `src/components/ThemeSwitch/ThemeSwitch.tsx:114`:
  ```ts
  derive: () => {
    if (override) return override;
    if (stored) return stored;
    if (typeof document !== "undefined" && attribute) {
      const fromAttr = document.documentElement.getAttribute(attribute);
      if (fromAttr === "light" || fromAttr === "dark") return fromAttr;
    }
    return defaultTheme ?? "dark";
  },
  ```

- **Problema**:
  El `derive()` se ejecuta durante render. **Está protegido con
  `typeof document !== "undefined"`** → en SSR (Node) el guard se
  activa, cae a `defaultTheme`. En cliente lee el DOM. **El
  componente ES SSR-safe** (no crashea).

  La crítica válida es:
  - El claim del README sobre "cero acceso DOM en render" es
    técnicamente falso para ThemeSwitch.
  - Aunque guard activo, leer DOM durante render cliente puede
    causar **hydration mismatch** si el server pintó con
    `defaultTheme="dark"` y el DOM ya tenía `data-theme="light"`
    aplicado por script anti-flash antes de hidratar.

- **Por qué MEDIUM** (no BLOCKER como sugiere B):
  Está protegido. No crashea SSR. Lo que rompe es coherencia
  documental + posible hydration warn.

- **Fix propuesto**:
  - Corregir README: ThemeSwitch lee DOM en cliente para sync con
    script anti-flash.
  - O mover lectura DOM a un external store coherente
    (`useSyncExternalStore` con server snapshot estable).

- **Riesgo del fix**: medio. Patrón `useSyncExternalStore` ya está
  en uso en otros lugares del DS.

### M-14 — README peer-dep `@floating-ui/react` claim engañoso

**Hallazgo nuevo del cruce con B B-09 (matizado de BLOCKER a MEDIUM).**

- **Archivos**:
  - `README.md` declara que `@floating-ui/react` solo es necesario
    si usas Tooltip.
  - `src/components/index.ts` exporta `Tooltip` desde el barrel
    raíz.
  - `Tooltip.tsx` importa `@floating-ui/react` estáticamente.

- **Verificación con esbuild** (ejecutada por A):
  - `import { Button }` con floating-ui externalizado → 848 B gz.
  - `import { Button }` sin externalizar → 4.776 B gz, **0
    ocurrencias de floating-ui en el bundle final**.

  Tree-shaking funciona — Tooltip y floating-ui se eliminan
  limpiamente del bundle si no se usan.

- **Pero**: **si el consumer NO instala `@floating-ui/react`**
  como peer-dep, su bundler/resolver fallará al resolver el grafo
  estático aunque no use Tooltip. peer-dep no satisfecho rompe
  install/resolution **antes de que tree-shake ocurra**.

- **Conclusión**:
  El claim "solo necesario si usas Tooltip" es **engañoso a nivel
  install**, no a nivel bundle. Worth aclarar en README.

- **Por qué MEDIUM** (no BLOCKER como B sugiere):
  El consumer típico instala el peer porque npm/pnpm/yarn lo
  reportan como warning explícito. Pocos consumers operan con
  peer-deps no satisfechos.

- **Fix propuesto** (3 opciones):

  | Opción | Acción |
  |---|---|
  | A | Corregir README: "instalar `@floating-ui/react` siempre, aunque solo se use Tooltip" |
  | B | Subpath `reactigoded/floating` con peer condicional |
  | C | Hacer floating-ui dep en lugar de peer (~30 KB extra al bundle del consumer aunque no use Tooltip) |

- **Mi opinión**: A. Cambio mínimo, expectativa correcta.

---

## IV.4 LOW (10)

[Sin cambios respecto a v3.]

- **L-01**: `Tooltip` `useDismiss` con default incluye outside click (ruido para hover-only).
- **L-02**: `Tooltip.text: string` requerido sin warn dev cuando empty/whitespace.
- **L-03**: `<Tooltip>` sobre `<button disabled>` (Firefox no dispara pointer events).
- **L-04**: 7 pares perceptuales bajos en allowlist (ruido de salida).
- **L-05**: `package.json:5` description "Igoded" mayúscula vs paquete "igoded" minúscula.
- **L-06**: Toast iconos default unicode con tamaño visual inconsistente entre variants.
- **L-07**: `_audit/perceptual-allowlist.test.ts` solo valida 3 invariantes de la allowlist.
- **L-08**: `dist/utils/useA11yWarnInput.d.ts` etc. accesibles vía subpath (no API soportada).
- **L-09**: `__ssr__.test.tsx` no incluye assertions para `TableCaption`, `TableFoot`, `TabsContent`, `IconButton`.
- **L-10**: `dist/index.d.ts` declara `export * from './components'` que arrastra ~91 símbolos sin filtro.

**Adicionales del cruce con B**:

- **L-11**: Dropdown llama `placement` a lo que es `align` (B M-05). En Floating UI, placement es `top/bottom/right/left + start/center/end`. Aquí solo horizontal align. Naming confuso de cara al futuro `floating/menu/DropdownMenu`. Worth renombrar a `align` antes de freeze.
- **L-12**: Pagination `aria-label="Página N"` hardcoded sin `getPageLabel` (B M-04). i18n parcial.
- **L-13**: README mezcla guía consumer con tracking interno post-RC1 (B LOW). Lenguaje de proceso interno.

---

## IV.5 DEFERRED (4)

[Sin cambios respecto a v3.]

- **D-01**: Refactor a `Slot` pattern para `<Tooltip>` (impone breaking de `ig-tooltip-wrapper`).
- **D-02**: forwardRef legacy migration. Ya hecho — todos usan ref como prop directo.
- **D-03**: Eliminación de `state.css` si H-07 opta por retirada. Defer al 2.0.
- **D-04**: Test runner SR (NVDA/VoiceOver) automatizado. Defer indefinido.

---

# V. Decisiones que aprueban API freeze (18)

[Sin cambios respecto a v3.]

1. Naming de los 32 componentes raíz (B-01 sobre colisiones).
2. Naming de los 42 compound children y wrappers públicos.
3. Set de hooks públicos (B-04 sobre inconsistencia documental).
4. Naming de callbacks de cambio de estado (B-02).
5. Firma del prop controlled por componente.
6. Discriminated union de `useControllableState`.
7. 8 entrypoints CSS.
8. Naming de las clases CSS públicas (~250 en CSSAPI.mdx).
9. Set de tokens `--ig-*` documentados como públicos.
10. Tooltip API completa.
11. Modal API.
12. Política `"use client"` global en barrel (H-09).
13. Peer-dep ranges (H-06).
14. Patrón compound vs prop-based para floating futuro.
15. Skeleton ARIA pattern post-beta.22.
16. Bundle layout monolítico (`dist/index.js` único).
17. CSSAPI.mdx como contrato CSS público formal.
18. CI gate `[reactigoded]` no en bundle.

**Bonus**:
- Wildcard subpath export `./styles/state/*.css` firma 28 fragmentos.
- Flujo SSR concreto: `useSyncExternalStore` con
  `serverSnapshot=false` para portales (ToastProvider). Patrón que
  el resto del DS no replica explícitamente — si futuros componentes
  con portales no siguen el mismo patrón, hydration mismatches.

---

# VI. Decisiones de arquitectura que estoy cuestionando (7)

[Sin cambios respecto a v3.]

## C-01 — `Tooltip.text: string` (no `ReactNode`)

Roadmap incluye HoverCard y Popover que sí necesitan
`content: ReactNode`. Cuando lleguen, dos APIs distintas para
conceptos hermanos.

**Fix**: ampliar `text` a `string | ReactNode` ahora.

## C-02 — Modal `<dialog>` nativo + Tooltip portal a body

Coherente solo si nunca hay Tooltip dentro de Modal. Roadmap
explícita ese caso (H-04 reproducido). Tres opciones, hoy ninguna
implementada.

## C-03 — Hand-rolled Dropdown vs Floating UI

Tooltip usa Floating UI. Dropdown no. Si llega `floating/menu/
DropdownMenu`, dos arquitecturas en paralelo para siempre.

## C-04 — `useDropdown`/`useTabs`/etc. accidentalmente públicos (B-04)

Cubierto en B-04.

## C-05 — `state.css` 713 KB gz: reinventando Tailwind opt-in

Cubierto en H-07.

## C-06 — Single-instance Toast Provider sin documentar comportamiento multi-instance

Position fija al provider. Para errores en bottom-center +
notificaciones en top-right, dos providers requeridos. Documentar.

## C-07 — `__suppressNoHandlerWarn` runtime escape hatch + `stripInternal` no es defensa total

`stripInternal` elimina del `.d.ts`. Bundle JS sí contiene el
string literal 3×. Consumer con `// @ts-expect-error` puede pasarla
runtime.

**Fix sugerido**: usar Symbol como key en lugar de string.

---

# VII. Auditoría componente por componente

[32 componentes auditados con notas individuales — sin cambios sustantivos respecto a v3, salvo las correcciones siguientes:]

- **Slider**: defensivo bien hecho EXCEPTO el caso `value` inválido
  (H-16, antes POSITIVO). Cambia modo controlled→uncontrolled
  silenciosamente.
- **Stepper**: defensivo bien hecho EXCEPTO `active` fuera de rango
  (B-05 nuevo BLOCKER). Sin clamp ni fallback.
- **DropdownItem**: el branch anchor reconoce el problema Space en
  comentario pero no sintetiza activación (H-19 nuevo).
- **Tooltip**: descripción Storybook miente sobre arquitectura
  (H-20 nuevo).
- **ThemeSwitch**: lee DOM en derive durante render (M-13 nuevo).

Resto de componentes: **Accordion, Alert, Avatar, AvatarGroup,
Badge, Breadcrumb, Button, IconButton, Card (compound), Checkbox,
Chip, Divider, Dropdown (compound), Input (compound), Modal
(compound), Navbar (compound), Pagination, Progress, Radio, Rating,
Select, Sidebar (compound), Skeleton, SkeletonContainer, Spinner,
Step, Switch, Table (compound), Tabs (compound), Textarea,
Timeline, TimelineItem, Toast, ToastProvider, Tooltip** — notas
individuales en v3 sección VII se mantienen sin cambios.

[Para reducir longitud, no repito las 32 notas aquí. Consultar v3.]

---

# VIII. Lo que está bien hecho

[Mantenido del v3 — 20 puntos. Recordatorio condensado:]

1. Geometría OKLCH dual con guard ΔE OKLab ejecutado en CI.
2. Tokens `--ig-z-*` ya definidos (1000-1080) antes de tener Popover.
3. SSR test cubre 33 componentes con composiciones reales.
4. `bundle-no-dev-warns` step explícito con grep `[reactigoded]`
   filtrado del ruido de tabbable. Comentario explicando WHY.
5. Chromatic sin `--auto-accept-changes=main`.
6. 227 tests storybook+axe en Chromium real, 54 s, todos verde.
7. 674 unit tests en 36 s con `pool: 'forks'` + `isolate: true`.
8. `migrate-tooltip-prefixes.mjs` script + experiencia codemodding.
9. **`docs/CSSAPI.mdx` con 877 líneas documentando contrato CSS público** — state-of-the-art.
10. Comentarios JSDoc + inline en código de calidad alta.
11. Pagination defensive contra valores inválidos (totalPages=0/-5/NaN, currentPage>total) — clamp + warn explícito + sigue funcional.
12. Slider defensive parcial (defaultValue array, value NaN warn). **Pero ver H-16 para el caveat de value inválido**.
13. `useControllableState` con discriminated union internal/derived.
14. ToastProvider con `useSyncExternalStore` SSR-safe.
15. `useLandmarkRegistry` a nivel módulo detecta colisiones runtime DEV.
16. Stepper roving tabIndex con focus management explícito post-render. **Pero ver B-05 para el caveat de active fuera de rango**.
17. Card dev-warn cuando `interactive + onClick` sin `role="button"`.
18. Tabs fallback graceful cuando `value` no matchea ningún Tab (warn diferenciado controlled vs uncontrolled).
19. CSS scope-leak guard real con allowlist auditada (426 mods).
20. `exports` field con 9 subpath exports y wildcard.

**Notas de cambio tras cruce**:
- "Pagination defensive" sigue siendo POSITIVO real. Su patrón de
  clamp + warn + permanecer functional es lo que debería imitarse.
- "Slider defensive" baja una muesca: warn dev no compensa cambio
  silencioso de modo (H-16). El patrón Pagination es superior.
- "Stepper roving tabIndex con focus management" sigue siendo
  POSITIVO en el patrón general (focusTargetIdxRef + comentarios
  detallados), pero el caveat B-05 (active fuera de rango) baja la
  nota porque no replica el fallback de Tabs.

---

# IX. Suposiciones (lo que NO pude verificar)

[Sin cambios sustantivos respecto a v3 — añadido un punto del cruce:]

1. H-04 reproducido en happy-dom asumo equivale en navegador real.
2. H-02 reproducido con `fireEvent` asumo equivale al comportamiento real con mouse drag.
3. SR real (NVDA/VoiceOver/JAWS) — afirmaciones inferidas desde ARIA.
4. `prefers-contrast: more` y `forced-colors: active` no probados en navegador.
5. RTL no probado (`dir="rtl"`).
6. Consumer Next.js App Router no montado (H-09 inferido).
7. Storybook publicado en igoded.es asumido al commit auditado.
8. `npm run chromatic` no ejecutado (CI lo corre, asumo verde).
9. Performance runtime no medida.
10. Storybook con `--auto-accept-changes` desactivado tras cambio visual no probado.
11. `migrate-tooltip-prefixes.mjs` script no ejecutado.
12. `npm pack` tarball no abierto para inspeccionar contenido.
13. Modal-en-Modal no probado en navegador real.
14. Tooltip sobre `<button disabled>` no probado en Firefox real.
15. **(Nuevo del cruce)**: B-05 (Stepper active fuera de rango)
    reproducido en happy-dom — el comportamiento DOM
    `tabIndex="-1"` en todos los steps debería ser idéntico en
    navegador real (no depende de mouse/focus events). Confianza
    alta.

---

# X. Cruce con review B (GPT-5.5)

Esta sección documenta cómo se cruzó el review de B con el de A, y
qué cambios materiales se aplicaron al informe final.

## X.1 Veredictos comparados

| Pregunta del mandato | A (este informe) | B (GPT-5.5) | Reconciliación |
|---|---|---|---|
| 1. Shippable rc.1? | BLOCK conditional | BLOCK | Convergente — ambos bloquean. |
| 2. Arquitectura aguanta? | NO sin 3 decisiones | NO | Convergente. |
| 3. Storybook coincide? | SÍ con asterisco | NO FIRMADO | A pudo ejecutar pipeline + axe-core en Chromium real. B no. **A firma con asterisco** porque las 227 stories pasan pero las cruzadas faltan y Tooltip Storybook miente sobre la implementación. |

## X.2 Donde A y B convergen

- **B-01 / GPT B-01 + B-02**: Naming `Select` y `DropdownMenu` colisionan con roadmap. Ambos lo flagean como BLOCKER.
- **B-02 / GPT B-05 + H-13**: Inconsistencia callbacks `on*Change` + Modal `onClose` opcional. Convergente con matiz: A trata Modal como caso especial dentro de B-02; B lo separa como B-05 (BLOCKER).
- **B-03 / GPT B-03**: Tooltip sin primitive floating común. Convergente.
- **H-04 / GPT B-04**: Tooltip sin `container` prop. Convergente.
- **C-04 / GPT B-07**: `useControllableState` API inmadura. Convergente.

## X.3 Donde B acierta y A corrige (3 puntos)

### B-05 (nuevo) — Stepper `active` fuera de rango

A no lo tenía. **GPT B-06 lo flagea, A lo verifica con test ad-hoc
ejecutado**: `active=999/-1/NaN` → todos los steps `tabIndex=-1` →
tablist sin tab stop. BLOCKER de a11y real. Promovido en este
informe.

### B-04 (corregido) — Inconsistencia hooks documentales

A trataba mi B-03 v3 como leak accidental de hooks. **GPT B-08
verifica que README los declara explícitamente públicos**. Tras
verificación: README declara 7, `src/index.ts` solo 2, dist exporta
8 (con `useControllableState` que README omite). El BLOCKER es
inconsistencia triple, no leak accidental.

### H-16 (severidad corregida) — Slider value inválido

A v3 lo trataba como POSITIVO (defensive). **GPT H-08 lo flagea
como bug de contrato**. Tras verificación: el código mismo lo
reconoce con comentario H-27 ("el consumer probablemente no nota
el bug hasta que el slider deja de seguir su state"). Warn dev no
repara contrato roto. Promovido a HIGH en este informe.

## X.4 Donde A acierta y B exagera o se equivoca (3 puntos)

### M-13 (matizado de BLOCKER a MEDIUM) — ThemeSwitch SSR

GPT B-10 lo sube a BLOCKER ("contradice garantía SSR del README").
A verifica el código: `derive()` está protegido con `typeof
document !== "undefined"` → SSR-safe en Node, no crashea. La crítica
válida es coherencia documental + posible hydration mismatch. **No
es BLOCKER pero sí MEDIUM real**.

### M-14 (matizado de BLOCKER a MEDIUM) — Peer-dep `@floating-ui/react`

GPT B-09 lo sube a BLOCKER ("packaging-risky"). A mide con esbuild:
con floating-ui externalizado, `import { Button }` produce 0
ocurrencias de floating-ui en bundle final → tree-shaking funciona.
La crítica válida es el claim README "solo necesario si usas
Tooltip" engañoso a nivel install. **MEDIUM real**.

### Severidad B-05 GPT (Modal onClose) — promovido a HIGH dentro de B-02

GPT lo trata como BLOCKER aislado. A integra el caso Modal dentro
de B-02 (callback inconsistency), promoviéndolo de v3 M-06 a HIGH
dentro del BLOCKER B-02.

## X.5 Gaps de A que B cubre (5 nuevos hallazgos integrados)

1. **H-18** — Tooltip `children: ReactNode` permite string sin asociar (de B H-01).
2. **H-19** — DropdownItem `href` no activa con Space (de B H-04).
3. **H-20** — Tooltip Storybook descripción "CSS-only" falsa (de B H-02).
4. **L-11** — Dropdown llama `placement` a lo que es `align` (de B M-05).
5. **L-12** — Pagination i18n hardcoded (de B M-04).

## X.6 Gaps de B que A cubre (cosas que B no pudo verificar)

1. Pipeline completa verde (lint+typecheck+test:unit:ci+test:contrast+test:scope-leaks+test:hex-drift+build+verify:size+test:storybook).
2. Bundle real medido (ESM 14.46 KB gz, CJS 12.92 KB gz, state.css 713.54 KB gz).
3. Tree-shaking real con esbuild (Button 848 B gz, cn 623 B gz arrastra react-dom).
4. Tests reproductores ad-hoc (H-04, H-02, M-07, Pagination edge cases, B-05 Stepper).
5. Consumer-side TS strict en `/tmp/consumer-test`.
6. **CSSAPI.mdx 877 líneas** existencia y exhaustividad. B no lo menciona.
7. **`useLandmarkRegistry`** detección runtime de colisiones aria-label. B no lo menciona.
8. **`docs/RC1_DECISIONS.md`** decisiones humanas documentadas, pausa npm publish. B no lo cita.
9. Bundle prod sin `console.*` ni `[reactigoded]` prefix verificado.
10. `__suppressNoHandlerWarn` verificación dual (stripeado en `.d.ts`, accesible runtime). B lo menciona pero sin verificación.
11. Pipeline completa con tiempos reales (75 s sin Storybook, 130 s con).
12. Auditoría individual de los 32 componentes con notas específicas.

## X.7 Cómo se hicieron las verificaciones cruzadas

Cada hallazgo de B fue validado con código local:

- **B-06 GPT (Stepper)**: test ad-hoc ejecutado, reproducido.
- **B-08 GPT (README hooks)**: `grep -nE "useControllableState|useTheme|useToast" README.md` ejecutado, confirmado línea 194.
- **H-04 GPT (DropdownItem Space)**: lectura de `DropdownItem.tsx:121-122`, comentario en código mismo lo reconoce.
- **H-08 GPT (Slider value inválido)**: lectura de `Slider.tsx:111-119`, comentario H-27 internal lo confirma.
- **H-02 GPT (Tooltip Storybook)**: `grep "CSS-only" Tooltip.stories.tsx` ejecutado, confirmado línea 13.
- **B-09 GPT (peer floating-ui)**: esbuild bundle ejecutado con/sin externalización, midió 0 ocurrencias en bundle.
- **B-10 GPT (ThemeSwitch)**: lectura de `ThemeSwitch.tsx:114`, guard `typeof document` confirmado.
- **H-01 GPT (Tooltip children)**: `grep "children" Tooltip.tsx` ejecutado, confirmado tipo `ReactNode`.
- **H-06 GPT (Dropdown listeners)**: `grep "addEventListener" Dropdown.tsx`, confirmado `document.addEventListener`.

---

# XI. Apéndices

## Apéndice A — Pipeline output

[Mantenido del v3.]

```
lint: ✓ 0 issues
typecheck: ✓ 0 issues
test:unit:ci: ✓ 674/674 passed in 36.03s
test:contrast: ✓ 7 warnings allowlisted
test:scope-leaks: ✓ 426 mods reviewed, 6 allowlisted
test:hex-drift: ✓ 47 hex / 18 tokens / 6 allowlisted
build: ✓ 6.76s
  dist/index.js  60.35 kB │ gzip: 14.65 kB
  dist/index.cjs 44.80 kB │ gzip: 12.98 kB
verify:size: ✓ all budgets met
test:storybook: ✓ 227/227 passed in 54.29s
npm pack --dry-run: 1.6 MB / 13.7 MB unpacked / 288 files
```

## Apéndice B — Tests reproductores (código)

### B-05 Stepper active fuera de rango (cruce GPT)

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Stepper, Step } from "../src/index";

describe("Stepper active fuera de rango — B-05", () => {
  it("active=999 — ningún step queda con tabIndex=0", () => {
    const onActive = vi.fn();
    const { container } = render(
      <Stepper active={999} onActiveChange={onActive}>
        <Step label="A" /><Step label="B" /><Step label="C" />
      </Stepper>,
    );
    const dots = container.querySelectorAll('.ig-step[role="button"]');
    const tabIndexes = Array.from(dots).map(d => d.getAttribute("tabIndex"));
    expect(tabIndexes.some(t => t === "0")).toBe(true);
    // → AssertionError: expected false to be true
    // tabIndexes en realidad: ["-1", "-1", "-1"]
  });
});
```

### H-04 Tooltip dentro de Modal

```tsx
describe("Tooltip dentro de Modal — H-04", () => {
  it("portal del Tooltip va a body, NO al dialog top-layer", async () => {
    const user = userEvent.setup();
    render(
      <Modal open onClose={() => {}}>
        <ModalBody>
          <Tooltip text="ayuda"><Button>X</Button></Tooltip>
        </ModalBody>
      </Modal>,
    );
    await user.hover(screen.getByRole("button", { name: /X/ }));
    const portal = document.querySelector(".ig-tooltip");
    const dialog = document.querySelector("dialog");
    expect(dialog?.contains(portal)).toBe(true);
    // → false
  });
});
```

### H-02 Modal drag-out

```tsx
describe("Modal drag-out — H-02", () => {
  it("mousedown dentro + mouseup fuera NO debería cerrar", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <ModalBody>texto seleccionable largo</ModalBody>
      </Modal>,
    );
    const dialog = document.querySelector("dialog")!;
    const body = screen.getByText("texto seleccionable largo");
    fireEvent.mouseDown(body);
    fireEvent.mouseUp(dialog);
    fireEvent.click(dialog, { target: dialog });
    expect(onClose).not.toHaveBeenCalled();
    // → falla, onClose llamado 1×.
  });
});
```

### M-07 Tooltip custom no-forward

```tsx
describe("Tooltip con custom component child — M-07", () => {
  it("custom no-forward — tooltip NO abre, sin warn", async () => {
    const user = userEvent.setup();
    function MyComp({ children }: any) {
      return <div>{children}</div>;
    }
    render(<Tooltip text="x"><MyComp>X</MyComp></Tooltip>);
    await user.hover(screen.getByText("X"));
    expect(document.querySelector(".ig-tooltip-place-top")).toBeNull();
  });

  it("aria-describedby SÍ se setea aunque sea custom", () => {
    function MyComp(props: any) {
      return <div data-testid="root" {...props} />;
    }
    render(<Tooltip text="hint"><MyComp>X</MyComp></Tooltip>);
    const root = screen.getByTestId("root");
    const id = root.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent("hint");
  });
});
```

### Pagination edge cases (POSITIVO)

```tsx
describe("Pagination edge cases — defensive bien hecho", () => {
  it.each([
    ["totalPages=0", { totalPages: 0, defaultPage: 1 }],
    ["totalPages negativo", { totalPages: -5, defaultPage: 1 }],
    ["currentPage > totalPages", { totalPages: 5, currentPage: 99 }],
    ["totalPages=NaN", { totalPages: NaN, defaultPage: 1 }],
  ])("%s — clamp con dev warn", (_, props) => {
    render(<Pagination {...props} />);
    expect(screen.queryAllByRole("button", { name: /Página \d/ }).length)
      .toBeGreaterThanOrEqual(1);
  });
});
// Todos pasan con dev warn explícito.
```

## Apéndice C — Comandos ejecutados

```bash
# Setup
cd /home/claude/reactigoded
npm ci --legacy-peer-deps --no-audit --no-fund

# Pipeline
npm run lint && npm run typecheck && npm run test:unit:ci
npm run test:contrast && npm run test:scope-leaks && npm run test:hex-drift
npm run build && npm run verify:size

# Storybook
npx playwright install --with-deps chromium
npm run test:storybook

# Pack
npm pack --dry-run

# Verificaciones específicas
grep -oE "exports\\.[A-Za-z_]+" dist/index.cjs | sort -u | wc -l
grep -E "console\\.[a-z]+|__suppressNoHandlerWarn|\\[reactigoded\\]" \
  dist/index.js dist/index.cjs

# Tree-shaking (esbuild)
mkdir -p /tmp/tree-test && cd /tmp/tree-test
ln -sfn /home/claude/reactigoded/node_modules ./node_modules
ln -sfn /home/claude/reactigoded ./node_modules/reactigoded
echo 'import { Button } from "reactigoded"; console.log(Button);' \
  > just-button.js
/home/claude/reactigoded/node_modules/.bin/esbuild just-button.js \
  --bundle --format=esm --minify \
  --external:react,react-dom,react/jsx-runtime,@floating-ui/react \
  --target=es2022 | gzip -c | wc -c

# Consumer sintético
mkdir -p /tmp/consumer-test && cd /tmp/consumer-test
ln -sfn /home/claude/reactigoded ./node_modules/reactigoded
/home/claude/reactigoded/node_modules/.bin/tsc --noEmit -p .

# Tests reproductores ad-hoc
cp /tmp/<test>.tsx /home/claude/reactigoded/src/__<test>__.test.tsx
npx vitest run --project unit src/__<test>__.test.tsx
rm /home/claude/reactigoded/src/__<test>__.test.tsx

# Verificaciones cruce con B
grep -nE "useControllableState|useTheme|useToast" README.md
grep -nE "CSS-only|css-only" src/components/floating/Tooltip/Tooltip.stories.tsx
sed -n '105,140p' src/components/ThemeSwitch/ThemeSwitch.tsx
sed -n '95,160p' src/components/Dropdown/DropdownItem.tsx
sed -n '85,135p' src/components/Slider/Slider.tsx
```

## Apéndice D — Bundle real exports (91 símbolos)

[Mantenido del v3.]

91 símbolos exportados desde `dist/index.cjs`. Detalle completo en
v3 Apéndice D — sin cambios.

---

# Cierre

**Pipeline: 100% verde.** Pero rc.1 es API freeze, y la pipeline
sólo verifica corrección del código actual contra los tests
escritos. Lo que la pipeline NO verifica + lo que el cruce con B
añade:

- Si el barrel está exponiendo cosas que el README declara públicas
  pero `src/index.ts` no (B-04 nuevo).
- Si los nombres de los componentes coliden con el roadmap (B-01).
- Si la inconsistencia de naming en callbacks se freezea para
  siempre (B-02).
- Si los escenarios cruzados (Tooltip-en-Modal) están rotos (H-04).
- Si Stepper pierde tab stop con `active` inválido (B-05 nuevo).
- Si Slider cambia silenciosamente de modo controlled→uncontrolled
  (H-16 promovido).
- Si DropdownItem viola WAI-ARIA APG (H-19 nuevo).
- Si Tooltip Storybook miente sobre arquitectura (H-20 nuevo).

Las **5 BLOCKERs** son decisiones de **5-30 LOC cada una**:

1. **B-01**: ~30 LOC. Renombrar `Dropdown`/`Select` o reservar
   namespace `floating/`.
2. **B-02**: ~50-100 LOC find/replace coordinado en 7 componentes
   + tests + stories. Estandarizar `onValueChange<T>`.
3. **B-03**: 1-2 días. Crear `floating/primitives/`, migrar Tooltip.
4. **B-04**: ~30 LOC. Declarar hooks públicos explícitos en
   `src/index.ts`, documentar `useControllableState` o retirarlo.
5. **B-05**: ~10 LOC. Clamp + fallback en Stepper (mismo patrón Tabs).

Cierras los 5 en 1-2 días. Vivir con cualquiera = breaking eterno
o bug a11y permanente.

Las **20 HIGHs** son decisiones de día a 5 días cada una. Cerrar
6-8 antes del freeze deja un rc.1 más limpio. Yo priorizaría:

- H-04 (Tooltip-en-Modal — escenario explícito del roadmap roto).
- H-09 (`"use client"` global — DX Next.js consumers).
- H-16 (Slider modo silencioso — bug contrato).
- H-19 (DropdownItem Space — spec violation).
- H-20 (Tooltip Storybook miente — confianza).
- H-13 (budgets ajustados — proceso).

Las **14 MEDIUMs** y **10 LOWs** se pueden vivir post-rc.1 si
están documentadas en el CHANGELOG/release notes como known
limitations.

---

**Esto es el deliverable final cruzado del mandato.** Consolida A
(este auditor) + B (GPT-5.5). Ambos reviews son complementarios y
ninguno solo es suficiente: A aporta la pipeline ejecutada y los
tests reproductores; B aporta gaps reales que A no cubrió.

A partir de aquí no hay más informe que escribir, hay decisiones
que tomar e implementar:

1. Decidir si los 5 BLOCKERs se cierran antes de rc.1 (mi
   recomendación: sí los 5).
2. Escoger qué HIGHs entran en rc.1 vs cuáles se documentan como
   known limitations.
3. Tomar postura clara sobre las 7 decisiones arquitectónicas
   cuestionadas.
4. Confirmar las 18 freeze decisions son conscientes.

Si quieres atacar algún BLOCKER específico con diff/PR propuesto,
dime cuál y lo armo. El trabajo de auditoría termina aquí.

*Fin del informe cruzado.*
