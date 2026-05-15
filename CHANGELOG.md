# Changelog

Todos los cambios notables de este paquete se documentan aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/),
versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added

- **`Tooltip` ampliado a los 12 placements de Floating UI [M-04]**: el
  type `TooltipPlacement` pasa de 4 (`top` / `bottom` / `left` / `right`)
  a los **12 valores nativos** de Floating UI — 4 sides × 3 alignments
  (base, `-start`, `-end`):

  ```ts
  type TooltipPlacement =
    | "top" | "top-start" | "top-end"
    | "right" | "right-start" | "right-end"
    | "bottom" | "bottom-start" | "bottom-end"
    | "left" | "left-start" | "left-end";
  ```

  Sin cambios CSS — las clases `.ig-tooltip-place-*` siguen siendo
  hooks informativos vacíos (Floating UI posiciona vía inline styles).
  La nueva clase `.ig-tooltip-place-top-start` y resto se emiten
  automáticamente.

  Sin breaking — los 4 placements antiguos siguen siendo válidos. Solo
  amplía el conjunto de opciones permitidas.

  Tests: `describe.each` ampliado a los 12 placements.
  Stories: nuevo layout 3x3 + alas mostrando los 12 placements simultáneamente.

### Changed

- **`"use client"` granular por archivo en lugar de global [H-09]**: el
  barrel `src/index.ts` ya no lleva `"use client";` global. En su lugar,
  los **48 archivos** que dependen de hooks React, browser APIs o context
  interno llevan la directive en su propio archivo. Los **44 archivos
  restantes** (Card subcomponents, Dialog body/footer/close, Sidebar
  items, Navbar pieces, Skeleton, Spinner, Badge, Progress, Divider,
  Timeline, etc. — ~49% del DS) son server-safe y pueden renderizarse
  desde React Server Components sin forzar boundary client en el árbol
  consumer.

  Impacto consumers RSC: árboles puramente presentacionales (p.ej.
  `<Card><CardBody>...</CardBody></Card>`) ya no escalan el "client
  boundary" innecesariamente. Para componentes interactivos (`Switch`,
  `Tabs`, `Dialog`, `Toast`, etc.) el comportamiento es idéntico — la
  directive sigue presente, ahora a nivel archivo.

  Sin impacto en SPA / Vite dev / Storybook — la directive es no-op
  fuera de bundlers RSC-aware (Next.js App Router, Remix, etc.).

### Breaking

- **`ThemeSwitch` → `ThemeToggle` (rename JS, sin cambios CSS)**: el componente
  se renombra a `ThemeToggle` para reflejar fielmente su comportamiento (toggle
  binario light/dark) y desacoplar el nombre público de la implementación
  interna (que sigue usando `<Switch>` por dentro). Alinea con la industria
  (Radix, ShadCN, MUI usan `ThemeToggle`/`ThemeButton`).

  Migración consumers:
  ```diff
  - import { ThemeSwitch } from "reactigoded";
  - <ThemeSwitch defaultTheme="dark" />
  + import { ThemeToggle } from "reactigoded";
  + <ThemeToggle defaultTheme="dark" />
  ```

  Tipo de props renombrado en paralelo: `ThemeSwitchProps` → `ThemeToggleProps`.

  **CSS sin cambios**: `ThemeToggle` sigue emitiendo `.ig-switch` (delega
  en `<Switch>` internamente). Consumers que customicen vía CSS de
  `.ig-switch` no se ven afectados.

- **Tabs API alineada a Radix puro (rename + wrapper eliminado)**: la API
  pública se simplifica a `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`
  con composición 100% Radix-style. Cierra inconsistencia interna del DS y
  alinea con la industria (Radix, ShadCN, Ark UI).

  | Antes | Después | Notas |
  |---|---|---|
  | `Tab` | `TabsTrigger` | trigger del tab |
  | `TabList` | `TabsList` | coherencia plural con `TabsContent`/`TabsContext` |
  | `TabPanel` | `TabsContent` | panel asociado al `value` |
  | `<TabsContent>` (wrapper sin lógica) | ❌ eliminado | era Caso 1 (`<div ig-tabs-content>` puro). Padding-top movido a `.ig-tabs-content` (el panel renombrado). |

  API final 100% Radix-style:
  ```tsx
  <Tabs>
    <TabsList>
      <TabsTrigger value="a">A</TabsTrigger>
    </TabsList>
    <TabsContent value="a">…</TabsContent>
  </Tabs>
  ```

  CSS coordinado:
  - `.ig-tab` → `.ig-tabs-trigger` (con sufijo `-active`)
  - `.ig-tab-panel` → `.ig-tabs-content` (con sufijo `-active`)
  - `.ig-tabs-list` SIN cambio (ya plural pre-RC1)
  - `.ig-tabs-content` (wrapper original) eliminada — el panel renombrado
    hereda el nombre.
  - Utilities `.ig-tab-1/2/4/8` (tab-size CSS) **SIN cambios** — son
    typography utilities, no componente Tabs.

  Tokens CSS-variable `--ig-tab-*` **mantenidos** (no renombrados) por
  compatibilidad con custom CSS de consumers (mismo criterio que
  `--ig-z-modal` en PR 3).

  Razón última: paralelismo con `Menu`/`MenuTrigger`/`MenuContent`
  post-PR Menu — los compounds del DS siguen el mismo patrón
  estructural `<X>` / `<XTrigger>` / `<XContent>`.

  Migración:
  ```diff
  - import { Tabs, TabList, Tab, TabPanel, TabsContent } from "reactigoded";
  + import { Tabs, TabsList, TabsTrigger, TabsContent } from "reactigoded";

  - <Tabs>
  -   <TabList>
  -     <Tab value="a">A</Tab>
  -   </TabList>
  -   <TabsContent>
  -     <TabPanel value="a">...</TabPanel>
  -   </TabsContent>
  - </Tabs>
  + <Tabs>
  +   <TabsList>
  +     <TabsTrigger value="a">A</TabsTrigger>
  +   </TabsList>
  +   <TabsContent value="a">...</TabsContent>
  + </Tabs>
  ```

- **`Modal` → `Dialog` (rename + regularización CSS-JS)**: el componente JS
  se renombra a `Dialog` para alinear con el HTML element nativo `<dialog>`
  (que ya usaba internamente) y con la industria (Radix, Ark UI, HeadlessUI,
  MUI usan `Dialog`). Las clases CSS ya estaban nombradas `.ig-dialog-*`
  (alineación previa), por lo que NO cambian. Este rename regulariza la
  inconsistencia legacy: componente `Modal` (JS) emitiendo clases
  `.ig-dialog-*` (CSS).

  Renames JS:

  | Antes | Después |
  |---|---|
  | `Modal` | `Dialog` |
  | `ModalBody` | `DialogBody` |
  | `ModalHeader` | `DialogHeader` |
  | `ModalFooter` | `DialogFooter` |
  | `ModalClose` | `DialogClose` |
  | `ModalProps` (y `Modal*Props` subcomponentes) | `DialogProps` (y `Dialog*Props`) |
  | `ModalContext` (interno) | `DialogContext` (interno) |
  | `ModalSize` / `ModalBackdrop` (types) | `DialogSize` / `DialogBackdrop` |

  Las **clases CSS `.ig-dialog-*` SIN cambios** (ya alineadas pre-RC1).
  Tokens `--ig-z-modal` / `--ig-z-modal-backdrop` se mantienen como
  utilities z-index genéricas (no renombradas para preservar
  compatibilidad con custom CSS de consumers).

  Migración:
  ```diff
  - import { Modal, ModalBody, ModalHeader, ModalFooter, ModalClose } from "reactigoded";
  + import { Dialog, DialogBody, DialogHeader, DialogFooter, DialogClose } from "reactigoded";
  ```

