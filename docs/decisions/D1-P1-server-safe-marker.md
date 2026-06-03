# D1-P1 — `@server-safe` JSDoc marker + suite SSR ejecutable

**Fecha**: 2026-05-18
**Estado**: ✅ **IMPLEMENTADO en beta.24** (gate review claudegate3)
**Origen**: D1 server-safe infrastructure (parte 1 de 4)

## Contexto

Pre-D1, el DS era SSR-safe de hecho (verificado en `__ssr__.test.tsx` con 38 casos `renderToString` + 4 `hydrateRoot` post H-08), pero sin contrato declarativo ni gate ejecutable que previniera regresiones futuras.

Para consumers que usan React Server Components o SSR puro (Next.js, Remix, Astro islands), saber qué componentes son seguros de renderizar en server sin "use client" es crítico. Sin marker explícito, el consumer debe inspeccionar cada componente para decidir.

## Decisión

Establecer una infraestructura de dos componentes:

1. **JSDoc tag `@server-safe`**: declaración de intención. Lo añade el autor del componente cuando confirma que el render path es determinístico server-side.

2. **Gate `check-server-safe-markers.mjs`**: enforza el invariante. Archivos marcados `@server-safe` deben cumplir:
   - NO `"use client"` directive (contradicción).
   - NO acceso DOM bare (`document.X` / `window.X` / `navigator.X` / `process.X` / `Buffer.X`) sin guard `typeof X !== "undefined"`.

3. **Test double-render idempotence**: dos invocaciones de `renderToString(jsx)` con el mismo JSX deben producir el mismo HTML. Cualquier side-effect en render path (module-level counters, mutación de estado externo) rompe el invariante.

### Componentes marcados en beta.24

**Los 36 archivos sin `"use client"` directive en `src/components/`**, validados por el gate (0 violations):

- Presentational: `Avatar/AvatarGroup`, `Badge`, `Breadcrumb/BreadcrumbItem`, `Button` + `IconButton`, `Card/CardBody/CardDivider/CardFooter/CardHeader/CardImage`, `Chip`, `Divider`, `Dialog/DialogBody/DialogFooter`, `Input/ErrorText/Helper/InputAddon/InputGroup/Label`, `Navbar/NavbarActions/NavbarBrand/NavbarLink/NavbarMenuButton`, `Progress`, `Radio`, `Sidebar/SidebarDivider/SidebarFooter/SidebarHeader/SidebarSection`, `Skeleton`, `Spinner`, `Stepper/Step`, `Table`, `Timeline/TimelineItem`, `Toast` (el item; el Provider sí es client).

El gate pasa con 36 markers, 0 violations. Los componentes restantes del DS (Dialog provider/content/trigger/header/close, Menu family, Tooltip, ThemeToggle, Switch, etc.) tienen `"use client"` explícito por design (state interno, portales, FUI) y NO son candidatos a `@server-safe`.

### Componentes NO candidatos

Por design:
- **Dialog / AlertDialog / Menu / Tooltip / Toast**: client-only por portales + `"use client"` granular + FUI.
- **ThemeToggle / Switch**: usan `useSyncExternalStore` con DOM access (vía guards), técnicamente safe pero con caveat — el consumer debe entender la semántica del fallback server.
- **Sidebar / Accordion / Tabs**: usan `useId` que en React 19 da IDs distintos entre invocaciones independientes de `renderToString` — excluidos del double-render strict check (test los skip vía `USES_USE_ID` set).

## useId y double-render

React 19 `useId()` no garantiza el mismo ID entre invocaciones independientes de `renderToString`. Dentro de una invocación los IDs son estables; entre invocaciones varían. Esto NO rompe SSR — el ID se persiste vía DOM y se hidrata correctamente con el ID que renderizó el server.

El test `double-render idempotence` skip esos componentes vía la passlist `USES_USE_ID`. Componentes "puros" sin useId se verifican byte-by-byte.

## CI integration

`npm run test:server-safe-markers` añadido al pipeline `verify:unit` (pre-build). El gate ahora corre con cada CI build. Si un PR añade `@server-safe` a un componente con violation, falla.

## Implementación

### Archivos

- `scripts/check-server-safe-markers.mjs`: gate script. Listing recursivo de `src/components/` + `src/hooks/`, lee archivos con `@server-safe`, valida invariantes.
- `package.json`:
  - script `test:server-safe-markers`.
  - encadenado en `verify:unit`.
