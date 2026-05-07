# Deuda técnica de autosuficiencia del DS

Inventario retroactivo de bugs CSS/visual/a11y que tests pre-beta.19 no
capturaban, organizado en cuatro capas de cobertura. Plan ejecutable
para roadmap post-beta.20 → 1.0.0 → 1.1.0.

**Filosofía**: el DS debe ser autosuficiente. Cada patrón documentado
aquí es un fallo que el DS arquitectónicamente PUEDE prevenir o
detectar antes de llegar al consumer. Lavarse las manos diciendo
"responsabilidad del consumer" pone el coste en el otro lado. Si un
componente PUEDE auto-protegerse, debe hacerlo.

---

## Inventario retroactivo de bugs no capturados

| Bug | Versión detectado | Patrón |
|---|---|---|
| Divider con texto pintaba franja completa cyan | beta.14 | CSS scope-leak global → wrapper compound |
| Textarea/Select estados `error`/`success` invisibles | beta.17 | Orden de cascada CSS, misma especificidad |
| Elevación LIGHT con tinte sub-perceptible | beta.15 | Contraste técnico ≥ 4.5 pero distinción visual mínima |
| Divider con texto: jerarquía de color invertida | beta.13 | Visual gestalt (líneas adyacentes formando banda) |
| `<button>` reset asume contexto del padre | beta.5 | Reset CSS con asunciones de fondo |
| Hex `vitreus` no cumplía intención semántica | beta.16 | Drift documentación vs hex literal |
| Hex hardcoded en stories Card/Avatar | beta.19 | Sin gate que valide hex literales contra tokens |
| Breadcrumb `landmark-unique` (multi-`<nav>`) | beta.19 | a11y axe — no captura happy-dom |
| Input `label` (sin label/aria-label/placeholder) | beta.19 | a11y axe — no captura happy-dom |
| Divider play() off-by-one | beta.19 | `toBeGreaterThan(N)` con count exacto N |
| Slider `[role="slider"]` vs implícito | beta.20 | querySelectorAll no resuelve accessibility tree |
| Stepper `color-contrast 1.02` | beta.20 | CSS scope-leak global → wrapper compound (idéntico a Divider beta.14) |
| Navbar `landmark-no-duplicate-banner` | beta.20 | a11y axe — multi-`<header>` |
| Sidebar `landmark-unique` en `<nav>` interno | beta.20 | a11y axe — `SidebarNav` default duplicado |

**Patrón crítico recurrente**: CSS scope-leak global → wrapper compound.
Aparecido **dos veces con dos años de distancia** (Divider beta.14,
Stepper beta.20). NO es accidente único; es patrón estructural del
CSS del DS. Justifica capa 3 dedicada.

---

## Capa 1 — Auto-protección componente-level

Patrones que el componente puede auto-detectar con dev-warn o hooks de
validación. NO requieren navegador real. Cada solución va con su test
unit anti-regresión y entry en CHANGELOG.

### 1.1 Inputs sin label asociado ✅ aplicada en post-RC1

**Solución aplicada**: hook `src/utils/useA11yWarnInput.ts` que warn
en dev cuando Input/Textarea/Select se montan sin ningún mecanismo
de label (htmlFor, aria-label, aria-labelledby, placeholder no vacío).
Una vez por instancia. Aplicado a Input, Textarea, Select. Tests
anti-regresión cubren los 4 mecanismos + componentName en mensaje.

```tsx
useEffect(() => {
  if (!isDev()) return;
  const id = inputRef.current?.id;
  const hasLabel = id && document.querySelector(`label[for="${id}"]`);
  const hasAriaLabel = inputRef.current?.getAttribute("aria-label");
  const hasAriaLabelledby = inputRef.current?.getAttribute("aria-labelledby");
  const hasPlaceholder = inputRef.current?.placeholder;
  if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby && !hasPlaceholder) {
    console.warn(
      "[ig-input] Input sin label asociado. Añade <Label htmlFor>, " +
      "aria-label, aria-labelledby o placeholder para accesibilidad."
    );
  }
}, []);
```

**Componentes afectados**: Input, Textarea, Select.
**Estimación**: 1-2h.
**Detectado**: beta.19 (AllStates Ola 1).

### 1.2 Multi-landmarks `<nav>`/`<aside>` sin aria-label único ✅ aplicada en post-RC1