- **`Menu` internals migrados a Floating UI (C-03)**: `Menu` reescrito sobre la
  capa `floating/primitives/` (PR #62). Reemplaza ~600 LOC hand-rolled de
  navegación por hooks composables:

  - `useListNavigation` con `focusItemOnOpen: 'auto'` (APG menu pattern: arrows
    abren menu + focan primer/último item; click abre sin focar).
  - `useTypeahead` (focus por primera letra, APG).
  - `useDismiss({ bubbles: { escapeKey: true } })` (cascade dismiss via
    `<FloatingTreeRoot>`).
  - `FloatingFocusManager` con `initialFocus={-1}` + `returnFocus` (defiere
    focus management a useListNavigation, devuelve foco al trigger al cerrar).
  - `useFloatingNode` para registrar el Menu en el FloatingTree (cascade dismiss
    cuando hay descendientes flotantes como Tooltip dentro de MenuItem).

  API pública (`open`/`defaultOpen`/`onOpenChange`/`placement`/`direction`/
  `closeOnSelect`) y compound shape (`Menu`/`MenuTrigger`/`MenuContent`/
  `MenuItem`/`MenuSeparator`/`MenuLabel`) sin cambio. Las clases CSS
  `.ig-menu-*` mantienen mismo contrato.

  Breaking de tipos en callbacks de `MenuItem`:
  - `onClick` y `onKeyDown` cambian de `MouseEvent<HTMLAnchorElement>` /
    `MouseEvent<HTMLButtonElement>` (según rama) a `MouseEvent<HTMLElement>`
    (genérico). Mismo para `KeyboardEvent`. Audit pre-RC1 verificó cero usage
    de API anchor/button-specific (`.href`, `.disabled`, etc.) en callbacks
    de MenuItem en repo + cero consumers reales.

  Migración consumers futuros que necesiten API element-specific:
  ```tsx
  onClick={(e) => {
    if (e.currentTarget instanceof HTMLAnchorElement) {
      e.currentTarget.href;  // narrow type-safe
    }
  }}
  ```

- **`OptionsMenu` → `Menu` + 5 subcomponentes renombrados (B-01 redefinido)**:
  alineación con la industria. 5 de 7 librerías top (MUI, Mantine, Ark UI,
  HeadlessUI, Chakra) usan el nombre canónico `Menu`. B-01 original (rename
  `Dropdown` → `OptionsMenu` pre-RC1) liberaba el nombre `Dropdown` para una
  migración FUI futura; la decisión 2026-05-10 unifica directamente a `Menu`.

  | Antes | Después | Notas |
  |---|---|---|
  | `OptionsMenu` | `Menu` | core |
  | `OptionsMenuTrigger` | `MenuTrigger` | core |
  | `OptionsMenuContent` | `MenuContent` | core |
  | `OptionsMenuItem` | `MenuItem` | core |
  | `OptionsMenuDivider` | `MenuSeparator` | rol ARIA correcto `separator` |
  | `OptionsMenuHeader` | `MenuLabel` | label de sección dentro del menu |

  CSS coordinado:
  - `.ig-options-menu-*` → `.ig-menu-*`
  - `.ig-options-menu-divider-*` → `.ig-menu-separator-*`
  - `.ig-options-menu-header-*` → `.ig-menu-label-*`

  Migración:
  ```diff
  - import { OptionsMenu, OptionsMenuTrigger, OptionsMenuItem } from "reactigoded";
  + import { Menu, MenuTrigger, MenuItem } from "reactigoded";
  ```

- **`Tooltip` Slot pattern (D-01 / M-05 / B-03 / H-01)**: el componente
  ya **no envuelve al child en `<span class="ig-tooltip-wrapper">`**.
  El render emite el child clonado + un `<span class="ig-sr-only"
  role="tooltip" inert>` sibling + el portal flotante. La API pública
  de props (`text`, `placement`, `variant`, `openDelay`, `closeDelay`,
  `container`) no cambia, **pero**:

  - **CSS público**: la clase `.ig-tooltip-wrapper` ya no se emite. Si
    tenías reglas CSS dirigidas al wrapper (layout, espaciado), aplica
    los estilos al child directamente o envuélvelo manualmente en tu
    propio span/div.
  - **Tipos de `TooltipProps`**: dejan de extender
    `HTMLAttributes<HTMLSpanElement>`. `className`, `ref` y
    `...rest` HTML props del wrapper desaparecen del tipo. Si pasabas
    `<Tooltip className="..." ref={spanRef}>`, el TS error es
    intencional — esos props no tenían destino fiable post-Slot.
  - **Layout**: si el child es block-level (e.g. `<div>`, `<table>`),
    ahora respeta el flujo natural (antes, el wrapper `display:
    contents` lo neutralizaba pero introducía un nodo silencioso).

  Razón: el wrapper rompía block-level layouts del consumer y obligaba
  a CSS extra para corregirlo. M-05 y D-01 lo señalaban; en RC1 se
  cierran.

### Añadido

- **`FloatingTreeRoot` y `useFloatingNode`** (B-03 / H-01): nueva capa
  `floating/primitives/` con un wrapper opt-in (`<FloatingTreeRoot>`)
  que habilita cascade dismiss entre `Tooltip` y futuros floats
  (`Popover`, `HoverCard`, `Dropdown` FUI 1.x+) cuando se anidan. Sin
  el root, los floats funcionan independientes (sin regresión).

  ```tsx
  import { FloatingTreeRoot } from "reactigoded";

  function App() {
    return (
      <FloatingTreeRoot>
        <RouterProvider router={router} />
      </FloatingTreeRoot>
    );
  }
  ```

  El hook `useFloatingNode()` devuelve `{ nodeId, parentId }` para que
  componentes flotantes del DS se registren en el árbol activo.
  `Tooltip` ya lo consume internamente.

### Notas operativas

- **Sin publicación a npm pre-RC1** (M-03 / cf. `docs/RC1_DECISIONS.md`
  § "Actualización 2026-05-06: pausa operativa"). Pre-RC1 el paquete
  se consume vía `git clone` + `npm link`. Iván decidió pausar
  `npm publish --tag beta` de `1.0.0-beta.22` hasta tener capacidad
  operativa para sostener el mantenimiento (issues, PRs de consumers,
  semver discipline). El branch `rc1-gate-fixes` ya cerró los 18
  Blockers + 8 Highs del gate review; la calidad del código no
  requiere publicación inmediata para ser real.
- **Tag git `v1.0.0-rc.1`** se creará tras la sesión de FREEZE-CHECK
  para trazabilidad histórica del repo, **sin acompañar de
  `npm publish`** mientras la pausa siga vigente.
- **Reactivación de la publicación** seguirá el procedimiento
  documentado en `docs/RC1_DECISIONS.md`: bumpear versión, revertir
  commit B-01-followup (banner del README), `npm publish --tag rc`.

## [1.0.0-beta.22] — 2026-05-06 (saneamiento RC1)

Cierra los 18 Blockers + 8 Highs del audit RC1
(`rc1-gate-review-reactigoded.md`) más limpieza adicional descubierta
durante el ciclo. **Última pre-release antes de `1.0.0-rc.1`**.

### Breaking

- **Sidebar**: prop `ariaLabel` eliminada por consistencia con el resto
  del DS (Pagination, Spinner, Stepper, TabList, Rating, Timeline ya
  habían eliminado la prop separada en beta.4 y posteriores). Sidebar
  era el último outlier. Migration:
  ```diff
  - <Sidebar ariaLabel="Navegación principal">…</Sidebar>
  + <Sidebar aria-label="Navegación principal">…</Sidebar>
  ```
  Sin override sigue cayendo al default ES `"Navegación lateral"`.
- **Skeleton**: cambio del patrón ARIA. `Skeleton` ahora es decorativo
  (`role="presentation"` + `aria-hidden="true"`). Para anunciar carga
  al lector de pantalla, envuelve un grupo en
  `<SkeletonContainer label="...">`, que dispara UN solo aviso
  (`role="status"` + `aria-busy` + `aria-live="polite"`). El patrón
  anterior generaba spam de "status busy" en SR cuando había varios
  `Skeleton`. Migration:
  ```diff
  - <Skeleton variant="text" />
  - <Skeleton variant="text" />
  + <SkeletonContainer label="Cargando lista">
  +   <Skeleton variant="text" />
  +   <Skeleton variant="text" />
  + </SkeletonContainer>
  ```
  El layout del wrapper es neutro (`display: contents`): no añade caja
  al flujo, los hijos se posicionan como si el container no existiese.

### Added

- **`SkeletonContainer`** [B-12]: nuevo wrapper a11y para grupos de
  `Skeleton`. Props: `label?: string` (default ES
  `"Cargando contenido…"`), `children`. Acepta `aria-label` directo
  vía rest (gana sobre `label`).
- **`Pagination` uncontrolled state sync** [B-18]: cuando `totalPages`
  baja por debajo del page interno, el componente sincroniza `page`
  al clamped current con `silent: true` (no dispara `onValueChange`).
  Cuando `totalPages` vuelve a subir, NO "salta" al page viejo.
- **`Tabs` controlled inválido — fallback tab stop** [H-26]: cuando
  `value` no matchea ningún Tab montado, el primer Tab registrado
  recibe `tabIndex=0` para mantener el tablist navegable por
  teclado. `aria-selected` permanece `false` en todos. Mensaje de
  warn dev actualizado.
- **`useControllableState` warn re-aplicado** [B-08-followup en
  beta.21]: ahora con escape hatch `__suppressNoHandlerWarn` que se
  elimina del `.d.ts` publicado vía `stripInternal`.
- **`Card.ref` polimórfica tipada** [B-03]: `ref` infiere desde
  `as`. `<Card as="a" ref={r}>` → `r` es `RefObject<HTMLAnchorElement>`.
- **Skeleton + Stepper data-step-index** [H-25]: el dot interactivo
  del Stepper expone `data-step-index` (implementation detail, NO
  API pública) para que el effect post-commit de focus management
  resuelva por índice lógico, no por orden DOM.

### Fixed

- **Bundle prod sin `console.*` dev warns** [B-07]: 9 componentes
  migrados de `if (!isDev())` a `if (!import.meta.env.DEV)` para
  que esbuild/Vite hagan DCE de los warn dev en build de producción.
  Verificado: `grep -c console.* dist/index.js` = 0; `grep -c
  console.* dist/index.cjs` = 0. CI ahora gated por step explícito.
- **`ThemeSwitch` respeta `<html data-theme>` pre-puesto** [B-08]:
  el derive lee `<html data-theme>` antes de caer a `defaultTheme`,
  así que un script anti-flash del consumer
  (`<html data-theme="light">` antes de hidratar) ya no se sobreescribe.
  6 tests añadidos (incluido SSR `renderToString` smoke + SSR test
  versión A que stuba `globalThis.document` y valida el branch
  `typeof document === "undefined"` del derive).
- **`Stepper` focus management sin `setTimeout`** [H-25]: el focus
  al nuevo step ya no usa `setTimeout(0)`; ahora usa un
  `useEffect([active])` post-commit y `data-step-index` para resolver
  el target de forma robusta contra conditional rendering, Steps
  decorativos sin role=button, o CSS reordering.
- **`Slider` warn dev cuando `value=NaN`** [H-27]: el path controlled
  no-finito ya no es silencioso; emite warn dev-only similar al que
  existía para `defaultValue` no-finito.
- **`Sidebar` blindaje a11y** [B-09]: `role`/`aria-busy`/`aria-live`
  en `<aside>` no pueden ser overrideados por consumer (extracción
  explícita de `aria-label` desde rest). Mismo patrón canónico del DS.
- **`Card.ref` con `Ref<unknown>`** [B-03]: pasa a
  `ComponentPropsWithRef<C>["ref"]`. Consumers en strict TS configs
  ya no reciben tipo laxo.
- **Sitio (igoded.es / Storybook)**:
  - `<html lang="es">` forzado runtime + estático [B-04 + B-04-followup].
  - Dedupe de `<title>` y `<meta name="description">` [B-05]. Causa
    raíz arreglada: metas estáticas consolidadas en
    `.storybook/manager-head.html` (eran duplicadas con
    `main.ts:managerHead()`); el script runtime queda como red de
    seguridad defensiva.

### Internal

- **`stripInternal: true`** en `tsconfig.build.json` [B-02]:
  `__suppressNoHandlerWarn` y cualquier miembro `@internal` no
  aparecen en el `.d.ts` publicado.
- **Excludes del dts publicado** [B-06]: `src/test-utils/`,
  `src/stories/`, helpers internos (`env.ts` borrado, `useIsoLayoutEffect`,
  `mergeDescribedBy`) ya no viajan al tarball. Script
  `scripts/clean-internal-dist.mjs` post-build defensivo.
- **`vite-env.d.ts` aislado** [B-07-followup]: nuevo
  `src/_internal-env.d.ts` con SOLO `ImportMetaEnv` para que tsc.build
  resuelva `import.meta.env.DEV` sin contaminar el dts publicado con
  `declare module "*.css"`.
- **MDX foundations canónicamente en `docs/`** [M-06]: 6 páginas
  movidas de `src/stories/` a `docs/`. Storybook `main.ts` añade
  `../docs/**/*.mdx` a `stories`.
- **`"use client";` en bundle** [B-17]: directiva añadida vía
  `output.banner` en `vite.lib.config.ts` (además del source) para
  garantizar que llega al bundle final tras minify. Soporta consumers
  Next.js App Router en Server Components.
- **CI verify pipeline reforzado**:
  - `test:scope-leaks --strict` [B-15] añadido como step.
  - `verify:unit` ahora encadena `test:unit:ci` (isolate + forks),
    no `test:unit` [B-16].
  - Bundle dev-warn guard con greps explícitos [B-07-followup].
  - Chromatic sin `--auto-accept-changes=main` ni
    `--exit-zero-on-changes` [H-02]: revisión visual humana
    obligatoria pre-RC1.
- **Build optimizado** [H-04]: `vite.lib.config.ts`
  `build.minify: "esbuild"`. Shave ~15% del bundle gzipped.
- **Perceptual allowlist** [B-13]: reversión consciente del tripwire
  `dark axis-kobalium` (ΔE 0.0522) introducido en c8a5202 (beta.18).
  El tripwire nunca fue operativo (`error_threshold=0.05 < 0.0522`).
  NO se tocan tokens. Anti-regresión:
  `src/_audit/perceptual-allowlist.test.ts` falla CI si la entrada
  desaparece sin razón documentada.
- **`merge-refs` consistente**: Stepper, Checkbox y Switch usan
  ahora el mismo patrón `useCallback(setRefs, [ref])`.
- **Higiene del repo**: `.claude/`, `.notes-*`, `.release-*`,
  `BLOQUEOS.md`, `SESION-RESUMEN*.md` añadidos a `.gitignore`.
  `src/utils/env.ts` (huérfano post-B-07) borrado.

### Docs

- **Pagination** uncontrolled documentado en README [B-14].
- **`Introduction.mdx`**: banner pre-publicación recomendando
  `npm install reactigoded@beta` [B-11].
- **`state.css` size** corregida en 4 sitios:
  `~6.5 MB sin gzip / ~700 KB gzipped` (antes "7.1 MB") [B-11].
- **JSDoc** de `Rating`, `Tabs`, `TabsContext`: ejemplos migrados
  a `aria-label` HTML estándar (antes mostraban API obsoleta
  `ariaLabel`) [B-10].
- **`docs/DS_AUTOSUFFICIENCY_DEBT.md`** capa 1.4 marcada cerrada
  [H-06].
- **CHANGELOG** referencia stale a `BLOQUEOS.md` reemplazada por
  puntero a `docs/DS_AUTOSUFFICIENCY_DEBT.md` [H-07].
- **`docs/RC1_DECISIONS.md`**: registro de las 4 decisiones humanas
  B1-B4 confirmadas explícitamente.
- **`docs/POST_RC1_BACKLOG.md`** + **`docs/RC1_FOUND_DURING_FIX.md`**:
  trackers de la deuda diferida y los hallazgos descubiertos durante
  el ciclo.
- **README**: sección "Desarrollo" documenta el requisito de
  `npm ci --legacy-peer-deps` [H-08].

### Bundle stats (size-limit, gzip)

| Bundle | Tamaño | Límite | Uso |
|---|---|---|---|
| JS ESM | 13.96 KB | 16 KB | 87% |
| JS CJS | 12.39 KB | 15 KB | 83% |
| state.css | 713.54 KB | 800 KB | 89% |
| components.css | 28.05 KB | 75 KB | 37% |
| tokens.css | 6.53 KB | 30 KB | 22% |

JS ESM bajó de 14.91 KB (beta.21) a 13.96 KB tras añadir
`build.minify: "esbuild"` (H-04), absorbiendo además el coste del
`SkeletonContainer` nuevo y los 5 tests de hook adicionales.

## [1.0.0-beta.21] — 2026-05-05

### Added
- **`useControllableState`** dev warn re-aplicado vía Option E
  (escape hatch interno `__suppressNoHandlerWarn`). Avisa cuando
  un componente está en modo controlled (`value` definido) sin
  `onChange` y sin el flag de suppress. Una vez por instancia.
  Tras el revert en beta.20 por falsos positivos en
  `Rating.SoloLectura`, ahora cada componente con modo
  display-only legítimo (Rating con `readOnly`) suprime el warn
  vía el flag interno.
- **Audit consistente del hook** en los 9 componentes que lo
  usan: Rating y Slider ahora pasan `onChange: onValueChange` al
  hook (eliminando llamadas duplicadas locales). Switch usa
  `__suppressNoHandlerWarn: true` permanente porque su `onChange`
  recibe `ChangeEvent` (no boolean) y tiene un warn local más
  específico.
- **Script `scripts/check-css-scope-leaks.mjs`** + allowlist
  `scope-leak-allowlist.json`. Cierra deuda capa 3.1 (PRIORIDAD
  ALTA). Detecta riesgo de scope-leak: clases globales
  modificadoras (`.ig-X-active`, `.ig-X-danger`…) emitidas en >1
  elemento del mismo componente. Modo `--strict` integrado en
  `verify:unit` pipeline. Run inicial: 420 candidatas / 6
  allowlisted (audit case-by-case con razón documentada) / 0
  riesgos nuevos.

### Tests
- Hook: 5 tests del warn (dispara/no dispara/escape hatch/una
  vez por instancia).
- Rating: 2 tests anti-regresión (`readOnly` no genera warn;
  controlled sin readOnly y sin onValueChange sí lo genera).

### Internal
- `Rating.stories.tsx AllStates`: instancias `<Rating value={N} />`
  marcadas `readOnly` (eran galería visual, no interactivas).
- README.md: actualizado a "última publicación: 1.0.0-beta.20".

## [1.0.0-beta.20] — 2026-05-05

### Added
- **`Card`**: prop polimórfica `as` con genéricos TS
  (`<C extends ElementType = "div">`). Acepta strings HTML
  (`as="article"`, `as="a"` con `href` tipado) y componentes
  (`as={Link}` para react-router/next). Las props específicas del
  elemento subyacente se tipan automáticamente. Story `Polimorfica`
  añadida.
- **`Pagination`**: modo **uncontrolled** vía `useControllableState`.
  `currentPage` y `onValueChange` ahora opcionales; `defaultPage`
  (default 1) inicializa el state interno. Patrón consistente con
  Tabs / Accordion / OptionsMenu / etc. Story `Uncontrolled` añadida.
- **`Stepper`**: modo **interactive** opt-in con `onValueChange`.
  Cuando se pasa el callback, cada step se vuelve focuseable
  (`role="button"` + roving tabIndex) y soporta keyboard nav
  completo: ArrowLeft/Right/Up/Down, Home/End, Enter/Space. Sin
  `onValueChange` permanece presentational (backwards compatible).
  Nueva clase `.ig-step-interactive`. `aria-label="Paso N"` en
  cada dot interactivo.
- **`Progress`**: props `loadingLabel` (default `"Cargando"`) y
  `formatLabel?: (percent: number) => string` para i18n del
  `aria-label`. Cierra el inventario de strings hardcoded
  user-facing del DS.
- **`AllStates` matrix Ola 2 (16 componentes)**: stories
  `chromatic.modes light+dark` para Alert, Radio, Rating, Slider,
  Stepper, Pagination, Tooltip, Timeline, Accordion, Sidebar,
  Navbar, ThemeSwitch, Toast, OptionsMenu, Modal, Input compound,
  Table, Textarea, NativeSelect. Cobertura visual completa en Chromatic
  bajo dual-mode.
- **`useControllableState` derive mode**: `ThemeSwitch` migrado
  a `useControllableState({ derive, setDerivedValue, ... })`.
  Consolida los 9 componentes con state controlled/uncontrolled
  bajo el mismo hook + soporte explícito para fuente de verdad
  externa.
- **`docs/CSSAPI.mdx`**: nueva sección "i18n y a11y strings" con
  tabla de overrides + patrón de uso con `react-i18next`. Notas
  sobre `Card.as` polimórfica y `Pagination` controlled+uncontrolled.
- **`docs/DS_AUTOSUFFICIENCY_DEBT.md`**: capa 6 nueva
  "Convenciones de tests unit". 6.1 ✅ regla anti-`console.error`
  mock para warnings React (causa: vitest `isolate: false` +
  React dedupe). 6.2 ✅ nota DOM Switch (`ig-switch` en `<label>`).
- **`src/test-utils/`**: utilities `queryAllByRoleSafe()` y
  `expectAtLeast()` exportadas (capa 1.5/1.6 debt doc).
- **Tests del CONTRATO** de `useControllableState` (4 tests
  hook-first cubriendo ambos modos × ambas direcciones de
  transición controlled↔uncontrolled). Smokes en componentes
  con input nativo (Rating, Slider, Switch).

### Changed
- **`Pagination`**: `currentPage` y `onValueChange` pasaron de
  required a opcionales. Cambio API público pre-1.0.0 (sin
  breaking productivo). Consumers que ya pasaban ambos siguen
  funcionando idénticamente.
- **`Stepper`**: clase global `.ig-step-active` migrada a selector
  compound `.ig-step.ig-step-active` para evitar scope-leak al
  wrapper `.ig-step-item.ig-step-active` (bug latente desde beta.5
  detectado en sub-Bloque A: dejaba label en contraste 1.02).
  Anti-regresión test añadido.
- Defaults ES de strings user-facing (`Alert.closeLabel`,
  `Chip.removeLabel`, `ModalClose aria-label`, `Pagination.prevLabel`/
  `nextLabel`, `Progress.loadingLabel`, `Stepper aria-label`,
  `Toast.closeLabel`) declarados intencionales en `CSSAPI.mdx`.
  Audience inicial hispanohablante; cambio a EN se reevaluará en
  1.1.0 si demanda real lo justifica.
- **`Slider` / `Switch`** tests viejos de transición controlled↔
  uncontrolled que afirmaban sobre warning de React vía
  `console.error` mock reemplazados por assertions sobre
  comportamiento observable. Los anteriores eran flaky por orden:
  vitest `isolate: false` + React dedupe de warnings dev por
  proceso. Documentado como regla en debt doc capa 6.1.

### Fixed
- **`Stepper`**: scope-leak CSS de `.ig-step-active` (ver Changed).
- Documentación JSDoc de `Switch` clarifica estructura DOM
  (`ig-switch` en `<label>` wrapper, NO en `<input>`).

### Internal
- Stories storybook con `chromatic.modes light+dark` ya
  proporcionan dual-theme matrix sin duplicar archivos test:storybook.
- Tracking de decisiones diferidas y deuda RC1 vive en
  `docs/DS_AUTOSUFFICIENCY_DEBT.md`.
- Decisión arquitectónica registrada: warn dev de
  `useControllableState` para `value=` sin `onChange=` diferido a
  rc.1 con escape hatch interno `__suppressNoHandlerWarn`.
  Intento beta.20 (commit 2975e19) revertido por falsos positivos
  en `Rating.SoloLectura` (readOnly legítimo). Diseño Option E
  documentado en debt doc sección 1.4.

### Bundle stats (size-limit, gzip)

| Bundle | Tamaño | Límite | Uso |
|---|---|---|---|
| JS ESM | 14.91 KB | 15 KB | 99.4% |
| JS CJS | 12.85 KB | 15 KB | 85.7% |
| `tokens.css` | 6.53 KB | 30 KB | 21.8% |
| `components.css` | 28.05 KB | 75 KB | 37.4% |
| `base.css` | 453 B | 2 KB | 22.7% |
| `reset.css` | 924 B | 2 KB | 46.2% |
| `fonts.css` | 142 B | 1 KB | 14.2% |
| `state.css` | 713.54 KB | 800 KB | 89.2% |
| `design.css` (meta) | 70 B | 2 KB | 3.5% |

JS ESM al 99% del budget — beta.21/rc.1 debería revisar headroom o
subir el límite ante crecimiento de features (Card.as polimórfica
+ Stepper keyboard nav son los principales nuevos). state.css cerca
del límite (89%) — es natural por el growth de utilities pseudo-class.

## [1.0.0-beta.19] — 2026-05-04

### Breaking
- **Tooltip**: clases CSS migradas a prefijos únicos para evitar
  colisión semántica.
  - `ig-tooltip-{top,right,bottom,left}` → `ig-tooltip-place-{...}`
  - `ig-tooltip-{brand,secondary,success,warning,danger,info}` →
    `ig-tooltip-color-{...}`
  Solo afecta a consumers vanilla con clases hardcoded; React API
  intacta. Migración automática vía `scripts/migrate-tooltip-prefixes.mjs`.
- **OptionsMenu**: clase de estado abierto migrada de `.open` a
  `.ig-options-menu-open` para respetar la convención de namespace `ig-*`.
- **Stepper**: prop `defaultActive` eliminada (era engañosa — el
  componente nunca fue uncontrolled). Migración:
  `<Stepper defaultActive={X}>` → `<Stepper active={X}>`. Si necesitas
  uncontrolled, mantén `[step, setStep]` en el consumer.
- **Navbar**: dos booleans `sticky`/`fixed` mutuamente excluyentes
  reemplazados por un único `position?: 'sticky' | 'fixed'`.
  Migración:

  | Antes | Después |
  |---|---|
  | `<Navbar sticky>` | `<Navbar position="sticky">` |
  | `<Navbar fixed>` | `<Navbar position="fixed">` |
  | `<Navbar sticky fixed>` | (TS error, antes silencioso) |

### Fixed
- **OptionsMenu**: keyboard open salta items con `aria-disabled="true"`
  desde el trigger (fix incompleto del bug original que solo cubría
  `OptionsMenuItem`). Selector compartido en `optionsMenuSelectors.ts`.
- **Tabs**: sin `value`/`defaultValue` selecciona el PRIMER tab
  registrado, no el último. El auto-select usa `setSelectedRaw` con
  `{ silent: true }` — ya no dispara `onValueChange`.
- **Pagination**: clamp completo de `currentPage`, `totalPages` y
  `siblingCount` fuera de rango (NaN, Infinity, negativos). Separación
  `prevLabel`/`nextLabel` (children visible) de
  `prevAriaLabel`/`nextAriaLabel` (a11y).
- **Progress**: guards para `max ≤ 0` o no-finite.
- **Slider**: guard NaN.
- **Card**: `tabIndex={0}` automático cuando actsAsButton (con override
  explícito respetado).
- **Rating**: `readOnly` aplica `aria-readonly` al radiogroup, no
  `disabled` a los radios (mejora a11y para SR).
- **Checkbox**/**Switch**/**Tab**: `useLayoutEffect` con fallback
  `useEffect` en SSR (no `() => {}`). Util compartida
  `src/utils/useIsoLayoutEffect.ts`.
- **Tab**: keyboard nav usa `closest('[role="tablist"]')` en lugar de
  `parentElement` (robustez ante wrappers).
- **Tooltip**: warn dev-only si `children` no es elemento React válido.
- **README**: clases para migración de `<button>` corregidas
  (`.ig-btn*`, no `.ig-button*`).
- **igoded-design.css**: cabecera `info → axis` corregida a
  `info → kobalium`.
- **manager.ts** y stories Card/Avatar: hex de paleta actualizados a
  la vigente desde beta.16 (`#5eded5` → `#3ae2f7`,
  `#d4c2f9` → `#d2bff7`).
- **SKILL.md**: tabla ΔE OKLab regenerada con cifras reales (eran de
  paleta pre-beta.16).
- **styles.test.ts**: test "7 cardinales" verificaba 6, faltaba
  kobalium.
- **mixColors** en `check-component-contrast.mjs`: shortest-arc para
  hue circular (bug latente que no se disparaba con tokens actuales
  pero podía con futuros).

### Added
- **`useControllableState<T>`** hook centralizado para patrón
  controlled/uncontrolled, con setter `silent` opt-in. **9
  componentes migrados**: Switch, Sidebar, Slider, Rating, Accordion
  (single + multiple), Alert, OptionsMenu, Tabs. 9 tests del hook
  (incluyendo `setValue` con `{ silent: true }` para auto-selects y
  rehidratación de fuentes externas no-de-usuario).
- **AllStates Ola 1** — 14 stories matrix con `chromatic.modes`
  light + dark: Button, Input, Checkbox, Switch, Tabs, Progress,
  Card, Badge, Spinner, Skeleton, Divider, Breadcrumb, Avatar, Chip.
  Util compartida `src/stories/_matrix.tsx` con `MatrixGrid`. 28
  snapshots Chromatic. Ola 2 (16 componentes interactivos +
  compounds) en beta.20.
- **Tests regresión visual AllStates** — 14 tests vía `composeStory`,
  uno por componente Ola 1, anti-regresión de "alguien borra una
  variant".
- **`Fundamentos/CSS API pública`** — MDX exhaustiva con tabla
  detallada y ejemplo HTML por los 32 componentes para consumers
  vanilla. Linkada desde el README.
- **`Fundamentos/Catálogo AllStates`** — índice MDX que lista los
  matrices visuales por ola.
- **`scripts/perceptual-allowlist.json`** con 2 excepciones
  documentadas (`laurus-vitreus` LIGHT 0.0847,
  `malum-rutilus` DARK 0.0706).
- **`check-component-contrast.mjs --print-perceptual-table`** modo
  debug para regenerar tabla del SKILL.
- **Tests añadidos** (no exhaustivo): OptionsMenu aria-disabled (×2),
  Tabs auto-select silent (×4), Pagination clamps (×6),
  Pagination prev/nextAriaLabel (×2), Progress guards (×6),
  Card tabIndex (×3), Rating aria-readonly (×2),
  useControllableState (×9), Tab keyboard wrapped, Spinner.label i18n
  (×3), Sidebar.ariaLabel i18n (×3).
- **`.github/workflows/verify.yml`** — gate CI completo (lint,
  typecheck, test:unit, test:contrast, build, verify:size) + job
  separado `storybook` con playwright.
- **`size-limit`** budget para `igoded-state-css.css` (techo 800 KB
  gzip).
- **`src/utils/env.ts`** — `isDev()` helper sin global augmentation.
- **`src/utils/useIsoLayoutEffect.ts`** — patrón canónico SSR-safe.
- **i18n explícitas**: `Spinner.label`, `Sidebar.ariaLabel`,
  `Avatar.statusLabel`, `Pagination.prevAriaLabel`/`nextAriaLabel`.
- **`scripts/migrate-tooltip-prefixes.mjs`** — pase con PostCSS AST
  para la migración de Tooltip.

### Changed
- **`scripts/check-component-contrast.mjs`**: Check 3 ΔE OKLab
  promovido a ERROR con umbral 0.05 + WARN umbral 0.10. Allowlist
  explícita con drift detection (95% del valor de decisión). Cómputo
  automático de los pares de cardinales por tema (30 totales).
- **`dist/env.d.ts`** ya no se publica al consumer
  (`tsconfig.build.json` lo excluye explícitamente). Componentes
  ahora usan `isDev()` util en lugar de `import.meta.env.DEV` directo.
- **`Modal`**: `ModalContextValue` removido del barrel export (era
  huérfano sin `ModalContext` ni `useModal()` exportados).
- **CSS publicados minificados con esbuild** (state.css 6.3 MB →
  713 KB gzipped, components.css 28 KB gzipped).
- **`design.css`** size-limit budget bajado de 5 KB a 2 KB (real
  ~70 B gzipped).
- **`tokens.css`** size-limit budget subido de 25 KB a 30 KB para
  margen.

### Removed
- CSS huérfano: `.ig-modal`, `.ig-modal-backdrop` en
  `igoded-components.css` (3 ocurrencias residuales del cleanup
  beta.0; el componente Modal usa `<dialog>`/`.ig-dialog`).
- Referencias prematuras a `1.0.0-rc.{1,2,3}` en código y docs
  (sustituidas por `1.0.0-beta.8` o `pre-1.0.0-rc.1` según contexto).
- `Stepper.defaultActive` (era prop muerta).
- `src/env.d.ts` (sustituido por `src/utils/env.ts` con `isDev()`).

### Notes
- **2 componentes saltados en migración a `useControllableState`**
  por razones técnicas documentadas:
  - **`ThemeSwitch`**: triple fuente de truth (controlled prop +
    override interno + storage cross-tab vía `useSyncExternalStore`).
    El componente original deriva el valor en render directamente
    de las fuentes; el hook genérico introduciría un `useState`
    interno que en happy-dom provoca loop infinito por la cadena
    `setItem → StorageEvent → snapshot revaluation → setState →
    setItem`. El patrón actual es idiomático para este caso, no es
    deuda técnica. Para post-RC1: extender el hook con modo
    `derive: () => T` opt-in o crear
    `useControllableStateWithStorage` dedicado.
  - **`Modal`**: controlled-only puro (`open: boolean` requerido,
    sin `defaultOpen`). El hook no aporta valor; siempre sería
    `isControlled=true`.
  - **`Checkbox`**: NO tiene `useState` interno — delega checked
    al `<input type="checkbox">` nativo. La migración añadiría
    complejidad sin valor.
- **Migration guide útil — `useControllableState` API**:

  ```ts
  const { value, setValue } = useControllableState({ value, defaultValue, onChange });

  // Acción del usuario (dispara onChange):
  setValue(newValue);

  // Auto-select interno o rehidratación post-mount (NO dispara onChange):
  setValue(newValue, { silent: true });
  ```

- **Tag retroactivo `v1.0.0-beta.0`** apuntado al commit
  `8a1c7ef5f030ba7bf227b53a0b8469fa442149e3` (`feat: rewrite as
  TypeScript + React 19 design system`, 2026-05-01) para
  trazabilidad histórica completa de la rama 1.0.x.

### Bundle stats (gzip)

| Archivo                                    | Real     | Budget  | Margen |
|--------------------------------------------|----------|---------|--------|
| `dist/index.js` (ESM)                      | 14.37 KB | 15 KB   | 4%     |
| `dist/index.cjs`                           | 12.36 KB | 15 KB   | 18%    |
| `dist/styles/igoded-design.css`            | 70 B     | 2 KB    | 97%    |
| `dist/styles/igoded-tokens.css`            | 6.53 KB  | 30 KB   | 78%    |
| `dist/styles/igoded-components.css`        | 28.05 KB | 75 KB   | 63%    |
| `dist/styles/igoded-base.css`              | 453 B    | 2 KB    | 78%    |
| `dist/styles/igoded-reset.css`             | 924 B    | 2 KB    | 55%    |
| `dist/styles/igoded-fonts.css`             | 142 B    | 1 KB    | 86%    |
| `dist/styles/igoded-state-css.css`         | 713.5 KB | 800 KB  | 11%    |

### Test stats
- Suite unit final: **515** tests (`vitest run --project unit`).
- 36 archivos de test, 100% verde.
- 14 nuevos AllStates regression tests (composeStory + selectores
  CSS).

## [1.0.0-beta.18] — 2026-05-03

### Changed
- **Test cleanup pre-RC1**: refactor masivo de tests unit.
  - **Variantes/sizes/forma cosmética**: colapsadas en `describe.each`
    parametrizado. Antes había 10 asserts sueltos por componente
    (uno por valor del eje); ahora un solo bloque parametrizado
    cubre todos los valores con una assert densa. Misma señal de
    contrato CSS, código 5× más compacto. Aplicado en Badge, Button,
    Card, Checkbox, Chip, Divider, Input, Modal, Navbar, Progress,
    Radio, Spinner, Switch, Tabs, Tooltip, Avatar, Rating.
  - **Estados funcionales con efecto observable**: `loading` del
    Button ahora expone `aria-busy` además de la clase, y el test
    valida ARIA + behavior (no solo clase). Combo `loading + disabled`
    cubierto explícitamente.
  - **Negative asserts** (`not.toHaveClass(default)`, `not.toHaveClass(success)`
    cuando outline) eliminados — paranoia frágil que rompía con
    cualquier rename.
  - **`className` merge desde consumer**: añadido test por componente
    (Badge, Button, Switch, Checkbox, Radio) verificando que las
    clases del consumer se mergean sin pisar las del componente. Bug
    recurrente que Chromatic no detecta.
  - **Stories `play()` duplicadas**: eliminadas `Checkbox.ToggleInteraction`
    y `Radio.SelectInteraction` (mismo aserto que el unit test, 10×
    más lentas).

### Added
- `Button` ahora expone `aria-busy={loading}` (antes solo clase).
  Mejora a11y para SR.

### Test stats
- Suite unit final tras refactor: **453** (`vitest run --project unit`).
  Con `describe.each` el conteo bruto sube por la expansión de cada
  parametrización; lo relevante es que el contrato CSS/ARIA queda
  cubierto con menos archivos y asserts más densos.
- Asserts cosméticos sueltos eliminados: ~80.
- Tests transversales nuevos: 5 (`className` merge), 1 combo de
  estado peligroso (`loading + disabled`).
- Nota: a partir de esta versión NO publicamos delta numérico
  contra la versión anterior; el conteo puede oscilar libremente
  con cada refactor de parametrización y no es una métrica
  contractual del paquete.

## [1.0.0-beta.17] — 2026-05-03

### Fixed
- **Textarea / NativeSelect estados `error` y `success` invisibles**: las
  reglas `.ig-input-error` / `.ig-input-success` (línea 6227) estaban
  declaradas ANTES de `.ig-textarea`, `.ig-textarea-auto` y `.ig-native-select`
  (líneas 6306, 6343, 6376), todas con la misma especificidad 0,1,0.
  Las reglas posteriores definían `border-color` y pisaban al estado de
  validación. Resultado: pasar `state="error"` o `state="success"` no
  cambiaba el borde del componente. Fix: reglas con doble clase (0,2,0)
  para `.ig-textarea.ig-input-error`, `.ig-native-select.ig-input-error`, etc.
  Input no estaba afectado porque `.ig-input` se declara antes de las
  reglas de estado.

## [1.0.0-beta.16] — 2026-05-03

### Changed
- **Vitreus reposicionado** de H≈194.83° (cyan puro sRGB, artefacto
  histórico de la paleta) a H=207.50° (centro perceptual matemático
  verde↔azul en OKLCH, punto medio entre verde Hering ~145° y azul
  Hering ~270°). Hex: `#053a40` (lux) / `#3ae2f7` (nox). Decisión
  fundacional — vitreus es el color brand del DS y su identidad
  declarada es "el azul-verde matemáticamente medio en OKLCH"; el hex
  anterior no cumplía esa intención. Contraste AAA preservado en los
  5 fondos del tema en ambos modos (LIGHT 11.78, DARK 11.91 sobre
  fundus opuesto). Las alphas (`--ig-vitreus-alpha-{10,20,30,50,70}`)
  y `--ig-text-heading` heredan automáticamente porque están definidas
  con `color-mix` sobre `--ig-vitreus`. Re-baseline de Chromatic
  requerida para snapshots con brand, text-heading o sus alphas.

### Fixed
- **Badge default vs Badge pill**: ambos usaban `--ig-rounded-full` y
  eran visualmente idénticos. Ahora el default es `--ig-rounded-md`
  (chip estilo etiqueta, esquinas suavemente redondeadas) y `pill`
  mantiene `--ig-rounded-full` (cápsula).

## [1.0.0-beta.15] — 2026-05-03

### Fixed
- **Elevación en LIGHT** (`--ig-bg-surface`, `--ig-bg-elevated`): los
  tokens mezclaban con `white` para "elevarse", pero como el body en
  LIGHT es `--ig-fundus-lux` = `#faf9fc` (casi blanco) el resultado era
  prácticamente igual al body. Cards, accordions, dropdowns, modals,
  toasts, sidebars y tabs se solapaban con el fondo. Ahora la elevación
  en LIGHT se consigue OSCURECIENDO ligeramente con tinte azulado
  coherente (`--ig-cinis-lux` 4% para surface, 8% para elevated). DARK
  intacto.

## [1.0.0-beta.14] — 2026-05-03

### Fixed
- **Divider con texto + variante** pintaba el `<div>` padre entero
  con el color de variante. La regla `.ig-divider-brand
  { background-color: var(--ig-vitreus); }` (del divider básico
  horizontal `<hr>`) matcheaba también al
  `<div class="ig-divider-with-text ig-divider-brand">` por compartir
  la clase modifier. Resultado: caja cyan brillante con el texto cyan
  encima — invisible. Fix: scope a `.ig-divider.ig-divider-brand` para
  que solo aplique al divider básico (que sí lleva la clase base
  `.ig-divider`).

## [1.0.0-beta.13] — 2026-05-03

### Changed
- **Divider con texto variante** invierte la jerarquía de color:
  ahora el TEXTO recibe el accent (`vitreus`, `axis`, ...) y las
  líneas se quedan en `--ig-border-subtle`. Antes (beta.10–12) las
  líneas iban con accent y el texto en `cinis`; las dos líneas
  alineadas creaban una banda continua perceptual y el texto quedaba
  apagado. Patrón Material UI: las líneas son sutiles, el color
  semántico vive en el label.

## [1.0.0-beta.12] — 2026-05-03

### Removed
- Stories aisladas `Indeterminate` de `Checkbox` y `Switch`.
  Confundían — el click no parecía hacer nada porque el sticky
  behavior re-aplicaba `indeterminate=true` sin un parent que
  gestione state. La nueva story `MasterSelectAll` (beta.11) ya
  muestra el indeterminate en su estado inicial y demuestra el
  patrón canónico.

## [1.0.0-beta.11] — 2026-05-03

### Added
- Stories `Componentes/Checkbox/MasterSelectAll` y
  `Componentes/Switch/MasterSelectAll` con el patrón canónico de
  indeterminate (maestro + grupo de hijos). El `indeterminate` no es
  un tercer estado del toggle, es una etiqueta visual derivada del
  estado de los hijos — patrón usado por GitHub, Gmail, Material UI
  checkbox group, Ant Design Tree, etc.

### Reverted
- Cambios en `Checkbox` y `Switch` glyph publicados en `beta.10`
  (`var(--ig-fundus)` adaptativo): diagnóstico erróneo, el reporte
  "indeterminate no hace nada" era de comportamiento (sticky
  behavior), no de contraste visual. El glyph vuelve a
  `var(--ig-fundus-lux)`. El cambio del Divider en `beta.10` se
  mantiene.

## [1.0.0-beta.10] — 2026-05-03

### Changed
- **Divider con texto variante**: el texto ya no toma el color del
  accent (era idéntico a las líneas y se confundía visualmente). Va
  en `--ig-cinis`. (Posteriormente revisado en `beta.13`: ahora el
  texto SÍ va en accent y las líneas en subtle.)

### Fixed (luego revertido en beta.11 — diagnóstico erróneo)
- ~~Glyph del Checkbox/Switch (`tick`, línea de indeterminate, thumb)
  cambiado a `var(--ig-fundus)` adaptativo. Pretendía resolver bajo
  contraste blanco-sobre-cyan en DARK; resultó no ser el bug
  reportado.~~

## [1.0.0-beta.9] — 2026-05-03

### Fixed
- **Progress bar invisible**: el componente renderizaba el bar como
  `<span class="ig-progress-bar">`. Como `<span>` es `display: inline`
  por defecto y el CSS no le aplicaba `display: block`, el `width`
  inline se ignoraba — todas las variantes se veían iguales (solo el
  track gris del fondo). Cambiado a `<div>`, alineado con la doc del
  CSS que ya prescribía `<div>`.

## [1.0.0-beta.8] — 2026-05-03

Consolida el trabajo que estuvo bajo `rc.1` / `rc.2` / `rc.3` (tags
borrados, no llegaron a publicarse) más los fixes finales sobre
`Progress` y `Checkbox`/`Switch` detectados al revisar el visual.

### Added
- **Prop `indeterminate?: boolean`** en `Checkbox` y `Switch`. Hasta
  `beta.7` el tercer estado solo se podía aplicar via ref-callback
  (`ref={el => { if (el) el.indeterminate = true }}`), patrón
  documentado pero poco ergonómico. Ahora basta `<Checkbox indeterminate>`
  / `<Switch indeterminate>`. Internamente un `useEffect` sincroniza la
  prop con `el.indeterminate` nativo (la propiedad del DOM, ya que
  `indeterminate` no es atributo HTML válido). El ref-callback sigue
  funcionando — los componentes ahora usan un `internalRef` y forwardean
  al ref del consumer si se pasa.
- **El estado `indeterminate` es sticky tras click**. El navegador limpia
  `el.indeterminate` automáticamente cuando el usuario clica un checkbox
  con `.indeterminate=true` (toggle nativo a checked/unchecked). Si la
  prop sigue `true`, `handleChange` re-aplica `el.indeterminate=true` —
  solo el parent decide cuándo salir del estado mixto pasando
  `indeterminate={false}`. Sin esto, tras el primer click el visual
  pasaba a checked normal aunque la prop dijera "parcial".
- **`aria-checked="mixed"`** automático en `Checkbox`/`Switch` cuando
  `indeterminate=true`, para que NVDA/JAWS/VoiceOver anuncien el estado
  parcial correctamente.
- **Visual `:indeterminate`** en `Checkbox` y `Switch`. Hasta `beta.7`
  el `<input>` nativo se ocultaba detrás de un overlay y las reglas CSS
  solo cubrían `:checked` / `:focus-visible` / `:disabled`, así que
  `el.indeterminate=true` no tenía diferencia visual.
  - **Checkbox**: fondo lleno (color de variante, igual que `:checked`)
    y glyph "−" (línea horizontal centrada).
  - **Switch**: thumb centrado en el track con background de variante
    (Material-like — comunica "ni on ni off" sin glyphs adicionales).
  - Las 6 variantes (`brand`/`secondary`/`success`/`warning`/`danger`/`info`)
    tienen su color correspondiente en ambos.
- **Story `Switch.Indeterminate`** (no existía).
- **Story `Checkbox.Indeterminate`** refactorizada: usa
  `args: { indeterminate: true }` en vez del ref-callback (mejor ejemplo).

### Changed
- **Progress bars siempre usan los `-nox`** (cardinales brillantes) en
  ambos temas, no los adaptativos `var(--ig-{role})`. Razón: en LIGHT
  los `-lux` tienen luminosidad y chroma demasiado bajos para
  distinguirse en una franja de 8-12 px (las 6 variantes se veían
  "todas oscuras" y costaba diferenciar hue). El track sigue adaptativo
  via `var(--ig-progress-track)`. Los demás componentes mantienen
  tokens adaptativos porque tienen texto encima donde el contraste
  WCAG sí importa; en `Progress` el bar es bloque sólido sin texto.
- **`Progress.Variantes`** story rediseñada — antes 5 barras
  `size="md"` (8 px) sin label. Ahora 6 barras `size="lg"` (12 px)
  con `<span class="ig-story-label">` arriba de cada una. `play()`
  afirma via `getComputedStyle` que las 6 barras tienen
  `background-color` distinto — regresión si alguien rompe la cascade
  `.ig-progress-{v} .ig-progress-bar`.
- **8 stories de Interacción propagan `args`** — `Radio.SelectInteraction`,
  `Modal.OpenInteraction`, `Accordion.Interaction`,
  `Sidebar.ToggleInteraction`, `Stepper.Interactivo`,
  `Tabs.KeyboardNavInteraction`, `Toast.FireInteraction`,
  `Tooltip.A11yInteraction` tenían `render: () => (<Comp prop="…" />)`
  con valores hardcoded, lo que dejaba el panel Controls desconectado
  del render. Ahora `render: (args) => (<Comp {...args} … />)` con
  overrides finales solo donde el `play()` necesita un valor concreto
  (state controlado, `defaultValue` predecible, payload del toast).
  Cuando hace falta un default distinto al del meta se añade
  `args: {…}` a nivel de story. `FireToastButton` se inlinea para
  leer `args.title/message/variant`.
- **`laurus` recalibrado de H=149° a H≈140°** para subir la separación
  perceptual ΔE OKLab `laurus ↔ vitreus` en LIGHT de ≈0.054 (rozaba el
  umbral del Check 3 = 0.05) a ≈0.074. Hex nuevos:
  `--ig-laurus-lux: #143d0a`, `--ig-laurus-nox: #6aed4a` (antes
  `#113d1c` / `#5eeb82`). Geometría dual preservada (L_lux=0.319,
  L_nox=0.841, ΔH=0.11°, suma 1.160). El alias `--ig-success` sigue
  apuntando a `--ig-laurus`, ningún consumer que use rol `success` debe
  tocar nada. Las alphas `--ig-laurus-alpha-{10,20,30,50,70}` siguen
  siendo `color-mix` y arrastran el cambio automáticamente.
  Visualmente: más vegetal puro, menos "menta caribeña". Re-baseline
  de Chromatic obligatorio.

### Fixed (Storybook only — no afecta al paquete publicado)
- **Toggle light/dark del toolbar de Storybook funciona también en
  páginas MDX puras** (`Contrast`, `DesignTokens`, `Introduction`,
  `Spacing`, `Variants`). Antes el toggle solo afectaba a las Stories
  CSF; las MDX se quedaban en el último `data-theme` aplicado por la
  Story anterior. Causa raíz: el decorator `withThemeByDataAttribute`
  solo se ejecuta cuando se monta una Story; las MDX sin `<Story of=…>`
  ni `<Canvas>` que referencie un export son páginas estáticas que no
  disparan decorators. Fix: `.storybook/preview-head.html` se suscribe
  al canal `__STORYBOOK_ADDONS_CHANNEL__` y reacciona al evento
  `updateGlobals` aplicando `data-theme` al `<html>` del iframe.
  Idempotente con el decorator existente.

### Documentation
- **README** bloque "Estado": ahora documenta `1.0.0-beta.8` con la
  paleta final + rename `cyaneus → kobalium` (de `beta.7`) +
  recalibración de `laurus` + nueva prop `indeterminate` +
  Progress bars `-nox`.
- **README** ejemplo de `Pagination` corregido —
  `ariaLabel="Pagination"` → `aria-label="Pagination"` (era
  inconsistente con la migración a `aria-*` estándar de `beta.4`).
- **`igoded-components.css`** cabecera: `info → kobalium (cyan)` →
  `info → kobalium (cobalt blue)` (residuo del sed `cyaneus → kobalium`
  de `beta.7` que dejó `(cyan)` colgando). Aclarado "6 roles UI (el
  sistema tiene 7 cardinales)" para no confundir cardinales con roles.
