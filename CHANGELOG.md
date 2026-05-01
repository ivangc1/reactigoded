# Changelog

Todos los cambios notables de este paquete se documentan aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/),
versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

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