**Solución aplicada**: hook `src/utils/useLandmarkRegistry.ts` con
registry shared a nivel módulo (role → Map<label, count>). Warn dev
cuando dos componentes con el mismo role landmark tienen aria-label
idéntico vivos al mismo tiempo. Aplicado a Breadcrumb (navigation),
NavbarNav (navigation), Pagination (navigation), Sidebar
(complementary), SidebarNav (navigation). Tests anti-regresión
cubren: NO warn con role distinto / label distinto / undefined,
SÍ warn con colisión, unmount limpia el registry, 3 instancias
warnean 2 veces.

**Componentes afectados**: Sidebar, SidebarNav, Pagination, Breadcrumb,
cualquier componente con `<nav>` o `<aside>`.
**Estimación**: 2-3h (hook + adopción).
**Detectado**: beta.19 (Breadcrumb), beta.20 sub-B (SidebarNav).

### 1.3 Multi-landmarks `<header>`/`<footer>` top-level ✅ aplicada en post-RC1

**Solución aplicada**: hook
`src/utils/useTopLevelLandmarkCheck.ts` con counter shared a nivel
módulo. En mount, usa `closest(WRAPPER_SELECTOR)` para verificar si
el elemento está dentro de un wrapper landmark (`<main>`, `<article>`,
`<section aria-label>`, `[role="region"]`, etc.). Si NO está
envuelto, contribuye al counter top-level. Si el counter sube de
1 a 2, warn dev con el role afectado y mitigación sugerida
(envolver en `<section aria-label>`). Aplicado a Navbar (banner).
Tests anti-regresión cubren: 1 top-level NO warn, 2 SÍ warn,
envuelto en main/section[aria-label]/[role=region] NO cuenta,
mezcla top-level + envuelto.

**Patrón documentado de mitigación story-level** (cuando el componente
todavía no implementa el warn): envolver cada instancia en
`<section aria-label="Demo X">` que la despromueve a `region`. Es la
solución aplicada hoy en `Navbar.stories.tsx → AllStates`. Funciona
también para `<footer>` con `contentinfo`.

**Componentes afectados**: Navbar (header), Footer si existe.
**Estimación**: 2h (lógica + tests).
**Detectado**: beta.20 sub-B (Navbar `landmark-no-duplicate-banner`,
4 instancias en grid AllStates).

### 1.4 `value=` sin `onChange=` (controlled sin handler) ✅ aplicada en beta.21

**Cerrado en beta.21** (commit `d7589d8`) vía Option E descrita
abajo: el warn dev se re-aplicó en `useControllableState` con un
escape hatch interno `__suppressNoHandlerWarn` que los componentes
con modo display-only legítimo (Rating con `readOnly`) activan
explícitamente. Desde beta.22 el flag además se elimina del `.d.ts`
publicado vía `stripInternal: true` en `tsconfig.build.json`
(B-02), así que NO aparece en autocomplete del consumer.



**Intento beta.20** (commit `2975e19`, revertido): warn dev en
`useControllableState` cuando `isControlled === true && options.onChange === undefined`.
Removido posteriormente por falsos positivos: el patrón
`<Rating value={N} readOnly />` (y equivalentes de display-only) es
legítimo — no es un controlled "roto", es un componente intencionalmente
no-mutable. La variante `Rating.SoloLectura` y `Rating.AllStates`
disparaban el warn sin que hubiese bug.

**Diagnóstico**: el warn detecta correctamente la forma sintáctica
(`value=` sin `onChange=`) pero ignora el caso semántico real
(`readOnly` o equivalente). Filtrar por `readOnly` desde el hook
acopla el hook a una prop de cada componente; declarar handlers stub
en cada story es ruido y degrada el ejemplo público.

**Diseño aprobado para rc.1 (Option E)** — escape hatch interno:

```ts
// Internal-only flag, NO documentado en API pública. Usado por
// componentes que tienen un modo legítimo de "value sin onChange"
// (Rating readOnly, Slider readOnly futuro, etc.) para silenciar
// el warn del hook sin necesidad de stub onChange.
type UseControllableStateOptions<T> = {
  // …existing fields
  /** @internal */
  __suppressNoHandlerWarn?: boolean;
};

// En el componente:
function Rating({ value, onChange, readOnly, ...rest }) {
  const state = useControllableState({
    value,
    defaultValue: 0,
    onChange,
    __suppressNoHandlerWarn: readOnly === true,
  });
  // …
}
```