- **Migration note ampliada** sobre el rename `cyaneus → kobalium` de
  `beta.7` distinguiendo:
  - **API estable** (no tocar nada): `var(--ig-info)`, `.ig-bg-info`,
    `.ig-text-info`, `.ig-alert-info`, `.ig-badge-info`, `.ig-btn-info`,
    etc. (30+ clases con sufijo de **rol**, no de cardinal).
  - **Primitivos internos** (renombrar si los usabas directo):
    `--ig-cyaneus` / `--ig-cyaneus-{lux,nox}` /
    `--ig-cyaneus-alpha-{10,20,30,50,70}` / `--ig-text-on-cyaneus` →
    `--ig-kobalium*` / `--ig-text-on-kobalium`.

### Self-correction
- La entrada de `1.0.0-beta.6` decía que `.ig-story-canvas` se movía a
  `.storybook/preview-head.html`. La ruta correcta es
  `.storybook/storybook.css` (consumido como `className` desde
  `.storybook/preview.tsx`). El `preview-head.html` no se tocó en
  `beta.6` — sigue como en `beta.5` con la inyección de
  `data-theme="dark"`.

## [1.0.0-beta.7] — 2026-05-03

### Renamed (BREAKING — token rename + hue reassignment)
- **`cyaneus` → `kobalium`** y **reasignación de hue de cyan H≈214° a
  cobalt blue H≈260°**. Razón: la separación perceptual ΔE OKLab entre
  `cyaneus` y `vitreus` (brand teal) era marginal (≈0.054 en dark), lo
  que producía confusión visual cuando ambos cardinales aparecían
  contiguos. Con kobalium en H≈260° la separación pasa a ≈0.123 (cómoda).
  El nombre cambia porque "cyaneus" describía un cyan que ya no existe
  como color real; "kobalium" (latinización de cobalto) refleja el nuevo
  hue. Hex nuevos: `--ig-kobalium-lux: #082e6d`, `--ig-kobalium-nox: #b1ccf7`
  (ambos cumplen geometría dual L_lux≈0.32, L_nox≈0.84, ΔH≤10°, AAA contra
  los 5 fondos del tema).

  **Migración**:
  - Si tu código usa solo el alias `var(--ig-info)`, **no tocar nada** —
    el alias sigue funcionando y ahora apunta internamente a `--ig-kobalium`.
  - Si tu código referencia literalmente `--ig-cyaneus`, `--ig-cyaneus-lux`,
    `--ig-cyaneus-nox`, `--ig-cyaneus-alpha-{10,20,30,50,70}` o
    `--ig-text-on-cyaneus`, **renombrar a `--ig-kobalium*`** /
    `--ig-text-on-kobalium`.
  - Re-baseline de Chromatic obligatorio: el cambio de hex altera todas
    las stories que usan info/cyaneus en cualquier forma.

