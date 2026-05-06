# Convenciones de stories de catálogo (galerías)

Las stories tipo `AllStates`, `Variantes`, `_matrix.tsx` y similares
son **galerías**: renderizan N instancias del mismo componente en una
sola página de Storybook. Axe trata cada story como un documento HTML
real y aplica reglas que asumen "una página = un sitio web". Los
componentes no fallan en uso real (donde hay UNA instancia por
página), pero la galería sí — y lo descubrimos cuando ya ha pasado
review de los componentes individuales.

Estas son las lecciones acumuladas en beta.19 / beta.20 que **toda
story de catálogo nueva debe respetar**.

> Origen: `docs/DS_AUTOSUFFICIENCY_DEBT.md` Capa 5. Este archivo es la
> versión enlazable / linkeable. Si añades una nueva regla aquí,
> sincronízala en el debt doc para no fragmentar la fuente de verdad.

---

## 1. `aria-label` único por landmark

Cada `<nav>`, `<aside>`, `<header>`, `<footer>` (roles landmark
implícitos) necesita un `aria-label` único en la galería. Los
defaults del DS (`"Migas de pan"`, `"Principal"`, `"Navegación
lateral"`) se repiten al renderizar varias instancias y rompen la
regla axe `landmark-unique`.

```tsx
// ❌ Galería con 3 instancias del Sidebar — default aria-label se repite
<Sidebar><SidebarNav>…</SidebarNav></Sidebar>
<Sidebar><SidebarNav>…</SidebarNav></Sidebar>
<Sidebar><SidebarNav>…</SidebarNav></Sidebar>

// ✅ aria-label distinto en cada instancia
<Sidebar aria-label="Sidebar default">
  <SidebarNav aria-label="Nav default">…</SidebarNav>
</Sidebar>
<Sidebar aria-label="Sidebar collapsed">
  <SidebarNav aria-label="Nav collapsed">…</SidebarNav>
</Sidebar>
```

**Componentes afectados (verificados en beta.19/20)**: Breadcrumb,
Pagination, Sidebar, SidebarNav, Navbar, NavbarNav, ThemeSwitch (si
está dentro de `<header>`).

---

## 2. Multi-banner / multi-contentinfo: envolver en `<section aria-label>`

Axe regla `landmark-no-duplicate-banner` solo permite UN `<header>`
top-level. Misma regla para `<footer>` (`landmark-no-duplicate-contentinfo`).
En una galería con múltiples Navbar/Footer, hay que **demover** cada
instancia de su rol landmark a `region`:

```tsx
// ❌ N <header> top-level
<Navbar>…</Navbar>
<Navbar>…</Navbar>

// ✅ Cada uno envuelto en <section aria-label> que lo demueve
<section aria-label="Demo Navbar default">
  <Navbar>…</Navbar>
</section>
<section aria-label="Demo Navbar sticky">
  <Navbar>…</Navbar>
</section>
```

El mismo patrón funciona con `<footer>`.

---

## 3. Inputs sueltos: `aria-label` o `placeholder` obligatorio

Cuando la story no usa un `<Label htmlFor>` adyacente, cada `Input`,
`Textarea`, `Select`, `Slider`, `Switch`, `Checkbox`, `Radio`
necesita un `aria-label` (o `placeholder` con texto significativo).

```tsx
// ❌ Input sin label asociado ni aria-label
<Input type="email" />

// ✅ aria-label
<Input type="email" aria-label="Email del usuario" />

// ✅ Label htmlFor (preferible cuando hay texto visible)
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

---

## 4. `defaultValue=` (no `value=`) en inputs sueltos sin `onChange`

En galerías visuales rara vez quieres interactividad real. `value=`
sin `onChange` bloquea la UI (warn dev del hook
`useControllableState`, capa 1.4 del debt doc) y además React emite
warning sobre input controlado sin handler.

```tsx
// ❌ value= sin onChange
<Input value="alguien@ejemplo.com" />
<Slider value={50} />

// ✅ defaultValue= (uncontrolled)
<Input defaultValue="alguien@ejemplo.com" />
<Slider defaultValue={50} />

// ✅ Si DEBE ser controlled: añadir handler stub
<Input value="alguien@ejemplo.com" onChange={() => {}} />

// ✅ Display-only intencional: usar la prop específica del componente
<Rating value={4} readOnly />
```

---

## 5. Selectores de `play()` usan accessibility tree, no atributo CSS

`canvasElement.querySelectorAll('[role="X"]')` **no resuelve roles
implícitos** de ARIA. `<input type="range">` tiene `role="slider"`
implícito, pero `[role="slider"]` no lo matchea.

```ts
// ❌ Selector CSS que no resuelve role implícito
const sliders = canvasElement.querySelectorAll('[role="slider"]');

// ✅ Utility del DS que usa Testing Library queryAllByRole
import { queryAllByRoleSafe } from "@/test-utils";
const sliders = queryAllByRoleSafe(canvasElement, "slider");

// ✅ Selector HTML directo cuando el role implícito viene del tag
const sliders = canvasElement.querySelectorAll('input[type="range"]');
```

---

## 6. `toBeGreaterThanOrEqual` por defecto en assertions de count

`toBeGreaterThan(N)` con count exacto N falla off-by-one cuando la
galería renderiza exactamente N items. Usar `>=` por defecto en los
plays:

```ts
// ❌ Off-by-one cuando count exacto es N
expect(items.length).toBeGreaterThan(N);

// ✅ Utility del DS con nombre explícito
import { expectAtLeast } from "@/test-utils";
expectAtLeast(items, N);

// ✅ Directo
expect(items.length).toBeGreaterThanOrEqual(N);
```

---

## Cómo aplicar estas reglas

1. Antes de escribir la story, identifica qué landmarks/inputs renderiza.
2. Aplica reglas 1, 2, 3 según el caso.
3. Si tu story muestra múltiples valores, decide controlled/uncontrolled
   con regla 4 (default uncontrolled).
4. Si la story tiene `play()`, aplica reglas 5 y 6.
5. Linkar este archivo desde el header del primer `_matrix.tsx` o de
   cualquier story que sirva de plantilla.

## Cobertura DS

Convenciones validadas en producción a través de:

- `verify:storybook` (axe-core en cada story).
- `verify:scope-leaks` (heurística estática componente-level).
- `verify:contrast` (WCAG ≥ 4.5 vs reglas de `igoded-components.css`).

Si escribes una story que rompe alguna regla, el gate CI lo captura.
Este archivo existe para que no llegues a ese punto.