El warn vuelve a activarse en el hook con la condición:

```ts
isControlled
  && options.onChange === undefined
  && options.__suppressNoHandlerWarn !== true
```

**Componentes a auditar antes de re-activar**:
- Rating (`readOnly` prop) — caso conocido del fallo beta.20.
- Slider (`readOnly` futuro si se añade) — preventivo.
- Switch (no tiene readOnly hoy, pero algunos consumers lo usan
  como display-only via `disabled`; revisar si pasa el warn).
- Resto (Tabs, Accordion, Modal, Toast, Dropdown, Pagination,
  Stepper, ThemeSwitch, Input compound): no tienen modo
  display-only legítimo, deberían disparar el warn correctamente.

**Tests anti-regresión para rc.1**:
- Hook test: warn se dispara sin `__suppressNoHandlerWarn`.
- Hook test: warn NO se dispara con `__suppressNoHandlerWarn: true`.
- Story test: `Rating.SoloLectura` no genera warn en consola
  (assertion sobre `console.error` mock).

**Componentes afectados**: los 10 componentes con `useControllableState`.
**Coste real beta.20**: ~30 min implementación + ~30 min revert +
~30 min documentación = 1.5h gastadas en producir → revertir.
**Coste estimado rc.1**: 1.5h (re-aplicar warn con flag + auditar
3 componentes con modo display-only + tests anti-regresión).
**Detectado**: beta.19 (varios AllStates Ola 1).
**Falso positivo detectado**: beta.20 sub-D verificación pre-commit
(Rating.SoloLectura/AllStates).

### 1.5 Plays con `[role="X"]` no resuelven role implícito ✅ aplicado en beta.20

**Solución aplicada**: utility `queryAllByRoleSafe()` exportada desde
`src/test-utils/`. Internamente usa Testing Library `queryAllByRole`,
resuelve accessibility tree (slider, checkbox, radio, button…).

**Migración**: plays existentes que usan `querySelectorAll('[role="X"]')`
pueden migrar a `queryAllByRoleSafe(canvas, "X")` en su próxima edición.
**Coste real**: 1h (utility + tests + export). Migración plays opcional.
**Detectado**: beta.20 sub-A (Slider).

### 1.6 Off-by-one en assertions de plays ✅ aplicado en beta.20

**Solución aplicada**: utility `expectAtLeast(els, min, message?)`
exportada desde `src/test-utils/`. Wrapping idiomático de
`toBeGreaterThanOrEqual` con nombre que hace explícita la intención.

**Coste real**: 30 min (utility + tests).
**Detectado**: beta.19 (Divider).

