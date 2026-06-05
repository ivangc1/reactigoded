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

Una tercera ronda de Codex (P1) cerró otra forma del eval-sink: invocar el `Function` constructor alcanzado por un solo `.constructor` (base función) vía `Function.prototype` — `(() => {}).constructor.call(null, "code")()`, `.apply`/`.bind`, y tagged template `(() => {}).constructor\`code\``. El gate ya cazaba `.call`/`.bind` sobre el doble `.constructor.constructor` y la llamada directa, pero no sobre el single. Ahora la rama (c.2) flaggea el `.constructor` cuando es base de `.call`/`.apply`/`.bind` o tag de un template (además de doble / callee directo / optional call). El control `[].slice.bind(...)` no flaggea (`.slice` no es `.constructor`). Esto alinea el código con lo que la "Frontera del eval-sink" ya afirmaba cazar.

Con esto el boundary syntáctico queda cerrado: TODA forma contigua de alcanzar+invocar `Function` vía `.constructor` se caza. Quedan residuales POR DISEÑO (indecidibles / colisión con patrón legítimo, además de los 3 data-flow de arriba): `Reflect.apply`/`Reflect.construct` sobre `x.constructor` (reflexión), getter que devuelve el constructor (data-flow), y `new x.constructor("code")` (colisiona con el clon legítimo `new x.constructor()` — no separable sin type-info).

Validación final: 1139 tests verdes (suite completa) + verify:unit (CI-equivalent) en verde, 0 violations sobre 39 marcados.

### Shadow-set fail-closed — el predicado `producesRuntimeValue` (cierre de CLASE del erased-shadow)

Dos procesos adversariales independientes (un hunt multi-agente de 8 lentes + un P1 de Codex) convergieron en el mismo punto: `namespace navigator {}` / `namespace localStorage { export interface E {} }` marcado `@server-safe` pasaba el gate, pero TS **elide el namespace entero** (no contiene miembro de valor → emit verificado = solo el cuerpo que lee el global, sin binding). El nombre del namespace acababa en el shadow-set y `navigator.userAgent` se trataba como acceso local.

El diagnóstico de fondo es la tesis del propio addendum, un nivel más abajo: **el modelo PRINCIPAL del gate fue a fail-closed (whitelist `SAFE_GLOBALS`), pero el shadow-set seguía siendo fail-OPEN** — añadía el nombre *salvo que* matcheara un modo de borrado conocido (`isAmbientDeclaration`, `isTypeOnly`). Por eso la misma raíz mordió **tres veces**: type-only import → `declare` ambient → namespace type-only. Un denylist de modos-de-borrado se descubre de uno en uno; el siguiente exótico (merging, `export =` de un tipo) volvería a pasar.

El fix correcto no es la rama del namespace: es **fail-close también el shadow-set**. Un nombre entra solo si su declaración **prueba** que emite valor. Los productores de valor son un conjunto ACOTADO y enumerable (`function`-con-body, `class`, `enum`, `namespace`-instanciado, var, import-de-valor, `import =` de valor); los borrados son ABIERTOS (interface, type alias, type-only import, `declare`, namespace type-only, …). Whitelistear el lado acotado cierra la CLASE; denylistear el abierto es el whack-a-mole de las 3 mordeduras. Es el **mismo argumento fail-closed-vs-denylist del catálogo de globals, aplicado al shadow-set**. Un único predicado `producesRuntimeValue(decl)` que TODOS los colectores consultan; para `namespace`, `namespaceIsInstantiated` evalúa recursivamente la presencia de miembro de valor.

Dos matices:
1. **Evaluado SINTÁCTICAMENTE bajo el toolchain de emisión REAL** (semántica "instantiated module" de TS = primer emit del build, `tsc -p tsconfig.build.json`), no bajo el type-checker (el gate no lo tiene) ni bajo asunciones tsc-default que diverjan de esbuild/vite. (`const enum` no es vector de sombra de todas formas — sus miembros se declaran.)
2. **El coste es FP, no bypass**, y es el trade que el gate ya eligió: fail-close yerra hacia omitir un productor de valor (flaggea código legítimo, corregible) nunca hacia añadir un borrado (pet silencioso en prod). Verificado **0-FP** contra los 39 marcados + el corpus honest-construct (que ya probó productores no obvios: enum, namespace-valor, `import =`).

### Frontera del eval-sink — modelo de amenaza y residuales conocidos POR DISEÑO