- `src/__ssr__.test.tsx`: nuevo `describe("SSR — double-render idempotence (D1-P1)")` con `cases.filter(c => !USES_USE_ID.has(c.name))`.
- 5 componentes con `@server-safe` JSDoc (Button, Badge, Chip, Divider, Spinner).

## Patrón consumer (React Server Components)

Tras D1-P1 + D1-P3 (planned: `react-server` conditional export), el consumer Next.js App Router puede importar directamente:

```tsx
// app/page.tsx (Server Component)
import { Button } from "reactigoded";  // @server-safe → OK

export default function Page() {
  return <Button>Click</Button>;  // SSR puro, sin hydration
}
```

Para componentes interactivos (Dialog, Menu, Toast, etc.), el consumer debe envolverlos en Client Component:

```tsx
// app/components/InteractiveDialog.tsx
"use client";
import { Dialog, DialogTrigger, DialogContent } from "reactigoded";
// ...
```

## Out of scope (post-RC1)

- **Style injection guard**: hoy no existe componente con `style={{ runtime: x }}` que cause hydration mismatch (Progress migró a CSS var en H-03). Si en el futuro se introducen, el guard será un nuevo check del gate.
- **useSyncExternalStore audit**: hoy todos los 3 usos (ThemeToggle, useTheme, ToastProvider) tienen `getServerSnapshot` explícito y se han verificado manualmente. Auto-audit sería un nuevo check.

## Addendum beta.27 — modelo fail-closed + marker fail-loud (BLOCKER-1, cruce A+B claudegate6)

El cruce de auditorías A+B (claudegate6) encontró que la regla §2 ("NO acceso DOM bare") estaba implementada como **denylist** de ~46 nombres browser-only, estructuralmente insuficiente: `lib.dom.d.ts` declara ~826 globals client-only que lanzan `ReferenceError` en Node, y la denylist cubría 46 → ~780 pasaban silenciosos (`HTMLElement`, `Element`, `self`, `CSS`, customElements nuevos…). Cambiarla por una denylist *más completa* conserva la dirección de fallo equivocada (lo desconocido pasa).

**Cambio**: el gate pasa a **fail-closed (whitelist)**. El safe-set se enumera —`SAFE_GLOBALS = (builtins ES ∪ globals de Node, vía paquete `globals`) − INTENTIONAL_DENY − overclaims`— y se flaggea el acceso bare a **cualquier** identificador no resuelto en scope y ausente del safe-set. Un global DOM nuevo se caza solo; un falso positivo es ruido corregible, no un `ReferenceError` en producción SSR.

Detalles:

- **INTENTIONAL_DENY** (Node los provee pero se deniegan igual): `globalThis` (bypass constructor), `process`/`Buffer` (portabilidad Workers/Deno), `navigator` (subset inestable), `localStorage`/`sessionStorage` (webstorage experimental), `eval`/`Function` (dynamic eval sinks).
- **Engine-min anchor**: `globals` puede listar globals posteriores a Node 22.12.0 (engine mínimo). El test `server-safe-catalog-vs-node.test.ts` corre en la matriz CI (22.12 + 24) y falla si `SAFE_GLOBALS ⊄ runtime`. Verificado contra Node 22.12 real: 8 overclaims subtraídos (`AsyncDisposableStack`, `CloseEvent`, `DisposableStack`, `ErrorEvent`, `Float16Array`, `Storage`, `SuppressedError`, `URLPattern`).
- **Determinismo**: `SAFE_GLOBALS` se deriva solo del paquete `globals` (datos estáticos), nunca del `globalThis` ambiente — el gate se importa también bajo jsdom (donde `window`/`document`/`HTMLElement` estarían polyfilled), y un runtime-intersect lo envenenaría.
- **`isNonReferencePosition` reglas 11-13**: bajo la denylist no se ejercitaban (el predicado short-circuitaba); el modelo whitelist las hace load-bearing para todo identificador, exponiendo posiciones type-space (QualifiedName, interface-heritage) y `import.meta` que se borran en compilación. El `extends` de una CLASE NO se excluye (es ref runtime — `class X extends HTMLElement` debe flaggearse).

**Marker fail-loud**: la detección de `@server-safe` miraba solo `sourceFile.statements` (top-level); un marker en JSDoc anidado pasaba inadvertido (fail-open silencioso). Ahora recorre el AST completo y **lanza un error** si el marker aparece en posición anidada — fuerza la forma canónica en vez de detección permisiva.