**Estimación capa 1 restante**: 5-7h (#1.1, #1.2, #1.3 pendientes).

---

## Capa 2 — Gate chromium+axe (NO sustituible)

Patrones que requieren navegador real con cascada DOM completa. NO se
pueden sustituir por checks estáticos. El gate `test:storybook` sigue
siendo la red final para:

### 2.1 Cascada cruzada CSS

`bg` viene de regla global, `color` viene de regla anidada más
específica que matchea el mismo elemento. El script
`check-component-contrast.mjs` audita pares dentro del mismo bloque
CSS — limitación documentada.

**Caso histórico**: Stepper beta.20.

### 2.2 Focus-visible contraste sobre fondos activos

Pendiente de auditar en Card brand activa, Rating stars, Tabs activas.
Stories dedicadas disparando focus + axe lo capturarían.

**Estimación**: 1-2h (stories nuevas que disparan focus en `play()`).

### 2.3 Estados hover/active sub-perceptibles

Tabs items, Dropdown items con fondo muy claro y texto poco contrastante
en hover. Stories con `play()` que dispara hover via `userEvent.hover()`.

**Estimación**: 1-2h.

### 2.4 Visual gestalt

Líneas adyacentes formando bandas continuas, elementos vecinos con
mismo color produciendo confusión visual. NO captable por axe ni por
checks estáticos. Requiere ojo humano o comparación visual.

**Caso histórico**: Divider con texto beta.13.
**Cobertura**: snapshot visual con Chromatic (ya existe — capa 4).

**Estimación capa 2 stories nuevas**: 2-4h.

---

## Capa 3 — Scripts estáticos de auditoría

Patrones detectables sin navegador con un parser AST/CSS.

### 3.1 CSS scope-leak detection ✅ aplicada en beta.21

Patrón comprobadamente recurrente: clases globales de variant
(`.ig-divider-brand`, `.ig-step-active`) sin scope compound matchean
accidentalmente wrappers anidados.

**Casos históricos**:
- Divider beta.14: `.ig-divider-brand` pintaba `<div>` wrapper completo
  en variante "with text".
- Stepper beta.20: `.ig-step-active` pintaba `.ig-step-item` wrapper
  completo, dejando label invisible (contraste 1.02).

**Solución aplicada** — `scripts/check-css-scope-leaks.mjs`:

1. ✅ Parsea `src/styles/igoded-components.css` con PostCSS.
2. ✅ Lista todas las clases que aparecen como selectores globales sin
   compound (`.ig-X-foo` solo, NO `.ig-X.ig-X-foo` ni `.ig-Y .ig-X-foo`).
3. ✅ Filtra a clases con sufijo de modificador (estados: `-active`,
   `-complete`, `-disabled`…; variantes: `-brand`, `-success`, `-danger`…;
   apariencia: `-filled`, `-outline`, `-dashed`…). Las clases base de
   wrapper/slot no son riesgo de scope-leak.
4. ✅ Cuenta líneas distintas con la clase en cada `.tsx` del componente
   (heurística proxy de "≥ 2 elementos JSX que la emiten"; ignora
   comentarios).
5. ✅ Cruza con `scripts/scope-leak-allowlist.json` (entradas auditadas
   intencionales; ifs/else mutuamente excluyentes, modes con renderizado
   exclusivo, slots con sufijo coincidente con variant).
6. ✅ Modo `--strict` (CI) sale con código no-cero ante riesgo NUEVO.
   Modo soft solo warn.

**Run inicial beta.21**: 420 clases modificadoras candidatas, 6
allowlisted (Step labeled, Sidebar/Dropdown link-vs-button modes,
Divider variants, Navbar brand slot), 0 riesgos nuevos.

**Limitaciones documentadas** (en JSDoc del script):
- No captura "cascade reach" (clase global aplicada a UN elemento que
  pinta también descendientes vía herencia o `*`). Caso Divider
  beta.14 NO se captura aquí. Cobertura adicional:
  `check-component-contrast.mjs` con DOM real.
- Heurística sobre líneas: clase emitida vía `.map()` rendereando
  varios items podría tener N ocurrencias visuales pero solo 1 línea
  fuente. NO se marca como leak en ese caso.

**Integración**: `npm run test:scope-leaks` (modo strict) en
`verify:unit` pipeline.

**Coste real**: ~2h (script + heurística refinada + allowlist + audit
de 6 findings).
**ROI confirmado**: ya capturó intencionalmente el patrón Stepper
post-fix (allowlist), bloqueando regresiones futuras.

### 3.2 Drift hex hardcoded vs tokens ✅ aplicada en post-RC1

Hex literales (`#3ae2f7`, `#d2bff7`, `#c4cada`…) aparecen hardcoded
en stories, manager-head, MDX y comentarios. Cuando los tokens del DS
cambian (recalibración OKLCH, ajuste de hue, etc.) los hex literales
quedan stale silenciosamente y producen drift visual entre el
catálogo y los componentes reales.

**Casos históricos**:
- beta.16: vitreus reposicionado de H≈194° a H=207.5° (`#5eded5` →
  `#3ae2f7`). Tokens actualizados, pero `manager.ts`, stories Card,
  stories Avatar y SVG inline siguieron con el hex viejo. Detectado
  en auditoría manual de beta.18 y fixed en beta.19 (commit
  `4a1fecf`).
- beta.16: axis recalibrado (`#d4c2f9` → `#d2bff7`). Mismo problema
  en stories Card/Avatar.
- beta.16: cinis ajustado (`#c3cbdb` → `#c4cada`). Mismo en
  `manager.ts`.

Patrón: cada vez que se recalibra un cardinal, se generan ~10-15 hex
hardcoded en archivos no-CSS que hay que sincronizar a mano. Ningún
test detecta el drift.

**Solución aplicada** — `scripts/check-hex-drift.mjs`:

1. ✅ Parsea `src/styles/igoded-tokens.css` y extrae tokens cardinales
   + fundus (`--ig-{cardinal}-{lux|nox}`, `--ig-fundus-{lux|nox}`)
   → set de hex VIGENTES.
2. ✅ Grep `#[0-9a-fA-F]{6}` en `src/components/**.tsx`,
   `.storybook/**.{ts,tsx,html}`, `src/stories/**.{mdx,tsx}`,
   `docs/**.md`, `README.md`.
3. ✅ Para cada hex: si está en el set vigente OK; si NO está pero
   tiene ΔE OKLab < 0.05 con un token vigente → reportar drift
   posible; si ΔE ≥ 0.05 con todos → hex no relacionado con paleta,
   no reportar.
4. ✅ Allowlist `scripts/hex-drift-allowlist.json` para hex
   intencionales auditados (Storybook chrome elevation, ejemplos
   documentales del propio bug histórico).
5. ✅ Modo `--strict` (CI) sale con código no-cero ante drift nuevo.
   Integrado en `verify:unit` pipeline vía `npm run test:hex-drift`.

**Run inicial post-RC1**: 49 hex escaneados, 18 tokens vigentes,
4 entradas allowlisted (3 instancias de Storybook elevation + 3
ejemplos doc del propio debt doc), 0 drifts nuevos.

**Coste real**: 2h (script + culori ΔE OKLab + allowlist + audit
de 7 findings iniciales).
**ROI confirmado**: previene drift silencioso en cada recalibración
futura. Si beta.X recalibra un cardinal y queda hex viejo en
manager.ts/stories/MDX, el script lo captura en CI antes del merge.

---

## Capa 4 — Snapshot visual con Chromatic (existente)

Red final para regresiones visuales tipo gestalt. Ya existe. Mantener
como gate obligatorio en CI.

**Quitar `--auto-accept-changes=main`** post-1.0.0 estable para forzar
review humano de cada cambio visual.

---

## Capa 5 — Convenciones de stories de galería (catálogo)

Las stories `AllStates` y similares son **galerías** que renderizan
N instancias del mismo componente en una sola página. Axe trata cada
story como un documento HTML real y aplica reglas que asumen "una
página = un sitio web". Los componentes no fallan en uso real (donde
hay UNA instancia por página), pero la galería sí.