**El criterio de la frontera es LEGIBLE vs OFUSCADO, no decidible vs indecidible.** El mandato del gate es cazar errores honestos + anti-patrones que un revisor vería leyendo el diff. `[].constructor.constructor("code")()` es legible-sospechoso → se caza. Una forma ofuscada por construcción (cuyo único motivo de existir es esconderse del revisor) queda fuera — y eso es principista, no cansado: lo ofuscado es necesariamente **deliberado**, y lo deliberado bajo un marker opt-in es el no-adversario ya descartado. La frontera del gate coincide exactamente con su mandato. La indecidibilidad (teorema de Rice: "¿esta expresión evalúa a `Function`?" no es computable) explica por qué no se persigue el 100%; el modelo de amenaza explica por qué no hace falta.

El gate caza **toda forma contigua** de alcanzar+invocar `Function` (`eval`, `Function`, `x.constructor.constructor`, `x.constructor(...)`, `.call`/`.apply`/`.bind`/tagged sobre `.constructor`, optional call). Declina explícitamente estas clases de **ofuscación profunda**, con un ejemplo de cada una para que dentro de N meses, cuando alguien las encuentre pasando, conste que es **conocido y por diseño**, no un agujero recién descubierto:

```ts
// 1. Cadena partida en variables intermedias (data-flow cross-statement):
const c1 = [].constructor; const c2 = c1.constructor; c2("return globalThis")();

// 2. Destructuring del nombre `constructor` (no hay member access que cazar):
const { constructor: C } = []; const { constructor: F } = C; F("...")();

// 3. Computed key vía variable (la key no es un string literal directo):
const k = "constructor"; [][k][k]("...")();

// 4. Reflexión / data-flow vía getter:
Reflect.apply((() => {}).constructor, null, ["..."])();
Reflect.construct((() => {}).constructor, ["..."]);
const o = { get c() { return (() => {}).constructor; } }; o.c("...")();

// 5. `new` sobre `.constructor` (colisiona con el clon legítimo):
new (() => {}).constructor("...")();   // no separable de `new x.constructor()` sin type-info
```

**Se evaluó y descartó un "Nivel 1"** (constant-folding de `const k = "constructor"; x[k]`) para cazar el caso 3. El argumento decisivo NO es "es un no-threat" — es **FALSA COMPLETITUD**, y aguanta incluso si dudas del modelo opt-in:

El caso 3 no es "la forma con const-literal". Es la clase entera de indirección. El mismo ataque tiene infinitas escrituras equivalentes — verificado, las 5 PASAN:

```ts
const k = "constructor"; [][k][k]("code")()            // 1. literal  ← lo único que el Nivel 1 cazaría
let k = "constructor"; [][k][k]("code")()              // 2. reasignable
const k = "cons" + "tructor"; [][k][k]("code")()       // 3. concatenada
const a = "constructor"; const k = a; [][k][k]("...")  // 4. alias
const o = { key: "constructor" }; [][o.key][o.key]()   // 5. propiedad de objeto
```

Un "Nivel 1" cazaría la #1 y dejaría pasar las otras cuatro. Documentar entonces "manejamos el computed-key al constructor" sería **mentir** — un revisor confiaría en una cobertura que no existe. Y contra un adversario real (justo el escenario en que dudar del modelo opt-in importaría), un cazador de 1-de-∞ escrituras **no detiene nada** — usa la #2 — y encima da falsa confianza: es **teatro de seguridad**, peor que un hueco declarado. Por eso este argumento es más fuerte que el del threat-model: si NO hay adversario, el catch parcial es coste por un fantasma; si SÍ lo hay, es disfraz que no para. En ambos casos: no se hace.

Refuerzos secundarios (cualquiera bastaría): todo computed-key peligroso ya se caza **por la RAÍZ** (`globalThis[k]`/`window[k]` flaggean pase lo que pase → el único caso incremental es constructor-sobre-raíz-segura = la ofuscación); el fold file-wide además FP-eaba shadowing honesto (`const key = "constructor"; { const key = "map"; arr[key](fn) }`). La línea **contigua-legible vs indirección-ofuscada** es la única NO arbitraria: "caza const pero no let" no tiene principio; "caza lo que un revisor ve, la indirección queda fuera por diseño" sí, y es verdad. El residual no es una grieta sin tapar — es el reconocimiento honesto de dónde acaba lo que un gate sintáctico puede prometer **sin mentir**.

**Lección de proceso (para contribuyentes):** todo check sensible a scope debe reusar el `localBindings` scope-aware del walker, NUNCA recolectar nombres file-wide e ignorar shadowing. El FP del Nivel 1 (`const key = "constructor"` externo + `const key = "map"` interno) es la ilustración: el fold file-wide trató el `key` interno como el externo. El gate YA respeta shadowing por la vía correcta (`const document = "x"; document.length` pasa). Patrón general de esta sesión: **auditar** (leer comportamiento existente) destapa bugs reales pre-existentes sin riesgo; **añadir código de detección** introduce bugs nuevos — gastar el presupuesto en lo primero. (Pendiente menor: confirmar que los otros colectores module-wide — `gatherModuleDeclaredNames`, los de erased-construct — interactúan bien con shadowing de scope interno; el path central de `localBindings` está verificado limpio.)