Validación: 0 violations sobre los 39 archivos marcados; bypasses cazados (incl. START-1 HTMLElement/self/CSS y `class X extends HTMLElement`); `SAFE_GLOBALS ⊆ Node 22.12` con 0 ausentes.

### Hardening post-review adversarial (mismo BLOCKER)

Una revisión adversarial multi-agente del primer commit (cada hallazgo reproducido con fixture real contra el gate, incl. Node 22.12) encontró y cerró:

- **Function constructor escape vía `.constructor`** (FN/bypass): `[].constructor.constructor("código")()` alcanzaba el `Function` constructor desde cualquier base (literal, valor SAFE) sin nombrar `Function` → eval-sink que pasaba. El gate solo lo cazaba colateralmente con base `globalThis`. Fix: toda invocación de `.constructor` (`x.constructor(...)`, callee de CallExpression) es `no-dynamic-eval-sink`, preservando reflexión/comparación/clon `new` (0 FP).
- **`global` en SAFE** (FN/bypass): alias Node de `globalThis`, lo listaba `globals.nodeBuiltin` → `global.process.env` y `global.constructor.constructor()` pasaban. Fix: añadido a `INTENTIONAL_DENY`.
- **Pin de contenido de `SAFE_GLOBALS`**: un minor bump de `globals` (`^17.6.0`) podría añadir un nombre floor-present-pero-unsafe sin que Test A lo cace (solo caza ausentes del runtime). Fix: pin del set exacto (122 nombres) en el test.
- **FPs fail-closed** (sobre-flagueo): nombre de campo de clase (`PropertyDeclaration`), label / `break` / `continue`, y `arguments` en funciones no-arrow → exentos en `isNonReferencePosition` / scope.
- **Marker fail-open two-block + prosa**: `ts.getJSDocTags` devolvía solo el último de varios bloques JSDoc consecutivos (fail-open) y un `@server-safe` embebido en prosa lanzaba fail-loud FALSO. Fix: iterar `node.jsDoc` (todos los bloques) + filtro de posición canónica (tag al inicio de línea JSDoc, no en prosa).

Una segunda re-revisión adversarial (sobre el hardening anterior) cerró además variantes del Function constructor escape que la primera iteración dejaba pasar: cadena asignada a una variable (`const F = x.constructor.constructor; F("code")()`), `.call`/`.bind` sobre el constructor, operador coma, y constructor pasado como argumento. La detección pasó de "callee de CallExpression" a flaggear la cadena `x.constructor.constructor` se llame o no (regla (a): un member access `constructor` cuya base es OTRO member access `constructor`).

El review de Codex (PR) añadió un P2 de la MISMA clase que los type-position: la regla 9 de `isNonReferencePosition` (JSX tag name) eximía TODO tag — incluido uppercase. Bajo fail-closed `<HTMLElement/>` (global DOM como componente JSX) lanza `ReferenceError` en SSR pero pasaba el gate. Fix: lowercase = intrínseco (exento); uppercase exento SOLO si el nombre está declarado a nivel de módulo (`gatherModuleDeclaredNames` — componente importado/local/forward-ref/mutuo) o resuelto en scope. Member-expr (`<Foo.Bar/>`) resuelve por el root vía la rama (c) existente. Se auditó además TODA la superficie de `isNonReferencePosition` (30 posiciones: las 14 reglas × read/non-read) — sólida, sin más over-exemptions: fail-closed convierte cada exención en load-bearing, así que el cierre se hizo de clase, no caso a caso.

Una segunda ronda de Codex (sobre el commit del fix JSX) cerró dos más de la misma familia "fail-closed convierte cada exención en load-bearing":
- **P1 — el guard `typeof X !== "undefined"` suprimía eval/escape sinks**: el cambio fail-closed hacía que el guard se reconociera para cualquier no-SAFE, incluidos `eval`/`Function`/`globalThis`/`global`. Pero esos se deniegan por ser vector de escape (siempre presentes en Node), no por ausencia → el guard es siempre true y no gatea nada. `NON_ABSENCE_DENIALS` los excluye del reconocimiento de guard; `window`/`process` (hazard = ausencia) siguen siendo guards válidos.
- **P2 — declaración AMBIENT (`declare const/let/var/function/class`, `declare global`) sombreaba el global**: se borra al compilar (no emite binding runtime) pero los colectores del shadow-set la añadían. Más amplio que el JSX que reportó Codex — afectaba bare-read, property, eval-sink y `declare global`. Helper `isAmbientDeclaration` cableado en los 4 colectores + `collectVarHoistedRecursive` deja de recursar en `ModuleDeclaration`. Mismo eje que el erased-shadow de los type-only imports.