### Added
- **Check 3 (warning) en `scripts/check-component-contrast.mjs`**:
  separación perceptual ΔE OKLab ≥ 0.05 entre pares de cardinales de UI
  activa (los 6 cardinales menos `cinis`, que es texto del cuerpo). Útil
  para detectar cuándo un cardinal nuevo entra en zona de confusión con
  uno existente. **No falla CI** — solo imprime aviso. Razón de no
  promocionar a error en esta beta: hay pares preexistentes (p.ej.
  `vitreus↔laurus` en light, ΔE≈0.054) que rozan el umbral; auditarlos
  con cabeza fría requiere su propio commit.

### Changed
- Doc cabecera de `igoded-tokens.css`, `SKILL.md`, `Introduction.mdx`,
  `Variants.mdx`, `Palette.stories.tsx`: actualizada la descripción de
  kobalium (cobalto, H≈260°) y la migration note desde cyaneus.

## [1.0.0-beta.6] — 2026-05-03

### Changed (BREAKING — visual)
- **`reset.css` ya no estiliza `<button>` con la marca**. Hasta beta.4
  el reset aplicaba `background: var(--ig-vitreus); color: var(--ig-text-on-vitreus)`
  a todo `<button>` sin clase. Desde beta.5 los `<button>` que importas
  con `reset.css` salen `background: transparent; color: inherit;
  border: 0; padding: 0; cursor: pointer;`. Si tu app dependía de que
  cualquier `<button>` nativo apareciese con look brand "gratis", ahora
  los verás transparentes sobre el fondo de su contenedor. Migración:
  añade la clase `.ig-button` (o variante `.ig-button-primary`,
  `.ig-button-secondary`…) a esos `<button>`. Razón del cambio: evitar
  combinaciones bg/color heredadas que rompían contraste cuando un
  wrapper aplicaba sus propios colores (caso real: SidebarItem con
  texto `cinis` sobre `<button>` con bg vitreus → ratio 1.06).

