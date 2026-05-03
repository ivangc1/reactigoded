# Changelog

Todos los cambios notables de este paquete se documentan aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/),
versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

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
  e inputs (`.ig-input`, `.ig-select`, `.ig-textarea`) → `Field`/`FieldText`.
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
  `useTabs`, `useAccordion`, `useAccordionItem`, `useDropdown`,
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
- **Input/Select/Textarea**: `aria-describedby` que el consumer pasara vía
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
- **Dropdown a11y**: el selector de navegación excluye también
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
  en Input/Select/Textarea.
- **Tabs `register` API** en `TabsContext` para auto-selección del primer
  Tab.
- **Modal `closingFromSyncRef`** flag interno.
- **`test:unit:ci` script** (vitest con `--isolate --pool=forks`) para CI
  estricto. El `test:unit` por defecto sigue con `isolate=false` por el
  workaround WSL.
- **4 stories interactivas con `play`**: `Input/TypeInteraction`,
  `Select/ChangeInteraction`, `Slider/KeyboardInteraction`,
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