Validación final: 1133 tests verdes (suite completa) + verify:unit (CI-equivalent) en verde, 0 violations sobre 39 marcados.

### Frontera del eval-sink — modelo de amenaza y residuales conocidos POR DISEÑO

Alcanzar el `Function` constructor por reflexión en JavaScript es **estáticamente indecidible** de cerrar al 100%: las indirecciones son ilimitadas (cadenas partidas en variables, destructuring, computed keys vía variable, `Reflect.get`, proto-walking, strings codificados/concatenados). El gate caza las formas **legibles** (`eval`, `Function`, `x.constructor.constructor` contiguo, `x.constructor(call)`, más todos los globals DOM) y declina explícitamente las siguientes tres clases de **ofuscación profunda** — con un ejemplo de cada una, para que dentro de N meses, cuando alguien las encuentre pasando el gate, conste que es **conocido y por diseño**, no un agujero recién descubierto:

```ts
// 1. Cadena partida en variables intermedias (data-flow, no sintáctico):
const c1 = [].constructor;        // Array
const c2 = c1.constructor;        // Function
c2("return globalThis")();        // ← PASA el gate

// 2. Destructuring del nombre `constructor` (no hay member access que cazar):
const { constructor: C } = [];
const { constructor: F } = C;
F("return globalThis")();         // ← PASA el gate

// 3. Computed key vía variable (la key no es un string literal):
const k = "constructor";
[][k][k]("return globalThis")();  // ← PASA el gate
```

(`Reflect.get(x, "constructor")` y `Object.getOwnPropertyDescriptor` caen en la misma categoría.)

**Por qué se aceptan — el modelo de amenaza, no solo la indecidibilidad.** La indecidibilidad explica por qué no perseguimos el 100%; el modelo de amenaza explica por qué no hace falta:

- `@server-safe` es un gate **opt-in y first-party**. Un contributor *añade* el marker para *afirmar* "este componente no peta en SSR/RSC"; el gate **verifica esa afirmación** contra errores honestos y anti-patrones legibles. NO es una frontera de confianza ni de seguridad (auth/sandbox).
- Rellenando el modelo de amenaza: **activo** = ninguno; **adversario** = un contributor que sabotea su *propia* afirmación opt-in; **daño** = su componente crashea **ruidoso** en el consumer que lo use (sin exfiltración, sin escalada, recuperable y visible). Un bypass del Function constructor bajo el propio marker es autodestructivo y no gana nada — bastaría con no poner el marker.
- Test que distingue "frontera principista" de `// nosec`: ¿el bypass permite dañar a otro / un activo real, o solo rompe lo propio opt-in? Aquí es lo segundo. Por eso aceptar estos residuales no es suprimir una vulnerabilidad: bajo la amenaza real, **nunca fueron un fallo**. Es un lint de calidad que no caza el 100% de la ofuscación deliberada, no una exposición tapada.
- En seguridad real (código no confiable) trazarías la frontera en fail-closed agresivo y aceptarías falsos positivos, porque el coste del miss es catastrófico. Aquí el coste del miss es un crash ruidoso en el consumer del propio contributor — el modelo no justifica el coste de FP (p.ej. romper el patrón factory legítimo `const Ctor = x.constructor; new Ctor()`, que cualquier expansión sintáctica sacrificaría sin lograr cierre hermético).

**CLÁUSULA DE CADUCIDAD.** Esta frontera asume que `@server-safe` se mantiene **opt-in, first-party, sin ejecutar código de fuentes no confiables**. Si esa premisa cambia — si el marker pasa a ser una frontera de confianza sobre la que se decide que código no auditado es "seguro" — esta decisión **queda anulada** y el cierre de los residuales debe reevaluarse (en ese mundo sí serían un agujero explotable, y "aceptar por diseño" se convertiría en el anti-patrón). La frontera es legítima solo mientras el modelo de amenaza se sostenga; por eso queda escrito.

**Footgun accidental SÍ cerrado** (distinto eje, sí cubierto por el modelo opt-in honesto): un carácter de ancho cero (ZWSP) colado por copy-paste justo antes del `@` del marker hacía que el archivo dejara de auditarse en silencio (fail-open accidental). Se normaliza el prefijo antes del check de posición canónica. Mismo espíritu que el marker anidado: cerrar lo que silencia el gate por accidente.
