# reactigoded

Design system de **igoded** — 32 componentes React 19 + TypeScript estricto
sobre un CSS modular utility-first state-driven (`tokens` / `base` /
`components` + `reset` opt-in + `state` opt-in).

> **Estado**: `1.0.0-beta.22` (saneamiento RC1).
> Paleta cardinal estable: 7 cardinales con geometría OKLCH dual
> (L_lux≈0.32 / L_nox≈0.84 / ΔH≤10°), todos AAA contra los 5 fondos
> del tema en ambos modos. El cardinal `info` se llama internamente
> `kobalium` (azul cobalto, H≈260°); la API semántica pública —
> `info` / `--ig-info` / `.ig-*-info` — no cambia. `vitreus` (brand)
> está reposicionado en H=207.50° (centro perceptual verde↔azul en
> OKLCH), hex `#053a40` lux / `#3ae2f7` nox. CI local en verde:
> `lint + typecheck + test:unit + test:contrast (WCAG ≥ 4.5 ambos
> temas + geometría OKLCH + ΔE OKLab) + build + storybook+axe +
> verify:size`.

## Instalación

```bash
npm install reactigoded
# o
pnpm add reactigoded
```

`react` y `react-dom` >= 19 son `peerDependencies`.

## CSS imports

8 entradas. Lo habitual: importa solo `design.css` (+ opcionalmente `fonts.css` si quieres las tipografías Google del DS).

```ts
// 100% variables --ig-* + keyframes. Cero selectores globales, cero
// requests remotos. Útil si construyes tus propios componentes sobre los
// tokens del DS sin cargar nada más.
import "reactigoded/styles/tokens.css";     // ~98 KB

// Globales mínimos: box-sizing + html scroll + scrollbars + ::selection +
// prefers-reduced-motion / contrast / forced-colors. Garantías a11y +
// scrollbar tematizada. Requiere tokens.css.
import "reactigoded/styles/base.css";       // ~4 KB

// Solo clases .ig-* (utilities + componentes). Cero globales. Requiere
// tokens.css + base.css.
import "reactigoded/styles/components.css"; // ~363 KB

// Atajo: tokens + base + components vía @import. Lo habitual.
import "reactigoded/styles/design.css";     // ~370 KB total

// Estilos por defecto para HTML nativo (h1-h6, p, a, button, input, table,
// code, blockquote…). NO lo importes si ya usas Tailwind preflight,
// Bootstrap reboot u otro reset.
import "reactigoded/styles/reset.css";      // ~5.5 KB

// Tipografías Google Fonts oficiales del DS (Electrolize / Saira / JetBrains
// Mono). Opt-in desde 1.0.0-beta.3: el paquete ya NO impone request remoto
// al consumer. Si no lo importas, los componentes caen al fallback
// system-ui declarado en tokens.css. Recomendado: self-host con next/font
// o @fontsource/* para mejor LCP, privacidad y CSP.
import "reactigoded/styles/fonts.css";      // ~2 KB (solo @import a Google Fonts)

// Utilities pseudo-class (hover:ig-bg-brand, focus:..., etc.) — solo si
// usas las utilities directamente en HTML.
import "reactigoded/styles/state.css";      // ~6.5 MB sin gzip / ~700 KB gzipped

// Atajo final: design + reset + state vía @import (sin duplicar bytes).
import "reactigoded/styles/all.css";
```

### Escenarios típicos

| Caso de uso                                       | Imports                                    |
|---------------------------------------------------|--------------------------------------------|
| Uso normal del DS                                 | `design.css`                               |
| DS + tipografías oficiales Google Fonts           | `design.css` + `fonts.css`                 |
| DS + estilos para HTML nativo                     | `design.css` + `reset.css`                 |
| DS completo con HTML nativo y utilities pseudo    | `all.css` (+ `fonts.css` aparte si quieres)|
| Solo tokens, construyo encima                     | `tokens.css`                               |
| Tokens + a11y baseline, mis componentes           | `tokens.css` + `base.css`                  |
| Tema custom, mismas clases del DS                 | `design.css` + override `:root`            |

> El `<dialog>` de `<Modal>` y los componentes con flex/transition usan
> `var(--ig-*)` definidos en `design.css`. **Si solo importas `state.css` o
> `reset.css`, los componentes no tendrán estilo.**

> El `reset.css` se separó del `design.css` en `1.0.0-beta.1` (antes estaba
> activo dentro de `design.css`). Si actualizas desde una beta anterior y
> notas que tu HTML nativo perdió estilos, importa `reset.css`.