**Lecciones acumuladas (beta.19/20)** que debe respetar cualquier
story de catálogo nueva:

### 5.1 aria-label único por landmark

Cada `<nav>`, `<aside>`, `<header>`, `<footer>` con role landmark
implícito necesita aria-label único. Default del DS (`"Migas de pan"`,
`"Principal"`, `"Navegación lateral"`) hay que sustituir por algo
descriptivo en cada instancia de la galería.

**Casos beta.19/20**: Breadcrumb, Pagination, Sidebar, SidebarNav,
Navbar (NavbarNav también).

### 5.2 Multi-banner / multi-contentinfo: envolver en `<section aria-label>`

Axe regla `landmark-no-duplicate-banner` solo permite UN `<header>`
top-level. Misma regla para `<footer>` (`landmark-no-duplicate-contentinfo`).
En galerías, envolver cada instancia en
`<section aria-label="Demo X">` que la despromueve a `region`.

### 5.3 Inputs sueltos con `aria-label` o `placeholder`

Cuando la story no usa un `<Label htmlFor>` adyacente, cada Input,
Textarea, Select necesita `aria-label` (o `placeholder` si visible).

### 5.4 `defaultValue=` en inputs sueltos sin `onChange`

`value=` sin `onChange` además de bloquear UX (capturado por warn
beta.20 #1.4) provoca warning de React. Usar `defaultValue=` en
demos de catálogo.

### 5.5 Selectors de plays usan accessibility tree, no atributo CSS

`canvasElement.querySelectorAll('[role="X"]')` no resuelve role
implícito ARIA. Usar `queryAllByRoleSafe(canvasElement, "X")` (utility
del DS, capa 1.5) o selector HTML directo (`input[type="range"]`).

### 5.6 `toBeGreaterThanOrEqual` por defecto en assertions de count

`toBeGreaterThan(N)` con count exacto N falla off-by-one. Usar
`expectAtLeast(els, N)` (utility del DS, capa 1.6) o
`toBeGreaterThanOrEqual(N)` directamente.

**Acción aplicada (post-RC1)**: convenciones extraídas a
`docs/STORY_CATALOG_CONVENTIONS.md` con ejemplos ❌/✅ por regla y
linkado desde el header de `src/stories/_matrix.tsx` para que el
siguiente que escriba una story de catálogo las tenga delante.

**Coste real**: 30 min (extracción + reformulación + link).

---

## Capa 6 — Convenciones de tests unit

### 6.1 NO afirmar sobre `console.error` mock para warnings de React

`vitest.config.ts` usa `pool: "threads"`, `maxWorkers: 1`,
`isolate: false`. Todos los archivos comparten worker → React
deduplica sus warnings dev por proceso (un mismo warning solo se
emite la primera vez). Cualquier test que afirme sobre
`console.error.mock.calls` para detectar warnings de React
(`"controlled to uncontrolled"`, key warnings, deprecations) **es
flaky por orden de ejecución**: pasa aislado, falla en el suite
completo.

**Caso histórico**: Slider/Switch en beta.20 sub-Bloque D —
2 tests viejos (`"transición uncontrolled→controlled emite warning
de React"`) eran flaky. Reemplazados por assertions sobre
**comportamiento observable** (input nativo refleja `value`/`checked`
externo tras rerender) en commit del Bloque D.

**Regla**: assertions sobre warnings dev de React están prohibidas.
Si hace falta verificar transición controlled↔uncontrolled, usar
patrón "comportamiento":

```ts
const { rerender } = render(<Comp defaultValue="a" />);
expect(getInput().value).toBe("a");
rerender(<Comp value="b" onChange={() => {}} />);
expect(getInput().value).toBe("b");
```

Si por alguna razón es indispensable testar warning emission,
configurar el test file con `isolate: true` localmente (override del
config global).

**Componentes auditados**: Slider, Switch (corregidos beta.20). Sin
otros casos detectados.
**Estimación capa 6**: 0 (regla; no hay deuda activa más allá de
esta documentación).

### 6.2 Estructura DOM de Switch: `ig-switch` va en `<label>`, no en `<input>` ✅ aplicada

Anti-patrón fácil de cometer al escribir tests: `screen.getByRole("switch")`
devuelve el `<input type="checkbox">` interno, NO el `<label>`
wrapper. La clase `ig-switch` está en el `<label>`. Para asserts
sobre la clase wrapper desde el input:

```ts
const input = screen.getByRole<HTMLInputElement>("switch");
expect(input.closest("label")).toHaveClass("ig-switch");
```

**Aplicado**: nota añadida en JSDoc de `Switch.tsx` (beta.20) con la
estructura DOM completa y ejemplo de assert correcto desde tests.

**Coste real**: 5 min (comentario JSDoc).
**Detectado**: beta.20 sub-Bloque D.

---

## Auditoría reset.css ✅ aplicada en post-RC1

`reset.css` opcional que el consumer importa. Asume contexto de fondo
del padre. Caso histórico beta.5: `<button>` con `background: vitreus`
+ `color: text-on-vitreus` heredaba colores cuando un wrapper aplicaba
sus propios. Migración beta.5 ya retiró el patrón pero el reset sigue
con asunciones implícitas.

**Auditoría aplicada — patrón documentado**:

| Bloque | Regla | Asunción de contexto | Riesgo |
|---|---|---|---|
| `html` | `color: var(--ig-text-body)` + `background-color: var(--ig-bg-base)` | el `<html>` arranca con bg-base + text-body que están WCAG-calibrados entre sí | bajo (root) |
| `h1-h6` | `color: var(--ig-text-heading)` (sin bg propio) | el padre tiene `bg-base` o `bg-sunken` | **MEDIO**: si un wrapper aplica bg vitreus/laurus/etc., los heading heredan color calibrado contra bg-base que puede degradar |
| `p` | sin color propio (hereda de body) | el padre tiene bg compatible | bajo |
| `a` | `color: var(--ig-link-color)` (sin bg) | mismo patrón heading | **MEDIO** mismo riesgo |
| `button` | `bg: transparent` + `color: inherit` (post-beta.5) | hereda del padre intencionalmente | **OK** — fix beta.5 |
| `input/textarea/select` | `bg: var(--ig-input-bg)` + `color: var(--ig-input-text)` | tokens dedicados con bg propio | OK |
| `code/pre` | `bg: var(--ig-bg-muted)` | bg propio | OK |
| `blockquote` | `color: var(--ig-text-muted)` | hereda padre | bajo |
| `hr/table` | borders con `--ig-border-default` | OK |
| `th` | `bg: var(--ig-bg-sunken)` | bg propio | OK |
| `::selection` | bg/color tokens | OK |

**Riesgo sistemático detectado**: `<h1>`-`<h6>`, `<a>`, `<p>`,
`<blockquote>` heredan `color` calibrado contra `bg-base`. Si el
consumer envuelve elementos del reset en un wrapper con bg distinto
(ej. `<section style="background: var(--ig-vitreus)">`) el contraste
puede degradar bajo WCAG sin que axe lo capture (no hay assertion
de contraste sobre `bg` heredado).

**Mitigación documentada** en `docs/CSSAPI.mdx` sección "Reset.css
contexto de fondo": consumers que cambian `bg` en wrappers deben:
(a) NO usar elementos HTML nativos del reset dentro de ese wrapper, o
(b) re-aplicar `color` apropiado al wrapper, o
(c) usar componentes del DS (que sí gestionan bg+color juntos).

**Cambio post-RC1**: ninguno al CSS — el reset es razonable como
está. Solo documentación.

**Coste real**: 1h (audit + matriz + doc).

---

## Estimación total roadmap

| Capa / Item | Estimación | Cuándo | Estado |
|---|---|---|---|
| 1.4 warn `useControllableState` (Option E) | 1.5h | beta.21 | ✅ aplicada (commit `d7589d8`); desde beta.22 el flag interno se elimina del dts vía stripInternal (B-02) |
| 1.5 utility `queryAllByRoleSafe` | 30 min | beta.20 | ✅ aplicado |
| 1.6 utility `expectAtLeast` | 30 min | beta.20 | ✅ aplicado |
| 1.1 hook `useA11yWarnInput` | 1h real | post-RC1 | ✅ aplicada |
| 1.2 hook `useLandmarkRegistry` | 1.5h real | post-RC1 | ✅ aplicada |
| 1.3 detección banner top-level | 1h real | post-RC1 | ✅ aplicada |
| 3.1 script CSS scope-leak | 2h real | beta.21 | ✅ aplicada |
| 3.2 script hex drift detection | 2h real | post-RC1 | ✅ aplicada |
| 2.2 stories focus-visible | 1h real | post-RC1 | ✅ aplicada |
| 2.3 stories hover/active | 1h real | post-RC1 | ✅ aplicada |
| Auditoría reset.css | 1h real | post-RC1 | ✅ aplicada (doc only) |
| Capa 5 doc `STORY_CATALOG_CONVENTIONS.md` | 30 min real | post-RC1 | ✅ aplicada |
| 6.1 regla anti-`console.error` warnings React | 0 (regla) | beta.20 | ✅ documentada |
| 6.2 nota JSDoc estructura DOM Switch | 5 min | beta.20 | ✅ aplicada |

**Total restante**: 0h — todas las capas accionables ✅ aplicadas en
beta.20, beta.21 y post-RC1. Lo único que queda son items
bloqueados por razón externa documentados en `POST_RC1_BACKLOG.md`
(esperar 2 meses feedback para tripwire `axis-kobalium`, esperar
1.0.0 estable para quitar Chromatic `--auto-accept-changes=main`)
y la decisión humana sobre el ΔE Check 3 → ERROR con allowlist
permanente (Punto 35 del plan beta.19, decisión pendiente).

**Coste real total ejecutado** (vs estimación 13-20h):
- Capa 1 (1.1, 1.2, 1.3, 1.4, 1.5, 1.6): ~5h.
- Capa 2 (2.2, 2.3): ~2h.
- Capa 3 (3.1, 3.2): ~4h.
- Capa 5 (doc + audit): ~1.5h.
- Capa 6 (6.1, 6.2): ~10 min.
- Auditoría reset.css: 1h.
- **Total ~13.5h** dentro del rango estimado.

---

## Patrones a NO reabrir

- **Capa 4 (Chromatic)**: existe y funciona. Mantener.
- **Tooltip Floating UI**: cambio arquitectónico mayor, post-1.0.0
  según `reactigoded_post_beta20_deferred.md`.
- **Fragmentar `state.css`**: breaking estructural, 1.1.0+.
- **clsx peer-dep**: decisión cerrada NO. No reabrir.
