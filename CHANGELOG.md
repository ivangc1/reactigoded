# Changelog

Todos los cambios notables de este paquete se documentan aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/),
versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

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
  {Button,Input,Textarea,Select,Anchor}HTMLAttributes) — Controls panel
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
- Compound components: `Accordion`, `Card`, `Dropdown`, `Input`, `Modal`,
  `Navbar`, `Sidebar`, `Stepper`, `Table`, `Tabs`, `Timeline`, `Toast`.
- Hooks públicos: `useTheme`, `useToast`, `useAccordion`,
  `useAccordionItem`, `useDropdown`, `useSidebar`, `useTabs`.
- API controlled+uncontrolled en `Accordion`, `Alert`, `Dropdown`,
  `Sidebar`, `Slider`, `Switch`, `Tabs`, `ThemeSwitch`, `Rating`.
- `Modal.loading` (aplica `ig-dialog-loading` + `aria-busy`).
- `Badge.dot` (modo punto sin texto, con `role="img"` automático).
- `Button.appearance="solid"|"outline"|"ghost"` combinable con variant
  color (12 clases CSS antes huérfanas ahora expuestas).
- `Input/Select/Textarea.describedBy` (string|string[]) — auto-`aria-describedby`.
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
- Tests de cleanup en unmount: Dropdown limpia listeners globales,
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
- `Tabs`, `Sidebar`, `Dropdown`, `Modal`, `Accordion`, `ToastProvider`
  con `Provider value` memoizado (`useMemo`+`useCallback`).
- `Dropdown.setOpen` ahora `useCallback` con deps correctas (era stale
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
- 4 missings de barrel export: `useDropdown`+`DropdownContextValue`,
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