### Documentation
- `igoded-components.css` cabecera: `info → axis` corregido a
  `info → cyaneus`.
- `igoded-tokens.css` "CUÁNDO USAR": `info` quitado de la línea de Axis
  y añadido a una línea propia para Cyaneus.
- `SKILL.md` y `README.md`: documentado el scope real de
  `npm run test:contrast` (qué cubre y qué no).

### Added
- Bloque `@media (forced-colors: active)` quirúrgico en
  `igoded-components.css` para estados `*-active`/`*-selected` (Tabs,
  Pagination, Stepper, Chip, Sidebar, Navbar) → `Highlight`/`HighlightText`,
  e inputs (`.ig-input`, `.ig-native-select`, `.ig-textarea`) → `Field`/`FieldText`.
  Complementa el mapeo semántico de `igoded-tokens.css` sin duplicarlo.
- Wrapper canvas de Storybook movido de inline-style a clase
  `.ig-story-canvas` en `.storybook/preview-head.html`.

## [1.0.0-beta.5] — 2026-05-03

### Changed (BREAKING)
- **Rediseño total de la paleta cardinal — geometría OKLCH uniforme**.
  Los 14 hex de los pares `{cardinal}-{lux,nox}` (vitreus, axis, cinis,
  rutilus, laurus, malum, cyaneus) cambian para cumplir
  `L_lux ≈ 0.32 ± 0.04`, `L_nox ≈ 0.84 ± 0.04`, `ΔH OKLCH ≤ 10°` entre
  lux/nox del mismo cardinal y AAA frente a los 5 fondos del tema.
  Diferencia visible más fuerte: `vitreus-nox` pasa de teal pastel
  `#5eded5` a cyan eléctrico `#30e6e6`; `laurus-nox` a verde brillante
  `#5eeb82`; `axis-lux` a violeta `#411271`. Resto: cambios sutiles.
  `--ig-fundus-{lux,nox}` se mantienen.
