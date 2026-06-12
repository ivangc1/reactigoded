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
1. **Evaluado SINTÁCTICAMENTE bajo el toolchain de emisión REAL** (semántica "instantiated module" de TS, que debe COINCIDIR con el emit de RUNTIME — **Vite/esbuild**, porque `tsc -p tsconfig.build.json` es `emitDeclarationOnly` y NO emite el JS), no bajo el type-checker (el gate no lo tiene) ni bajo asunciones tsc-default que diverjan de esbuild/vite. Verificado (deepest re-hunt #173): `ts.isInstantiatedModule` DIVERGE de esbuild en namespaces **ambient-anidados** (lo cuenta instanciado, esbuild lo elide → bypass); por eso `namespaceIsInstantiated` se reescribió para REPLICAR la regla de emit de esbuild, no la de TS — ver FP-B en "Hunt final" + `feedback_esbuild_emit_oracle`.
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

**REFINAMIENTO DE LA LÍNEA (deepest final hunt #173, commit posterior a 4924427) — la frontera es token-UNIDAD-EN-SU-SITIO vs ENSAMBLAJE/INDIRECCIÓN, y por eso se REVIRTIERON dos folds.** El criterio operativo de esta sección ("legible vs ofuscado") es correcto en espíritu pero es un GRADIENTE — ¿es legible un concat de 3 piezas? ¿un ternario constante? La formulación sintáctica, decidible **sin folder ni call-graph**, que lo hace preciso: **¿el token peligroso (`constructor`/`call`/`apply`/`bind`) está presente como UNIDAD —un member `.constructor`, o un string-literal ÚNICO `["constructor"]`/`` [`constructor`] ``, con los wrappers value-transparentes desenvueltos (`[1 && "constructor"]`, `[(0,"constructor")]`)— = CAZAR; o está ARMADO de piezas (`"construc"+"tor"`, `` `cons${"tructor"}` ``, `String.fromCharCode(…)`, `["c",…].join("")`, `".".slice()`) o alcanzado por INDIRECCIÓN (variable `const k="constructor"`, data-flow) = RESIDUAL?** Envolver mantiene el token intacto (el valor fluye); ENSAMBLAR lo fabrica (el token no está presente). Eso caza B1 (`(0,[].constructor)` — token intacto) y deja fuera el ensamblaje, coherente, sin contradicción.

A la luz de esta línea, **el `+`-concat (CLASE B de 4924427) y la sustitución de template (`` [`cal${"l"}`] ``, round previo) eran INCOHERENTES y se REVIRTIERON.** Ambos foldeaban un SUBCONJUNTO del ensamblaje → **FALSA COMPLETITUD**, exactamente lo que esta sección rechaza: verificado, `["cons"+(true?"tructor":"")]` y `[String.fromCharCode(…)]` (y ∞ más) **se escapaban igual** → cazar concat-literal pero no esos NO tiene principio (¿por qué concat-literal sí, concat-ternario no?), da falsa confianza ("manejamos string-building" = mentira), y bajo el modelo opt-in-first-party ningún autor honesto ensambla el token sin querer. Un ADR que rechaza la falsa completitud con código que ES falsa completitud es incoherente: o cambia el principio (está verificado-correcto) o revierte el código → **revierte el código**. La alternativa (HARDEN: foldear TODO inline-constante — fromCharCode/join/slice/repeat/padStart/atob/…) es el mismo 1-de-∞ sin cierre hermético, **más** reimplementar el evaluador de constantes de JS (out-of-design, misma frontera que el binder de B4) **más** el FP del §184 sobre el factory legítimo. Tras revertir, `foldConstString` resuelve SOLO un string-literal único; la afirmación del gate queda **VERDADERA**: "cazo el token en su sitio como unidad; todo ensamblaje e indirección es residual por diseño" — completa para lo que afirma, sin teatro. La misma `foldConstString` la consulta el typeof-guard: un string de guard ENSAMBLADO (`` typeof x !== `${"undefined"}` ``) deja de reconocerse → over-flag FAIL-CLOSED (dirección segura, código que nadie escribe). Pin: 15 tests token-unidad-caza / ensamblaje-residual. **Proceso:** llegué a "revertir un fix shippeado y FP-free" remando contra mi propia recomendación inicial de HOLD — el §141 (escrito y ratificado) exige que su código case con su principio; CLASE B era el único fix que cruzó la línea que la propia sección dibuja. No es "cazar más ofuscación" (teatro), es hacer la afirmación de la frontera VERDADERA.

### Re-hunt exhaustivo — cierre de la clase value-transparente + residuales nuevos

Un re-hunt adversarial exhaustivo (8 lentes) sobre el gate endurecido NO destapó ninguna raíz NUEVA: todo fue variante de las dos fronteras ya conocidas (alcance del eval-sink + shadow borrado/mal-scopeado). Se cerró lo **acotado/decidible**, se dejó residual solo lo **indecidible-por-diseño**.

**Cerrado — operadores value-transparentes del eval-sink.** `(0, fn.constructor)("x")()`, `(c ? fn.constructor : null)!("x")()`, `(fn.constructor || null)("x")()` escapaban: el valor de estos operadores ES (sintácticamente) uno de sus operandos. NO es falsa-completitud (a diferencia del computed-key, que es data-flow ∞): los constructos value-transparentes son un conjunto **finito y enumerable** — wrappers erased (`()`,`!`,`as`,`satisfies`,`<T>`) + coma, `&&`, `||`, `??`, `?:`, `=` — cerrable con unwrap recursivo. La línea exacta del bound: **EXCLUYE las CALLS/IIFE**. `(() => X)()` NO es transparente — su valor exige evaluar el cuerpo = data-flow = residual. Atravesar un call reintroduciría el muro infinito; por eso el set se enumera explícito (sin calls) y un test lo pinea (el set cerrado ES el contrato). El `.constructor` sigue textualmente presente bajo el ruido transparente → un revisor lo ve → es el lado legible de la frontera (under-catch del mandato, no scope nuevo).

**Residual POR DISEÑO — `import X = NS.Y` que aliasa un TIPO** (`import window = Cfg.window` con `Cfg.window` type → sombra fantasma del global; el binding se borra al emit, `window.*` resuelve al global real). Este caso tuvo **dos diagnósticos equivocados antes del correcto**, y se documentan los dos errores porque la raíz (afirmar donde debía verificar) importa más que el caso:

1. **Error 1 — "indecidible" (cobardía).** La versión original metía TODO `import X = NS.Y` en el cubo "indecidible". Falso: cross-module necesita checker, pero same-file no es indecidible.
2. **Error 2 — "decidible, es GRATIS" (sobreconfianza).** La corrección al error 1 cerró same-file con un resolver que reusaba `producesRuntimeValue` — afirmando que era trabajo sintáctico barato de-un-solo-archivo. **También falso, y verificado en directo:** tras cerrarlo (B4), un re-hunt + Codex enumeraron **7 bypasses consecutivos** (nested → merge → alias-ns → dotted-self → chain-cycle → split-dotted) que NO eran clases-raíz nuevas sino la **gramática del binder de TS** salida a mano: fusión de namespaces, scope léxico, cadenas de alias, namespaces dotted, self-ref. Resolver same-file *completo* **ES reimplementar el binder de TS**.

**Diagnóstico correcto (verificado): decidible-solo-por-binder.** El gate es **parser-puro por diseño** (solo `createSourceFile`, sin `getTypeChecker` ni binder). Eso pone same-file import-equals-a-tipo en la **misma clase categórica que el alias CROSS-MODULE**: ambos necesitan resolución de símbolos que el gate renuncia a tener. La línea principista NO es "simple vs complejo" (arbitraria), es **"¿necesita binder?"** — y coincide con el diseño declarado del gate. `import window = Cfg.window` same-file → necesita binder → **residual**. (Frontera idéntica en espíritu a la del eval-sink: decidible-con-esfuerzo pero contrivado + opt-in/first-party → residual, no agujero bajo el threat-model.)

**Lo que SÍ cazamos (acotado, sin binder):** el value-alias cuyo ROOT es un GLOBAL — `import h = window.location.href` flaggea `window` pase lo que pase el RHS (regla 11, discriminador `!isTypeOnly`). Eso no necesita binder: `window` es un global bare. El namespace (decidible vía `ts.isInstantiatedModule`, sin binder — su instanciación es una propiedad sintáctica local) sigue cerrado.

**CLÁUSULA DE CADUCIDAD DOBLE.** Este residual se revisita si (a) `@server-safe` deja de ser opt-in/first-party (el constructo deliberado pasa a ser amenaza), **o** (b) el gate adopta un binder/type-checker (deja de ser decidible-solo-por-binder-que-no-tenemos). Mientras ambas premisas se sostengan, es residual legítimo, no grieta sin tapar.

**Lección (la raíz, no el caso):** me equivoqué las dos veces por la misma razón — **afirmar donde debía verificar**. Error 1: afirmé "indecidible" sin verificar. Error 2: verifiqué la EMISIÓN (se borra) pero NO el COSTE del resolver (asumí "reusar helpers basta"; era un binder). Los 7 bypasses fueron la verificación que debí exigir antes de cerrar. La regla: **antes de cerrar una clase "porque es decidible", verificar que decidirla no exige reimplementar un subsistema del compilador.** Si lo exige, y el gate renuncia a ese subsistema por diseño, es residual-por-diseño — ni cobardía ni grieta.

**Convergencia (eje de seguridad).** Tras este round el gate es taggeable en seguridad: ningún bypass con setup no-contrivado queda abierto, y el residual restante es indecidible-por-diseño (import-equals). Lo que **refutaría** la convergencia: una clase-RAÍZ nueva de bypass, o un bypass común/no-contrivado — NO otra clase acotada (eso es el proceso funcionando). El eje de FP (sobre todo guard recognition) puede destapar más over-strictez, pero **un FP es ruido corregible no-bloqueante; un bypass sí bloquea el freeze**.

### Round de centralización — 4 bypasses sobre estado endurecido + la raíz sistémica

**La convergencia declarada arriba era PREMATURA.** Un re-hunt adversarial (13 lentes, 3-escéptico-mayoría) sobre el gate ya endurecido destapó **4 bypasses reales** (B1–B4) + 5 FPs — exactamente el falsador nombrado ("un bypass común/no-contrivado refuta"). Se documenta el error: declarar convergencia tras N rounds sin bypass NO es seguro mientras un re-hunt sobre el estado endurecido siga produciendo hallazgos. La señal de convergencia es un re-hunt que vuelve **0 verificado**, no la ausencia de ganas de seguir.

**La textura de los 4 es la misma raíz, y no es "clase nueva":** cobertura **asimétrica entre caminos de código PARALELOS** que hacen trabajo parecido con lógica no-espejada.
- **B1** — el unwrap value-transparent se aplicaba al lado BASE (`reachesConstructorAccess`) pero no al lado KEY (`accessedMemberName`, solo coma) → `({})["constructor"][1 && "constructor"](…)` escapaba (asimetría base-vs-key).
- **B2** — el set de exclusión del guard de eval-sink (`NON_ABSENCE_DENIALS`) omitía `self`, el alias de globalThis presente en Edge (set incompleto).
- **B3** — el path deferred/timer usaba un set de exención distinto (`DYNAMIC_EVAL_SINKS`) que el render → `setTimeout(() => globalThis.window.location.href)` (TypeError real en Edge) quedaba exento (asimetría render-vs-timer).
- **B4** — el preload de import-equals no reusaba `producesRuntimeValue` (colectores no-espejados). **⚠️ B4 se REVIRTIÓ a residual** (ver sección anterior): cerrarlo de verdad exigía reimplementar el binder de TS, fuera del diseño parser-puro del gate. B1/B2/B3 sí son acotados (sets finitos / alineación de dos call-sites) y quedan cerrados; B4 no lo era. La distinción es la lección: **"¿necesita binder?"** separa lo que se centraliza-y-cierra de lo que es residual-por-diseño.

**El fix durable de B1/B2/B3 NO es cazar los 3 — es centralizar la lógica COMPARTIDA y que cada path la LLAME:** un `valueTransparentChildren` (consultado por el descenso `valueTransparentLeaves` Y el ascenso `isValueTransparentParent`), una `isExemptInDeferredBody` (ramas (c) y (d)), un `NON_ABSENCE_DENIALS` completo. Tras la centralización, un fix a un path es un fix a todos, y el hunt deja de encontrar la misma raíz disfrazada. **Caveat:** se centraliza lo COMPARTIDO; lo que de verdad difiere (base vs key son posiciones distintas) mantiene su estructura, y la centralización misma pide cuidado (no es gratis). **El intento de meter B4 en esta centralización (`producesRuntimeValue` para todos los colectores, incl. import-equals same-file) fue el error 2 de arriba** — un caso que parecía "un colector más" era en realidad un binder; centralizar no convierte un binder en un AST-walk. Este es el mecanismo que acaba el whack-a-mole para lo ACOTADO — no para una gramática no-acotada como la del binder.

### Batch de FPs (F1-F5) + frontera de F4 — fuera-de-mandato, no out-of-design

Un deep re-hunt destapó 5 FPs (código server-safe legítimo que el gate flaggeaba); se cerraron con su contra-test de soundness cada uno (F1/F2 `classifyTypeofGuard` generaliza el reconocimiento de existencia; F3 narrowea el body de for/while; F4 exime un nombre module-declared leído en cuerpo de función; F5 `isDeferredExecutionContext` salta wrappers erased). Un review adversarial (8 lentes, 3-escéptico) + Codex confirmaron **0 bypasses**, salvo una frontera en F4 que merece registro porque es una TERCERA clase de frontera distinta de B4.

**F4 codex P1 — "la exención es too broad para funciones que corren en module-eval".** Cierto, y verificado a fondo:
1. **F4 NUNCA expone un dom-access.** Invariante: `api ∈ moduleDeclaredNames` ⟹ existe un binding module-scope que SOMBREA el global module-wide ⟹ el read resuelve al local, jamás al global. Verificado en runtime: lanza TDZ del `const window` local, no devuelve el global.
2. El repro exacto (IIFE forward-read) **NO compila** (tsc `TS2448`/`TS2454`) → nunca llega al gate (que corre post-tsc). El `var`-IIFE igual.
3. El único caso que compila (named-eager: `const x = f(); function f(){…window…} const window`) suprime un **TDZ de un local sombreado** — un `ReferenceError` que lanza en TODOS los runtimes (Node/browser/Edge), crash en load-time, NO un missing-global Edge-específico.

**El discriminador es el TIPO DE ERROR, verificado en runtime, no una etiqueta:** missing-global server-específico = mandato del gate (`no-bare-dom-access`); TDZ platform-independent = fuera (lo caza tsc + cualquier test que importe el módulo, al instante). Cazar el named-eager *soundly* exige call-graph/data-flow (qué funciones corren en module-eval antes de qué declaraciones) — el subsistema que el gate renuncia por diseño, **misma frontera que el binder de B4, distinta razón**: B4 exponía el global real (in-mandate, bypass real, cerrarlo correcto pero costaba un binder); F4 no expone el global (out-of-mandate). NO es la cobardía de "indecidible": es un principio comprobado en runtime.

**ACOPLAMIENTO PINEADO (QA, lo que el invariante 1 esconde):** F4 es sound SOLO si `gatherModuleDeclaredNames` excluye lo borrado (namespace type-only, interface, type-alias, import-type, inline-type, `declare` ambient). Si un nombre ERASED se colara en ese set, F4 eximiría un read del global real → bypass-de-global silencioso (no TDZ-de-local — no hay binding que sombree). El invariante no es auto-contenido; descansa sobre los excludes de erased-shadow. Por eso se pinea con un test "phantom borrado leído en cuerpo de función DEBE flaggear" (implementación-agnóstico): una regresión en los excludes falla ahí en vez de degradar F4 a bypass sin avisar.

### Stance de runtime — anclado al edge baseline (no a "globals de Node")

**"server-safe" significa: funciona en el edge runtime MÁS ESTRICTO, sin asumir `nodejs_compat`.** Es la decisión conservadora correcta para una librería — no puedes asumir que tus consumers activan la flag de compat de Node. Esto re-ancla las denegaciones Node-only:

- `setImmediate`/`clearImmediate` se deniegan: son Node-only (no Web-standard). En **Vercel Edge** (target RSC canónico de Next.js) están definidos como un **stub que lanza al llamarse** — "A Node.js API is used (setImmediate) which is not supported in the Edge Runtime". Por el stub, `typeof setImmediate !== "undefined"` pasa pero la llamada revienta → el typeof-guard daría falsa confianza, así que van en `NON_ABSENCE_DENIALS` (trato tipo eval-sink: el guard NO los legitima). Los otros deferred-timers (`setTimeout`/`setInterval`/`queueMicrotask`) SÍ son Web-standard y se quedan en SAFE.
- **Corrección de anclaje** (verificado): la razón de `process`/`Buffer` NO es "Workers/Deno no los tienen" — Cloudflare Workers/Deno **CON `nodejs_compat`** SÍ los tienen (process.env poblado, Buffer disponible). El anclaje correcto es **"ausente/stub en el baseline Web-standard edge (Vercel Edge; Workers/Deno SIN compat)"** — el mínimo común denominador. CAVEAT explícito: un componente flaggeado por un global Node-only SÍ funcionaría en un runtime con compat; el gate ancla al baseline sin compat a propósito.

**Derivación data-driven del baseline edge (hecho — codex P1, #190).** El whitelist admitía TODO `globals.nodeBuiltin`, incluyendo web-APIs que Node provee pero el runtime Edge NO expone (`BroadcastChannel`, `MessageChannel`/`MessageEvent`/`MessagePort`, `Navigator`, los constructores `Performance*`, los stream controllers, `CompressionStream`/`CustomEvent`…). Un read bare de cualquiera lanza `ReferenceError` en Vercel Edge. Fix: `SAFE_GLOBALS = (builtin ∪ nodeBuiltin) ∩ edgeGlobalThis`, donde el conjunto Edge-missing (`EDGE_MISSING_GLOBALS`, 22 nombres) se derivó **DATA-DRIVEN del `globalThis` REAL del runtime Edge** — enumerado con `@edge-runtime/vm@5.0.0` (la emulación oficial de Vercel Edge), NO curado a ojo. Provenance + comando de regeneración en el comentario del set; el pin de contenido de `SAFE_GLOBALS` (98 nombres, #150 Test E) + el invariante `EDGE_MISSING ∩ SAFE = ∅` (#150 Test F) cazan el drift al bumpear `globals`. Subtraer SOLO añade strictness: si Edge gana una API, el efecto es un FP corregible, nunca un FN. Esto resuelve la sustancia de #190 (de "denegaciones-curadas-a-mano" a "intersección con el baseline edge autoritativo"); queda como follow-up menor automatizar la regeneración en CI (requiere `@edge-runtime/vm`, que choca con los peers del repo — task #184).

### Hunt final #173 (e29c388) — 5 FPs cerrados, 0 bypasses nuevos

Round de cierre del eje de seguridad antes de RC1. Un hunt adversarial (18 lentes, 3-escéptico-mayoría, 33 agentes, 0 fallos en el run final) sobre el gate ya endurecido volvió **0 bypasses nuevos** — la señal de convergencia que las líneas 218/222 nombraban ("un re-hunt que vuelve 0 verificado"). Lo que destapó fueron **5 FPs** (código compilable `@server-safe` que el gate sobre-flaggeaba), todos fail-closed, cada uno con su contra-test de soundness:

- **FP-A deferred-alias-spoof** — el CALLEE de un sink diferido envuelto en wrapper runtime-transparente (`(useEffect)(cb)`, `(useEffect as T)(cb)`, `(React).useEffect`, `(React)["useEffect"]`, `React!.useEffect`, `(setTimeout)(cb,0)`) no se desenvolvía → render-path → FP. Fix: `unwrapErased` al callee y a cada hop del chain-root (espejo del unwrap del callback, L613). **Soundness:** `(React).useState(lazy)` render-phase y el alias-spoof `useState as useEffect` SIGUEN flaggeando.
- **FP-B shadow-scoping** — const-enum-only namespace que colisiona con un global. **Raíz definitiva (cerrada en el deepest re-hunt #173):** el oráculo de instanciación era `ts.isInstantiatedModule`, que DIVERGE del emisor de runtime REAL (esbuild/Vite). El camino completo del error (3 capas, ver `feedback_esbuild_emit_oracle`): `preserveConstEnums=false` over-flaggeaba el const-enum directo (FP) → se cambió a `true` (cerró el FP) pero abrió **BYPASS-2**: `namespace document { export declare namespace I { const enum E {a} } }` → `isInstantiatedModule(_,true)`=true (gate cree shadow, NO flaggea) pero **esbuild ELIDE** el `declare` anidado → `document` resuelve al global → ReferenceError en Edge (verificado 3 checks: compila + esbuild elide + gate `[]`). **Fix definitivo: reemplazar `ts.isInstantiatedModule` por un predicado que REPLICA la regla de emit de esbuild** (`namespaceIsInstantiated` → `esbuildInstantiatesViaStatement`), anclado data-driven contra `esbuild.transformSync` sobre 10 formas (test "namespaceIsInstantiated = oráculo ESBUILD"). Regla esbuild: instancia ⟺ miembro DIRECTO var/let/const/function/class/enum (declare o no) **o** namespace anidado NO-ambient que instancia; ELIDE el anidado **ambient**, interface/type, vacío. **NO es residual:** el const-enum-namespace SÍ es decidible — con el oráculo correcto (esbuild), no con `ts.isInstantiatedModule`. El FP simple sigue arreglado (const-enum directo → sombra) Y el bypass cerrado (anidado-ambient → flag). El value-member ambient anidado (`{ export declare namespace I { const z } }`) era una divergencia PRE-existente del mismo predicado, cerrada por el mismo fix.
- **FP-C nonref-heritage** — computed key con identificador en miembro type-space (PropertySignature/MethodSignature de interface o type-literal; branded types `T & { readonly [tag]: B }` con symbol ambient) se borra entero al emit pero se flaggeaba. Fix: regla 6b en `isNonReferencePosition`. **Soundness:** la computed key de una CLASE (PropertyDeclaration, runtime) SIGUE flaggeando.
- **FP-D new-fp-source** — `parameterName` de un TypePredicateNode en posición de tipo standalone (`type G = (val) => val is string`, method-sig de interface, callback-prop, `asserts val is T`) caía al fail-closed aunque es type-space erased. Fix: regla 6c. **Soundness:** una función REAL con type-predicate sigue masked y un read bare real dentro SIGUE flaggeando.
- **FP3 typeof-guard top-cast (simetría erased)** — `classifyTypeofGuard` desenvolvía erased en los operandos pero a nivel top de la guard solo el paréntesis → `(typeof window !== "undefined") as boolean` no se reconocía. Fix: `unwrapErased` al inicio (el `!` LÓGICO sigue aparte, no es erased). **Soundness:** el `!` lógico SIGUE flipando `presentWhenTrue`.

**Provenance (trazabilidad).** FP-A/B/C/D vienen del run 2 (completo) confirmados 3/3. FP3 NO figura en los confirmados del run 2: lo levantó la lente `f1f2-classify` en el run 1 (incompleto), cuyos 3 verificadores murieron por **límite de sesión (no por rechazo)**; se validó A MANO (gate-probe + lectura de `classifyTypeofGuard` + soundness del `!` lógico). Por eso el output del run 2 lista "5 candidatos / 4 confirmados" pero el cierre real es "5 FPs arreglados".

**Candidato a bypass RECHAZADO — `performance`.** La lente `catalog-edge` propuso que `performance` es SAFE en el gate pero ausente en Edge. **RECHAZADO 1/3:** `performance` (la instancia) SÍ está en Vercel Edge — verificado en `@edge-runtime/vm` (`typeof performance === "object"`, `performance.now()` corre, `constructor.name === "Performance"`). Consistente con la derivación data-driven de #190, que excluye los CONSTRUCTORES `Performance*` (Edge-missing) pero NO la instancia `performance`. No lleva fix; queda como no-issue trazado bajo #190.

### Deepest re-hunt POST-fix #173 (16 lentes saturantes, 89 agentes) — 2 clases de bypass cerradas

Un re-hunt adversarial sobre el gate YA con los 5 FP-fixes (saturante: cada lente enumera todos los hermanos, no el más saliente; 3-escéptico) destapó **2 clases de bypass in-mandate reales** — ambas decidibles (no binder), cerradas:

- **Clase A — namespace ambient-anidado** (BYPASS-2 + value-member): ver FP-B arriba. `ts.isInstantiatedModule` reemplazado por el predicado esbuild-matching. Cierra const-enum-anidado-ambient Y value-member-anidado-ambient.
- **Clase B — eval-sink template-selector:** `` g.constructor[`cal${"l"}`](…) `` para `.call`/`.apply`/`.bind`. **⚠️ Este fold de sustitución de template se REVIRTIÓ después** (REFINAMIENTO §141): foldear la sustitución era el mismo subconjunto-de-ensamblaje = falsa completitud. La sustitución de template es ENSAMBLAJE (token armado) → residual por diseño, igual que el `+`-concat. El gate sigue cazando `["call"]`/`` [`call`] ``/`[(0,"call")]`/`[b?"call":"call"]` (token-unidad envuelto en value-transparentes), no la sustitución.

**Debunk:** el candidato del completeness-critic "eval-sink por concatenación `+`" (`g.constructor["ca"+"ll"]`) **NO compila** (TS7053 — `+` no folda a literal, `string` no indexa `Function`) → fuera de mandato, no es bypass. La lente eval-sink ya lo había marcado fuera.

**Fase de calidad — FPs (over-flag de código legítimo, todos fail-closed, NO bypasses).** El re-hunt reportó 18 candidatos a FP; **3 no eran reales** (FP4/5/6: la regla 6c ya cubría el TypePredicate-en-tipo) → **15 FPs**. Cerrados **13**, cada uno con contra-test de soundness:

- **Type-space** (5): computed-key de `declare class` (ambient), método `abstract` y overload-signature (sin cuerpo; la impl con cuerpo sigue flaggeando), get/set accessor-signature de interface/type-literal (regla 6b), import-attributes `with { type: "json" }` (regla 6d).
- **typeof-guard** (4): template-substitution `` typeof X !== `${"undefined"}` `` (foldConstString) — **⚠️ REVERTIDO** (REFINAMIENTO §141): un string de guard ENSAMBLADO ya no se reconoce → over-flag fail-closed (nadie escribe el literal así); el literal y `` `undefined` `` no-sub siguen reconociéndose; `switch (typeof X)` discriminant (sound con fall-through: solo narrowea sin fall-through entrante / default-con-case-undefined); alias booleano `const has = typeof X...; has ? X` (guardAliases por const, con purga en addToScope para shadowing).
- **deferred / import** (3): handler en value-transparent `onClick={cond ? cb : x}` (up-walk por valueTransparentChildren); import-equals alias de hook react `import ue = React.useEffect` / `import R = React` (gatherReactImports por fixpoint).
- **eval-sink** (1): key con ternario de condición LITERAL `x.constructor[true ? "name" : "ctor"]` — `valueTransparentChildren` folda la rama muerta (puro fold sintáctico; `false`/variable/rama-ctor-viva siguen flaggeando).

**Nota de soundness — el alias booleano (FP13) tuvo DOS bypasses antes de ser sound:**
1. Primer intento: un binding interno homónimo no invalidaba el alias outer — cazado por mis contra-tests, cerrado purgando `guardAliases` en `addToScope` (purga POSICIONAL).
2. La purga posicional NO bastaba: un `const`/`let`/`class`/`function` block-scoped homónimo SOMBREA el alias para TODO el bloque (lexical/TDZ), pero addToScope solo purgaba TRAS la declaración → un closure/uso ANTERIOR (`const fn = () => isC ? X : 0; const isC = true; fn()`) resolvía al guard outer = **bypass in-mandate** (compila + gate `[]` + runtime lee el global). **Lo cazó el codex re-review** (no mis tests). Fix: `visitOrderedStatements` purga los nombres block-lexical al ENTRAR el bloque, no posicionalmente.

Confirma el patrón de toda la sesión: **cada relajación del fail-closed exige su soundness-test**, y la sombra léxica/TDZ es más amplia que la posicional. El feature de narrowing-por-alias es el más delicado del gate por esto.

**Rondas codex 5-8 (POST-TDZ) — la familia alias-narrowing siguió destapando cabos, todos cerrados:** (5) `extractNegativeEarlyReturnGuards` no hilaba `guardAliases` a `collectDisjunctionGuards` → `const noWin = typeof X === "undefined"; if (noWin) return; X` no resolvía el alias (FP), `8365e5b`; (6) `gatherBlockLexicalNames` solo cubría `const`/`let` → `using`/`await using`/`enum`/`namespace`/`import =` block-scoped no purgaban el alias (la misma sombra TDZ del punto 2 anterior, otras formas) → `isBlockScopedDeclList` + `producesRuntimeValue`, `793591b`; (7) el `CaseBlock` de `switch` es UN scope léxico con su propio walker y NO purgaba al entrar → mismo bypass TDZ dentro de un switch, `189aa11`.

**Round 8 — import-equals de valor en cuerpo de namespace (FP separado, NO alias-family), `437dc48`.** `namespace N { export const Y = 1; import X = N.Y; export const z = X; }` over-flaggeaba `X` como global bare: `extractPostStatementBindings` reconocía enum/namespace pero NO `ImportEqualsDeclaration`. **El fix literal que pedía codex (añadirlo a `localBindings`) habría reabierto una regresión:** el nombre import-equals también caía en `nonImportBindings`, el set que `isDeferredExecutionContext` consulta para distinguir un shadow LOCAL de un hook real → `import ue = React.useEffect; ue(cb)` pasaba a tratarse como shadow local y se flaggeaba (FP14/15). **Un import-equals es IMPORT-LIKE:** sombrea el global homónimo (`localBindings`) pero NO cuenta como shadow de un hook (`nonImportBindings`) — dos sets con semánticas distintas, no aliasar. Fix: `extractPostStatementBindings` → `{ all, nonImport }` (import-equals solo en `all`); `addToScope(ctx, names, nonImportNames = names)`. **Frontera de soundness:** `producesRuntimeValue(importEquals)` es conservador (`!isTypeOnly`) — exactamente el **residual B4 ya ratificado** (decidir si el RHS same-file es un miembro-TIPO erased exige el binder). Un `import window = N.SomeType` con `SomeType` type-only escrito SIN `type` se trata como valor → over-exemption en ese rincón contrivado first-party = residual-por-diseño, igual que B4. El fix NO introduce clase nueva: aplica al cuerpo de namespace el MISMO tratamiento del module-preload path, unificando con un residual ya aceptado. Anclas de soundness en el test: alias de valor real NO flaggea (FP cerrado) + global bare sin alias SÍ flaggea. **Lección reforzada:** insistir en el codex re-review CON el checklist completo embebido en el trigger pagó 4 rondas seguidas — cada una un cabo real que ni mis soundness-tests ni las rondas previas pillaron.

**Sweep adversarial POST-round-8 (40 candidatos, 8 lentes, verificación empírica refutadora) — 0 bugs reales, y el residual B4 queda PROBADAMENTE inofensivo, no solo "contrivado".** El sweep destapó 15 constructos de una misma familia (`import X = N.TipoMember` con `X` nombrado como global de cliente: location/screen/navigator/localStorage/window/document/history) donde el gate exime el read. Algunos verificadores los clasificaron como "bypass" — **usando el oráculo equivocado (tsc `transpileModule`, que ELIDE el import-equals por type-only)**. Resuelto contra el oráculo correcto (esbuild, [[feedback_esbuild_emit_oracle]]): **esbuild NUNCA elide un import-equals cuyo nombre se usa como valor — emite `const X = N.member`**. Verificado empíricamente sobre los 4 nombres y los 4 casos límite. La propiedad que cierra la clase:

| Caso | `producesRuntimeValue` | GATE | ESBUILD emit | Runtime |
|---|---|---|---|---|
| `import X = N.valor` | true | exime | `const X = N.valor` (valor real) | lee el valor local — correcto |
| `import X = N.tipo` (sin `type`) | true | exime | `const X = N.tipo` (= undefined) | `X.m` lanza TypeError en TODO runtime — out-of-mandate |
| `import type X = …` | false | **flaggea** | elide | lee el global → gate ya flaggeó — fail-closed |
| namespace no-instanciado | — | **flaggea** | `const X = …` | crash local |

**esbuild-elide ⟺ `import type` ⟺ gate-flaggea; gate-exime ⟹ esbuild-emite-`const`-local ⟹ el nombre value-position es SIEMPRE local, jamás el global de cliente real.** No hay hueco: la over-exemption del residual B4 no puede colar un read de global de cliente en código server-safe — en el peor caso (RHS tipo) produce un `undefined` local que crashea platform-independent (misma categoría que F4: fuera de mandato, lo caza cualquier test que importe el módulo). El residual sube de "aceptado por contrivado" a **demostrablemente out-of-mandate bajo el oráculo del build**. La lección [[feedback_esbuild_emit_oracle]] aplicó otra vez: la pregunta "¿esto lee el global?" se responde contra esbuild, no contra el emit de tsc.

### DEEPEST FINAL HUNT #173 (4924427) — 17 bypasses REALES cerrados: el predicado de instanciación del gate DIVERGÍA de esbuild

El hunt adversarial más exhaustivo (14 lentes sobre TODO el gate, loop-until-dry 4 rounds, **5 escépticos diversos por superviviente**, screen empírico con oráculo esbuild, surface-any-no-mayoría) cazó **17 bypasses majority-confirmed**, **verificados a mano contra esbuild** (gate exime + esbuild emite 0 shadow → leen el global de cliente REAL, in-mandate: `ReferenceError` en server). DOS raíces:

- **CLASE A (15) — instanciación de namespace.** `esbuildInstantiatesViaStatement` (el predicado que el round BYPASS-2 introdujo para "replicar esbuild") marcaba instanciante **TODO** value-producer, asumiendo que "el ambient TOP-LEVEL instancia". **Falso — el propio predicado-oráculo divergía de esbuild.** Medido sobre 19 formas: un miembro `declare` instancia **SOLO si va `export`** (`export declare const` sí → `var N`; `declare const`/`declare var`/`declare function`/`declare class`/`declare enum` pelados → **elide**); y `import Q = N` instancia **SOLO si value-USED o `export import`** (`import Q=N; type Z=typeof Q.z` value-dead → elide). El gate marcaba instanciados `namespace document { declare var slot }` e `import Q=N` value-dead → metía `document`/`window`/`navigator`/`localStorage`/`sessionStorage`/`indexedDB`/`caches`/`screen` en el shadow-set → eximía el read, pero esbuild borra el namespace entero → el read filtra al global. **Fix:** `isAmbientDeclaration(stmt) ? hasExportModifier(stmt) : true` para value-producers, y `hasExportModifier && !isTypeOnly` para import-equals (value-use es binder-territory → fail-closed a `export import`; un import-equals value-used igual instancia por su statement de USO, no se pierde caso legítimo).
- **CLASE B (2) — eval-sink `+`-concat. ⚠️ FIX REVERTIDO** (ver REFINAMIENTO en §141, commit posterior). Inicialmente se cazó `([] as any)["construc"+"tor"][…]("return window")` foldeando el `+`-concat. Pero el re-hunt POST-fix demostró que era **falsa completitud** (`["cons"+(true?"tructor":"")]`, `[String.fromCharCode(…)]`, `[".".join("")]` y ∞ más se escapan igual) → INCOHERENTE con el §141 que la propia sesión ratifica. Se REVIRTIÓ junto con el fold de sustitución de template: el eval-sink string-building es el **residual §141** (token ARMADO de piezas), no un bug del modelo. **A diferencia de CLASE A** (el predicado del gate estaba *equivocado* sobre el emit de esbuild → bypass real → fix), aquí el gate entiende bien el emit y solo declina la ofuscación por diseño → residual. Los namespace (CLASE A) son el único cierre real de este hunt.

**Esto ERA exactamente el riesgo que el §F4 pinneó** ("si un nombre ERASED se colara en `gatherModuleDeclaredNames`/el shadow-set, F4 eximiría un read del global real → bypass silencioso"). El pin existía pero el predicado de instanciación tenía el hueco. **Lección — 4ª aplicación de [[feedback_esbuild_emit_oracle]], la más fina: no basta con "anclar a esbuild"; el predicado que dice replicar esbuild HAY QUE VERIFICARLO data-driven contra esbuild, porque una réplica a-ojo diverge** (aquí: "ambient instancia" era medio-verdad — solo el ambient EXPORTADO). El fix se acompaña de un **PIN anti-divergencia**: un test data-driven que compara el veredicto del gate contra el emit REAL de esbuild en 19 formas — si TS/esbuild/un refactor divergen, revienta. Corpus de regresión: los 17 snippets exactos del hunt, cada uno DEBE flaggear; + 5 contra-tests 0-FP (instanciación genuina sigue eximiendo). verify-cold 1536 verde; gate-vs-source 0 violaciones.

### Hunt final capturatodo — 2 bypasses MÁS de deferred-execution (commit `791382a`)

Un hunt final exhaustivo sobre el gate ya endurecido (consciente de TODAS las fronteras, para filtrar residuales/FPs conocidos) cazó **6 bypasses reales en 2 clases de deferred-execution** (verificados a mano: compilan bajo el tsconfig REAL —strict + noUnusedLocals— + gate exime + esbuild lee el global SÍNCRONO en render/instanciación, in-mandate):

- **Clase A — import-equals que SOMBREA un hook diferido con una función SÍNCRONA no-react.** `namespace App { import useEffect = Sync.run; useEffect(() => { document.title = "x"; }); }` donde `Sync.run(cb)` invoca `cb()` inline. **Raíz: el fix de round-8** (excluir TODO import-equals de `nonImportBindings` para que `import ue = React.useEffect` siga siendo un hook real, FP14/15) era **demasiado amplio**: el alias no-react tampoco se registraba como shadow → el shadow-guard de `isDeferredExecutionContext` (L700) no disparaba → el check canónico **file-global** trataba `useEffect = Sync.run` como el hook react diferido → eximía el read. **Fix:** un import-equals va a `nonImport` SALVO que aliase react (`importEqualsAliasesReact`: RHS root ∈ `reactImports.namespaces` Y NO sombreado localmente). `Sync.run`/`FakeReact` → shadow → flagea; `React.useEffect` → exempt (FP14/15 preservado). **Codex P1 (refinamiento scope-aware):** `reactImports.namespaces` es FILE-GLOBAL; un `import React = FakeReact; import useEffect = React.useEffect` dentro de un namespace clasificaba `useEffect` como alias-react (root `React` ∈ namespaces file-global) aunque `React` esté sombreado local por FakeReact → `React.useEffect = FakeReact.useEffect` (síncrono) = BYPASS encadenado. Fix `3fb0c5d`: el check exige que el RHS root NO esté en `priorNonImport` (los shadows no-react ya acumulados; el `import React = FakeReact` ya entró por esta regla). Scope-aware. Otra vez: el mismo cabo que yo había marcado y mi fix dejó suelto — los hunts/codex son load-bearing. **Sutileza de adjudicación:** los repros mínimos daban TS6133 (import top-level muerto por el shadow) → 1 de 5 escépticos los refutó como "no compila"; pero la VARIANTE que USA el import top-level (`export const realHook = useEffect`) rompe ese vise y compila limpio → bypass real. Por eso se adjudica a mano: 4/5 decían real y tenían razón.
- **Clase B — tag JSX `$Foo`/`_Foo` mal-clasificado como intrínseco.** El gate restringe la exención de event-handlers a elementos intrínsecos (`<button onClick>`) — un componente custom puede invocar `props.onClick()` síncrono en render. Pero el check `first === first.toLowerCase()` tomaba `$`/`_` como "minúscula" (no son ni mayúscula ni minúscula) → clasificaba `$Panel`/`_Widget` como intrínsecos → eximía su handler. esbuild los emite como COMPONENTES (`jsx($Foo,…)`, verificado), que corren `props.onClick()` en render → leen el global en SSR. **Fix:** intrínseco ⟺ `/^[a-z]/` (lowercase LETTER), la regla real de React/esbuild. Solo el intrínseco real difiere el handler al evento DOM post-render.

Ambos son `deferred-execution` mal-modelado, NO residuales: el callback corre SÍNCRONO en SSR, no post-render. Tests: 6 bypasses flaggean + variante compilable + 0-FP (react-alias exento, intrínseco lowercase exento, FP14/15 intacto). **Lección — cada fix de soundness puede abrir otra clase:** el round-8 (import-equals fuera de nonImport) cerró FP14/15 pero abrió la Clase A; el discriminador correcto no era "import-equals sí/no" sino "aliasa-react sí/no". verify-cold 1559 verde; gate-vs-source 0 violaciones.

**La Clase A tuvo DOS cabos scope-aware más, ambos cazados por codex y cerrados — el patrón recurrente del área deferred-hook es FILE-GLOBAL/POSICIONAL vs SCOPE-AWARE/LÉXICO:**
- **P1 (`3fb0c5d`) — root sombreado.** `importEqualsAliasesReact` usaba `reactImports.namespaces` FILE-GLOBAL: `import React = FakeReact; import useEffect = React.useEffect` clasificaba useEffect como react-alias (root `React` ∈ namespaces file-global) aunque `React` esté sombreado local por FakeReact → `React.useEffect = FakeReact.useEffect` síncrono. Fix: el RHS root NO debe estar en `priorNonImport`.
- **P1 round-10 (`64d3f7e`) — sombra léxica POSTERIOR.** Una función visitada ANTES de un `const useEffect = Sync.run` posterior liga léxicamente al const local; `priorNonImport` es posicional → no lo veía. Fix: `gatherNonReactLexicalShadows` PRE-CARGADO en nonImportBindings al ENTRAR el scope (gemelo del purge de guard-aliases). **Diagnóstico permanente: ante cualquier hallazgo del deferred-hook, sospechar de la asimetría file-global/posicional vs scope-aware/léxico — reactImports es file-global y gatherReactImports solo procesa top-level.**

**Hunt final — divergencia gate-vs-bundler en resolución de extensiones (`93e62b0`, LATENTE).** El gate resuelve `./helper` por `RESOLUTION_EXT_CASCADE` (`.ts` primero); Vite rankea `.mjs`/`.js`/`.mts` ANTES (`DEFAULT_EXTENSIONS`). Con `helper.ts` limpio + `helper.mjs` sucio (`screen.width`), el gate auditaría el `.ts` y el bundler ENVÍA el `.mjs` = bypass cross-módulo silencioso. **0 archivos `.mjs`/`.js` en `src/` hoy → latente, no live.** Fix fail-closed: `bundlerShadowSibling` detecta un hermano de mayor precedencia Vite del archivo resuelto → resolución AMBIGUA → `unresolvable` (falla ruidoso, no audita JS → sin FP nuevo). Activa solo cuando alguien añada tal hermano. Mismo género que cualquier "la capa que de verdad gobierna" — la resolución del gate debe casar con la del bundler, no con tsc.

**Caveat de completitud:** el hunt agotó el límite de sesión en los finders de rounds 3-4 (14 lentes) y los 2 critics — NO corrieron. Los 17 confirmados salieron de rounds 1-2 + el resume. Tras el fix queda PENDIENTE re-correr el hunt contra el gate arreglado (confirmar cierre de clase + completar rounds 3-4 + critics) cuando el límite resetee.

**2 FPs ACEPTADOS como over-flag fail-closed** (NO se arreglan — el over-flag ES el comportamiento correcto; arreglarlos sería fail-open o exigiría data-flow; contrivados, 0 en el DS):
- **FP8** handler en object-spread `<button {...handlers}>`: saber que el objeto va a un intrínseco exige data-flow → eximirlo sería fail-open (un objeto-config con `onClick` llamado en render se eximiría = bypass).
- **FP10** eval-sink con key `x.constructor[key ?? "ctor"]` (`const key = "name"`): foldear el `??` exige RESOLVER que `key` es un const-string no-null → una const-resolution-map en la función más sensible a bypass (el eval-sink). Distinto del ternario-literal (FP9, cerrado): ahí la condición es un keyword `true`/`false` (fold sintáctico puro, sin resolución). El caso `??`-con-identificador sí necesita resolver el binding → se deja como over-flag.

**Histórico vs final (evitar confusión de conteos).** Los bypasses B1-B4 y los FPs F1-F5 (secciones arriba) son rounds ANTERIORES a la convergencia. El hunt de e29c388 ("Hunt final #173", línea 252) y los re-hunts/sweeps intermedios volvieron 0 bypasses nuevos. **PERO el DEEPEST FINAL HUNT (4924427, sección arriba) — el más exhaustivo, con 5-escéptico-por-superviviente y oráculo esbuild empírico — SÍ cazó 17 bypasses reales** que los rounds previos (incluido codex en limpio) no pillaron: la convergencia anterior era ilusoria porque ningún round previo había verificado el predicado de instanciación **data-driven contra esbuild**. Tras 4924427 + el PIN anti-divergencia, "taggeable en seguridad" se re-evalúa: queda PENDIENTE el re-hunt contra el gate arreglado (rounds 3-4 + critics no corrieron por límite de sesión) y un nuevo codex re-review antes de declarar cierre.