**Por qué no se cierra el Nivel 2 (taint de single-assignment).** Cazaría #1 y #2, pero FP-ea el patrón clon legítimo `const Ctor = x.constructor; new Ctor()` — el taint marcaría `Ctor` y flaggearía `new Ctor()`, indistinguible de `Ctor("code")()` sin type-info (verificado). Shippear un gate que rompe código legítimo en un 1.0 congelado es peor que el hueco de ofuscación deliberada. Por eso se descarta — no por coste, sino por FP-sobre-legítimo.

**Por qué se aceptan — el modelo de amenaza, no solo la indecidibilidad.** La indecidibilidad explica por qué no perseguimos el 100%; el modelo de amenaza explica por qué no hace falta:

- `@server-safe` es un gate **opt-in y first-party**. Un contributor *añade* el marker para *afirmar* "este componente no peta en SSR/RSC"; el gate **verifica esa afirmación** contra errores honestos y anti-patrones legibles. NO es una frontera de confianza ni de seguridad (auth/sandbox).
- Rellenando el modelo de amenaza: **activo** = ninguno; **adversario** = un contributor que sabotea su *propia* afirmación opt-in; **daño** = su componente crashea **ruidoso** en el consumer que lo use (sin exfiltración, sin escalada, recuperable y visible). Un bypass del Function constructor bajo el propio marker es autodestructivo y no gana nada — bastaría con no poner el marker.
- Test que distingue "frontera principista" de `// nosec`: ¿el bypass permite dañar a otro / un activo real, o solo rompe lo propio opt-in? Aquí es lo segundo. Por eso aceptar estos residuales no es suprimir una vulnerabilidad: bajo la amenaza real, **nunca fueron un fallo**. Es un lint de calidad que no caza el 100% de la ofuscación deliberada, no una exposición tapada.
- En seguridad real (código no confiable) trazarías la frontera en fail-closed agresivo y aceptarías falsos positivos, porque el coste del miss es catastrófico. Aquí el coste del miss es un crash ruidoso en el consumer del propio contributor — el modelo no justifica el coste de FP (p.ej. romper el patrón factory legítimo `const Ctor = x.constructor; new Ctor()`, que cualquier expansión sintáctica sacrificaría sin lograr cierre hermético).

**CLÁUSULA DE CADUCIDAD.** Esta frontera asume que `@server-safe` se mantiene **opt-in, first-party, sin ejecutar código de fuentes no confiables**. Si esa premisa cambia — si el marker pasa a ser una frontera de confianza sobre la que se decide que código no auditado es "seguro" — esta decisión **queda anulada** y el cierre de los residuales debe reevaluarse (en ese mundo sí serían un agujero explotable, y "aceptar por diseño" se convertiría en el anti-patrón). La frontera es legítima solo mientras el modelo de amenaza se sostenga; por eso queda escrito.

**Footgun accidental SÍ cerrado** (distinto eje, sí cubierto por el modelo opt-in honesto): un carácter de ancho cero (ZWSP) colado por copy-paste justo antes del `@` del marker hacía que el archivo dejara de auditarse en silencio (fail-open accidental). Se normaliza el prefijo antes del check de posición canónica. Mismo espíritu que el marker anidado: cerrar lo que silencia el gate por accidente.

### Re-hunt exhaustivo — cierre de la clase value-transparente + residuales nuevos

Un re-hunt adversarial exhaustivo (8 lentes) sobre el gate endurecido NO destapó ninguna raíz NUEVA: todo fue variante de las dos fronteras ya conocidas (alcance del eval-sink + shadow borrado/mal-scopeado). Se cerró lo **acotado/decidible**, se dejó residual solo lo **indecidible-por-diseño** o **toolchain-coupled**.

**Cerrado — operadores value-transparentes del eval-sink.** `(0, fn.constructor)("x")()`, `(c ? fn.constructor : null)!("x")()`, `(fn.constructor || null)("x")()` escapaban: el valor de estos operadores ES (sintácticamente) uno de sus operandos. NO es falsa-completitud (a diferencia del computed-key, que es data-flow ∞): los constructos value-transparentes son un conjunto **finito y enumerable** — wrappers erased (`()`,`!`,`as`,`satisfies`,`<T>`) + coma, `&&`, `||`, `??`, `?:`, `=` — cerrable con unwrap recursivo. La línea exacta del bound: **EXCLUYE las CALLS/IIFE**. `(() => X)()` NO es transparente — su valor exige evaluar el cuerpo = data-flow = residual. Atravesar un call reintroduciría el muro infinito; por eso el set se enumera explícito (sin calls) y un test lo pinea (el set cerrado ES el contrato). El `.constructor` sigue textualmente presente bajo el ruido transparente → un revisor lo ve → es el lado legible de la frontera (under-catch del mandato, no scope nuevo).

