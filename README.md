# reactigoded

Design system de **igoded** — 32 componentes React 19 + TypeScript estricto
sobre un CSS modular utility-first state-driven (`tokens` / `base` /
`components` + `reset` opt-in + `state` opt-in).

> **Estado**: `1.0.0-beta.4` — última pasada pre-`1.0.0`: API HTML
> estándar uniforme (`aria-label` directo en vez de prop `ariaLabel` en 12
> componentes); Rating clamp robusto (`value > max`, max no entero);
> Tabs registry post-mount (defaultValue inválido cae al primer Tab); Slider
> filtra arrays al DOM; size-limit en CI con budgets por archivo (~10.7 KB
> ESM gzip · ~67 KB components.css gzip); `vite.lib.config.ts` separado;
> `Fundamentos/Variantes` MDX nuevo. 0 deprecaciones. **Listo para `1.0.0`
> tras 1-2 semanas de soak time.**

## Instalación

```bash
npm install reactigoded
# o
pnpm add reactigoded
```

`react` y `react-dom` >= 19 son `peerDependencies`.

## CSS imports

8 entradas en `1.0.0-beta.4`. Lo habitual: importa solo `design.css` (+ opcionalmente `fonts.css` si quieres las tipografías Google del DS).

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
import "reactigoded/styles/state.css";      // ~7.1 MB

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
| **Display** | `Avatar`, `AvatarGroup`, `Badge`, `Card` (+`CardHeader`/`Body`/`Footer`/`Image`/`Divider`), `Divider`, `Skeleton`, `Spinner`, `Tag`/`Timeline`+`TimelineItem` |
| **Feedback** | `Alert`, `Progress`, `Toast`+`ToastProvider`+`useToast`, `Tooltip` |
| **Formularios** | `Checkbox`, `Input` (+`Label`/`Helper`/`ErrorText`/`InputGroup`/`InputAddon`), `Radio`, `Rating`, `Select`, `Slider`, `Switch`, `Textarea`, `ThemeSwitch` |
| **Navegación** | `Accordion`+`AccordionItem`+`AccordionHeader`+`AccordionContent`, `Breadcrumb`+`BreadcrumbItem`, `Dropdown`+`DropdownTrigger`+`DropdownMenu`+`DropdownItem`+`DropdownDivider`+`DropdownHeader`, `Modal`+`ModalHeader`+`ModalBody`+`ModalFooter`+`ModalClose`, `Navbar`+`NavbarBrand`+`NavbarNav`+`NavbarLink`+`NavbarActions`+`NavbarMenuButton`, `Sidebar`+`SidebarHeader`+`SidebarNav`+`SidebarItem`+`SidebarFooter`+`SidebarToggle`+`SidebarDivider`+`SidebarSection`, `Stepper`+`Step`, `Table` (+`TableHead`/`Body`/`Foot`/`Row`/`HeaderCell`/`Cell`/`Caption`), `Tabs`+`TabList`+`Tab`+`TabPanel`+`TabsContent` |

Hooks públicos: `useTheme`, `useToast`, `useAccordion`, `useAccordionItem`,
`useDropdown`, `useSidebar`, `useTabs`.

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

`Modal` y `Pagination` son **controlled-only** (siempre necesitan
`open`+`onClose` o `currentPage`+`onPageChange`).

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
  ariaLabel="Pagination"
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
npm run test:storybook   # vitest browser Chromium + axe-a11y
npm run verify           # lint + typecheck + test:unit + build + test:storybook
```

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

## Licencia

MIT — ver [LICENSE](./LICENSE).