- **`--ig-bg-{surface,sunken,elevated,muted}` derivados de `fundus`**.
  Ahora se generan vía `color-mix(in oklch, var(--ig-fundus-{lux,nox}), …)`.
  Si cambias `fundus`, todo el tema acompaña automáticamente. Output
  visual ±1 punto del previo.
- **`engines.node`**: `>=20` → `>=22`. Node 20 (Iron) llegó a EOL el
  2026-04-30 y ya no recibe parches de seguridad. El VPS de despliegue
  (Debian 13) corre Node 22.22 LTS (Jod), que pasa a ser el floor
  soportado oficialmente.

### Fixed (a11y / contraste)
- 32 violaciones WCAG AA por texto `--ig-fundus-lux` hardcoded sobre
  fondos cardinales adaptativos en Badge (×6), Button outline:hover (×6),
  Tabs Pills (×6), Pagination active (×1), Stepper dot active+complete
  (×2) y Chip selected (×2). Ahora todos usan `--ig-text-on-{role}`,
  que invierte automáticamente entre claro/oscuro según el tema.
- **Reset CSS de `<button>`**: ya no fuerza `background: vitreus +
  color: text-on-vitreus`. Pasa a `transparent + inherit` para que
  cualquier wrapper (SidebarItem, otros) pueda aplicar sus colores sin
  riesgo de mezcla incoherente (texto cinis sobre fondo vitreus =
  ratio 1.06 que el runner cazó tras el fix de Bloque 1).
- **Runner storybook+axe local**: deja de ser ciego al modo dark.
  Antes, `useEffect` del theme decorator aplicaba `data-theme="dark"`
  POST-paint y chromium headless evaluaba en light (vía
  `prefers-color-scheme: light`), donde no había violaciones. Fix
  con `.storybook/preview-head.html` que inyecta `data-theme="dark"`
  antes del primer paint del iframe.
- **Token huérfano**: eliminado `--ig-text-on-cinis` (cinis nunca se
  usa como background, solo como color de texto-body).
- **`--ig-text-muted` en light**: ajustado a `#5e5667` (ratio 5.06 sobre
  el nuevo `bg-muted`). Antes daba 4.45 (< 4.5 AA).

### Added
- **`scripts/check-component-contrast.mjs`** como guardrail CI: parsea
  `igoded-components.css` con postcss y valida (a) WCAG ≥ 4.5 en cada
  par bg/color resuelto en ambos temas y (b) geometría OKLCH dual
  (ΔH ≤ 10°, L_lux/nox y suma dentro de banda). Conectado a
  `npm run test:contrast` y `npm run verify`.
- Story `Fundamentos/Paleta` (visualización viva de los 7 cardinales
  con hex, OKLCH (L,C,H) y ratios contra `fundus`).
- `:root { color-scheme: dark light }` + por tema, para que los
  scrollbars y form-controls del UA sigan el tema activo.
- Bloque `@media (forced-colors: active)` que mapea los semánticos
  críticos a system-color keywords (CanvasText, Canvas, LinkText,
  GrayText) para Windows High Contrast Mode.
- Token `--ig-theme-transition` con override en
  `@media (prefers-reduced-motion: reduce)`.
- Cabecera explícita en `igoded-tokens.css` documentando los 3 tiers
  de tokens (primitivos / semánticos / escalas universales) y los
  guardrails de CI.
- `SKILL.md` con las reglas inviolables del DS (geometría dual, uso de
  `text-on-*`, prohibición de `fundus-*` directo, separación
  info/secondary, escala neutral universal).

## [1.0.0-beta.4] — 2026-05-02

Última pasada de pulido pre-`1.0.0`. Cierra los hallazgos de la auditoría
externa sobre beta.3 + endurecimiento adicional (size budgets, dev-warnings,
config split lib vs dev/storybook, registry de Tabs robusto frente a
defaultValue inválido).

### Fixed (a11y / regression / robustness)
- **Rating**: `value` o `defaultValue` fuera de `[0, max]` se clampa
  silenciosamente. `value=10 max=5` antes dejaba todos los radios con
  `tabIndex=-1` (tablist sin tab stop accesible). Ahora va al tope. `max`
  no entero se redondea hacia abajo, mínimo 1.
- **Tabs `defaultValue` inválido**: si el value pasado no matchea ningún
  `<Tab>` montado, fallback al primero registrado tras un useEffect
  post-mount (no durante el registro tab-a-tab — eso producía un falso
  positivo cuando los Tabs se montaban en orden alfabético). En modo
  controlled NO se auto-corrige; solo console.warn dev-only.
- **Tab.tsx pre-register con `useLayoutEffect`** (en cliente; SSR cae a
  noop): el primer paint visible ya tiene tab activo, sin flicker.
- **Slider**: `defaultValue` array (legalmente permitido por
  `InputHTMLAttributes` aunque `<input type="range">` no lo soporta) ya no
  se reenvía al DOM como `[object Array]`. Filtramos a number/string
  válidos.
- **Modal**: el effect de sincronización `open` ahora resetea
  `closingFromSyncRef` en su cleanup. No hay leak real (state muere con
  unmount), pero queda explícitamente correcto frente a re-mounts en
  desmontaje rápido (navegación SPA durante animación de cierre).
- **Reset.css `<button>` color**: usaba `--ig-fundus-lux` fijo que daba
  contraste bajo en dark (texto casi blanco sobre teal claro). Ahora usa
  `--ig-text-on-vitreus` adaptativo. Se aplicó en beta.3 pero faltaba
  validación AA en dark — verificada ahora con axe.

### Added
- **`vite.lib.config.ts` separado** del `vite.config.ts` general. El
  build de librería (`npm run build`) usa explícitamente esta config con
  `dts` plugin + `copyDesignSystemStyles`. Más robusto que el guard env
  `STORYBOOK !== "true"` de beta.3 (Storybook ya nunca puede contaminar
  el build de librería, independientemente de qué env vars setee).
- **`size-limit` en CI** con budgets por archivo:
  - `dist/index.{js,cjs}` → ≤ 15 KB gzipped (real: ~10.7 KB ESM)
  - `dist/styles/igoded-design.css` → ≤ 5 KB (real: 1 KB, es solo @import)
  - `dist/styles/igoded-tokens.css` → ≤ 25 KB (real: 22 KB)
  - `dist/styles/igoded-components.css` → ≤ 75 KB (real: 67 KB)
  - `dist/styles/igoded-base.css` → ≤ 2 KB (real: 1.4 KB)
  - `dist/styles/igoded-reset.css` → ≤ 2 KB (real: 1.6 KB)
  - `dist/styles/igoded-fonts.css` → ≤ 1 KB (real: 0.9 KB)
  Script `npm run verify:size`. Forma parte de `npm run verify`.
- **Card**: dev-only `console.warn` si `interactive` + `onClick` está
  presente pero sin `role="button"`. Avisa una vez por instancia. La
  card sin role no activa por teclado, este caso suele ser un descuido.
- **`Fundamentos/Variantes` (nueva MDX)**: visualización del mapeo
  `variant` → cardinal con los 7 colores nuevos (incluye `cyaneus`).
  Documentación de override por consumer + ratios WCAG AA.
- **JSDoc `@example` en hooks públicos**: `useTheme`, `useToast`,
  `useTabs`, `useAccordion`, `useAccordionItem`, `useOptionsMenu`,
  `useSidebar`. Mejora autocompletado en LSP del consumer.