> ⚠️ **Breaking visual desde `1.0.0-beta.5`**: el `reset.css` ya no estiliza
> `<button>` con la marca. Antes daba a todo `<button>` `background: vitreus`
> + `color: text-on-vitreus`; ahora salen `background: transparent`,
> `color: inherit`, `border: 0`, `padding: 0`, `cursor: pointer`. Si tu app
> dependía de que cualquier `<button>` nativo apareciera con look brand
> "gratis", ahora los verás transparentes. **Migración**: añade la clase
> base `.ig-btn` + la variante (`.ig-btn-brand`, `.ig-btn-secondary`,
> `.ig-btn-success`, `.ig-btn-warning`, `.ig-btn-danger`, `.ig-btn-info`,
> `.ig-btn-outline-*`, `.ig-btn-ghost-*`, `.ig-btn-link`) a esos
> elementos — usa preferentemente el componente `<Button variant="…">`
> de la librería, esas clases son la API CSS pública subyacente.
> **Razón**: combinaciones bg/color heredadas rompían contraste cuando
> un wrapper aplicaba sus propios colores.

### Globales aplicados por `base.css` (incluido en `design.css`)

`design.css` **no estiliza** elementos HTML nativos como `h1`, `p`, `a`,
`button`, `input` o `table` — eso vive en `reset.css` (opt-in).

Sí aplica un baseline global mínimo (`base.css`), pensado como
infraestructura del sistema (no como opinión visual sobre tu HTML):

| Selector / @-rule | Qué hace |
|---|---|
| `*, *::before, *::after { box-sizing: border-box }` | Necesario para que padding+border de los componentes calcule el tamaño correcto. |
| `html { scroll-behavior, scrollbar-gutter, accent-color, caret-color }` | Suaviza scroll, reserva gutter de scrollbar, fija color de focus en checkboxes/radios nativos y caret de inputs. |
| `::-webkit-scrollbar*` | Scrollbar tematizada (solo Chrome/Edge/Safari). |
| `::selection`, `::-moz-selection` | Color de selección de texto coherente con la marca. |
| `@media (prefers-reduced-motion: reduce)` | Reduce animation/transition a `0.01ms` para usuarios con sensibilidad al movimiento. **Garantía a11y, no opcional.** |
| `@media (prefers-contrast: more)` | Refuerza bordes en `.ig-btn`, `.ig-input`, `.ig-card`. |
| `@media (forced-colors: active)` | Compatibilidad con Windows High Contrast Mode. |

**Si quieres cero globales** en una sub-zona aislada, importa solo
`tokens.css` + `components.css` (sin `base.css`). Pierdes el baseline a11y
del sistema; asegúrate de que ya lo tienes en tu propia capa.

## Uso

```tsx
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalClose,
  Toast,
  ToastProvider,
  useToast,
} from "reactigoded";
import "reactigoded/styles/design.css";

function App() {
  return (
    <ToastProvider position="top-right">
      <Page />
    </ToastProvider>
  );
}

function Page() {
  const { toast } = useToast();
  return (
    <Button onClick={() => toast({ variant: "success", title: "Guardado" })}>
      Guardar
    </Button>
  );
}
```

## Componentes (32)

| Categoría | Componentes |
|---|---|
| **Acciones** | `Button`, `Chip`, `Pagination` |
| **Display** | `Avatar`, `AvatarGroup`, `Badge`, `Card` (+`CardHeader`/`Body`/`Footer`/`Image`/`Divider`), `Divider`, `Skeleton`, `Spinner`, `Timeline`+`TimelineItem` |
| **Feedback** | `Alert`, `Progress`, `Toast`+`ToastProvider`+`useToast`, `Tooltip` |
| **Formularios** | `Checkbox`, `Input` (+`Label`/`Helper`/`ErrorText`/`InputGroup`/`InputAddon`), `Radio`, `Rating`, `Select`, `Slider`, `Switch`, `Textarea`, `ThemeSwitch` |
| **Navegación** | `Accordion`+`AccordionItem`+`AccordionHeader`+`AccordionContent`, `Breadcrumb`+`BreadcrumbItem`, `Dropdown`+`DropdownTrigger`+`DropdownMenu`+`DropdownItem`+`DropdownDivider`+`DropdownHeader`, `Modal`+`ModalHeader`+`ModalBody`+`ModalFooter`+`ModalClose`, `Navbar`+`NavbarBrand`+`NavbarNav`+`NavbarLink`+`NavbarActions`+`NavbarMenuButton`, `Sidebar`+`SidebarHeader`+`SidebarNav`+`SidebarItem`+`SidebarFooter`+`SidebarToggle`+`SidebarDivider`+`SidebarSection`, `Stepper`+`Step`, `Table` (+`TableHead`/`Body`/`Foot`/`Row`/`HeaderCell`/`Cell`/`Caption`), `Tabs`+`TabList`+`Tab`+`TabPanel`+`TabsContent` |