**Residual — `import X = NS.Y` que aliasa un TIPO** (`import document = NS.document` con `NS.document` type → sombra fantasma del global). El discriminador honesto NO es "indecidible": el RHS es **decidible CON el type-checker** (`import a = NS.v` valor → EMITE `var a`; `import b = NS.T` tipo → borrado). El gate es sintáctico-puro **por diseño** (solo `createSourceFile`, sin `getTypeChecker`) — meter el checker en un analizador de-un-solo-archivo es un coste arquitectónico grande para un caso contrivado (aliasar un tipo a un nombre que colisiona con un global). Así que: **decidible con el checker, elegimos no resolverlo**, no "imposible". La regla del shadow-set se afina con esto: no es "añade solo lo que prueba valor", es "**excluye lo PROVABLEMENTE borrado** (decidible sintácticamente: type-only import, `declare`, namespace type-only/vacío)". `import X = NS.Y` es sintácticamente indecidible y en el caso común es valor usado como valor → incluirlo es correcto; excluirlo FP-earía todo value-alias. El namespace (decidible → excluye vía `ts.isInstantiatedModule`) y este caso (indecidible → incluye) quedan consistentes, no contradictorios.

**Residual — const-enum-only namespace que colisiona con un global** (`namespace navigator { export const enum Foo {} }` → `navigator.Foo.A` se inlinea a una constante, sin acceso runtime, pero el gate flaggea). La erasure de const-enum es **toolchain-dependiente** (emite bajo esbuild/transpileModule, se inlinea bajo tsc-default con `preserveConstEnums:false`). Modelarlo acoplaría el gate al toolchain — justo lo que no se quiere. Contrivado + toolchain-coupled → residual. Y es un **FP**, no un bypass: ruido corregible (el dev no nombra un namespace `navigator`), no un agujero.

**Convergencia (eje de seguridad).** Tras este round el gate es taggeable en seguridad: ningún bypass con setup no-contrivado queda abierto, y los residuales son indecidibles-por-diseño (import-equals) o toolchain-coupled/contrivados (const-enum). Lo que **refutaría** la convergencia: una clase-RAÍZ nueva de bypass, o un bypass común/no-contrivado — NO otra clase acotada (eso es el proceso funcionando). El eje de FP (sobre todo guard recognition) puede destapar más over-strictez, pero **un FP es ruido corregible no-bloqueante; un bypass sí bloquea el freeze**.

### Stance de runtime — anclado al edge baseline (no a "globals de Node")

**"server-safe" significa: funciona en el edge runtime MÁS ESTRICTO, sin asumir `nodejs_compat`.** Es la decisión conservadora correcta para una librería — no puedes asumir que tus consumers activan la flag de compat de Node. Esto re-ancla las denegaciones Node-only:

- `setImmediate`/`clearImmediate` se deniegan: son Node-only (no Web-standard). En **Vercel Edge** (target RSC canónico de Next.js) están definidos como un **stub que lanza al llamarse** — "A Node.js API is used (setImmediate) which is not supported in the Edge Runtime". Por el stub, `typeof setImmediate !== "undefined"` pasa pero la llamada revienta → el typeof-guard daría falsa confianza, así que van en `NON_ABSENCE_DENIALS` (trato tipo eval-sink: el guard NO los legitima). Los otros deferred-timers (`setTimeout`/`setInterval`/`queueMicrotask`) SÍ son Web-standard y se quedan en SAFE.
- **Corrección de anclaje** (verificado): la razón de `process`/`Buffer` NO es "Workers/Deno no los tienen" — Cloudflare Workers/Deno **CON `nodejs_compat`** SÍ los tienen (process.env poblado, Buffer disponible). El anclaje correcto es **"ausente/stub en el baseline Web-standard edge (Vercel Edge; Workers/Deno SIN compat)"** — el mínimo común denominador. CAVEAT explícito: un componente flaggeado por un global Node-only SÍ funcionaría en un runtime con compat; el gate ancla al baseline sin compat a propósito.

**FOLLOW-UP (post-freeze, task aparte):** derivar `SAFE_GLOBALS` como **intersección cross-runtime** anclada al baseline edge (vía una herramienta tipo `platform-node-compat` que testea disponibilidad de globals across runtimes) en vez de `globals.nodeBuiltin` − denegaciones-curadas-a-mano. Convertiría la lista de denegaciones Node-only en algo derivado y mantenible, no curado. Hoy se cubre `setImmediate`/`clearImmediate` (verificados); un barrido completo del baseline edge es trabajo aparte.