- **Test SSR-hydration ThemeSwitch**: `localStorage.theme="light"` gana
  al default `dark` y NO se sobreescribe en el primer effect.
- **`src/env.d.ts`**: declaración tipada de `import.meta.env.DEV/PROD`
  para que los warnings dev-only de Card/Tabs typechequen sin pisar el
  `vite-env.d.ts` (que está excluido del build para no exportar
  declaraciones de módulos `*.css`/`*.svg` al consumer).

### Changed (BREAKING — momento ideal pre-1.0)
- **`ariaLabel` prop → `aria-label` HTML estándar** en 9 componentes:
  `Pagination`, `Spinner`, `Stepper`, `Rating`, `Sidebar`, `SidebarNav`,
  `NavbarNav`, `Tabs.TabList`, `Breadcrumb`, `Progress`, `Avatar`,
  `Timeline`. Cada uno extrae `aria-label` del rest con fallback ES por
  defecto. Coherente con el resto del DS (ThemeSwitch ya usaba esto
  desde beta.3) y con la convención web.
  - **Migration**: rename en tu JSX `ariaLabel={...}` → `aria-label={...}`.
- **`docs.defaultName: "Documentación"` → `"Docs"`** (ya estaba en beta.3,
  reconfirmado: URLs ASCII, sin %C3%B3n).
- **README CSS imports actualizado**: 7 entradas → 8 entradas (incluye
  `fonts.css`); la versión del estado pasa de beta.2 a beta.4.
- **README script anti-flash de tema**: fallback `|| "light"` →
  `prefers-color-scheme: dark` con fallback `dark` (alineado con el
  branding dark-first del DS). Try/catch para entornos sin localStorage.
- **`tokens.css` comentarios**: "FUNDUS + 6 CARDINALES" → "FUNDUS + 7
  CARDINALES" + tabla de los 7 incluyendo `CYANEUS`. Mención obsoleta a
  `@font-face` en tokens.css eliminada (vive en fonts.css desde beta.3).
- **`package.json#keywords`**: quitado `"headless"` (engañoso, el DS es
  CSS-first opinionated). Añadidos `"design-tokens"`, `"css-first"`,
  `"themeable"`, `"dark-mode"`.
- **`vite.config.ts` simplificado**: ya no contiene `build.lib` ni `dts`
  (eso vive en `vite.lib.config.ts`). Se queda con plugins comunes
  (react, optimizeDeps) compartidos por playground dev y Storybook.

### Migration desde beta.3
1. **Si tu JSX usa la prop `ariaLabel`** en alguno de estos componentes,
   renombra a `aria-label`:
   ```diff
   - <Stepper ariaLabel="Checkout">
   + <Stepper aria-label="Checkout">
   - <Pagination ariaLabel="Paginación principal">
   + <Pagination aria-label="Paginación principal">
   - <TabList ariaLabel="Cuenta">
   + <TabList aria-label="Cuenta">
   ```
   La búsqueda+reemplazo es trivial: tu IDE te marcará los errores TS
   (la prop ya no existe en los tipos).
2. **Si tu app inyecta el script anti-flash de tema** del README,
   actualízalo al nuevo (system-aware + dark fallback) — el viejo
   pisaba la preferencia del usuario en sistemas dark-first.

### Coverage
- Statements 92.29% · Branches 86.44% · Functions 95.17% · Lines 95.11%
- 339 unit tests + 179 storybook (axe-a11y) = 518 tests verdes.

## [1.0.0-beta.3] — 2026-05-02

Pasada agresiva pre-`1.0.0`: a11y real, SSR-safe, naming/types fix y un
nuevo color cardinal para diferenciar `info` de `secondary`.

### Fixed (a11y / regression)
- **Input/NativeSelect/Textarea**: `aria-describedby` que el consumer pasara vía
  `{...rest}` se sobreescribía a `undefined` cuando no se pasaba la prop
  `describedBy`. La propia story `FormularioCompleto` estaba rota.
  Solucionado con un nuevo helper `mergeDescribedBy(native, prop)` que
  concatena ambos. +6 tests de regresión.
- **Rating**: añadido **roving tabindex + keyboard nav completo** (←/→/↑/↓,
  Home, End, Space, Enter) para cumplir el patrón WAI-ARIA APG de
  radiogroup. Antes solo respondía a click. +9 tests de regresión.
- **ToastProvider SSR**: ya no produce hydration mismatch. Antes el
  servidor renderizaba inline y el primer paint cliente ya pintaba portal.
  Ahora arranca inline (idéntico al server) y conmuta al portal en el
  primer `useEffect` post-mount.
- **OptionsMenu a11y**: el selector de navegación excluye también
  `[aria-disabled="true"]` (anchors no tienen `disabled` HTML); items
  aria-disabled bloquean activación por click y por Enter/Space; **button**
  menuitem ahora también tiene `tabIndex={-1}` (antes anchor sí lo tenía
  y button no, inconsistente).
- **Tabs sin `defaultValue`**: el tablist quedaba sin tab stop si el
  consumer no pasaba `value`/`defaultValue` (todos los tabs `tabIndex=-1`).
  Ahora un registry interno selecciona el primer `Tab` montado de forma
  automática.
- **Modal `onClose` doble disparo**: cuando el consumer hacía
  `setOpen(false)`, el effect llamaba `dialog.close()` que disparaba el
  evento `close` nativo y volvía a invocar `onClose`. Añadido flag
  `closingFromSyncRef` que distingue cierre user-driven de cierre por
  sincronización con la prop.
- **ThemeSwitch `aria-label`**: ahora se puede sobrescribir vía rest
  (i18n). Antes el hardcoded ganaba al rest por orden de spread.
- **Slider `defaultValue` string/array**: `defaultValue="60"` (string)
  dejaba el state interno en `0` mientras el `<input>` mostraba 60.
  Ahora normaliza a número finito; arrays se ignoran (no soportados por
  `<input type="range">`).

### Added
- **`igoded-fonts.css` (nuevo, opt-in)** — `@import` de Google Fonts
  (Electrolize/Saira/JetBrains Mono). **Antes vivía dentro de
  `tokens.css`**, lo que metía un request remoto en el bundle de
  cualquier consumer. Ahora `tokens.css` declara solo los `--ig-font-*`
  con fallback `system-ui`/`monospace`. Storybook lo importa
  explícitamente en `preview.tsx`. Expuesto como
  `reactigoded/styles/fonts.css`.
- **Color cardinal `cyaneus`** (cian-azul) — nuevo `--ig-cyaneus-{lux,nox}`
  + `--ig-text-on-cyaneus-{lux,nox}`. `--ig-info` ahora apunta a `cyaneus`
  en vez de a `axis` (que es violet/secondary). Antes `secondary` e `info`
  eran visualmente idénticos; ahora son colores distintos. Verificado
  WCAG AA en light y dark.
- **`mergeDescribedBy` helper** en `src/utils/`. Tests propios + integrados
  en Input/NativeSelect/Textarea.
- **Tabs `register` API** en `TabsContext` para auto-selección del primer
  Tab.
- **Modal `closingFromSyncRef`** flag interno.
- **`test:unit:ci` script** (vitest con `--isolate --pool=forks`) para CI
  estricto. El `test:unit` por defecto sigue con `isolate=false` por el
  workaround WSL.
- **4 stories interactivas con `play`**: `Input/TypeInteraction`,
  `NativeSelect/ChangeInteraction`, `Slider/KeyboardInteraction`,
  `Stepper/Interactivo` (ahora con play que verifica `aria-current`).

### Changed
- **`vite.config.ts`** ahora sólo activa el modo lib build cuando
  `command === "build" && mode === "production" && STORYBOOK !== "true"`.
  Antes `mode === "production"` solo, lo que disparaba `dts` plugin y
  `copyDesignSystemStyles` también durante `storybook build` (cada deploy
  de igoded.es).
- **`docs.defaultName: "Documentación"` → `"Docs"`**: el unicode `ó`
  generaba URLs `componentes-x--documentaci%C3%B3n` feas y problemáticas
  para search/SEO. Las páginas MDX de Foundations siguen en español.
- **Tema dark-first uniforme**: `useTheme` (ya estaba dark), `ThemeSwitch`
  (era light) y Storybook `withThemeByDataAttribute` (era light) ahora
  todos default `"dark"`. Coherente con el branding.
- **Card type assertion**: `onClick?.(event as unknown as MouseEvent)`
  desde el handler de Enter/Space sustituido por `event.currentTarget.click()`,
  que dispara un MouseEvent auténtico.
- **Alert** `style={{flex:1, minWidth:0}}` inline → clase
  `.ig-alert-content` publicada en `components.css`.
- **Card story `Interactiva`** quita `ig-story-clickable` (la clase
  `.ig-card-interactive` ya implica `cursor: pointer`, y la helper de
  storybook.css confundía a consumers que copiaran el código).
- **`eslint.config.js`** comentario `postinstall` → `prepare` (coincide
  con el script real de `package.json`).
- **README** métricas obsoletas (~285/~175) → texto sin números fijos.

### Migration
- Si confiabas en el `@import` de Google Fonts dentro de `design.css` /
  `tokens.css`, ahora también necesitas:
  ```ts
  import "reactigoded/styles/fonts.css";
  ```
  …o self-host con `next/font`/`@fontsource/*` y override de los
  `--ig-font-*`.
- **Cambio visual: `info` ahora es CYAN, no violet.** Si tu app usa
  `<Toast variant="info">`, `<Alert variant="info">`, `<Badge variant="info">`,
  `<Card variant="info">`, `.ig-btn-info`, `.ig-bg-info`, etc., verás un
  color cian-azul (`--ig-cyaneus`) en vez del violet (`--ig-axis`) de antes.
  La razón: en beta.0–beta.2, `secondary` e `info` apuntaban ambos a `axis`
  y eran visualmente idénticos. Ahora `info` tiene su propio cardinal
  `cyaneus` (WCAG AA verificado en light + dark). Si necesitas el aspecto
  anterior, sobreescribe `--ig-info: var(--ig-axis)` en tu `:root`.
- Si usabas `<Toast variant="default">` en el primitivo (no lo deberías
  desde beta.1, ya estaba renombrado a `neutral`), nada cambia aquí.
- Si `defaultValue` de Slider venía como string, antes el value visible no
  cuadraba con el internal — ahora cuadra. Si dependías del bug, comprueba.

## [1.0.0-beta.2] — 2026-05-02

Refactor de la arquitectura CSS y pulido completo del catálogo Storybook.

### Added
- **`igoded-base.css` (nuevo, ~3 KB)** — globales mínimos del DS:
  `box-sizing` universal, `html` (scroll-behavior, scrollbar-gutter,
  accent-color, caret-color), scrollbar tematizada (`::-webkit-scrollbar*`),
  `::selection`, `@media (prefers-reduced-motion: reduce)`,
  `(prefers-contrast: more)`, `(forced-colors: active)`. Standalone, depende
  solo de tokens. Expuesto como `reactigoded/styles/base.css`.
- **`igoded-components.css` (nuevo, ~270 KB)** — utilities + componentes
  (clases `.ig-*`). Sin selectores globales. Depende de tokens + base.
  Expuesto como `reactigoded/styles/components.css`.
- `.storybook/manager.ts` no era nuevo; sí lo es **`managerHead`** en
  `main.ts`: meta description, og:title/description/url/type, theme-color,
  canonical, twitter:card, y un MutationObserver que reescribe
  `<title>` `"… ⋅ Storybook"` → `"… · Igoded Design System"` en cada
  navegación. Sin polling.
- `docs.defaultName: "Documentación"` (era `"Docs"`).
- Helpers en `.storybook/storybook.css`: `.ig-story-card-{sm,md,lg}`,
  `.ig-story-clickable`, `.ig-story-min-h-{sm,md,lg}`,
  `.ig-foundation-{grid,swatch,token-row,contrast,typo}` para los MDX.
- README: tabla detallada de globales que aplica `base.css`, escenarios
  de import por caso de uso (5 filas).

### Changed
- **`igoded-design.css` ahora es solo un meta-importer** que hace
  `@import` de `tokens.css` + `base.css` + `components.css`. Backward
  compat: un consumer que importa `design.css` recibe lo mismo que antes.