Hooks públicos: `useTheme`, `useToast`, `useAccordion`, `useAccordionItem`,
`useDropdown`, `useSidebar`, `useTabs`.

## API CSS pública

Las clases `.ig-*` que usan los componentes son **API pública del paquete**
y se pueden aplicar directamente sobre HTML estático sin montar React (útil
para emails, PDFs, demos rápidas, fragmentos server-rendered). El convenio
es uniforme: **clase base + modifiers de variant / size / shape / state**,
todos kebab-case y todos compuestos por concatenación con guion.

Tabla mínima (clase base por componente). Los modifiers siguen el patrón
estándar `{base}-{variant}` / `{base}-{size}` y se documentan exhaustivamente
en Storybook → *Fundamentos / CSS API pública* — [referencia con
tablas detalladas y ejemplos HTML por los 32 componentes](https://igoded.es/?path=/docs/fundamentos-css-api-publica--docs).

| Componente              | Clase base                | Modifiers principales                                                                  |
|-------------------------|---------------------------|----------------------------------------------------------------------------------------|
| `Accordion`             | `.ig-accordion`           | `-item`, `-item-open`, `-header`, `-content`, `-icon`                                  |
| `Alert`                 | `.ig-alert`               | variants `-brand`/`-secondary`/`-success`/`-warning`/`-danger`/`-info`/`-neutral`, `-title`, `-description`, `-icon`, `-close` |
| `Avatar` / `AvatarGroup`| `.ig-avatar`              | sizes `-xs`…`-xl`, `-square`, `-group`, `-status-online`/`-busy`/`-away`/`-offline`     |
| `Badge`                 | `.ig-badge`               | variants color, sizes, `-pill`, `-dot`                                                  |
| `Breadcrumb`            | `.ig-breadcrumb`          | `-item`, `-current`, `-separator`                                                       |
| `Button`                | `.ig-btn`                 | variants `-brand`/`-secondary`/`-success`/`-warning`/`-danger`/`-info`, `-outline-*`, `-ghost-*`, `-link`, sizes `-xs`…`-xl`, `-block`, `-icon`, `-loading` |
| `Card`                  | `.ig-card`                | `-header`, `-body`, `-footer`, `-image`, `-divider`, `-bordered`                        |
| `Checkbox`              | `.ig-checkbox`            | variants color, sizes                                                                   |
| `Chip`                  | `.ig-chip`                | variants color, `-close`                                                                |
| `Divider`               | `.ig-divider`             | variants color, `-vertical`, `-dashed`, `-with-text`                                    |
| `Dropdown`              | `.ig-dropdown`            | `-trigger`, `-menu`, `-item`, `-divider`, `-header`, `-open`                            |
| `Input` / `Textarea` / `Select` | `.ig-input` · `.ig-textarea` · `.ig-select` | `-error`, `-success`, `-addon`, `-group`, `-textarea-auto`, `-select-auto` |
| `Modal`                 | `.ig-dialog` *(<dialog> nativo)* | `-header`, `-body`, `-footer`, `-close`, sizes `-sm`…`-xl`/`-full`, `-backdrop-blur`/`-dark`/`-light`/`-no-backdrop`, `-show`, `-loading` |
| `Navbar`                | `.ig-navbar`              | `-brand`, `-nav`, `-actions`, `-link`, `-menu-button`, `-sticky`/`-fixed`               |
| `Pagination`            | `.ig-pagination`          | variants color, `-active`                                                               |
| `Progress`              | `.ig-progress`            | `-bar`, variants color, sizes                                                           |
| `Radio`                 | `.ig-radio`               | variants color, sizes                                                                   |
| `Rating`                | `.ig-rating`              | sizes `-sm`/`-md`/`-lg`, `-readonly`                                                    |
| `Sidebar`               | `.ig-sidebar`             | `-header`, `-nav`, `-item`, `-section`, `-footer`, `-toggle`, `-divider`, `-collapsed`  |
| `Skeleton`              | `.ig-skeleton`            | `-avatar`, `-avatar-lg`, `-text`, `-rect`, `-circle`                                    |
| `Slider`                | `.ig-slider`              | `-group`, `-value`                                                                      |
| `Spinner`               | `.ig-spinner`             | variants color, sizes                                                                   |
| `Stepper`               | `.ig-stepper`             | `-labeled`                                                                              |
| `Switch` / `ThemeSwitch`| `.ig-switch`              | variants color, sizes                                                                   |
| `Table`                 | `.ig-table`               | `-bordered`, `-auto`, `-row`, `-header-cell`, `-cell`, `-caption`                       |
| `Tabs`                  | `.ig-tabs`                | variants color, `-content`, `-list`, `-tab`, `-panel`                                   |
| `Timeline`              | `.ig-timeline`            | `-item`, `-content`, `-date`                                                            |
| `Toast`                 | `.ig-toast`               | placement `-top-left`/`-top-right`/`-bottom-left`/`-bottom-right`/`-bottom-center` …    |
| `Tooltip`               | `.ig-tooltip`             | placement `-place-top`/`-place-bottom`/`-place-left`/`-place-right`, variants `-color-brand`/`-color-secondary`/… |

> Los modifiers son aditivos: una variante completa de Button es, p.ej.,
> `<button class="ig-btn ig-btn-brand ig-btn-lg ig-btn-block">…</button>`.
> La librería React monta exactamente estas mismas clases — los componentes
> son wrappers delgados sobre la capa CSS.

## Patrones recurrentes

### Controlled vs. uncontrolled

Componentes con estado (`Accordion`, `Alert`, `Dropdown`, `Sidebar`,
`Slider`, `Switch`, `Tabs`, `ThemeSwitch`, `Rating`) soportan ambos modos:

```tsx
// Uncontrolled — el componente gestiona su estado.
<Tabs defaultValue="perfil">…</Tabs>

// Controlled — la app gestiona el estado.
const [tab, setTab] = useState("perfil");
<Tabs value={tab} onValueChange={setTab}>…</Tabs>
```

`Modal` es **controlled-only** (siempre necesita `open`+`onClose`).
`Pagination` soporta tanto controlled (`currentPage`+`onPageChange`) como
uncontrolled (`defaultPage`, `onPageChange` opcional) desde 1.0.0-beta.20.

### Tema light/dark

Tres opciones según necesidad:

1. **Toggle UI listo**: `<ThemeSwitch />` (persiste en `localStorage`,
   aplica `data-theme` a `<html>`, SSR-safe).
2. **Hook programático**: `const { theme, toggleTheme, setTheme } = useTheme()`
   para integrarlo en menús de ajustes.
3. **Manual**: `document.documentElement.dataset.theme = "dark"` en cualquier
   momento.

Para evitar el flash de tema incorrecto en SSR (Next.js, Remix), inyecta un
script blocking en `<head>` que aplique `data-theme` antes del paint:

```html
<script>
  (function () {
    // Orden de prioridad: storage > preferencia del sistema > dark (default
    // del DS desde 1.0.0-beta.3 — branding dark-first). Sin esto, hay un
    // flash de tema incorrecto entre el primer paint server y el primer
    // paint cliente cuando el usuario tiene tema persistido distinto.
    try {
      var stored = localStorage.getItem("theme");
      var systemDark =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      var t = stored || (systemDark ? "dark" : "light") || "dark";
      document.documentElement.dataset.theme = t;
    } catch (e) {
      document.documentElement.dataset.theme = "dark";
    }
  })();
</script>
```

### Accesibilidad

- Todos los componentes interactivos siguen el patrón [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) más cercano: `role`, `aria-*`, keyboard nav, focus management.
- Los textos por defecto (`aria-label`, `closeLabel`, `prevLabel`, etc.) están
  **en español**. Para otros idiomas, pasa la prop con tu traducción:

```tsx
<Pagination
  prevLabel="Previous"
  nextLabel="Next"
  aria-label="Pagination"
  …
/>
```

- `Modal` usa `<dialog>` HTML nativo (focus trap, ESC, top-layer y
  `aria-modal` automáticos).
- `Tooltip` inyecta `aria-describedby` en el child y un `<span role="tooltip">`
  sr-only para lectores de pantalla.

### SSR / hydration

- Todos los componentes son SSR-safe (no acceden a `window`/`document` durante
  render; los efectos sí, pero solo en cliente).
- `<Modal>` no llama `showModal()` en server (el `<dialog>` se queda con
  `display:none` hasta que el efecto cliente lo abre — sin flash).
- `<Toast>` se renderiza inline en SSR (no portal) hasta que `document.body`
  está disponible.

## Browserslist

Targets oficiales (últimas 2 versiones de Chrome, Firefox, Safari, Edge):

- `<dialog>.showModal()`: 98% global ✓
- `color-mix()`: 95% ✓
- `backdrop-filter`: 97% ✓
- `field-sizing` (`Textarea auto`): Chrome 123+, Safari 17.4+; **Firefox aún
  no** — el `Textarea auto` en Firefox cae al comportamiento `rows` por
  defecto.

## Scripts (dev)

```bash
npm run dev              # playground (http://localhost:5173)
npm run storybook        # docs/demos (http://localhost:6006)
npm run build            # dist/ con index.js + index.cjs + .d.ts + styles/
npm run test:unit        # vitest happy-dom (suite completa)
npm run test:unit:ci     # como test:unit, con isolate=true + pool=forks (CI estricto)
npm run test:contrast    # CSS estático: pares bg/color + geometría OKLCH
npm run test:storybook   # vitest browser Chromium + axe-a11y (DOM real)
npm run verify           # lint + typecheck + test:unit + test:contrast + build + test:storybook + verify:size
```

**`test:contrast` vs `test:storybook`** — son guardrails complementarios,
no redundantes. `test:contrast` parsea `igoded-components.css` con postcss
y valida cada regla que declara `color` + `background[-color]` en el mismo
bloque, contra los 14 hex de los pares cardinales en ambos temas. Es rápido
y atrapa la mayoría de regresiones, pero **no cubre**: alphas/tinted con
`color-mix(... transparent)` o `rgba(... .5)` (no compone contra el padre),
combinators padre-hijo en reglas separadas (solo ve pares dentro del mismo
bloque), gradients ni `currentColor`. Para esos casos depende
`test:storybook`, que ejecuta cada story en chromium headless con axe-core
sobre el DOM final ya pintado.

## Estructura

```
src/
├── components/         # 32 carpetas (1 por componente raíz)
├── hooks/              # useTheme
├── utils/              # cn (wrapper de clsx)
├── styles/             # igoded-{tokens,base,components,design,reset,state-css}.css
└── index.ts            # entry del paquete
scripts/
└── strip-orphan-css.mjs  # limpia utilities de state-css apuntando a tokens eliminados
```

## Decisiones técnicas

- **`ref` como prop** (React 19) — sin `forwardRef`, mejor inferencia.
- **Sin `PropTypes`** — TypeScript estricto.
- **`exactOptionalPropertyTypes: true`** — `prop={undefined}` no equivale a
  no pasar la prop.
- **CSS-first** — la lógica visual vive en `.css`; los componentes React
  son wrappers delgados que aplican clases condicionalmente.
- **Sin transpilación CSS** — el CSS publicado usa `color-mix()`,
  `backdrop-filter`, `@container`, `field-sizing`. Targets modernos
  (browserslist arriba).
- **Sourcemaps de JS desactivados en publish** — los `.d.ts.map` sí se
  publican (útiles para "go-to-definition" desde consumer).
- **`sideEffects: ["**/*.css"]`** — bundlers tree-shake JS pero conservan
  CSS imports.

## Desarrollo

Para trabajar sobre el repo (no como consumidor del paquete) usar
`--legacy-peer-deps` al instalar:

```bash
git clone https://github.com/ivangc1/reactigoded.git
cd reactigoded
npm ci --legacy-peer-deps
```

Causa del flag: conflicto peer-dep entre `@storybook/addon-vitest`
(que pin-ea una versión de `@vitest/browser` que no coincide con el
mismo paquete declarado en nuestras `devDependencies` para usar la
API de tests directamente). El instalador moderno de npm marca esto
como bloqueante por defecto desde npm 7. El flag baja el conflicto a
warning y procede.

**No afecta a los consumidores del paquete**: cuando alguien instala
`reactigoded` como dep, solo se resuelven `peerDependencies` (`react`
y `react-dom`). Las devDependencies del repo no viajan al consumer.

Tracking: post-RC1 evaluar bump de Storybook o vitest para alinear
las dos referencias y eliminar el flag.

## Licencia

MIT — ver [LICENSE](./LICENSE).

