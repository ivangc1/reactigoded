# reactigoded

Design system de **igoded** — 32 componentes React 19 + TypeScript estricto
sobre el CSS utility-first state-driven (`igoded-design.css` +
`igoded-state-css.css`).

> **Estado**: `1.0.0-beta.0` — reescritura completa, 0 deprecaciones, listo
> para consumir como dependencia.

## Instalación

```bash
npm install reactigoded
# o
pnpm add reactigoded
```

`react` y `react-dom` >= 19 son `peerDependencies`.

## CSS imports

Tres entradas, eliges qué cargar:

```ts
// Recomendado: solo el CSS de componentes (~470 KB sin gzip)
import "reactigoded/styles/design.css";

// Opcional: utilities pseudo-class (hover:ig-bg-brand, focus:..., etc.)
// 7.1 MB sin gzip — solo si usas las utilities directamente en HTML
import "reactigoded/styles/state.css";

// Atajo: importa los dos vía @import (sin duplicar bytes)
import "reactigoded/styles/all.css";
```

> El `<dialog>` de `<Modal>` y los componentes con flex/transition usan
> `var(--ig-*)` definidos en `design.css`. **Si solo importas `state.css`,
> los componentes no tendrán estilo.**

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
    var t = localStorage.getItem("theme") || "light";
    document.documentElement.dataset.theme = t;
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
npm run test:unit        # vitest happy-dom (~285 tests)
npm run test:storybook   # vitest browser Chromium + axe-a11y (~175 tests)
npm run verify           # lint + typecheck + test:unit + build + test:storybook
```

## Estructura

```
src/
├── components/         # 32 carpetas (1 por componente raíz)
├── hooks/              # useTheme
├── utils/              # cn (wrapper de clsx)
├── styles/             # igoded-design.css + igoded-state-css.css
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