- **`igoded-tokens.css` es ahora 100% variables CSS**: el
  `*, *::before, *::after { box-sizing: border-box }` se movió a
  `base.css`. Tokens.css ya no tiene ningún selector global.
- **Stories renombradas (ES uniforme)**:
  - `Switch.Toggle` → `InteracciónToggle` (no era prop literal).
  - `Accordion.Controlled` / `Sidebar.Controlled` /
    `ThemeSwitch.Controlled` → `Controlado` (consistencia con
    `Switch.Controlado` y `Rating.Controlado`).
- **Card stories**: 4 inline `style={{ maxWidth, cursor }}` → clases
  helper `.ig-story-card-md`, `.ig-story-card-lg`, `.ig-story-clickable`.
- **MDX foundations** (`Spacing.mdx`, `Contrast.mdx`, `DesignTokens.mdx`)
  migrados de inline styles a clases `.ig-foundation-*`. Markup más
  limpio y consistente entre páginas.
- **`igoded-design.css` cabecera reescrita**: las ~190 líneas de índice
  legacy con números de línea desactualizados ("RESET BASE OPCIONAL...215"
  apuntaban a líneas que ya no existen) sustituidas por bloque conciso
  que documenta la arquitectura modular real.

### Migración (sin breaking)
- `import "reactigoded/styles/design.css"` sigue funcionando igual que en
  beta.1. Internamente ahora `@import`a 3 archivos en vez de 2.
- Si importabas `tokens.css` esperando el `box-sizing` global, ahora
  importa `base.css` también (`tokens.css` + `base.css` reproduce el
  comportamiento anterior).

## [1.0.0-beta.1] — 2026-05-02

Pasada de pulido orientada a percepción del catálogo Storybook + saneamiento
de la API pública antes del `1.0.0`.

### Added
- `igoded-tokens.css` (nuevo, ~98 KB) — solo variables `--ig-*`, keyframes y
  `@font-face`, sin clases de componentes. Útil para consumers que construyen
  su propia capa de componentes sobre los tokens del DS.
  Expuesto como `reactigoded/styles/tokens.css`.
- `igoded-reset.css` (nuevo, ~5 KB) — estilos por defecto para HTML nativo
  (h1-h6, p, a, button, input, table…). **Opt-in**, no se importa
  automáticamente con `design.css`. Expuesto como
  `reactigoded/styles/reset.css`.
- `Button.appearance="link"` — quinta apariencia (aplica `ig-btn-link`,
  ignora variant).
- `Card.appearance="outline"|"filled"` — sustituye al flag `filled` (ver
  Changed).
- Card activación Enter/Space automática cuando `interactive` +
  `role="button"` + `onClick`. Encadenable con `onKeyDown` del consumer
  (preventDefault cancela). +6 tests.
- `.storybook/manager.ts` con branding Igoded (createTheme dark,
  Vitreus/Axis colors, brandTitle "Igoded Design System", fonts Saira +
  JetBrains Mono).
- `.storybook/storybook.css` con clases helper `ig-story-{stack,row,grid,
  frame,form,shell,label}` para layouts de stories. NO se publica al paquete.
- Foundations docs MDX: `Spacing.mdx` (visualización de los 25 tokens
  `--ig-space-*`, equivalencias Tailwind, guidance) y `Contrast.mdx`
  (9 pares texto+fondo verificados WCAG AA + garantías a11y de CI).

### Changed
- **CSS reset extraído** de `igoded-design.css` a `igoded-reset.css` opt-in.
  En `design.css` queda solo `*, *::before, *::after { box-sizing: border-box }`
  (necesario para el sizing de los componentes). Eliminado el comentario
  legacy "ESTÁ COMENTADO A PROPÓSITO" que mentía sobre el estado del reset.
- **CSS modular split**: `igoded-design.css` ahora `@import`a
  `igoded-tokens.css` internamente. Self-containment preservado (consumer
  que importa solo `design.css` recibe lo mismo que antes).
- **Storybook preview**: eliminado wrapper global con padding/100vh que
  rompía `layout: "fullscreen"` en Navbar/Sidebar. Eliminado import de
  `state.css` (7.1 MB innecesarios en HMR). Backgrounds reactivados con
  4 valores tokenizados (base/surface/muted/sunken).
- **Stories en español uniforme**: 28 archivos renombrados
  `Default→PorDefecto`, `Variants→Variantes`, `Sizes→Tamaños`. Otros nombres
  ya en ES (`ConImagen`, `Compuesta`, `Interactiva`, etc.) o nombres
  técnicos propios (`Pills`, `Vertical`, `KeepMounted`, `BackdropBlur`)
  intactos.
- **External assets fuera del catálogo**: pravatar/placehold.co reemplazados
  por SVG data URIs inline; 11 emojis de Sidebar reemplazados por SVG inline
  feather-style (consistencia visual entre SO/navegadores).
- **Storybook propFilter** excluye HTML attributes heredados
  (HTMLAttributes, AriaAttributes, DOMAttributes,
  {Button,Input,Textarea,NativeSelect,Anchor}HTMLAttributes) — Controls panel
  muestra solo props del propio package.
- **Glass Navbar story**: gradiente Tailwind genérico
  (#4f46e5/#ec4899/#f59e0b) → gradientes con tokens
  `--ig-vitreus-alpha-*` + `--ig-axis-alpha-*` sobre `--ig-bg-base`.
- **~40 inline styles repetidos** en stories migrados a clases
  `.ig-story-*`. Los inline styles component-internal (sizing de Card,
  padding de inputs internos, márgenes decorativos) se conservan.
- Comentario WCAG en `igoded-design.css:437` corregido AAA → AA (coincide
  con keyword `wcag-aa` y los memos reales de tokens).

### Breaking
- `Button.variant="outline"|"ghost"|"link"` → migrar a
  `Button.appearance="outline"|"ghost"|"link"`. `ButtonVariant` se reduce a
  los 6 colores semánticos. Razón: dos ejes ortogonales
  (color × estilo visual) en vez de mezclar 9 valores en uno.
- `Card.filled` (boolean flag) → migrar a `Card.appearance="filled"`. El
  comportamiento default (`appearance="outline"`) es idéntico.
- `Toast.variant="default"` → renombrado a `"neutral"` por consistencia con
  Alert. Comportamiento idéntico (no añade clase de variant).
- Estilos para HTML nativo (`<h1>`, `<p>`, `<a>`, `<table>`…) ya **no se
  cargan** desde `reactigoded/styles/design.css`. Si los necesitas, importa
  también `reactigoded/styles/reset.css`.

## [1.0.0-beta.0] — 2026-05-01

Cambios desde la migración inicial JSX→TSX. Agrupa el trabajo de las 6
auditorías profundas previas a `1.0.0`.

### Added
- 32 componentes React 19 + TypeScript estricto, con tests unit
  (happy-dom) + Storybook tests (Chromium real + axe-a11y) + 16 stories
  con `play` (interaction tests).
- Compound components: `Accordion`, `Card`, `OptionsMenu`, `Input`, `Modal`,
  `Navbar`, `Sidebar`, `Stepper`, `Table`, `Tabs`, `Timeline`, `Toast`.
- Hooks públicos: `useTheme`, `useToast`, `useAccordion`,
  `useAccordionItem`, `useOptionsMenu`, `useSidebar`, `useTabs`.
- API controlled+uncontrolled en `Accordion`, `Alert`, `OptionsMenu`,
  `Sidebar`, `Slider`, `Switch`, `Tabs`, `ThemeSwitch`, `Rating`.
- `Modal.loading` (aplica `ig-dialog-loading` + `aria-busy`).
- `Badge.dot` (modo punto sin texto, con `role="img"` automático).
- `Button.appearance="solid"|"outline"|"ghost"` combinable con variant
  color (12 clases CSS antes huérfanas ahora expuestas).
- `Input/NativeSelect/Textarea.describedBy` (string|string[]) — auto-`aria-describedby`.
- `Slider.onValueChange(v:number)` — alternativa al `onChange` nativo.
- `Slider aria-valuetext` automático cuando hay `formatValue`.
- `Modal.aria-labelledby` automático vía `ModalContext`+`ModalHeader`.
- `Switch role="switch"` + `aria-checked` (refactor desde checkbox plano).
- `Tooltip.aria-describedby` concatena con el del child existente.
- `BreadcrumbItem` discriminated union por `current`.
- `Step.aria-current` en el span del círculo (no en el div wrapper).
- `Textarea.auto` con `field-sizing: content` (Chrome/Edge 123+,
  Safari 17.4+; Firefox cae al `rows` por defecto).
- `browserslist` declarado en package.json.
- Stories `play` (interaction) en 16 componentes interactivos.
- Tests "fuera de provider" para los 5 hooks de context.
- Tests de cleanup en unmount: OptionsMenu limpia listeners globales,
  ToastProvider limpia timers.
- Tests de transición controlled↔uncontrolled (warning de React).
- `scripts/strip-orphan-css.mjs` — limpia con postcss utilities
  pseudo-class del `state-css` que apuntan a tokens eliminados.

### Changed
- `Toast.closable` → `Toast.dismissible` (alineado con `Alert`).
- `Rating.onChange` → `Rating.onValueChange` (consistencia con `Tabs`,
  `Accordion`, `Slider`).
- `Spinner.label` / `Progress.label` / `Rating.label` → `ariaLabel`
  (estandarización a camelCase).
- `Stepper.active` ahora opcional + `defaultActive`.
- `Alert.open` ahora opcional + `defaultOpen` + `onOpenChange`.
- `dist/styles/index.css` ahora usa `@import` (no concatenación física —
  ahorra 7.85 MB en el unpacked).
- Publish sin sourcemaps de JS (`.js.map`/`.cjs.map`); `.d.ts.map` sí se
  publica.
- `tsconfig.json#exactOptionalPropertyTypes: true`.
- Sección CSS "78b. DIALOG" renombrada a "78. DIALOG / MODAL" (la 78
  legacy se eliminó).
- `Tabs`, `Sidebar`, `OptionsMenu`, `Modal`, `Accordion`, `ToastProvider`
  con `Provider value` memoizado (`useMemo`+`useCallback`).
- `OptionsMenu.setOpen` ahora `useCallback` con deps correctas (era stale
  closure cuando `onOpenChange` cambiaba entre renders).
- `Button.disabled || loading` (antes `??`, permitía que `disabled={false}`
  anulara `loading={true}`).
- `{...rest}` ahora se aplica ANTES de role/aria/tabIndex/disabled/hidden
  en todos los componentes, evitando que un consumer pueda sobreescribir
  atributos críticos accidentalmente.

### Removed
- `.ig-modal-*` (variante legacy con `<div>` — el componente React usa
  `<dialog>` nativo). 11 clases CSS + 7 tokens `--ig-modal-*` + 164
  utilities pseudo-class autogeneradas.
- `.ig-input-{brand,secondary,info,danger,warning}` (variantes color
  nunca expuestas en TS).
- `dist/test/setup.d.ts` del publish (Vitest setup, no público).
- `useState` muerto en `Stepper` (era presentational, no necesitaba
  estado interno).
- Cast `alt={alt ?? ""}` en `Avatar` (`alt` ya required en el tipo
  `AvatarImage`).

### Fixed
- 4 missings de barrel export: `useOptionsMenu`+`OptionsMenuContextValue`,
  `useTabs`+`TabsContextValue`, `SidebarContextValue`,
  `ToastContextValue`, `ModalContextValue`.
- Colisión de `Theme` (definido en dos sitios) — ahora única fuente en
  `hooks/useTheme.ts`.
- `Badge.outline-{variant}` y `Badge.pill` referenciaban CSS inexistente.
- `Spinner.size="xs"` referenciaba CSS inexistente.
- `TabPanel.tabIndex={isActive ? 0 : -1}` (antes siempre 0, panel oculto
  era focusable).
- Tooltip ya no sobreescribe `aria-describedby` del child existente.

### Métricas finales
- Pack tarball: 860 KB.
- 32 unit test files / 285 tests + 32 storybook test files / 175 tests.
- 0 TSX→CSS missings, 0 hooks/contexts sin barrel, 0 CSS huérfanas reales.
- Bundle ESM: 50 KB / gzip 11 KB para 74 componentes.
