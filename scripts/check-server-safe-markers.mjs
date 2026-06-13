#!/usr/bin/env node
/**
 * check-server-safe-markers.mjs — D1-P1 gate (AST-based)
 *
 * Verifica el invariante de los componentes marcados con JSDoc
 * `@server-safe`: el componente puede ser renderizado server-side
 * (incluyendo React Server Components / SSR puro) sin acceder a APIs
 * que solo existen en cliente.
 *
 * Reglas que enforza este gate:
 *
 *   1. **No `"use client"` directive**: si un componente está marcado
 *      `@server-safe`, NO debe declarar `"use client"`. Las dos cosas
 *      son contradictorias por design.
 *
 *   2. **No accesos a globals no-server-safe en render path** (modelo
 *      FAIL-CLOSED / whitelist, beta.27): acceso bare a CUALQUIER
 *      identificador no resuelto en scope (local/param/import) y AUSENTE de
 *      `SAFE_GLOBALS` (= builtins ES ∪ globals de Node − `INTENTIONAL_DENY`
 *      − overclaims) — en cualquier forma (`X`, `X.foo`, `X?.foo`,
 *      `X["foo"]`, `X?.["foo"]`) — es violation, salvo en uno de estos
 *      contextos:
 *
 *      (a) Bajo guard `typeof X !== "undefined"` ACTIVO según scope
 *          (positive typeof, dentro del then-branch del if).
 *      (b) Dentro del body de una función pasada a un sink de ejecución
 *          diferida reconocido: JSX event handler (`onClick`,
 *          `onChange`, etc), hook de React diferido (`useEffect`,
 *          `useLayoutEffect`, `useInsertionEffect` — ver `DEFERRED_HOOKS`),
 *          o timer que existe en Node (`setTimeout`, `setInterval`,
 *          `setImmediate`, `queueMicrotask` — ver `DEFERRED_LATER_FNS`).
 *
 *          NOT incluido en (b): `useMemo` / `useState` lazy init /
 *          `useRef` lazy init (corren durante render server); helpers
 *          nested (`function readEnv() { return window.x; }` invocada
 *          desde JSX corre durante render); IIFE (`(() => x)()`);
 *          `useCallback` / `useImperativeHandle` (el value returned puede
 *          invocarse durante render — removidos del set); timers
 *          browser-only `requestAnimationFrame` / `requestIdleCallback` y
 *          `startTransition` (corre síncrono) — su call-site mismo lanza en
 *          SSR. El consumer debe inline-ar el acceso en un JSX event
 *          handler reconocido o moverlo a un effect / guard.
 *
 *      Acceso a un client global en el render path top-level (FUERA
 *      de cualquier callback) sin guard activo es la única forma de
 *      violation.
 *
 *      NOTA: `typeof X` solo short-circuita ReferenceError sobre el
 *      identificador BARE. `typeof X.Y` ejecuta la property access
 *      (lanza si X no existe), por tanto NO es exempt. Si appears
 *      `typeof window.foo` en código `@server-safe`, el gate lo
 *      flaggea correctamente — debe quedar bajo guard real o moverse
 *      a callback body.
 *
 * ─── Implementación ────────────────────────────────────────────
 *
 * AST-based (TypeScript Compiler API) en lugar de regex stack. Decidido
 * en codex P1 round 8 sobre PR #90 tras 7 rondas de heurísticas regex
 * que cerraron silent bypasses incrementalmente:
 *
 *   1. globalThis missing en regex.
 *   2. Line comments confunden el typeof check.
 *   3. Block comments single-line igual.
 *   4. Block comments multi-line igual.
 *   5. Brace depth tracking necesario (guards fuera de scope).
 *   6. typeof === "undefined" trataba como guard.
 *   7. Optional chaining + bracket access bypass.
 *   8. multi-line `if (typeof X !==) { }` + callbacks.
 *   9. `typeof window.foo` ancestor check exempt-eaba el property
 *      access — pero `typeof` solo suprime ReferenceError sobre
 *      identificadores bare, NO sobre property accesses descendientes.
 *  10. `functionDepth > 1` exempt-eaba TODOS los nested function bodies,
 *      incluido helper `function readEnv() { return window.x; }` que se
 *      invoca síncronamente desde JSX. Reemplazo: allowlist explícito
 *      de sinks de ejecución diferida.
 *  11. (este round) DOS findings:
 *      (a) `startTransition` NO es timer — React invoca la action
 *          síncronamente. Removido del allowlist diferido.
 *      (b) Bare identifier reads (`const w = window`, `if (document)`,
 *          `f(navigator)`) no se chequeaban — el walker solo veía
 *          PropertyAccess/ElementAccess. Añadido branch para Identifier
 *          con filtro `isNonReferencePosition` que skipea declaration
 *          names, property keys, type positions, JSX tag/attribute names,
 *          binding propertyName de destructure, y operands de typeof.
 *
 *          Además se añadió scope tracking minimal (`localBindings` per
 *          context, acumulada al entrar function-likes) para evitar
 *          falsos positivos cuando un `CLIENT_GLOBALS` name está
 *          shadow-eado por un parameter, var local, o import:
 *
 *            function fn(window) { return window; }   // OK
 *            import { document } from "./local";       // OK
 *            const navigator = ...                     // OK
 *
 *  12. Scope tracking del round 11 era function-scope global. Reemplazo:
 *      scope-stack real. Hoist solo `var` + `function` al function
 *      scope; `let`/`const`/`class` se añaden al ENTRAR cada Block;
 *      `catch` param al entrar el CatchClause; `for-init let/const` al
 *      entrar el ForStatement/ForInStatement/ForOfStatement.
 *  13. DOS findings ortogonales:
 *      (a) En strict ESM, `function` declarations dentro de blocks NO
 *          hoist al function scope — son block-scoped (visible solo en
 *          su block, aunque pre-initialized desde block-entry).
 *          `if (...) { function window() {} } window.location` ahora
 *          se flaggea correctamente: el `function window` no shadow-ea
 *          el global fuera del block.
 *      (b) `let`/`const`/`class` están en TDZ antes de su declaración.
 *          El walker pre-cargaba TODOS los let/const del scope al
 *          entrar, lo que false-shadow-eaba reads anteriores:
 *
 *            window.location;            // ← FLAG (TDZ throws igual)
 *            const window = ...;
 *
 *          Reemplazo: traversal order-aware. `visitOrderedStatements`
 *          itera statements en orden, pre-cargando solo function
 *          declarations (block-hoisted within scope), y añadiendo
 *          let/const/class al scope DESPUÉS de visitar cada statement.
 *          Reads anteriores al const ven el outer scope (global).
 *  14. DOS findings (P2):
 *      (a) for-init `var x` (en `for`/`for-in`/`for-of`) no se hoist-eaba
 *          porque el walker chequeaba solo VariableStatement, no
 *          VariableDeclarationList directo. Fix: chequear
 *          VariableDeclarationList — cubre ambos sites.
 *      (b) Switch/case lexical scope no se procesaba — let/const/class
 *          dentro de cases no se acumulaban. Fix: nuevo branch
 *          CaseBlock que pre-carga function decls cross-clauses +
 *          itera clauses en orden, persistiendo scope cross-case.
 *  15. (este round) DOS findings (P2):
 *      (a) `"use client"` regex (`/^["']use client["'];?\s*$/m`) perdía
 *          casos válidos: `"use client"; // comment`, comillas mixtas,
 *          trailing whitespace, etc. Reemplazo: AST directive prologue
 *          — walk top-level statements mientras sean
 *          ExpressionStatement/StringLiteral.
 *      (b) `useCallback` / `useImperativeHandle` removidos de
 *          DEFERRED_HOOKS — sus callbacks NO se invocan síncronamente
 *          por el hook, pero el VALUE returned puede invocarse durante
 *          render (`const f = useCallback(() => window.foo, []); f();`).
 *          Forzar al consumer a inline arrow en JSX event handler o
 *          mover acceso a effect/guard.
 *  16. DOS findings (P2):
 *      (a) JSX `on[A-Z]` exempt-eaba TODOS los components. Los
 *          intrinsic HTML elements (`<button onClick>`) sí son real
 *          DOM event handlers post-render, pero los custom components
 *          (`<MyComp onFoo>`) tienen `onFoo` como prop normal que el
 *          componente puede invocar síncronamente durante render.
 *          Restringir exemption a JsxOpeningElement/JsxSelfClosingElement
 *          con tagName Identifier lowercase first char (intrinsic).
 *      (b) Deferred sinks (`useEffect`, `setTimeout`, etc.) trustaban
 *          el callee text directamente. Un local `function useEffect(cb)
 *          { cb(); }` shadow-eaba el hook real pero pasaba el check.
 *          Fix: separar `localBindings` (todos los bindings) y
 *          `nonImportBindings` (excluye imports). Si el root identifier
 *          del callee está en nonImportBindings = local shadow → NO
 *          exempt. Imports legítimos (e.g., `useEffect` from "react")
 *          solo están en localBindings, no en nonImportBindings →
 *          siguen exempt.
 *  17. (este round) DOS findings (P1 + P2):
 *      (a) DEFERRED_HOOKS check NO verificaba el source del import. Un
 *          `import { useEffect } from "./fake-helper"` (con synchronous
 *          impl) pasaba como deferred sink. Fix: nuevo `reactImports`
 *          Set en context, populated by `gatherReactImports` que solo
 *          incluye nombres con `moduleSpecifier.text === "react"`.
 *          Check requiere root del callee in reactImports para exempt.
 *      (b) `requestAnimationFrame` / `requestIdleCallback` movidos de
 *          DEFERRED_LATER_FNS → CLIENT_GLOBALS. Estos APIs NO existen
 *          en Node SSR; el call site lanza ReferenceError antes de que
 *          el callback se defiera. Añadidos también
 *          `cancelAnimationFrame` y `cancelIdleCallback` por consistencia.
 *          DEFERRED_LATER_FNS queda solo con timers que sí existen en
 *          Node: setTimeout, setInterval, setImmediate, queueMicrotask.
 *  18. (este round) P1: DEFERRED_LATER_FNS check trustaba el callee
 *      text + non-import shadow check (round 16), pero NO verificaba
 *      que el timer fuera el global real. `import { setTimeout } from
 *      "./fake-helper"` con synchronous impl pasaba como deferred sink.
 *      Fix: requerir que el rootIdent del callee NO esté en
 *      `localBindings` (los timers reales son globals de Node, no se
 *      declaran ni se importan). Mismo razonamiento que round 17 hooks
 *      pero con criterio inverso — timers son globals nativos, hooks
 *      requieren react-import.
 *
 * El regex approach degrada rápido por context-sensitive matching.
 * AST resuelve ambos casos del round 8 directamente.
 *
 * ─── Contrato de invocación ────────────────────────────────────
 * • **Invoker**: `npm run test:server-safe-markers`, encadenado en
 *   `verify:unit`. CI lo invoca como gate.
 * • **Entorno requerido**: TypeScript devDep + source files en
 *   `src/components/` + `src/hooks/`.
 * • **Fallback / errores**: ERROR (exit 1) si encuentra cualquier
 *   violación. La intención del marker es "audited+enforced", no
 *   "declarative wish".
 *
 * Modo de uso:
 *
 *   node scripts/check-server-safe-markers.mjs
 *
 * No acepta flags — invariante binario.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  dirname,
  resolve,
  join,
  relative,
  sep as pathSep,
  posix as pathPosix,
} from "node:path";
import ts from "typescript";
import globalsPkg from "globals";

/**
 * Normaliza un path al separator POSIX (`/`). Helper de bajo nivel
 * usado por `crossOsResolve`/`crossOsRelative`/`crossOsDirname` —
 * NO usar directamente como input de `pathPosix.resolve` cuando el
 * input puede tener drive letter (Windows), porque POSIX no trata
 * `D:/` como absoluto y prepende cwd.
 */
function toPosix(p) {
  return p.split(pathSep).join("/");
}

/**
 * Resolver cross-OS que cubre tres modos sin if-else por plataforma:
 *
 *   1. **VFS test**: `base` como `/repo` (POSIX literal). No tiene
 *      drive letter — `pathPosix.resolve` lo trata como absoluto.
 *   2. **Real-disk Linux**: `base` como `/home/user/reactigoded`.
 *      Mismo caso que (1).
 *   3. **Real-disk Windows**: `base` como `D:\a\reactigoded`. Tras
 *      `toPosix` queda `D:/a/reactigoded`, pero `pathPosix.resolve`
 *      NO reconoce `D:/` como absoluto (POSIX ignora drive letters)
 *      y prepende cwd → path roto. Codex P1 sobre PR #121:
 *      `D:\a\.../D:/a/.../src/utils/cn`. La fix: extraer la drive
 *      letter como prefijo, ejecutar `pathPosix.resolve` sobre el
 *      resto POSIX-puro, y re-prepender la drive al output.
 *
 * Trabajamos en POSIX internamente para que el path intermedio
 * compare correctamente con el VFS (keys forward-slash) y con
 * `node:fs` en Windows (que acepta forward slashes nativamente).
 */
function crossOsResolve(base, ...segments) {
  const posixBase = toPosix(base);
  const posixSegments = segments.map(toPosix);
  const driveMatch = /^([A-Za-z]:)(\/.*)?$/.exec(posixBase);
  if (driveMatch) {
    const drive = driveMatch[1];
    const rest = driveMatch[2] ?? "/";
    return drive + pathPosix.resolve(rest, ...posixSegments);
  }
  return pathPosix.resolve(posixBase, ...posixSegments);
}

/**
 * `path.relative` cross-OS. Misma técnica: strip drive letter
 * (case-insensitive — Windows es case-insensitive sobre drives),
 * relativar el resto POSIX, devolver el resultado. Si las drives no
 * coinciden, fallback a `pathPosix.relative` que producirá un path
 * "imposible" (`..` inflado) y `inSrc` lo rechazará — comportamiento
 * correcto para el cross-drive case.
 */
function crossOsRelative(from, to) {
  const posixFrom = toPosix(from);
  const posixTo = toPosix(to);
  const fromDrive = /^([A-Za-z]:)/.exec(posixFrom)?.[1];
  const toDrive = /^([A-Za-z]:)/.exec(posixTo)?.[1];
  if (
    fromDrive &&
    toDrive &&
    fromDrive.toLowerCase() === toDrive.toLowerCase()
  ) {
    return pathPosix.relative(
      posixFrom.slice(fromDrive.length) || "/",
      posixTo.slice(toDrive.length) || "/",
    );
  }
  return pathPosix.relative(posixFrom, posixTo);
}

/**
 * `path.dirname` cross-OS. Como POSIX dirname sobre forward slashes
 * basta — no hay caso especial con drive letters (siempre queda
 * `D:/foo/bar` → `D:/foo`).
 */
function crossOsDirname(p) {
  return pathPosix.dirname(toPosix(p));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const COMPONENTS_DIR = resolve(repoRoot, "src/components");
const HOOKS_DIR = resolve(repoRoot, "src/hooks");
const SRC_ROOT = resolve(repoRoot, "src");

// ── Modelo fail-closed (whitelist) del catálogo server-safe ──
// (beta.27 BLOCKER-1, cruce A+B claudegate6)
//
// HISTORIA: hasta beta.26 esto era una DENYLIST de ~46 nombres browser-
// only. El cruce A+B (START-1) demostró que era estructuralmente
// insuficiente: `lib.dom.d.ts` declara ~826 globals client-only que
// lanzan ReferenceError en Node, y la denylist cubría 46 → ~780 pasaban
// silenciosos (`HTMLElement`, `Element`, `self`, `CSS`, customElements
// nuevos…). Una denylist "más completa" conserva la dirección de fallo
// equivocada: el día que el navegador/TS añada un global nuevo, vuelve a
// pasar hasta que alguien regenere el catálogo.
//
// MODELO: deny-by-default. Lo SEGURO se enumera (finito, estable); todo
// lo demás accedido bare se flaggea. Seguro =
//   (ECMAScript builtins ∪ globals de Node) − denegaciones intencionales.
// Fuente: paquete `globals` (mantenido, versionado). Un global DOM nuevo
// se caza solo, sin tocar este archivo. Un falso positivo es ruido
// (arreglable: añadir a SAFE_GLOBALS si es genuinamente Node-safe), no un
// ReferenceError en producción SSR — fail-closed compra esa dirección.
//
// ENGINE-MIN: `globals.nodeBuiltin` puede listar globals añadidos después
// de Node 22.12.0 (engine mínimo declarado). El test #150
// `src/__tests__/server-safe-catalog-vs-node.test.ts` corre en la matriz
// CI (22.12 + 24) y falla si algún nombre de SAFE_GLOBALS no lo provee el
// Node real → ancla la whitelist al engine mínimo, no al Node del dev.
//
// STANCE: "server-safe" = funciona en el EDGE RUNTIME MÁS ESTRICTO **sin
// asumir `nodejs_compat`** (Vercel Edge; Cloudflare Workers / Deno sin la flag
// de compat de Node). Es la decisión conservadora correcta para una librería:
// no puedes asumir que tus consumers activan compat. CAVEAT explícito: un
// componente flaggeado por un global Node-only SÍ funcionaría en un runtime
// CON compat — pero el gate ancla al baseline sin compat. (Verificado contra
// Vercel Edge / matriz de compat cross-runtime; ver ADR D1-P1.)
//
// DENEGACIONES INTENCIONALES (Node los provee pero se flaggean igual):
//   - `globalThis` / `global`: cazan el bypass
//     `globalThis.constructor.constructor("return window")()` y el acceso
//     directo a client globals / `process.env` vía el objeto global. `global`
//     es el alias runtime-equivalente de Node (`global === globalThis` en el
//     floor) y `globals.nodeBuiltin` lo lista — sin denegarlo, `global.*`
//     reabriría el mismo agujero que `globalThis.*` (cruce A+B, FN-hunt).
//   - `process` / `Buffer`: ausentes/stub en el baseline Web-standard edge
//     (Vercel Edge; Workers/Deno SIN `nodejs_compat`). NO "Workers/Deno no los
//     tienen" — CON compat sí los tienen; el anclaje es al baseline sin compat.
//     En RSC el patrón canónico es leer env vía args/context, no globalmente.
//   - `setImmediate` / `clearImmediate`: Node-only, NO Web-standard. En Vercel
//     Edge están definidos como STUB QUE LANZA al llamarse ("A Node.js API is
//     used (setImmediate) which is not supported in the Edge Runtime"). Por eso
//     van también en NON_ABSENCE_DENIALS (un `typeof setImmediate !==
//     "undefined"` pasa pero la llamada revienta → guard de falsa confianza).
//     Los otros deferred-timers (`setTimeout`/`setInterval`/`queueMicrotask`)
//     SÍ son Web-standard y se quedan en SAFE.
//   - `navigator`: provisto como SUBSET inestable (sí `userAgent`/`language`;
//     no `geolocation`/`mediaDevices`) — semántica divergente entre runtimes →
//     gate fuerza guard explícito.
//   - `localStorage` / `sessionStorage`: webstorage no disponible en el edge
//     baseline ni estable en Node (experimental) → crashean o son semántica-
//     mente erróneos en SSR/RSC.
//   - `eval` / `Function`: dynamic eval sinks (ver DYNAMIC_EVAL_SINKS).
//     Excluidos de SAFE para que también se flaggeen como bare ref.
//
// FOLLOW-UP (post-freeze): derivar SAFE como INTERSECCIÓN cross-runtime anclada
// al baseline edge (vía una herramienta tipo `platform-node-compat`) en vez de
// `globals.nodeBuiltin` − denegaciones-a-mano. Esto convertiría la lista de
// denegaciones Node-only en algo derivado, no curado.
const INTENTIONAL_DENY = new Set([
  "globalThis",
  "global",
  "process",
  "Buffer",
  "setImmediate",
  "clearImmediate",
  "navigator",
  "localStorage",
  "sessionStorage",
  "eval",
  "Function",
]);

// Overclaims de `globals`: nombres que `globals@17.x` lista en `builtin`/
// `nodeBuiltin` pero que Node 22.12.0 (engine MÍNIMO declarado) NO provee
// como global — landearon en Node 23/24 o están flag-gated. Un componente
// `@server-safe` que los referencie bare lanzaría ReferenceError en un
// consumer sobre el floor. Verificado contra el runtime real de Node
// 22.12.0; el test `server-safe-catalog-vs-node.test.ts` (Test A) corre en
// la celda 22.12 de la matriz CI y FALLA si esta lista se desincroniza con
// lo que el floor realmente provee (p.ej. al bumpear `globals` o el engine).
// IMPORTANTE: subtraer SOLO añade strictness (fail-closed) — si un nombre
// dejara de ser overclaim, el efecto sería un FP corregible, nunca un FN.
const GLOBALS_OVERCLAIMS = new Set([
  "AsyncDisposableStack",
  "CloseEvent",
  "DisposableStack",
  "ErrorEvent",
  "Float16Array",
  "Storage",
  "SuppressedError",
  "URLPattern",
]);

// EDGE-MISSING: globals que `globals.nodeBuiltin` lista (Node los provee) pero el
// runtime EDGE más estricto (Vercel Edge sin nodejs_compat) NO expone — un read
// bare lanza ReferenceError ahí. El gate ancla "server-safe" a ese baseline, así
// que SAFE = (builtin ∪ nodeBuiltin) ∩ edge. Esta lista es la diferencia
// (SAFE − edgeGlobalThis), derivada DATA-DRIVEN del runtime Edge real, no curada
// a ojo. Regenerable (provenance, @edge-runtime/vm@5.0.0):
//   npm i -D @edge-runtime/vm@5 && node -e 'const{EdgeVM}=require("@edge-runtime/vm");
//   const e=new Set(new EdgeVM().evaluate("Object.getOwnPropertyNames(globalThis)"));
//   import("./scripts/check-server-safe-markers.mjs").then(m=>console.log(
//   [...m.SAFE_GLOBALS].filter(n=>!e.has(n)).sort()))'
// Subtraer SOLO añade strictness (fail-closed): un FP corregible si Edge gana la
// API, nunca un FN. Codex P1 (BroadcastChannel) + #190. El pin de contenido de
// SAFE caza el drift al bumpear `globals`.
const EDGE_MISSING_GLOBALS = new Set([
  "BroadcastChannel",
  "ByteLengthQueuingStrategy",
  "CompressionStream",
  "CountQueuingStrategy",
  "CustomEvent",
  "DecompressionStream",
  "MessageChannel",
  "MessageEvent",
  "MessagePort",
  "Navigator",
  "Performance",
  "PerformanceEntry",
  "PerformanceMark",
  "PerformanceMeasure",
  "PerformanceObserver",
  "PerformanceObserverEntryList",
  "PerformanceResourceTiming",
  "ReadableByteStreamController",
  "ReadableStreamBYOBRequest",
  "ReadableStreamDefaultController",
  "TransformStreamDefaultController",
  "WritableStreamDefaultController",
]);

// Whitelist efectiva. Acceso bare a cualquier identificador NO resuelto
// en scope (local/param/import) y AUSENTE de este set se trata como
// global no-server-safe y se flaggea. Reemplaza al antiguo `CLIENT_GLOBALS`
// (denylist) invirtiendo la decisión-hoja del walker. DETERMINISTA: se
// deriva solo del paquete `globals` (datos estáticos), nunca del
// `globalThis` ambiente — el gate se importa también bajo jsdom (donde
// `window`/`document`/`HTMLElement` estarían polyfilled) y un
// runtime-intersect envenenaría SAFE con browser globals.
const SAFE_GLOBALS = new Set(
  [
    ...Object.keys(globalsPkg.builtin),
    ...Object.keys(globalsPkg.nodeBuiltin),
  ].filter(
    (name) =>
      !INTENTIONAL_DENY.has(name) &&
      !GLOBALS_OVERCLAIMS.has(name) &&
      !EDGE_MISSING_GLOBALS.has(name),
  ),
);

// Sinks de evaluación dinámica. NO son "browser globals" — existen
// también en Node — pero PERMITEN bypassear el análisis estático del
// gate evaluando código arbitrario desde un string en runtime. Usados
// para escape hatches reconocidos en bypasses del gate (codex round
// del cruce beta.25 + Claude):
//   - `eval("window.foo")` — eval directo.
//   - `Function("return window")()` — Function constructor.
//   - `new Function("return window")()` — idem con `new`.
//   - `Reflect.construct(Function, ["return window"])()` — wrapper.
//   - `globalThis.constructor.constructor("...")` — chain access.
//
// Los dos primeros se cazan directamente añadiendo `eval` y `Function`
// como bare identifiers (rama d) y como callee de CallExpression
// (rama c via el OUTER PropertyAccess no aplica aquí, pero el Identifier
// como callee SI es read position). Los wrapper patterns 3 y 4 se
// cazan transitivamente: `Reflect.construct(Function, ...)` flagea
// `Function` como arg identifier (rama d); `globalThis.constructor.X`
// flagea `globalThis` como base PropertyAccess (rama c).
//
// El error message distingue el rule name (`no-dynamic-eval-sink` vs
// `no-bare-dom-access`) para que el fix recommendation sea apropiada:
// con eval/Function NO se puede "guard con typeof" — hay que refactor.
const DYNAMIC_EVAL_SINKS = new Set(["eval", "Function"]);

// Denegaciones para las que un guard `typeof X !== "undefined"` NO hace el
// body safe — el typeof-guard NO se reconoce para ellas:
//   - `eval`/`Function`/`globalThis`/`global`/`self`: sinks de eval / raíz de
//     escape (el objeto global por sus tres nombres `globalThis`/`global`/`self`).
//     `globalThis` está siempre presente; `global` es el alias de Node; `self` es
//     el alias presente en Vercel Edge (typeof self === "object" ahí) → en Edge el
//     guard es vacuamente true y `self.eval`/`self.Function` LANZAN EvalError igual.
//     Un typeof-guard solo suprimiría la detección. (Codex P1 round 3; `self`:
//     re-hunt B2.) NO incluye `window`/`parent`/`top`/`frames`: esos están AUSENTES
//     en Edge, su hazard SÍ es la ausencia → ahí el guard typeof protege de verdad.
//   - `setImmediate`/`clearImmediate`: en Vercel Edge están DEFINIDOS como un
//     stub que LANZA al llamarse → `typeof setImmediate !== "undefined"` pasa
//     pero la llamada revienta. El guard da falsa confianza; por eso se trata
//     como los eval-sinks. (Workflow honest-construct / edge-baseline.)
// Difieren de `window`/`process`, cuyo hazard SÍ es la ausencia (no están
// definidos en el baseline) y donde el guard typeof SÍ protege.
const NON_ABSENCE_DENIALS = new Set([
  "eval",
  "Function",
  "globalThis",
  "global",
  "self",
  "setImmediate",
  "clearImmediate",
]);

/**
 * Política ÚNICA de exención en body diferido (ramas (c) y (d)). Las
 * `NON_ABSENCE_DENIALS` (sinks de eval + raíces de escape + stubs que lanzan)
 * disparan en Edge SIEMPRE → solo se eximen en deferred CLIENT-ONLY (useEffect/
 * handler, que NO corren en SSR), NUNCA en timers (setTimeout/setInterval/
 * queueMicrotask, que SÍ disparan en el isolate Edge durante SSR). El resto, cuyo
 * hazard es la AUSENCIA (window/document…), se exime en CUALQUIER deferred.
 *
 * Centralización (re-hunt B3): antes cada rama llaveaba esto por DYNAMIC_EVAL_SINKS
 * ({eval,Function}), un subconjunto ESTRICTO de NON_ABSENCE_DENIALS → globalThis/
 * global/self/setImmediate/clearImmediate quedaban exentos en timers y escapaban
 * (`setTimeout(() => globalThis.window.location.href)` → TypeError real en Edge).
 * Render-vs-timer eran paths paralelos con set de exención distinto; ahora ambos
 * llaman a ESTE. beta.27 BLOCKER-1.
 */
function isExemptInDeferredBody(api, context) {
  return NON_ABSENCE_DENIALS.has(api)
    ? context.isInClientOnlyDeferredBody
    : context.isInDeferredBody;
}

// Hooks de React cuyo body se EJECUTA GUARANTEED post-render (commit
// phase) en client. Los effects no corren en SSR, por tanto sus bodies
// nunca se ejecutan durante render server — exención safe.
//
// EXCLUIDOS intencionalmente:
//   - useMemo / useState (lazy init) / useRef (lazy init): el factory
//     corre durante el render server, por tanto accesos a client APIs
//     dentro son una violation real.
//   - useReducer: el reducer corre al despachar, técnicamente diferido,
//     pero acceso a client globals dentro de un reducer es patrón
//     anti-idiomático y vale la pena que el gate lo flaggee.
//   - useSyncExternalStore: tiene 3 args; `getServerSnapshot` SÍ corre
//     en render server. Una exención wholesale del hook abriría un
//     silent bypass para getServerSnapshot.
//   - useCallback / useImperativeHandle: el callback/factory NO se
//     invoca síncronamente por el hook, pero el VALUE returned puede
//     invocarse durante render por el consumer:
//       const f = useCallback(() => window.foo, []);
//       f();  // ← corre durante render
//     Codex round 15 P2.2: con exención, este patrón pasaba el gate.
//     Removidos para forzar al consumer a inline-ar el arrow en JSX
//     event handler (recognized) o mover el access a un effect / guard.
const DEFERRED_HOOKS = new Set([
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
]);

// Browser/JS timers cuyo callback NO corre durante el render server.
// Solo timers que existen en Node (SSR) — los browser-only no exempt:
// el call site mismo crash-ea antes de que el callback se defiera.
//
// EXCLUIDOS intencionalmente:
//   - `startTransition`: NO es un timer. React invoca la `action`
//     SÍNCRONAMENTE en el call site — el "diferimiento" se aplica a
//     la prioridad del state update, no a la ejecución de la función.
//     `startTransition(() => window.foo)` ejecuta `window.foo` durante
//     render, lanza ReferenceError en SSR. Codex round 11 P1.
//   - `requestAnimationFrame` / `requestIdleCallback`: browser-only, no
//     existen en Node SSR. `requestAnimationFrame(...)` en render path
//     lanza ReferenceError antes de que el callback se defiera. Movidos
//     a CLIENT_GLOBALS para que la bare ref también flag-ee. Codex
//     round 17 P2.2.
// Timers WEB-STANDARD cuyo callback NO corre durante el render server (existen
// en el edge baseline). `setImmediate` NO está aquí: es Node-only y se deniega
// (ver INTENTIONAL_DENY) — su call site mismo crashea en Edge.
const DEFERRED_LATER_FNS = new Set([
  "setTimeout",
  "setInterval",
  "queueMicrotask",
]);

/**
 * Devuelve el KIND de ejecución diferida de `fnNode` (ArrowFunction /
 * FunctionExpression / … colocado como callback de un sink reconocido):
 *   - "none"   → render path (su body corre durante el render server).
 *   - "client" → hook (useEffect…) / event handler — NO corre en SSR (corre tras
 *                hidratación en cliente). Eval-sinks aquí son safe (eval funciona
 *                post-hidratación) → exentos.
 *   - "timer"  → setTimeout/setInterval/queueMicrotask — su callback PUEDE
 *                disparar en el isolate Edge durante SSR. Un eval-sink ahí throw
 *                (code-gen deshabilitado) → NO exento; un read de global ausente
 *                (window) sí sigue exento (deferred).
 * Su body NO se invoca durante el render server (salvo "none").
 *
 * Sinks reconocidos:
 *   - JSX event handler: `<X onFoo={fn}>` con nombre matching /^on[A-Z]/.
 *   - CallExpression a hook diferido: `useEffect(fn, deps)`,
 *     `useCallback(fn, deps)`, etc. Soporta también `React.useEffect`
 *     (PropertyAccessExpression como callee).
 *   - CallExpression a timer diferido: `setTimeout(fn, ms)`, etc.
 *
 * NO reconoce IIFE (`(() => …)()`) — el fn está como callee, no como
 * argumento — esos siguen siendo render path. Tampoco reconoce
 * referencias indirectas (`const handler = () => …; <X onFoo={handler}>`):
 * en ese caso el body del arrow no está en posición sintáctica reconocida,
 * por tanto se chequea. El consumer debe inline-ar el arrow en el prop o
 * envolverlo en `useCallback`.
 *
 * Transparent wrappers (ParenthesizedExpression `(fn)`, JsxExpression
 * `{fn}`) se desenrollan para llegar al parent semántico.
 */
function isDeferredExecutionContext(fnNode, context) {
  let current = fnNode;
  let parent = current.parent;
  // Sube saltando wrappers RUNTIME-TRANSPARENTES entre el callback y su sink: parens,
  // JsxExpression, erased (`as`/`satisfies`/`!`/`<T>`), y los constructos VALUE-TRANSPARENTES
  // de los que el callback ES el valor (`cond ? cb : x`, `cond && cb`, `cb ?? x`, `(0, cb)`)
  // — `onClick={cond ? () => {…} : undefined}` pasa el arrow como handler del intrínseco
  // igual que `onClick={() => {…}}` (deepest re-hunt #173: handler en ternario). Reusa
  // valueTransparentChildren (el callback es una de sus hojas transparentes).
  while (
    parent &&
    (isErasedOuterExpr(parent) ||
      ts.isJsxExpression(parent) ||
      valueTransparentChildren(parent).includes(current))
  ) {
    current = parent;
    parent = parent.parent;
  }
  if (!parent) return "none";

  // (1) JSX event handler RESTRICTED a intrinsic HTML elements:
  // `<button onClick={fn}>`. Custom components `<MyComp onFoo={fn}>`
  // pueden invocar `onFoo` síncronamente durante render — NO son
  // deferred sinks. Distinción: tagName lowercase first char =
  // intrinsic (string element), uppercase / PropertyAccess / namespaced =
  // component reference. Codex round 16 P2.1.
  if (ts.isJsxAttribute(parent)) {
    const attrName = parent.name;
    if (ts.isIdentifier(attrName) && /^on[A-Z]/.test(attrName.text)) {
      const jsxAttributes = parent.parent;
      const jsxElement = jsxAttributes?.parent;
      if (
        jsxElement &&
        (ts.isJsxOpeningElement(jsxElement) ||
          ts.isJsxSelfClosingElement(jsxElement))
      ) {
        const tagName = jsxElement.tagName;
        if (ts.isIdentifier(tagName)) {
          // Intrínseco (host string `<button>`) ⟺ el tag empieza por LETRA MINÚSCULA
          // [a-z] — la regla REAL de React/esbuild (verificado): `<$Foo>`/`<_Foo>`/`<Upper>`
          // son COMPONENTES (esbuild emite `jsx($Foo,…)`), no strings. El check viejo
          // `first === first.toLowerCase()` tomaba `$`/`_` como "minúscula" → clasificaba
          // `$Panel`/`_Widget` como intrínsecos → eximía su handler, pero un componente
          // custom puede invocar `props.onClick()` SÍNCRONO en render → lee el global en SSR
          // = BYPASS (hunt final #173, 4 confirmados $/_-prefijo). Solo el intrínseco real
          // (lowercase letter) difiere el handler al evento del DOM post-render.
          if (/^[a-z]/.test(tagName.text)) {
            return "client";
          }
        }
      }
    }
  }

  // (2) Argumento de CallExpression a sink reconocido.
  if (ts.isCallExpression(parent)) {
    if (parent.expression === current) return "none";
    const isArg = parent.arguments.some((a) => a === current);
    if (!isArg) return "none";
    // El callee puede venir envuelto en wrappers RUNTIME-TRANSPARENTES igual que el
    // callback (L613): `(useEffect)(cb)`, `(useEffect as typeof useEffect)(cb)`,
    // `(setTimeout)(cb,0)`. Sin desenvolver, `ts.isIdentifier`/`isPropertyAccess`
    // daban false → calleeName=null → sink no reconocido → render-path → FP. Espejo
    // exacto del unwrap del callback (hunt final deferred-alias-spoof). Fail-closed:
    // un hook render-phase envuelto (`(React).useState(lazy)`) sigue flaggeándose.
    const callee = unwrapErased(parent.expression);
    let calleeName = null;
    let rootIdent = null;
    if (ts.isIdentifier(callee)) {
      calleeName = callee.text;
      rootIdent = callee.text;
    } else if (
      ts.isPropertyAccessExpression(callee) ||
      ts.isElementAccessExpression(callee)
    ) {
      // Soporte para `React.useEffect`, `React["useEffect"]`, `window.setTimeout`.
      // accessedMemberName resuelve punto Y bracket-string igual — antes solo se
      // reconocía la forma punto y `React["useEffect"]` se trataba como render-path
      // (FP, deep adversarial). Una key dinámica (`React[k]`) → undefined → no
      // reconocido (render-path), correcto: no es un hook conocido.
      calleeName = accessedMemberName(callee) ?? null;
      // Root identifier de la cadena para chequear shadow (punto o bracket).
      // Desenvolver erased en cada hop: `(React).useEffect`, `React!.useEffect`,
      // `(React satisfies typeof React).useEffect` → chain-root `React`. Antes el
      // walk solo atravesaba Property/ElementAccess y un wrapper intermedio cortaba
      // la cadena → rootIdent=null → no canónico → FP (hunt final).
      let chain = unwrapErased(callee.expression);
      while (
        ts.isPropertyAccessExpression(chain) ||
        ts.isElementAccessExpression(chain)
      ) {
        chain = unwrapErased(chain.expression);
      }
      if (ts.isIdentifier(chain)) rootIdent = chain.text;
    }
    if (calleeName !== null) {
      // Codex round 16 P2.2: si el root identifier del callee es un
      // NON-IMPORT local binding (shadow de un hook/timer real con un
      // function decl, var, let, const, parameter, etc.), NO es el
      // deferred sink — el local puede invocar el callback síncronamente
      // durante render.
      if (
        rootIdent !== null &&
        context.nonImportBindings.has(rootIdent)
      ) {
        return "none";
      }
      // Deferred React hook — resuelto por el EXPORT CANÓNICO de react, no el alias
      // local. `import { useState as useEffect }` (callee local "useEffect") resuelve
      // a "useState" → render-phase → NO deferred (deep adversarial bypass); la cara
      // inversa `import { useEffect as ue }` resuelve a "useEffect" → SÍ deferred (FP).
      // `React.useEffect`: el miembro YA es canónico si `React` viene de react.
      // Codex round 17 P1.1: solo cuenta si viene de "react" (un `import { useEffect }
      // from "./fake"` con impl síncrona NO se exime).
      let canonicalCallee = null;
      if (ts.isIdentifier(callee)) {
        const mapped = context.reactImports.named.get(calleeName);
        if (mapped !== undefined) canonicalCallee = mapped;
      } else if (
        rootIdent !== null &&
        context.reactImports.namespaces.has(rootIdent)
      ) {
        canonicalCallee = calleeName;
      }
      if (canonicalCallee !== null && DEFERRED_HOOKS.has(canonicalCallee)) {
        return "client";
      }
      if (DEFERRED_HOOKS.has(calleeName)) {
        // Nombre de hook diferido que NO resuelve a un export de react (alias-spoof
        // `useState as useEffect`, o un hook de un módulo no-react): el binding real
        // corre síncrono en render → NO diferido.
        return "none";
      }
      if (DEFERRED_LATER_FNS.has(calleeName)) {
        // Codex round 18 P1: solo exempt si el timer es el GLOBAL real
        // (no declarado en el archivo). `import { setTimeout } from
        // "./fake-helper"` con synchronous impl quedaba exempt aunque
        // el local sí invoca síncronamente. Los timers reales
        // (setTimeout, setInterval, setImmediate, queueMicrotask) son
        // globales de Node — no se declaran en el source — así que
        // `localBindings.has(rootIdent)` === false en uso legítimo.
        // Cualquier import o local-decl los marca como suspect.
        if (
          rootIdent === null ||
          context.localBindings.has(rootIdent)
        ) {
          return "none";
        }
        return "timer";
      }
    }
  }

  return "none";
}

function listSourceFiles(dir) {
  const result = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      result.push(...listSourceFiles(p));
    } else if (
      (p.endsWith(".tsx") || p.endsWith(".ts")) &&
      !p.endsWith(".test.tsx") &&
      !p.endsWith(".test.ts") &&
      !p.endsWith(".stories.tsx")
    ) {
      result.push(p);
    }
  }
  return result;
}

/**
 * Extrae recursivamente nombres de un BindingName (Identifier u
 * ObjectBindingPattern / ArrayBindingPattern) y los añade al Set.
 * Maneja destructure anidado y rest elements.
 */
/**
 * `true` si la declaración es AMBIENT (`declare const/let/var/function/class`,
 * o cualquier declaración dentro de un `declare global { … }`). Las ambient se
 * BORRAN al compilar — NO emiten binding runtime, así que NO sombrean el global
 * homónimo. Si se añadieran al shadow-set, una ref bare al nombre se trataría
 * como local y pasaría el gate, pero en runtime resuelve al global ambiente →
 * ReferenceError en SSR. Mismo eje que los imports type-only.
 *
 * Cubre el `declare` PROPIO (vía `getCombinedModifierFlags & Ambient`) Y el
 * ambient HEREDADO de un `declare global`/`declare module`/namespace ambient
 * (vía `node.flags & NodeFlags.Ambient`) — `getCombinedModifierFlags` NO
 * propaga el ambient heredado, por eso se chequean los dos. (En la práctica el
 * `declare global { var X }` ya queda fuera porque `collectVarHoistedRecursive`
 * no recursa en `ModuleDeclaration`; este chequeo es defensa-en-profundidad
 * frente a un refactor que añada recursión.) beta.27 BLOCKER-1 (codex P2
 * round 3 + workflow honest-construct).
 */
function isAmbientDeclaration(node) {
  return (
    (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Ambient) !== 0 ||
    (node.flags & ts.NodeFlags.Ambient) !== 0
  );
}

/**
 * ¿La lista de statements de un case/default-clause TERMINA el control de flujo
 * (no cae por fall-through al siguiente clause)? Conservador: solo el caso simple
 * en que el ÚLTIMO statement es return/break/continue/throw. Si no es obvio,
 * devuelve false → se trata como fall-through (no se narrowea → FP seguro, no
 * bypass). Usado por el narrowing de `switch (typeof X)`. deepest re-hunt #173.
 */
function caseClauseTerminates(statements) {
  if (!statements || statements.length === 0) return false;
  const last = statements[statements.length - 1];
  return (
    ts.isReturnStatement(last) ||
    ts.isBreakStatement(last) ||
    ts.isContinueStatement(last) ||
    ts.isThrowStatement(last)
  );
}

/**
 * ¿Un `namespace`/`module` está INSTANCIADO? — i.e. ¿el emit de RUNTIME produce
 * `var N;(IIFE)`? Si lo está, su nombre ES una sombra runtime legítima; si se
 * elide, una ref bare a `N` (= global ausente en Edge) resuelve al global real →
 * debe flaggearse.
 *
 * ORÁCULO = ESBUILD (el transformer de Vite), **NO** `ts.isInstantiatedModule`.
 * tsc NO emite el JS de runtime (`tsconfig.build.json` es `emitDeclarationOnly`);
 * el bundler es esbuild, que DIVERGE de `ts.isInstantiatedModule` en un caso REAL:
 * un namespace cuyo único miembro instanciante vive en un `namespace` AMBIENT
 * ANIDADO. `ts.isInstantiatedModule(_, true)` lo cuenta instanciado → el nombre
 * entra en localBindings → ref bare al global NO se flaggea, pero esbuild ELIDE
 * todo lo `declare` anidado → la ref filtra al global = **BYPASS** (deepest
 * re-hunt #173: `namespace document { export declare namespace I { const enum E } }`).
 * Ver `feedback_esbuild_emit_oracle`. Regla de esbuild VERIFICADA empíricamente
 * sobre 10 formas (test `esbuild-namespace-instantiation`):
 *
 *   INSTANCIA: miembro DIRECTO var/let/const/function/class/enum (declare o no),
 *              o `namespace` anidado NO-ambient que a su vez instancia.
 *   ELIDE:     `namespace` anidado AMBIENT (declare), interface/type/import-type, vacío.
 *
 * Nota clave: esbuild SÍ instancia por un value-member ambient TOP-LEVEL (`export
 * declare const z` → `var N`), pero NO por uno ambient ANIDADO — esa es la única
 * divergencia. Fail-closed: ante un statement no reconocido devolvemos `false`
 * (over-flag seguro, nunca bypass). beta.27 BLOCKER-1.
 */
function namespaceIsInstantiated(moduleDecl) {
  const body = moduleDecl.body;
  if (!body) return false;
  // `namespace X.Y { … }`: el body es otro ModuleDeclaration (forma dotted).
  if (ts.isModuleDeclaration(body)) {
    return isAmbientDeclaration(body) ? false : namespaceIsInstantiated(body);
  }
  if (!ts.isModuleBlock(body)) return false;
  return body.statements.some(esbuildInstantiatesViaStatement);
}

/** ¿El statement lleva el modificador `export`? (robusto a la API nueva/vieja de TS). */
function hasExportModifier(stmt) {
  const mods =
    ts.canHaveModifiers && ts.canHaveModifiers(stmt)
      ? ts.getModifiers(stmt)
      : stmt.modifiers;
  return !!mods && mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Un statement de cuerpo de namespace que hace que esbuild EMITA el shell `var N`.
 *
 * **UNDER-APPROXIMATION CONSERVADORA (fail-closed) — NO igualdad exacta con esbuild.**
 * La invariante de soundness es `true ⟹ esbuild-instancia` (si decimos instanciado, lo
 * está → el nombre es shadow runtime → eximir el read es seguro). El REVERSO no se cumple:
 * esto es un WHITELIST de productores de valor DECIDIBLES; un namespace instanciado SOLO
 * por un statement runtime-only (expression-statement `Q.z;`, control-flow `if(){}`) NO se
 * reconoce → devolvemos `false` → over-flag FAIL-CLOSED (codex P2 round-9, verificado: esos
 * casos divergen de esbuild pero 100% en la dirección segura). Cerrar ese FP exigiría
 * RECONOCER MÁS instanciación (default-true / blacklist) = la dirección FAIL-OPEN que abrió
 * los 17 bypasses (§184): un statement que añadiéramos y que esbuild ELIDA sería bypass. Se
 * mantiene el whitelist; el FP es contrivado (`namespace window { Q.z; }`, 0 en source real).
 *
 * REGLA REAL DE ESBUILD para el whitelist (medida empíricamente, deepest final hunt #173 —
 * NO la que asumía el código anterior). El error previo: tratar TODO value-producer (incl.
 * `declare` no-exportado y `import Q = N` value-dead) como instanciante. esbuild NO los emite
 * → un `namespace document { declare var x }` se ELIDE entero y `document.title` leía el
 * GLOBAL real con el gate exento = BYPASS (17 confirmados: window/document/navigator/…).
 *
 *   INSTANCIA: const/let/var/function/class/enum NO-ambient; o `declare` (ambient)
 *              PERO SOLO si va `export` (`export declare const z` re-exporta una
 *              propiedad → `var N`; un `declare const z` pelado es ambient puro →
 *              ELIDE); o `import Y = Z` que esbuild emite = value-USED o `export
 *              import`; o `namespace` anidado NO-ambient que a su vez instancia.
 *   ELIDE:     `declare …` no-exportado, `import Y = Z` value-dead no-exportado,
 *              `namespace` anidado ambient, interface/type/import-type, vacío.
 *
 * Para import-equals la value-use es binder-territory (parser-puro no la prueba
 * barato) → fail-closed: solo cuenta `export import` (la forma que esbuild SIEMPRE
 * emite). Un `import Q = N` no-exportado value-USED igual instancia el namespace
 * por SU statement de uso (`export const y = Q.z`), no por el import → no se pierde
 * ningún caso legítimo. Fail-closed: statement no reconocido → false (over-flag).
 */
function esbuildInstantiatesViaStatement(stmt) {
  // Productores de valor: const/let/var/function/class/enum. NO-ambient siempre
  // instancia; `declare` (ambient) solo si `export` (verificado contra esbuild).
  if (
    ts.isVariableStatement(stmt) ||
    ts.isFunctionDeclaration(stmt) ||
    ts.isClassDeclaration(stmt) ||
    ts.isEnumDeclaration(stmt)
  ) {
    return isAmbientDeclaration(stmt) ? hasExportModifier(stmt) : true;
  }
  // `import Y = Z`: esbuild instancia si la value-use ocurre, o si es `export import`
  // (re-export, siempre emitido). El `import` pelado value-dead se ELIDE (raíz de 5
  // bypasses) → fail-closed: solo `export import` de valor cuenta.
  if (ts.isImportEqualsDeclaration(stmt)) {
    return hasExportModifier(stmt) && !stmt.isTypeOnly;
  }
  // Namespace anidado: instancia SOLO si NO es ambient Y a su vez instancia. El
  // ambient anidado (`export declare namespace I { … }`) esbuild lo BORRA entero →
  // NO cuenta. El no-ambient anidado recurre.
  if (ts.isModuleDeclaration(stmt)) {
    return isAmbientDeclaration(stmt) ? false : namespaceIsInstantiated(stmt);
  }
  // interface, type alias, import-type, export-decl sin valor → no emite. Fail-closed.
  return false;
}

/**
 * Fail-closed: ¿la declaración EMITE un binding runtime (produce valor)?
 *
 * EL shadow-set solo debe añadir un nombre si su declaración PRUEBA que emite
 * valor. Si no, el nombre se BORRA al compilar y una ref bare resuelve al
 * global real → erased-shadow bypass. Históricamente esto se filtraba con un
 * DENYLIST disperso (`!isAmbientDeclaration` por sitio, `!isTypeOnly` en el
 * path import) y la misma raíz mordió tres veces: type-only import → `declare`
 * ambient → namespace type-only. Los productores de valor son un conjunto
 * ACOTADO y enumerable; los borrados son ABIERTOS. Este predicado whitelistea
 * el lado acotado — la única forma de cerrar la CLASE, no el caso. Lo consultan
 * todos los colectores que añaden nombres de declaración al shadow-set.
 *
 * SINTÁCTICO a propósito: el gate no tiene type-checker (usa createSourceFile),
 * y el primer emit del build es `tsc -p tsconfig.build.json`, cuya semántica de
 * elisión es exactamente la que se evalúa aquí.
 *
 * El trade es deliberado y consistente con el resto del gate: errar hacia FP
 * (omitir un productor de valor → flaggear código legítimo, corregible) NUNCA
 * hacia bypass (añadir un borrado → fallo silencioso en prod). Verificado 0-FP
 * contra los 39 marcados + el corpus honest-construct. beta.27 BLOCKER-1.
 */
function producesRuntimeValue(decl) {
  if (!decl || isAmbientDeclaration(decl)) return false;
  if (ts.isClassDeclaration(decl)) return true;
  if (ts.isEnumDeclaration(decl)) return true;
  if (ts.isFunctionDeclaration(decl)) return decl.body !== undefined;
  if (
    ts.isVariableDeclaration(decl) ||
    ts.isVariableStatement(decl) ||
    ts.isBindingElement(decl) ||
    ts.isParameter(decl)
  )
    return true;
  // `import X = …`: conservador `!isTypeOnly`. Resolver si el RHS es un miembro-TIPO
  // SAME-FILE (erased) exige reimplementar el binder de TS (merge / scope-léxico /
  // alias-chains / dotted / self-ref) — fuera del diseño parser-puro del gate. Ese
  // caso same-file queda como RESIDUAL honesto (ver ADR: "binder, no indecidibilidad
  // ni gratis"). El alias CROSS-MODULE ya era residual por la misma razón categórica.
  if (ts.isImportEqualsDeclaration(decl)) return !decl.isTypeOnly;
  if (ts.isModuleDeclaration(decl)) return namespaceIsInstantiated(decl);
  // interface, type alias, y todo lo demás type-space → NO produce valor.
  return false;
}

function addBindingNamesFromPattern(node, names) {
  if (!node) return;
  if (ts.isIdentifier(node)) {
    names.add(node.text);
    return;
  }
  if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
    for (const el of node.elements) {
      if (ts.isBindingElement(el)) {
        addBindingNamesFromPattern(el.name, names);
      }
    }
  }
}

/**
 * Nombres declarados BLOCK-LEXICAL en `statements` (const/let/class/function al nivel
 * del scope) — los que, por scope léxico/TDZ, SOMBREAN un binding outer homónimo para
 * TODO el scope (no solo tras su declaración). Usado para purgar `guardAliases` al ENTRAR
 * un scope (bloque o CaseBlock entero), cerrando el bypass de shadow-antes-de-declaración
 * (codex P2). `var` NO entra (es function-scoped, lo cubre el var-hoisting).
 */
function gatherBlockLexicalNames(statements) {
  const out = new Set();
  for (const stmt of statements) {
    if (ts.isVariableStatement(stmt)) {
      // const/let/using/await-using son block-scoped (TDZ); `var` es function-scoped
      // → NO aplica aquí. isBlockScopedDeclList cubre los 4 (codex P2: faltaba `using`).
      if (isBlockScopedDeclList(stmt.declarationList.flags)) {
        for (const d of stmt.declarationList.declarations) {
          addBindingNamesFromPattern(d.name, out);
        }
      }
    } else if (
      stmt.name &&
      ts.isIdentifier(stmt.name) &&
      (ts.isClassDeclaration(stmt) ||
        ts.isFunctionDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt) ||
        ts.isModuleDeclaration(stmt) ||
        ts.isImportEqualsDeclaration(stmt)) &&
      producesRuntimeValue(stmt)
    ) {
      // class/function/enum/namespace-instanciado/import-equals-de-valor crean un binding
      // de VALOR block-scoped que sombrea el alias. producesRuntimeValue excluye los que
      // NO crean valor (función sin cuerpo, namespace type-only, import-equals type-only)
      // → esos no sombrean el alias-de-valor, no se purgan (evita over-flag).
      out.add(stmt.name.text);
    }
  }
  return out;
}

/**
 * Nombres block-lexical de un scope que SOMBREAN un binding con un valor NO-react —
 * para PRE-CARGARLOS en nonImportBindings al ENTRAR el scope. Sin esto, una función
 * visitada ANTES de un `const useEffect = Sync.run` posterior resuelve `useEffect` al
 * hook react file-global y se exime, aunque léxicamente el call liga al const local
 * síncrono → BYPASS (codex P1 round-10, el gemelo del purge de guard-aliases). Igual
 * que `gatherBlockLexicalNames` PERO excluye los import-equals que aliasan react (esos
 * SÍ son hooks legítimos, FP14/15) — 2 pasadas: primero los no-import-equals (siempre
 * no-react), luego los import-equals contra el set ya acumulado (cierra la cadena
 * `import React = FakeReact; import useEffect = React.useEffect`).
 */
function gatherNonReactLexicalShadows(statements, reactImports, baseNonImport) {
  const shadows = new Set();
  for (const stmt of statements) {
    if (ts.isVariableStatement(stmt)) {
      if (isBlockScopedDeclList(stmt.declarationList.flags)) {
        for (const d of stmt.declarationList.declarations) {
          if (isAmbientDeclaration(d)) continue;
          // `const { useEffect } = React` aliasa hooks react → NO es shadow (mismo criterio
          // que extractPostStatementBindings; si entrara, la pre-carga flaggearía el hook).
          if (!variableInitAliasesReact(d, reactImports, baseNonImport)) {
            addBindingNamesFromPattern(d.name, shadows);
          }
        }
      }
    } else if (
      stmt.name &&
      ts.isIdentifier(stmt.name) &&
      (ts.isClassDeclaration(stmt) ||
        ts.isFunctionDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt) ||
        ts.isModuleDeclaration(stmt)) &&
      producesRuntimeValue(stmt)
    ) {
      shadows.add(stmt.name.text);
    }
  }
  for (const stmt of statements) {
    if (
      ts.isImportEqualsDeclaration(stmt) &&
      stmt.name &&
      ts.isIdentifier(stmt.name) &&
      producesRuntimeValue(stmt)
    ) {
      const prior = baseNonImport
        ? new Set([...baseNonImport, ...shadows])
        : shadows;
      if (!importEqualsAliasesReact(stmt, reactImports, prior)) {
        shadows.add(stmt.name.text);
      }
    }
  }
  return shadows;
}

/** Devuelve un context con `guardAliases` purgado de `names` (sombras léxicas). */
function purgeGuardAliasShadows(context, names) {
  if (!context.guardAliases || context.guardAliases.size === 0 || names.size === 0) {
    return context;
  }
  let purged = null;
  for (const n of names) {
    if (context.guardAliases.has(n)) {
      if (!purged) purged = new Map(context.guardAliases);
      purged.delete(n);
    }
  }
  return purged ? { ...context, guardAliases: purged } : context;
}

/**
 * Recolecta los nombres declarados a NIVEL DE MÓDULO (top-level): const/let/
 * var, function, class e imports — SIN recursar en cuerpos de función. Usado
 * SOLO para eximir tags JSX uppercase que son referencias a componentes del
 * módulo (importados / locales / forward-ref / mutuos — válidos en
 * render-time aunque el orden TDZ los deje "fuera de scope" en el punto
 * sintáctico de uso). Un global DOM como `HTMLElement` NO se declara → no se
 * exime → se flaggea.
 *
 * DISEÑO (consciente, no efecto colateral): el set es module-level ∪ (vía el
 * walker) localBindings. Cubre los casos legítimos —componente importado,
 * top-level forward/mutuo, y nested declarado-antes-de-uso (que ya está en
 * localBindings)— SIN sobre-eximir. Un nested forward-ref en el mismo scope
 * (`<Sub/>` antes de `const Sub=…`) es un error de runtime real (TDZ → React
 * lo ve undefined) y se flaggea correctamente. Module-level (no whole-file)
 * evita el FN de "nombre declarado en función A usado como tag en función B".
 * beta.27 BLOCKER-1 (codex P2: JSX uppercase tags bajo fail-closed).
 */
function gatherModuleDeclaredNames(sourceFile) {
  const names = new Set();
  for (const stmt of sourceFile.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (isAmbientDeclaration(decl)) continue; // declare const → no runtime
        addBindingNamesFromPattern(decl.name, names);
      }
    } else if (
      (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) &&
      stmt.name &&
      !isAmbientDeclaration(stmt)
    ) {
      names.add(stmt.name.text);
    } else if (ts.isImportDeclaration(stmt)) {
      addRuntimeImportBindings(stmt.importClause, names);
    }
  }
  return names;
}

/**
 * ¿La VariableDeclarationList es BLOCK-SCOPED (no var-hoisted)? `let`/`const` y
 * también `using`/`await using` (recursos explícitos, TS 5.2). using=4 (plano),
 * await-using=6 (incluye el bit Const). El `using` plano faltaba → se trataba como
 * var-hoisted y sombreaba un global homónimo en scope externo (re-hunt BYP4:
 * `{ using navigator = …; }` exime `navigator.userAgent` fuera del bloque).
 */
function isBlockScopedDeclList(flags) {
  return (
    (flags &
      (ts.NodeFlags.Let | ts.NodeFlags.Const | ts.NodeFlags.Using)) !==
    0
  );
}

/**
 * `var` declarations: hoisted al function/module scope. Recurre a
 * través de blocks anidados, if/else, try/catch, for/while bodies,
 * switch — pero NO en nested function-likes (otro scope).
 *
 * NO incluye `function` declarations: en strict ESM (todos los .ts/.tsx
 * de un DS) son block-scoped, NO function-hoisted. Codex round 13 P1.1.
 *
 * NO incluye `let`/`const`/`class`/`using`: block-scoped y order-aware (TDZ).
 * Codex round 13 P1.2; using en re-hunt BYP4.
 */
function collectVarHoistedRecursive(node, names) {
  if (
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    // class: un `var` en un static block / property initializer está scoped a ESE
    // bloque, NO al function/namespace scope envolvente (`class C { static { var
    // window } }` no hoista `window` fuera). No parar aquí preloadeaba ese var →
    // bypass de un global homónimo leído después. codex P2.
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    // namespace/module: sus `var` son scoped al módulo, NO al archivo — y un
    // `declare global { var X }` es AMBIENT (borrado, no emite binding). En
    // ninguno de los dos casos el `var` debe hoistarse al scope del archivo.
    // No recursar cierra el bypass del `declare global`. Codex P2 round 3.
    ts.isModuleDeclaration(node)
  ) {
    return;
  }
  // Chequear VariableDeclarationList directamente — cubre tanto
  // VariableStatement (`var x;`) como for-init (`for (var x = 0; ...)`,
  // `for (var x in obj)`, `for (var x of arr)`). Codex round 14 P2.1:
  // antes solo se chequeaba VariableStatement, los var en for-headers
  // pasaban sin hoist.
  if (ts.isVariableDeclarationList(node)) {
    const flags = node.flags;
    const blockScoped = isBlockScopedDeclList(flags);
    if (!blockScoped) {
      for (const decl of node.declarations) {
        if (isAmbientDeclaration(decl)) continue; // declare var / declare global
        addBindingNamesFromPattern(decl.name, names);
      }
    }
  }
  ts.forEachChild(node, (child) => collectVarHoistedRecursive(child, names));
}

/**
 * Bindings visibles desde scope-entry en el body de una function-like:
 *   - parameters
 *   - var declarations hoisted desde cualquier nested block (non-fn)
 *
 * NO incluye `function`/`class`/`let`/`const` del body — esos se manejan
 * order-aware al iterar las statements del body Block (round 13).
 */
function gatherFunctionVarHoisted(fnNode) {
  const names = new Set();
  if (fnNode.parameters) {
    for (const param of fnNode.parameters) {
      addBindingNamesFromPattern(param.name, names);
    }
  }
  if (fnNode.body) {
    ts.forEachChild(fnNode.body, (child) =>
      collectVarHoistedRecursive(child, names),
    );
  }
  return names;
}

/**
 * Function declarations IMMEDIATE en un Block. En strict ESM, son
 * block-scoped (no hoisted al function/module scope) pero SÍ están
 * inicializadas desde el inicio del block (no en TDZ). Por tanto se
 * pre-cargan al scope al entrar el block, ANTES de iterar statements.
 *
 * Aplica también al Block que ES el body de una function (allí el
 * function decl pre-load equivale a la regla normal "fn decls visibles
 * desde el inicio del fn body").
 */
function gatherBlockFunctionDeclarations(blockNode) {
  const names = new Set();
  if (!blockNode.statements) return names;
  for (const stmt of blockNode.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && !isAmbientDeclaration(stmt)) {
      names.add(stmt.name.text);
    }
  }
  return names;
}

/**
 * Function declarations IMMEDIATE en un SourceFile (module). Block-
 * scoped al module pero pre-initialized (mismo comportamiento que en
 * Block).
 */
function gatherSourceFileFunctionDeclarations(sourceFile) {
  const names = new Set();
  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && !isAmbientDeclaration(stmt)) {
      names.add(stmt.name.text);
    }
  }
  return names;
}

/**
 * Bindings introducidos POR un statement, que pasan a ser visibles
 * para los SIGUIENTES siblings en el mismo block (no antes).
 *
 *   - `let x = ...` / `const x = ...`: visible después de la declaración.
 *   - `class X {}`: visible después de la declaración (TDZ).
 *   - `var x = ...` / `function x() {}`: NO se incluyen aquí — ya están
 *     pre-cargados al inicio del scope (var-hoisted o fn-hoisted).
 *
 * Codex round 13 P1.2: `window.location; const window = ...;` el read
 * inicial es a global (TDZ throw, no shadow). Antes del refactor
 * los let/const se pre-cargaban a scope-entry, false-shadow-eando reads
 * anteriores.
 */
function extractPostStatementBindings(stmt, reactImports, priorNonImport) {
  // `all`: todos los bindings (para localBindings — sombrean globals). `nonImport`:
  // SOLO los locales NO-import (para nonImportBindings, que distingue un shadow local
  // de un hook real). `import X = …` es IMPORT-LIKE → va a `all` pero NO a `nonImport`
  // (si entrara, `import ue = React.useEffect; ue(cb)` se trataría como shadow local y
  // se flaggearía — regresión). Espejo de gatherModulePreloadedBindings.
  const all = new Set();
  const nonImport = new Set();
  if (ts.isVariableStatement(stmt)) {
    const flags = stmt.declarationList.flags;
    const blockScoped = isBlockScopedDeclList(flags);
    if (blockScoped) {
      for (const decl of stmt.declarationList.declarations) {
        if (isAmbientDeclaration(decl)) continue; // declare const/let → erased
        addBindingNamesFromPattern(decl.name, all);
        // `const { useEffect } = React` aliasa hooks react genuinos → NO es shadow local
        // (si entrara en nonImport, el deferred-hook shadow-guard flaggearía el hook). El
        // `const { useEffect } = Sync` (no-react) SÍ es shadow. Espejo de import-equals.
        if (!variableInitAliasesReact(decl, reactImports, priorNonImport)) {
          addBindingNamesFromPattern(decl.name, nonImport);
        }
      }
    }
  } else if (
    (ts.isClassDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt) ||
      ts.isModuleDeclaration(stmt) ||
      ts.isImportEqualsDeclaration(stmt)) &&
    stmt.name &&
    ts.isIdentifier(stmt.name) &&
    // `class`/`enum` emiten binding; `namespace` SOLO si está instanciado (≥1
    // miembro de valor); `import X = N.Y` (import-equals) es un alias de VALOR
    // local si el RHS produce valor (`!isTypeOnly`). Un namespace type-only/vacío
    // o un import-equals type-only se elide → NO sombra. `producesRuntimeValue`
    // cierra la CLASE (fail-closed). beta.27 BLOCKER-1 + codex P2 (import-equals en
    // cuerpo de namespace).
    producesRuntimeValue(stmt)
  ) {
    all.add(stmt.name.text);
    if (!ts.isImportEqualsDeclaration(stmt)) {
      nonImport.add(stmt.name.text);
    } else if (!importEqualsAliasesReact(stmt, reactImports, priorNonImport)) {
      // Un import-equals es import-like (exempt como hook) SOLO si aliasa REACT
      // (`import ue = React.useEffect` → FP14/15). Un alias a un valor NO-react
      // (`import useEffect = Sync.run`, `import React = FakeReact`) SOMBREA el nombre
      // localmente —incluido un nombre de hook diferido— con una función que puede
      // correr SÍNCRONA en render → debe ir a nonImport para que el shadow-guard de
      // isDeferredExecutionContext (L700) dispare y lo flaggee. Sin esto, el check
      // canónico file-global trataba `useEffect = Sync.run` como el hook react diferido
      // y eximía el read del global = BYPASS (hunt final #173, deferred import-equals).
      nonImport.add(stmt.name.text);
    }
  }
  return { all, nonImport };
}

/**
 * ¿Un `import X = Y(.Z…)` aliasa REACT? — i.e. su RHS root identifier es un namespace
 * de react reconocido (`reactImports.namespaces`: `import React` / `import * as React`
 * / un alias resuelto) Y NO está SOMBREADO localmente por un binding no-react.
 * `import ue = React.useEffect` → root `React` ∈ namespaces, no sombreado → SÍ (hook
 * legítimo, exempt). `import useEffect = Sync.run` → root `Sync` ∉ namespaces → NO.
 *
 * **El check de shadow es load-bearing (codex P1):** `reactImports.namespaces` es
 * FILE-GLOBAL. Dentro de un namespace, `import React = FakeReact` sombrea `React` con un
 * namespace no-react; un `import useEffect = React.useEffect` posterior tendría root
 * `React` ∈ namespaces file-global → SE clasificaría como alias react aunque `React.*`
 * sea ahora `FakeReact.*` (síncrono) = BYPASS. Por eso exigimos que el root NO esté en
 * `priorNonImport` (los shadows no-react acumulados ANTES de esta statement — el propio
 * `import React = FakeReact` ya entró ahí por esta misma regla). Scope-aware, no file-global.
 */
function importEqualsAliasesReact(stmt, reactImports, priorNonImport) {
  if (!reactImports || !ts.isImportEqualsDeclaration(stmt)) return false;
  let ref = stmt.moduleReference;
  if (!ref || ts.isExternalModuleReference(ref)) return false; // import X = require(...)
  while (ts.isQualifiedName(ref)) ref = ref.left;
  if (!ts.isIdentifier(ref)) return false;
  if (priorNonImport && priorNonImport.has(ref.text)) return false; // root sombreado no-react
  return reactImports.namespaces.has(ref.text);
}

/**
 * ¿Una `VariableDeclaration` aliasa REACT? — `const { useEffect } = React`, `const R = React`,
 * `const ue = React.useEffect`: el root del initializer es un namespace react reconocido Y no
 * está sombreado localmente. Espejo de `importEqualsAliasesReact` para destructuring/alias por
 * `const`/`let` — sin esto los nombres destructurados de hooks react genuinos entraban en
 * nonImportBindings y el deferred-hook shadow-guard FLAGGEABA un hook diferido legítimo (hunt
 * scope-aware: 7 FP_REGRESSION de `const { useEffect } = React`, over-flag fail-closed). El
 * control `const { useEffect } = Sync` (root no-react) NO aliasa → sigue siendo shadow → flagea.
 */
function variableInitAliasesReact(decl, reactImports, priorNonImport) {
  if (!reactImports || !ts.isVariableDeclaration(decl) || !decl.initializer) return false;
  const init = unwrapErased(decl.initializer);
  // `const useEffect = reactUseEffect` — alias de un NAMED react import (no namespace).
  if (ts.isIdentifier(init) && reactImports.named.has(init.text)) {
    return !(priorNonImport && priorNonImport.has(init.text));
  }
  let root = init;
  while (
    ts.isPropertyAccessExpression(root) ||
    ts.isElementAccessExpression(root)
  ) {
    root = unwrapErased(root.expression);
  }
  if (!ts.isIdentifier(root)) return false;
  if (priorNonImport && priorNonImport.has(root.text)) return false; // root sombreado no-react
  return reactImports.namespaces.has(root.text);
}

/**
 * Set de nombres importados específicamente de `"react"`. Codex round
 * 17 P1.1: los DEFERRED_HOOKS (`useEffect`, `useLayoutEffect`,
 * `useInsertionEffect`) son hooks de React con semántica garantizada
 * (callback corre POST-render client-only, nunca en SSR). Pero si el
 * consumer importa un name con el mismo string desde OTRO módulo
 * (`import { useEffect } from "./fake-helper"` con synchronous impl),
 * la garantía se rompe.
 *
 * Solo aceptar como deferred sink si el binding viene de `"react"`.
 * Otros módulos (preact, frameworks alt, mocks/helpers locales) no
 * exempt.
 */
/**
 * Añade a `names` los bindings RUNTIME de un import clause, SALTANDO los
 * type-only. CRÍTICO: un `import type { X }` o `import { type X }` se BORRA al
 * compilar — NO crea un binding en runtime, así que NO sombrea el global
 * ambiente `X`. Si se añadiera al shadow-set, una ref bare a `X` se trataría
 * como local y pasaría el gate, pero en runtime resuelve al global real →
 * ReferenceError en SSR. Centralizar el filtro aquí evita que el bypass
 * recurra en cada colector. `isImportPurelyTypeOnly` ya existía para el path
 * de smuggling; este lo cablea también al path de shadow.
 * beta.27 BLOCKER-1 (workflow: erased-shadow bypass).
 */
function addRuntimeImportBindings(importClause, names) {
  if (!importClause || importClause.isTypeOnly) return;
  if (importClause.name) names.add(importClause.name.text);
  const nb = importClause.namedBindings;
  if (!nb) return;
  if (ts.isNamespaceImport(nb)) {
    names.add(nb.name.text);
  } else if (ts.isNamedImports(nb)) {
    for (const spec of nb.elements) {
      if (!spec.isTypeOnly) names.add(spec.name.text);
    }
  }
}

/**
 * Imports de "react", resueltos por su EXPORT CANÓNICO (no el binding local). Un
 * deferred-hook se reconoce por el nombre que EXPORTA react, no por el alias local:
 * `import { useState as useEffect }` tiene binding local "useEffect" ∈ DEFERRED_HOOKS
 * pero su export es "useState" (render-phase, su lazy-init corre en SSR) → NO deferred
 * (deep adversarial: alias-spoof bypass). Devuelve { named, namespaces }:
 *   named: Map<localName, exportName> de named imports (`useEffect`→`useEffect`,
 *          `useEffect`(alias de useState)→`useState`).
 *   namespaces: Set<localName> de default (`import React`) + `import * as React`,
 *          cuyos miembros `React.useEffect` YA son el nombre canónico.
 */
function gatherReactImports(sourceFile) {
  const named = new Map();
  const namespaces = new Set();
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== "react") continue;
    const clause = stmt.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name) namespaces.add(clause.name.text); // default import: React
    const nb = clause.namedBindings;
    if (!nb) continue;
    if (ts.isNamespaceImport(nb)) {
      namespaces.add(nb.name.text); // import * as React
    } else if (ts.isNamedImports(nb)) {
      for (const spec of nb.elements) {
        if (spec.isTypeOnly) continue;
        const exportName = spec.propertyName ? spec.propertyName.text : spec.name.text;
        // `import { default as React }` ≡ `import React` — el export `default` de react
        // ES el objeto-namespace (React.useEffect…). Va a namespaces, no a named (codex
        // P2: si no, React.useEffect no se reconoce → FP).
        if (exportName === "default") {
          namespaces.add(spec.name.text);
        } else {
          named.set(spec.name.text, exportName);
        }
      }
    }
  }
  // import-equals que aliasan react: `import R = React` (R es namespace si React lo es),
  // `import ue = React.useEffect` (ue→"useEffect" si React es namespace). Fixpoint para
  // cadenas (`import R = React; import ue = R.useEffect`). Sound: solo resuelve contra
  // react YA reconocido; un alias-spoof `import ue = React.useState` mapea al canónico
  // "useState" (render-phase → NO deferred). deepest re-hunt #173 (import-alias).
  // Recoge import-equals + var-statements de TODO el árbol (no solo top-level): un alias
  // react en cuerpo de función/namespace (`function C(){ const {useEffect}=React }`,
  // `namespace P { import R = React; R.useEffect(…) }`) también debe reconocerse — si no, el
  // hook react se trata como render-phase = FP (hunt scope-aware, 3 FP residuales). File-global
  // es SOUND para la EXENCIÓN: un shadow SYNC homónimo en otro scope (`const useEffect = Sync.run`)
  // se flaggea igual porque el shadow-guard scope-aware de nonImportBindings (L707) corre ANTES
  // que el check canónico react (L715), y ese local entra en nonImportBindings de SU scope.
  const aliasStmts = [];
  const collectAlias = (node) => {
    node.forEachChild((child) => {
      if (ts.isImportEqualsDeclaration(child) || ts.isVariableStatement(child)) {
        aliasStmts.push(child);
      }
      collectAlias(child);
    });
  };
  collectAlias(sourceFile);
  let changed = true;
  while (changed) {
    changed = false;
    for (const stmt of aliasStmts) {
      if (ts.isImportEqualsDeclaration(stmt) && !stmt.isTypeOnly) {
        const ref = stmt.moduleReference;
        const local = stmt.name.text;
        if (ts.isIdentifier(ref)) {
          if (namespaces.has(ref.text) && !namespaces.has(local)) {
            namespaces.add(local);
            changed = true;
          }
        } else if (ts.isQualifiedName(ref) && ts.isIdentifier(ref.left)) {
          if (
            namespaces.has(ref.left.text) &&
            named.get(local) !== ref.right.text
          ) {
            named.set(local, ref.right.text);
            changed = true;
          }
        }
      } else if (ts.isVariableStatement(stmt)) {
        // Alias por `const`/`let` de un namespace react: `const R = React` (namespace),
        // `const ue = React.useEffect` (named), `const { useEffect, useState: us } = React`
        // (destructuring). Mismo rol que el import-equals para el deferred-hook canónico →
        // un hook react destructurado NO se trata como render-phase (cierra 7 FP). Fixpoint
        // resuelve cadenas (`const R = React; const { ue } = R`). Top-level: gatherReactImports
        // solo procesa sourceFile.statements; un destructure react en namespace queda fail-closed.
        for (const d of stmt.declarationList.declarations) {
          if (!d.initializer) continue;
          const init = unwrapErased(d.initializer);
          // `const useEffect = reactUseEffect` — alias de un NAMED react import (no namespace):
          // hereda el canónico. (`import { useEffect as reactUseEffect } from "react"; const
          // useEffect = reactUseEffect; useEffect(cb)` — FP del hunt scope-aware.)
          if (
            ts.isIdentifier(d.name) &&
            ts.isIdentifier(init) &&
            named.has(init.text)
          ) {
            const canon = named.get(init.text);
            if (named.get(d.name.text) !== canon) {
              named.set(d.name.text, canon);
              changed = true;
            }
            continue;
          }
          let root = init;
          while (
            ts.isPropertyAccessExpression(root) ||
            ts.isElementAccessExpression(root)
          ) {
            root = unwrapErased(root.expression);
          }
          if (!ts.isIdentifier(root) || !namespaces.has(root.text)) continue;
          if (ts.isIdentifier(d.name) && init === root) {
            if (!namespaces.has(d.name.text)) {
              namespaces.add(d.name.text);
              changed = true;
            }
          } else if (
            ts.isIdentifier(d.name) &&
            ts.isPropertyAccessExpression(init) &&
            ts.isIdentifier(init.name)
          ) {
            if (named.get(d.name.text) !== init.name.text) {
              named.set(d.name.text, init.name.text);
              changed = true;
            }
          } else if (ts.isObjectBindingPattern(d.name) && init === root) {
            for (const el of d.name.elements) {
              if (!ts.isBindingElement(el) || !ts.isIdentifier(el.name)) continue;
              const localName = el.name.text;
              const prop =
                el.propertyName && ts.isIdentifier(el.propertyName)
                  ? el.propertyName.text
                  : localName;
              if (named.get(localName) !== prop) {
                named.set(localName, prop);
                changed = true;
              }
            }
          }
        }
      }
    }
  }
  return { named, namespaces };
}

/**
 * Imports + top-level var (NO let/const/class — esos son order-aware).
 * Pre-loaded al iniciar la traversal del SourceFile.
 *
 * Para `var` usa `collectVarHoistedRecursive`, que cubre `var` anidados
 * en for-headers top-level (`for (var x = 0; ...)`) y otros constructs
 * que envuelven var declarations.
 *
 * Devuelve `{ all, nonImports }`: dos Sets paralelos. `all` incluye
 * imports + var; `nonImports` solo var. Esto permite distinguir entre
 * `import { useEffect } from "react"; useEffect(cb)` (legítimo, exempt
 * como deferred sink) y `function useEffect(cb) { cb(); }; useEffect(cb)`
 * (shadow local, no es el hook real — codex round 16 P2.2).
 */
function gatherModulePreloadedBindings(sourceFile) {
  const all = new Set();
  const nonImports = new Set();
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      addRuntimeImportBindings(stmt.importClause, all);
      continue;
    }
    // `enum E {}` / `namespace NS {}` value-producing a nivel de módulo: su
    // binding es referenciable desde cualquier render body (inicializado en
    // module-eval). `enum` emite; `namespace` SOLO si está instanciado — un
    // namespace type-only/vacío se elide y NO debe sombrear (mismo predicado
    // central que extractPostStatementBindings). beta.27 BLOCKER-1.
    if (
      (ts.isEnumDeclaration(stmt) || ts.isModuleDeclaration(stmt)) &&
      stmt.name &&
      ts.isIdentifier(stmt.name) &&
      producesRuntimeValue(stmt)
    ) {
      all.add(stmt.name.text);
      continue;
    }
    // `import X = NS.Y` / `import X = require("y")` (TS import-equals): emite un
    // binding runtime `X` SOLO si el RHS produce valor — un alias a un miembro-TIPO
    // same-file se borra y NO debe sombrear (mismo predicado central; re-hunt B4).
    if (ts.isImportEqualsDeclaration(stmt) && producesRuntimeValue(stmt)) {
      all.add(stmt.name.text);
      continue;
    }
    const captured = new Set();
    collectVarHoistedRecursive(stmt, captured);
    for (const n of captured) {
      all.add(n);
      nonImports.add(n);
    }
  }
  return { all, nonImports };
}

/**
 * Clasifica un typeof-guard de EXISTENCIA: `{ name, presentWhenTrue }` o null.
 * `presentWhenTrue` = el identificador está DEFINIDO cuando la expresión es true
 * (positivo) o cuando es false (negativo). Único predicado para todas las formas de
 * comparación + negación (re-hunt F1/F2). Soundness de existencia:
 *   typeof X !== "undefined"        → present cuando TRUE   (positivo)
 *   typeof X === "undefined"        → present cuando FALSE  (negativo)
 *   typeof X === S  (S≠"undefined") → present cuando TRUE   (si fuera undefined no sería S)
 *   typeof X !== S  (S≠"undefined") → present cuando FALSE  (false ⇒ typeof===S≠undefined)
 *   !(expr)                         → invierte presentWhenTrue
 * Acepta `==`/`!=` (typeof siempre da string). MANTIENE las exclusiones SAFE (irrelevante)
 * y NON_ABSENCE_DENIALS (un guard sobre eval/Function/globalThis/global/self/setImmediate
 * es vacuo en Edge → reconocerlo suprimiría la detección — load-bearing, no tocar).
 */
function classifyTypeofGuard(expr, guardAliases) {
  // Desenvolver wrappers RUNTIME-TRANSPARENTES de TODA la expresión-guard:
  // `(G)`, `(G) as boolean`, `(G)!`, `(G satisfies …)`, `<T>(G)` narrowean
  // idéntico a G en runtime (el cast se borra). Antes solo se desenvolvía el
  // paréntesis → `(typeof window !== "undefined") as boolean` no se reconocía
  // (FP, asimetría con el unwrap de operandos en L1251/1258). isErasedOuterExpr
  // NO incluye el `!` LÓGICO (PrefixUnary) — ese SÍ flipea presentWhenTrue y se
  // maneja justo debajo; solo el `!` NonNull (postfijo) es erased.
  expr = unwrapErased(expr);
  if (
    ts.isPrefixUnaryExpression(expr) &&
    expr.operator === ts.SyntaxKind.ExclamationToken
  ) {
    const inner = classifyTypeofGuard(expr.operand, guardAliases);
    return inner ? { name: inner.name, presentWhenTrue: !inner.presentWhenTrue } : null;
  }
  // Alias booleano de un guard: `const has = typeof X !== "undefined"; … has ? X : …`.
  // guardAliases mapea el nombre del const (SOLO const, inmutable) a la clasificación
  // de su initializer; se construye en visitOrderedStatements y solo contiene guards
  // REALES (NON_ABSENCE_DENIALS/SAFE ya excluidos al clasificar el initializer).
  // deepest re-hunt #173 (boolean-alias-typeof-guard).
  if (guardAliases && ts.isIdentifier(expr) && guardAliases.has(expr.text)) {
    return guardAliases.get(expr.text);
  }
  if (!ts.isBinaryExpression(expr)) return null;
  const op = expr.operatorToken.kind;
  const isEq =
    op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
    op === ts.SyntaxKind.EqualsEqualsToken;
  const isNeq =
    op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
    op === ts.SyntaxKind.ExclamationEqualsToken;
  if (!isEq && !isNeq) return null;
  for (const cand of [
    { typeofExpr: expr.left, stringExpr: expr.right },
    { typeofExpr: expr.right, stringExpr: expr.left },
  ]) {
    // Ambos lados pueden venir en wrappers erased: `(typeof window) !== ("undefined")`,
    // `(typeof window as string) !== …` ≡ `typeof window !== …` (runtime-transparente,
    // tsc lo narrowea). Desenvolver antes del check (deep adversarial FP).
    let typeofExpr = cand.typeofExpr;
    while (typeofExpr && isErasedOuterExpr(typeofExpr)) typeofExpr = typeofExpr.expression;
    let stringExpr = cand.stringExpr;
    while (stringExpr && isErasedOuterExpr(stringExpr)) stringExpr = stringExpr.expression;
    if (!ts.isTypeOfExpression(typeofExpr)) continue;
    // El operando puede venir en wrappers runtime-transparentes: `typeof (window)`,
    // `typeof (window as any)` ≡ `typeof window` (re-hunt FP paren-operand).
    let operand = typeofExpr.expression;
    while (operand && isErasedOuterExpr(operand)) operand = operand.expression;
    if (!ts.isIdentifier(operand)) continue;
    if (SAFE_GLOBALS.has(operand.text)) continue;
    if (NON_ABSENCE_DENIALS.has(operand.text)) continue;
    // El lado string puede ser StringLiteral, template SIN sustitución (`` `undefined` ``)
    // O template CON sustituciones CONSTANTES (`` `${"undefined"}` `` → "undefined"):
    // runtime-idénticos. foldConstString los folda todos (deepest re-hunt #173:
    // typeof-guard-template-substitution). Un template con sustitución dinámica → undefined.
    const stringValue = foldConstString(stringExpr);
    if (stringValue === undefined) continue;
    const isUndefined = stringValue === "undefined";
    // undefined: presente cuando !==; otro tipo: presente cuando ===.
    const presentWhenTrue = isUndefined ? isNeq : isEq;
    return { name: operand.text, presentWhenTrue };
  }
  return null;
}

/** Nombre con guard que prueba PRESENCIA cuando la expresión es TRUE (positivo), o null. */
function extractPositiveTypeofGuard(expr, guardAliases) {
  const c = classifyTypeofGuard(expr, guardAliases);
  return c && c.presentWhenTrue ? c.name : null;
}

/** Nombre con guard que prueba PRESENCIA cuando la expresión es FALSE (negativo), o null. */
function extractNegativeTypeofGuard(expr, guardAliases) {
  const c = classifyTypeofGuard(expr, guardAliases);
  return c && !c.presentWhenTrue ? c.name : null;
}

/**
 * Nombres con typeof-guard POSITIVO garantizados definidos a la DERECHA de un `&&`
 * (y en el whenTrue de un ternario): `typeof a !== "undefined" && typeof b !==
 * "undefined" && <aquí>`. Chain-aware (recurre por `&&`/parens). CONSERVADOR: NO
 * recurre por `||` — `(typeof a !== "undefined" || foo) && <aquí>` NO garantiza `a`.
 * Sobre-añadir un guard suprimiría un read real (bypass), por eso solo lo PROVADO.
 * Reusa `extractPositiveTypeofGuard` (mismo predicado que el if-guard, hereda la
 * exclusión SAFE + NON_ABSENCE_DENIALS). beta.27 BLOCKER-1 (re-hunt: guard por expr).
 */
function collectConjunctionGuards(expr, out, guardAliases) {
  const g = extractPositiveTypeofGuard(expr, guardAliases);
  if (g !== null) {
    out.add(g);
    return;
  }
  if (ts.isParenthesizedExpression(expr)) {
    collectConjunctionGuards(expr.expression, out, guardAliases);
    return;
  }
  if (
    ts.isBinaryExpression(expr) &&
    expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  ) {
    collectConjunctionGuards(expr.left, out, guardAliases);
    collectConjunctionGuards(expr.right, out, guardAliases);
  }
}

/**
 * Análogo para `||` con guards NEGATIVOS (y el whenFalse de un ternario): a la
 * derecha de `typeof a === "undefined" || typeof b === "undefined" || <aquí>`,
 * todos los a/b están definidos (la disyunción es falsa). Chain-aware por `||`.
 */
function collectDisjunctionGuards(expr, out, guardAliases) {
  const g = extractNegativeTypeofGuard(expr, guardAliases);
  if (g !== null) {
    out.add(g);
    return;
  }
  if (ts.isParenthesizedExpression(expr)) {
    collectDisjunctionGuards(expr.expression, out, guardAliases);
    return;
  }
  if (
    ts.isBinaryExpression(expr) &&
    expr.operatorToken.kind === ts.SyntaxKind.BarBarToken
  ) {
    collectDisjunctionGuards(expr.left, out, guardAliases);
    collectDisjunctionGuards(expr.right, out, guardAliases);
  }
}

/**
 * Si `stmt` es `const X = <typeof-guard>` (UN solo declarator, nombre identificador,
 * inicializador clasificable como guard de existencia), devuelve `[X, classification]`
 * para registrarlo como alias booleano del guard; si no, null. SOLO `const` (inmutable
 * — un `let`/`var` reasignable haría el alias unsound → bypass). El initializer se
 * clasifica con el guardAliases vigente (permite `const b = a` si `a` ya es alias).
 * deepest re-hunt #173 (boolean-alias-typeof-guard).
 */
function extractConstGuardAlias(stmt, guardAliases) {
  if (!ts.isVariableStatement(stmt)) return null;
  const list = stmt.declarationList;
  if ((list.flags & ts.NodeFlags.Const) === 0) return null;
  if (list.declarations.length !== 1) return null;
  const decl = list.declarations[0];
  if (!ts.isIdentifier(decl.name) || !decl.initializer) return null;
  const c = classifyTypeofGuard(decl.initializer, guardAliases);
  return c ? [decl.name.text, c] : null;
}

/**
 * `true` si `stmt` completa SIEMPRE de forma abrupta (return/throw/break/
 * continue), de modo que el control NO cae a los statements posteriores. Para
 * un Block, mira el último statement (simplificación conservadora: no analiza
 * todos los paths, pero el caso idiomático `{ return null; }` se cubre).
 */
function statementAlwaysExits(stmt) {
  if (!stmt) return false;
  if (
    ts.isReturnStatement(stmt) ||
    ts.isThrowStatement(stmt) ||
    ts.isBreakStatement(stmt) ||
    ts.isContinueStatement(stmt)
  ) {
    return true;
  }
  if (ts.isBlock(stmt) && stmt.statements.length > 0) {
    return statementAlwaysExits(stmt.statements[stmt.statements.length - 1]);
  }
  // if/else donde AMBAS ramas salen siempre → el control no cae (re-hunt FP6).
  if (ts.isIfStatement(stmt) && stmt.elseStatement) {
    return (
      statementAlwaysExits(stmt.thenStatement) &&
      statementAlwaysExits(stmt.elseStatement)
    );
  }
  return false;
}

/**
 * Narrowing por EARLY-RETURN: `if (typeof X === "undefined") return null;`
 * (sin else, then-branch que sale abrupto) implica que TRAS el `if`, X existe
 * → acceso a X es safe en los statements posteriores del mismo bloque. Es el
 * idioma React/SSR dominante (equivalente al narrowing de TS/ESLint). Devuelve
 * el nombre guardado o null. beta.27 BLOCKER-1 (workflow honest-construct).
 */
function extractNegativeEarlyReturnGuards(stmt, guardAliases) {
  if (!ts.isIfStatement(stmt) || stmt.elseStatement) return new Set();
  // `||` de guards negativos: `if (typeof a === "undefined" || typeof b ===
  // "undefined") return` → tras el return AMBOS están definidos (la disyunción
  // es falsa) (re-hunt FP5). Reusa collectDisjunctionGuards (chain-aware).
  // guardAliases hila el alias booleano (`const noWin = typeof X === "undefined";
  // if (noWin) return; X`) — antes faltaba aquí → FP (codex P2, 3ª ronda).
  const names = new Set();
  collectDisjunctionGuards(stmt.expression, names, guardAliases);
  if (names.size === 0) return names;
  if (!statementAlwaysExits(stmt.thenStatement)) return new Set();
  return names;
}

/**
 * Devuelve `true` si `node` (Identifier) está en una posición sintáctica
 * que NO es una referencia de valor en runtime. En esas posiciones, leer
 * un client global no causa ReferenceError porque el binding no se lee:
 * es metadata (property names, declaration names, JSX attribute names,
 * JSX tag names lowercase, TS type positions) o está short-circuited
 * por `typeof`.
 *
 * Codex round 11 P1.2 (bare-ident reads): `const w = window`,
 * `if (document)`, `f(navigator)` SÍ son refs runtime y lanzan
 * ReferenceError en SSR. El walker debe flag-earlos. Pero
 * `obj.window`, `function fn(window) {}`, `typeof window` NO leen el
 * binding global — son safe.
 */
/**
 * `true` si `node` es un member access cuyo nombre accedido es
 * `constructor` — property access (`x.constructor`) o element access con
 * string literal (`x["constructor"]`). Usado para cazar el escape al
 * Function constructor (`x.constructor.constructor("code")()`,
 * `f.constructor("code")`) cuando la base NO es un identificador denegado.
 * beta.27 BLOCKER-1 (cruce A+B, FN-hunt).
 */
/**
 * Nombre del miembro accedido, sea punto (`x.foo` → "foo") o bracket con string
 * literal (`x["foo"]` → "foo"). `undefined` si no es member access o la key no es
 * un string literal (computed dinámico). Unifica ambas formas para que ningún
 * check de nombre de método tenga asimetría punto-vs-bracket (codex P2: el
 * eval-sink escapaba por `x.constructor["call"]`). beta.27 BLOCKER-1.
 */
function accessedMemberName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node)) {
    // La key se resuelve por las MISMAS hojas value-transparentes que la base
    // (`valueTransparentLeaves`) — no solo coma/erased: `x.constructor[1 && "call"]`
    // reduce su key a "call" igual que `(0,"call")`. Antes la key solo desenvolvía
    // erased+coma mientras la base seguía &&/||/??/ternario → asimetría base-vs-key
    // por la que escapaba `({})["constructor"][1 && "constructor"](…)` (re-hunt B1).
    // Fail-closed: si ALGUNA hoja es un nombre weaponizable, ese gana (la key PUEDE
    // resolverse a él aunque otra rama no). Una key `[k]` (variable) es su propia hoja
    // no-literal → undefined → residual data-flow (#3); `[k || "x"]` con "x" benigno
    // tampoco da weaponizable → sigue residual.
    const leaves = valueTransparentLeaves(node.argumentExpression);
    // foldConstString resuelve SOLO un string-literal único por hoja (frontera
    // token-unidad-vs-ensamblado, §141): `["constructor"]`, `` [`constructor`] `` y los
    // wrappers value-transparentes (`[1 && "constructor"]`, `[(0,"constructor")]`) se cazan;
    // CUALQUIER key ENSAMBLADA (`["construc"+"tor"]`, `` [`cons${"tructor"}`] ``,
    // `[String.fromCharCode(…)]`, `[k]` variable) → undefined → residual por diseño.
    const literals = leaves
      .map(foldConstString)
      .filter((s) => s !== undefined);
    const weaponizable = literals.find(
      (t) => t === "constructor" || t === "call" || t === "apply" || t === "bind",
    );
    if (weaponizable !== undefined) return weaponizable;
    // Forma simple `x["foo"]` (hoja única literal) → ese nombre.
    if (leaves.length === 1 && literals.length === 1) return literals[0];
  }
  return undefined;
}

/**
 * Valor string CONSTANTE de un nodo si es foldeable en compile-time: StringLiteral,
 * NoSubstitutionTemplate, o TemplateExpression cuyas sustituciones son TODAS strings
 * constantes (recursivo). Desenvuelve wrappers erased. `` `cal${"l"}` `` → "call".
 * Cierra el bypass eval-sink por template-substitution en el selector — el gate ya
 * cazaba `["call"]`, `` [`call`] ``, `[(0,"call")]`; solo la sustitución escapaba
 * `valueTransparentLeaves` (deepest re-hunt #173). undefined si alguna parte NO es
 * constante (→ residual data-flow, como `[k]`).
 */
function foldConstString(node) {
  node = unwrapErased(node);
  if (ts.isStringLiteralLike(node)) return node.text;
  // FRONTERA token-unidad-vs-ENSAMBLADO (ADR §141, eje del eval-sink). SOLO se resuelve
  // una key que sea un string-literal ÚNICO — `StringLiteral` o template SIN sustitución
  // (`` `constructor` ``); ambos son `isStringLiteralLike`. Los wrappers value-transparentes
  // (`(0,"x")`, `("x")`, `"x" as T`, `1 && "x"`, ternario-literal) los desenvuelve antes
  // `valueTransparentLeaves`, así que el token ENVUELTO sigue cazándose (B1).
  //
  // CUALQUIER ENSAMBLAJE del token queda SIN RESOLVER → residual POR DISEÑO:
  //   - concat:           `["construc" + "tor"]`
  //   - sustitución tmpl: `` [`cons${"tructor"}`] ``
  //   - intrínsecos:      `[String.fromCharCode(99,…)]`, `[[".."].join("")]`, `[".".slice()]`
  //   - indirección:      `const k = "constructor"; [k]` (data-flow)
  //
  // Foldear un SUBCONJUNTO del ensamblaje (lo hacían el `+`-concat —CLASE B 4924427— y la
  // sustitución de template) era FALSA COMPLETITUD, exactamente lo que el §141 (ratificado)
  // rechaza: cazaba 1-de-∞ escrituras equivalentes (el ternario-concat `"cons"+(true?"tructor":"")`
  // y fromCharCode se escapaban igual → verificado), daba falsa confianza ("manejamos
  // string-building" = mentira), y bajo el modelo opt-in-first-party NINGÚN autor honesto
  // ensambla el token sin querer (todo ensamblaje es deliberado = el no-adversario descartado).
  // Revertir ambos folds hace VERDADERA la afirmación de la frontera ("cazo el token en su
  // sitio como unidad; ensamblaje e indirección son residual") y reduce la superficie de FP
  // (§184). La alternativa "folder TODO inline-constante" (fromCharCode/join/slice/…) es el
  // mismo 1-de-∞ sin cierre + reimplementar el evaluador de constantes. Línea = ¿el token está
  // presente como UNIDAD (literal/member), o ARMADO de piezas? — sintáctica, sin folder ni
  // call-graph. deepest final hunt #173.
  return undefined;
}

function isConstructorMemberAccess(node) {
  return accessedMemberName(node) === "constructor";
}

/**
 * ¿`node` es un wrapper que se BORRA al emit (runtime-transparente)? Cubre los
 * paréntesis Y las expresiones type-only que TS elimina: `x!` (NonNull), `x as T`
 * (As), `x satisfies T` (Satisfies), `<T>x` (TypeAssertion). Todos emiten
 * EXACTAMENTE su operando — son contiguos y legibles, no ofuscación. Tratarlos
 * solo como ParenthesizedExpression dejaba escapar el eval-sink envuelto en `!`/
 * `as`/`satisfies` (re-hunt: hermanos del paren-wrap C). beta.27 BLOCKER-1.
 */
function isErasedOuterExpr(node) {
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isAsExpression(node) ||
    (typeof ts.isSatisfiesExpression === "function" &&
      ts.isSatisfiesExpression(node)) ||
    (typeof ts.isTypeAssertionExpression === "function" &&
      ts.isTypeAssertionExpression(node))
  );
}

/**
 * Desenvuelve TODOS los wrappers runtime-transparentes (`()`,`!`,`as`,`satisfies`,
 * `<T>`) que rodean `node` y devuelve el operando real. Espejo iterativo de
 * `isErasedOuterExpr`: el valor emitido de `(((x as T)))!` ES `x`. Centraliza el
 * patrón `while (n && isErasedOuterExpr(n)) n = n.expression` que ya aparecía en
 * isDeferredExecutionContext (callback), classifyTypeofGuard (operandos) e
 * isNonReferencePosition (typeof-operand) — el CALLEE y su chain-root no lo
 * aplicaban → FP `(useEffect)(cb)` / `(React).useEffect(cb)` (hunt final
 * deferred-alias-spoof). beta.27 BLOCKER-1.
 */
function unwrapErased(node) {
  while (node && isErasedOuterExpr(node)) node = node.expression;
  return node;
}

/**
 * Mapeo ÚNICO del set ACOTADO de constructos VALUE-TRANSPARENTES → las sub-expresiones
 * cuyo valor ES (sintácticamente) el de la expresión, sin evaluar nada: wrappers erased
 * (`()`,`!`,`as`,`satisfies`,`<T>`) + `await` de un no-thenable (operando — un constructor
 * NO es thenable, devuelve el operando sin cambiarlo) + coma (→right) + `&&`/`&&=` (→right:
 * una base truthy como un constructor pasa a la derecha) + `||`/`??`/`||=`/`??=` (→left|right)
 * + asignación `=` (→right) + ternario (→ambas ramas). `[]` si `node` es una HOJA.
 *
 * CRÍTICO — EXCLUYE las CALLS/IIFE: `(() => X)()` NO es transparente, su valor exige EVALUAR
 * el cuerpo = data-flow = residual infinito. El bound (legible-contiguo vs ofuscado) aguanta
 * SOLO porque este set es finito y no incluye calls.
 *
 * Centralización (re-hunt B1): ESTE es el ÚNICO sitio que define el set. El descenso
 * (`valueTransparentLeaves` → base de reachesConstructorAccess + resolución de la key en
 * accessedMemberName) y el ascenso (`isValueTransparentParent`) lo CONSULTAN. Antes la key
 * solo desenvolvía erased+coma → el bypass `({})["constructor"][1 && "constructor"](…)`
 * escapaba por la asimetría base-vs-key. beta.27 BLOCKER-1.
 */
function valueTransparentChildren(node) {
  if (!node) return [];
  if (isErasedOuterExpr(node)) return [node.expression];
  if (ts.isAwaitExpression(node)) return [node.expression];
  if (ts.isConditionalExpression(node)) {
    // Condición literal CONSTANTE → solo la rama viva (la muerta no se evalúa).
    // `true ? "name" : "constructor"` es SIEMPRE "name" → la rama "constructor" es
    // código muerto, no un selector alcanzable. Puro fold sintáctico (no data-flow):
    // solo `true`/`false` keyword (desenvueltos de erased). `false ? fn.ctor : null`
    // → solo null (no alcanza el constructor) — el lado base se beneficia igual.
    // deepest re-hunt #173 (FP eval-sink con key estáticamente reducible). Fail-closed
    // intacto: una condición VARIABLE devuelve ambas ramas (si alguna es weaponizable,
    // flaggea).
    const cond = unwrapErased(node.condition);
    if (cond.kind === ts.SyntaxKind.TrueKeyword) return [node.whenTrue];
    if (cond.kind === ts.SyntaxKind.FalseKeyword) return [node.whenFalse];
    return [node.whenTrue, node.whenFalse];
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.CommaToken) return [node.right];
    if (
      op === ts.SyntaxKind.AmpersandAmpersandToken ||
      op === ts.SyntaxKind.AmpersandAmpersandEqualsToken
    ) {
      return [node.right];
    }
    if (
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken ||
      op === ts.SyntaxKind.BarBarEqualsToken ||
      op === ts.SyntaxKind.QuestionQuestionEqualsToken
    ) {
      return [node.left, node.right];
    }
    if (op === ts.SyntaxKind.EqualsToken) return [node.right];
  }
  return [];
}

/**
 * Hojas value-transparentes de `node`: las expresiones terminales a las que su valor se
 * reduce siguiendo `valueTransparentChildren`. Multi-hoja (`||`/`??`/ternario). Un operando
 * VARIABLE es una hoja (su valor no se resuelve → data-flow residual).
 */
function valueTransparentLeaves(node, out) {
  const acc = out || [];
  const kids = valueTransparentChildren(node);
  if (kids.length === 0) {
    if (node) acc.push(node);
    return acc;
  }
  for (const kid of kids) valueTransparentLeaves(kid, acc);
  return acc;
}

/** ¿`child` es una sub-expresión value-transparente de `parent`? (ascenso). */
function isValueTransparentParent(parent, child) {
  return valueTransparentChildren(parent).indexOf(child) !== -1;
}

/**
 * ¿El valor de `node` ES (vía constructos value-transparentes, sin calls) un member access
 * `constructor`? ALGUNA hoja value-transparente es un `.constructor`. Cierra el anidamiento;
 * usado para la base del doble `.constructor.constructor`.
 */
function reachesConstructorAccess(node) {
  return valueTransparentLeaves(node).some((leaf) => isConstructorMemberAccess(leaf));
}

/**
 * El member access `constructor` `node` está "weaponizado" (alcanza+invoca el
 * `Function` constructor). Salta los constructos VALUE-TRANSPARENTES a AMBOS lados
 * (wrappers erased + coma/lógico/ternario/asignación, sin calls): son contiguos y
 * legibles — `((x).constructor)()` ≡ `x.constructor!()` ≡ `(0, x.constructor)()` ≡
 * `x.constructor()`. Exigir `node.parent` directo dejaba escapar la forma envuelta.
 * beta.27 BLOCKER-1 (hunt: paren-wrap C; re-hunt: `!`/`as`/`satisfies` + operadores).
 */
function isWeaponizedConstructorAccess(node) {
  // (a) doble `x.constructor.constructor` (ES Function, se llame o no) — la base
  //     puede venir envuelta en value-transparentes: `(0, x.constructor).constructor`.
  if (reachesConstructorAccess(node.expression)) return true;
  // Ancestro efectivo saltando value-transparentes hacia ARRIBA; `child` es el nodo
  // (quizá envuelto) que es hijo directo de ese ancestro.
  let child = node;
  let parent = node.parent;
  while (parent && isValueTransparentParent(parent, child)) {
    child = parent;
    parent = parent.parent;
  }
  if (!parent) return false;
  // (b) callee de CallExpression: `x.constructor("code")` (incl. optional call).
  if (ts.isCallExpression(parent) && parent.expression === child) return true;
  // (d) tagged template: `` x.constructor`code` ``.
  if (ts.isTaggedTemplateExpression(parent) && parent.tag === child) return true;
  // (c) Function.prototype: `x.constructor.call/.apply/.bind(...)` — punto O
  //     bracket-string `x.constructor["call"](...)` (codex P2). Ambas formas son
  //     contiguas y legibles; `accessedMemberName` las trata por igual.
  if (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isElementAccessExpression(parent)) &&
    parent.expression === child
  ) {
    const m = accessedMemberName(parent);
    if (m === "call" || m === "apply" || m === "bind") return true;
  }
  return false;
}

/**
 * ¿`node` (un identifier o property-access) es —o es el ROOT cualificado de— la
 * expresión de una heritage TYPE-ONLY? `interface X extends a.B.C` y
 * `class X implements a.B` son type-only (se borran). El `extends` de una CLASE
 * (`class X extends a.B`) es runtime read → false. Sube por el PropertyAccess
 * (los miembros ya están cubiertos) hasta la heritage expression. Usado en la
 * regla 12 (identifier bare) Y en la rama (c) (root de property-access), porque
 * ambas detectan el global por caminos distintos. beta.27 BLOCKER-1 (re-hunt FP).
 */
function isInTypeOnlyHeritageExpr(node) {
  let top = node;
  while (
    ts.isPropertyAccessExpression(top.parent) &&
    top.parent.expression === top
  ) {
    top = top.parent;
  }
  return (
    ts.isExpressionWithTypeArguments(top.parent) &&
    top.parent.expression === top &&
    ts.isHeritageClause(top.parent.parent) &&
    (top.parent.parent.token === ts.SyntaxKind.ImplementsKeyword ||
      ts.isInterfaceDeclaration(top.parent.parent.parent))
  );
}

function isNonReferencePosition(node, declaredNames) {
  const parent = node.parent;
  if (!parent) return false;

  // 1. Property name in member access: `obj.window`, `obj?.window`.
  //    En `window.foo`, el Identifier `window` ES la expression
  //    (parent.expression === node) — eso SÍ es ref. En `obj.window`,
  //    el Identifier `window` es parent.name — NO es ref.
  if (
    (ts.isPropertyAccessExpression(parent) || ts.isQualifiedName(parent)) &&
    "name" in parent &&
    parent.name === node
  ) {
    return true;
  }

  // 2. Operand of TypeOfExpression: `typeof window` short-circuita ReferenceError
  //    sobre el identifier BARE — incluso envuelto en wrappers RUNTIME-TRANSPARENTES
  //    (`typeof (window)`, `typeof (window as any)`): los parens/erased no cambian
  //    que el operando es el bare ident, así que sigue sin lanzar. `typeof window.foo`
  //    (property access, NO erased) SÍ ejecuta el read → no se exime (el up-walk para
  //    en el PropertyAccess). re-hunt FP paren-operand.
  let typeofTop = node;
  while (typeofTop.parent && isErasedOuterExpr(typeofTop.parent)) {
    typeofTop = typeofTop.parent;
  }
  if (
    ts.isTypeOfExpression(typeofTop.parent) &&
    typeofTop.parent.expression === typeofTop
  ) {
    return true;
  }

  // 3. TS type-position typeof: `const x: typeof window`. TypeQueryNode.
  if (ts.isTypeQueryNode(parent) && parent.exprName === node) {
    return true;
  }

  // 4. TS type reference: `let x: Buffer`. Types no se leen en runtime.
  if (ts.isTypeReferenceNode(parent) && parent.typeName === node) {
    return true;
  }

  // 5. Key/name de object literal property o type member:
  //    `{ window: 1 }`, `{ window() {} }`, `interface { window: T }`.
  //    Excluye ShorthandPropertyAssignment intencionalmente — esa SÍ
  //    es una ref runtime al binding (`{ window }` ≡ `{ window: window }`).
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent) ||
      ts.isEnumMember(parent)) &&
    "name" in parent &&
    parent.name === node
  ) {
    return true;
  }

  // 6. Declaration names: variable, parameter, binding pattern, fn,
  //    class, interface, type alias, enum, module, type param,
  //    import/export specifier, etc. NO leen el binding global —
  //    declaran un binding local (que puede shadow el global).
  if (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isBindingElement(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isArrowFunction(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isEnumDeclaration(parent) ||
      ts.isModuleDeclaration(parent) ||
      ts.isImportClause(parent) ||
      ts.isImportSpecifier(parent) ||
      ts.isExportSpecifier(parent) ||
      ts.isNamespaceImport(parent) ||
      ts.isNamespaceExportDeclaration(parent) ||
      // Nombre de campo de clase: `class C { count = 0 }` — `count` es el
      // nombre de un PropertyDeclaration, no un read del binding global.
      // beta.27 BLOCKER-1 (cruce A+B, FP-hunt).
      ts.isPropertyDeclaration(parent) ||
      ts.isTypeParameterDeclaration(parent)) &&
    "name" in parent &&
    parent.name === node
  ) {
    return true;
  }

  // 6b. Computed-property key DENTRO de un miembro TYPE-SPACE
  //     (PropertySignature/MethodSignature de interface o type-literal):
  //     `interface I { [sym]: T }`, `type U = { [sym](): void }`, branded
  //     types `T & { readonly [brand]: B }`. El miembro entero se BORRA al
  //     emit → la key nunca lee un binding runtime. Solo PropertySignature/
  //     MethodSignature (NUNCA Property/MethodDeclaration de clase u object
  //     literal, que SÍ emiten) → no exime computed keys de clase (runtime).
  //     Dispara con `declare const sym: unique symbol` ambient (sin binding
  //     runtime, antes caía al fail-closed y FP-eaba). hunt final nonref-heritage.
  if (
    ts.isComputedPropertyName(parent) &&
    parent.parent &&
    (ts.isPropertySignature(parent.parent) ||
      ts.isMethodSignature(parent.parent) ||
      // get/set accessor SIGNATURE de interface/type-literal (sin cuerpo) — type-space
      // erased. El accessor de CLASE lleva cuerpo → no se exime (deepest re-hunt #173).
      ((ts.isGetAccessorDeclaration(parent.parent) ||
        ts.isSetAccessorDeclaration(parent.parent)) &&
        parent.parent.body === undefined))
  ) {
    return true;
  }

  // 6c. parameterName de un TypePredicateNode (`x is T`, `asserts x is T`) en
  //     posición de TIPO standalone: `type G = (val) => val is string`,
  //     `interface { check(val): val is T }`, callback-prop `(item: T) => item
  //     is T`, anotación de un const `(x) => asserts x is number`. El predicate
  //     es type-space (se borra); en una función REAL el param está en
  //     localBindings y queda enmascarado, pero en un tipo suelto no hay binding
  //     → caía al fail-closed y flaggeaba el nombre (`val`,`item`) aunque ni es
  //     global. `this is T` no afecta: `this` es keyword, no Identifier. hunt
  //     final new-fp-source.
  if (ts.isTypePredicateNode(parent) && parent.parameterName === node) {
    return true;
  }

  // 6d. Nombre de un import-attribute (`import x from "./y.json" with { type: "json" }`,
  //     o el viejo `assert { type: "json" }`): es metadata del loader/resolver, NO una
  //     ref runtime al global. TS lo modela como ImportAttribute.name (AssertEntry.name
  //     en versiones previas). deepest re-hunt #173 (exotic-syntax).
  if (
    ((typeof ts.isImportAttribute === "function" &&
      ts.isImportAttribute(parent)) ||
      (typeof ts.isAssertEntry === "function" && ts.isAssertEntry(parent))) &&
    "name" in parent &&
    parent.name === node
  ) {
    return true;
  }

  // 7. Source-module export key en import/export specifiers
  //    (propertyName): `import { window as x }` — propertyName es
  //    metadata para el resolver de imports, no ref runtime.
  if (
    (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) &&
    "propertyName" in parent &&
    parent.propertyName === node
  ) {
    return true;
  }

  // 7b. Destructure source property name: `const { document: doc } = obj`
  //     — `document` es BindingElement.propertyName, metadata sobre qué
  //     key del object source extraer, NO ref runtime al binding global.
  //     El binding local es `doc` (parent.name).
  if (
    ts.isBindingElement(parent) &&
    "propertyName" in parent &&
    parent.propertyName === node
  ) {
    return true;
  }

  // 8. JSX attribute name: `<x window={y} />` — `window` es el nombre
  //    del attribute, no ref al global.
  if (ts.isJsxAttribute(parent) && parent.name === node) {
    return true;
  }

  // 9. JSX tag name. Lowercase (`<div/>`, `<span/>`) = elemento intrínseco
  //    (string literal, NO lee binding) → exento. Uppercase (`<HTMLElement/>`,
  //    `<Foo/>`) = referencia de VALOR a un binding que el runtime JSX
  //    evalúa: se exime SOLO si el nombre está declarado en algún sitio del
  //    módulo (componente importado / local / forward-ref / mutuo, válido en
  //    render-time). Un global DOM bare como `<HTMLElement/>` NO se declara →
  //    cae al check fail-closed y se flaggea (ReferenceError en SSR). Bajo la
  //    denylist esto era skip pragmático; fail-closed lo hace load-bearing.
  //    Codex P2 beta.27 BLOCKER-1.
  if (
    (ts.isJsxOpeningElement(parent) ||
      ts.isJsxClosingElement(parent) ||
      ts.isJsxSelfClosingElement(parent)) &&
    parent.tagName === node &&
    ts.isIdentifier(node) &&
    (/^[a-z]/.test(node.text) ||
      (declaredNames !== undefined && declaredNames.has(node.text)))
  ) {
    return true;
  }

  // 10. Expression of PropertyAccess/ElementAccess: `window.foo`,
  //     `window["foo"]`. Ya capturado en (c) sobre el outer
  //     Property/ElementAccess. Evitar doble flag.
  if (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isElementAccessExpression(parent)) &&
    parent.expression === node
  ) {
    return true;
  }

  // ── Reglas 11-13: añadidas en beta.27 BLOCKER-1 al pasar a fail-closed.
  // Bajo la denylist anterior nunca se ejercitaban (el predicado
  // `CLIENT_GLOBALS.has` short-circuitaba antes de llegar aquí); el modelo
  // whitelist hace `isNonReferencePosition` load-bearing para TODO
  // identificador, exponiendo posiciones type-space y meta-properties que
  // se borran en compilación y no leen ningún binding global.

  // 11. Entity name de tipo (`A.B` en posición de tipo es un
  //     QualifiedName, p.ej. `React.ReactNode`). A diferencia del acceso a
  //     valor `a.b` (PropertyAccessExpression), el QualifiedName SOLO
  //     aparece en type-space → ni `left` ni `right` leen un binding
  //     runtime. (Caza `React`/`ReactNode` en `children?: React.ReactNode`.)
  //
  //     EXCEPCIÓN: el `moduleReference` de un `import x = A.B.C` NO-type-only es
  //     una EntityName en posición de VALOR. `import h = window.location.href`
  //     emite `var h = window.location.href` — un read runtime del root
  //     (`window`). El root es el `.left` más interno; los miembros (`.right`,
  //     `location`/`href`) ya los exime la regla 1. Solo el root se des-exime.
  //     Discriminador conservador `!isTypeOnly` (acotado, sin binder): NO se intenta
  //     resolver si el RHS same-file es un miembro-TIPO — eso exige el binder de TS
  //     y queda RESIDUAL por diseño (ver ADR). Caso bounded que SÍ cazamos: el root
  //     es un GLOBAL (`window`/`navigator`…), flaggeado pase lo que pase el RHS.
  //     beta.27 BLOCKER-1 (hunt: import-equals value-alias).
  if (ts.isQualifiedName(parent)) {
    if (parent.left === node) {
      let top = parent;
      while (top.parent && ts.isQualifiedName(top.parent)) top = top.parent;
      if (
        top.parent &&
        ts.isImportEqualsDeclaration(top.parent) &&
        top.parent.moduleReference === top &&
        !top.parent.isTypeOnly
      ) {
        return false; // root de import-equals value-alias = read runtime
      }
    }
    return true;
  }

  // 12. Heritage type-only: `interface X extends Omit<...>` o
  //     `class X implements Y`. El `extends` de una INTERFACE y el
  //     `implements` de una CLASE son type-only (se borran). CRÍTICO: el
  //     `extends` de una CLASE (`class X extends Base`) SÍ es una ref
  //     runtime — no se excluye, para que `class X extends HTMLElement`
  //     (custom element, client-only) siga flaggeándose.
  //
  //     Cubre también el ROOT de una heritage CUALIFICADA (`interface X extends
  //     navigator.Connection`): `isInTypeOnlyHeritageExpr` sube por el
  //     PropertyAccess (los miembros ya los exime la regla 1) hasta la heritage
  //     expression. Solo type-only — `class X extends navigator.Foo` es runtime.
  if (isInTypeOnlyHeritageExpr(node)) {
    return true;
  }

  // 13. Nombre de MetaProperty: el `meta` de `import.meta` (y `target` de
  //     `new.target`). Construcción sintáctica ESM estándar, disponible en
  //     SSR/RSC — no es un read de global. (Caza `meta` en
  //     `import.meta.env.DEV`.)
  if (ts.isMetaProperty(parent) && parent.name === node) {
    return true;
  }

  // 14. Labels: `outer: for (...)` y los targets de `break outer` /
  //     `continue outer`. El identificador es el NOMBRE del label (en
  //     `parent.label`, no `parent.name`), metadata de control de flujo, no
  //     un read del binding global. La antigua regla 6 listaba
  //     `LabeledStatement` pero comprobaba `parent.name` → rama muerta.
  //     beta.27 BLOCKER-1 (cruce A+B, FP-hunt).
  if (
    (ts.isLabeledStatement(parent) ||
      ts.isBreakStatement(parent) ||
      ts.isContinueStatement(parent)) &&
    parent.label === node
  ) {
    return true;
  }

  // 15. JsxNamespacedName: el `ns` y el `name` de `<svg:rect/>` (tag) o de
  //     `<use xlink:href=.../>` (atributo). Compila a un STRING (`"svg:rect"`,
  //     `{ "xlink:href": … }`) — ni `ns` ni `name` leen un binding runtime.
  //     beta.27 BLOCKER-1 (workflow: FP en SVG/XML namespaced).
  if (ts.isJsxNamespacedName(parent)) {
    return true;
  }

  // 16. ImportTypeNode.qualifier: el `Name` de `import("mod").Name` en
  //     posición de TIPO (`p: import("react").ReactNode`). Type-space puro,
  //     se borra en compilación — análogo a la regla 11 (QualifiedName). El
  //     `import()` DINÁMICO de runtime no es un ImportTypeNode, así que sigue
  //     flaggeándose. beta.27 BLOCKER-1 (workflow: FP type-space).
  if (ts.isImportTypeNode(parent) && parent.qualifier === node) {
    return true;
  }

  // 17. Label de NamedTupleMember: el `first`/`second` de
  //     `type Pair = [first: number, second: string]`. Type-space puro,
  //     se borra en compilación — no lee binding. beta.27 BLOCKER-1
  //     (workflow honest-construct: FP en tuplas con labels).
  if (ts.isNamedTupleMember(parent) && parent.name === node) {
    return true;
  }

  // 18. Nombre de ImportEqualsDeclaration (`import X = NS.Y`): es la
  //     declaración del binding `X`, no un read. El binding runtime se añade
  //     al scope en gatherModulePreloadedBindings. beta.27 BLOCKER-1.
  if (ts.isImportEqualsDeclaration(parent) && parent.name === node) {
    return true;
  }

  return false;
}

// Nota: NO existe exención "dentro de typeof". Se intentó en el round 8
// (helper `isInsideTypeof` que walkeaba parents), pero codex P1 round 9
// señaló que `typeof window.document` ejecuta el property access — JS
// solo suprime ReferenceError sobre el IDENTIFICADOR BARE
// (`typeof window` → "undefined" si window no existe), no sobre accesos
// a propiedades de ese identificador. Por tanto cualquier
// PropertyAccess/ElementAccess detectado por el walker es un acceso
// real al binding y debe ser chequeado normalmente, esté o no
// envuelto en `typeof`.
//
// El walker SÍ chequea reads de Identifier bare (rama (d) — `const w =
// window`, `f(navigator)`, etc.; el modelo fail-closed la hizo load-bearing
// para todo identificador). `typeof window` (sin acceso a propiedad) NO se
// flaggea porque el operando de un `TypeOfExpression` es non-reference-
// position (regla 2 de `isNonReferencePosition`): leer `typeof X` no lanza
// ReferenceError aunque X no exista. Comportamiento correcto.

// ─── Cross-module smuggling (beta.26 HIGH-2) ──────────────────────
//
// Hasta beta.25 inclusive, el gate solo analizaba el archivo marcado
// `@server-safe`. Un componente marcado podía importar un util que
// internamente accediera `window.X` y el gate no lo veía — silent bypass
// detectado en cruce reviews beta.25 (Claude HIGH-4).
//
// El walker recursivo de imports sigue:
//   - `import { X } from "./foo"` / `from "@/utils/foo"` (value imports).
//   - `export { X } from "./bar"` y `export * from "./barrel"` (barrels —
//     un `@server-safe` que entra por barrel toca el mismo riesgo).
//
// EXCLUSIONES:
//   - `import type { X } from "..."` — no genera runtime. El check sería
//     ruido y arriesga falsos positivos sobre `.d.ts` puros con `declare`.
//   - Bare specifiers que no matcheen alias `@/` (`react`, `clsx`,
//     `@floating-ui/react`, `node:*`) — peer deps / built-ins son
//     responsabilidad del consumer, no del DS.
//   - `import("./foo")` dynamic — Node lo soporta legítimamente en SSR.
//     **HUECO CONOCIDO**: el módulo cargado dinámicamente PUEDE tocar
//     client globals en su top-level y petar al resolverse en server. No
//     se cubre en esta iteración (más raro y costoso) — documentado aquí
//     para que la próxima auditoría no lo reporte como bug sorpresa. Si
//     se materializa, ampliar el extractor para seguir también el target.
//
// RESOLUCIÓN:
//   - Relativos (`./foo`, `../foo`): resuelven contra el directorio del
//     importer con cascada `.ts → .tsx → /index.ts → /index.tsx`.
//   - Alias (`@/foo`): resuelven via `compilerOptions.paths` del
//     `tsconfig.json` (`@/* → ./src/*`). Misma cascada.
//   - Si un import relativo/alias NO resuelve a archivo dentro de `src/`,
//     el gate FALLA RUIDOSAMENTE con `unresolved-import`. Skip silencioso
//     reproduce el bypass que este gate cierra — peor que un falso
//     positivo.
//
// PERFORMANCE:
//   - `parseCache: Map<absPath, { sourceFile, content }>` evita re-parsear
//     un util compartido por N componentes (sin cache, el coste cae a
//     O(N·M)).
//   - `visited: Set<absPath>` corta ciclos de imports.
//
// REPORTING:
//   - Las violations transitivas llevan `.chain` con la cadena completa
//     de imports (paths relativos a repo root): `Rating.tsx → utils/format.ts →
//     utils/inner.ts`. El path absoluto del container no le sirve a nadie.

const RESOLUTION_EXT_CASCADE = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * Lee `compilerOptions.paths` del tsconfig.json del repo. Solo soporta
 * patterns wildcard (`"@/*": ["./src/*"]`) — el patrón único que usa
 * este repo. Pattern sin wildcard se ignoran (raro y no presente).
 *
 * Devuelve array compilado: `[{ prefix: "@/", targetPrefix: "src/" }, ...]`.
 */
function loadTsconfigPaths() {
  const tsconfigPath = resolve(repoRoot, "tsconfig.json");
  const text = readFileSync(tsconfigPath, "utf8");
  // tsconfig.json admite comentarios → usar el parser de tsc, no JSON.parse.
  const parsed = ts.parseConfigFileTextToJson(tsconfigPath, text);
  if (parsed.error) {
    throw new Error(
      `[server-safe-gate] tsconfig.json parse error: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n")}`,
    );
  }
  const paths = parsed.config?.compilerOptions?.paths;
  const compiled = [];
  if (paths && typeof paths === "object") {
    for (const [pattern, targets] of Object.entries(paths)) {
      if (!pattern.endsWith("/*")) continue;
      if (!Array.isArray(targets) || targets.length === 0) continue;
      const target = targets[0];
      if (typeof target !== "string" || !target.endsWith("/*")) continue;
      // Normalizar target: "./src/*" → "src/" (sin leading ./)
      const targetPrefix = target.slice(0, -1).replace(/^\.\//, "");
      compiled.push({
        prefix: pattern.slice(0, -1), // "@/*" → "@/"
        targetPrefix,
      });
    }
  }
  return compiled;
}

let cachedTsconfigPaths = null;
function getTsconfigPaths() {
  if (cachedTsconfigPaths === null) {
    cachedTsconfigPaths = loadTsconfigPaths();
  }
  return cachedTsconfigPaths;
}

/**
 * Devuelve el primer candidato existente aplicando la cascada de
 * extensiones, o `null` si ninguno existe. `fileExists` se inyecta para
 * permitir virtual FS en tests.
 */
function tryResolveFile(noExtAbsPath, fileExists) {
  for (const ext of RESOLUTION_EXT_CASCADE) {
    const candidate = `${noExtAbsPath}${ext}`;
    if (fileExists(candidate)) return candidate;
  }
  return null;
}

// Orden REAL de `resolve.extensions` de Vite/esbuild (DEFAULT_EXTENSIONS, .json excluido
// — no se audita). El gate resuelve `.ts` primero; Vite rankea `.mjs`/`.js`/`.mts` ANTES
// que `.ts` (y `.jsx` antes que `.tsx`). Si para un import extensionless existe un hermano
// que Vite preferiría, el BUNDLER ENVÍA ESE archivo y el gate auditaría OTRO → divergencia
// silenciosa (hunt final: helper.ts limpio + helper.mjs `screen.width` → gate `[]`, Vite
// envía el .mjs) = bypass cross-module. Hoy LATENTE (0 .mjs/.js en src) → fail-closed.
const VITE_RESOLVE_EXTS = [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx"];

/**
 * Si `resolvedAbsPath` (lo que el gate resolvió, `.ts`/`.tsx` o `…/index.ts`) tiene un
 * hermano que Vite PREFERIRÍA, devuelve su path (= el archivo que el bundler REALMENTE
 * envía, distinto del que el gate auditaría). null si no hay divergencia. DOS casos:
 *
 *   1. FILE `<base>.ts` resuelto → un `<base>.<extMayorPrecedencia>` (`.mjs`/`.js`/`.mts`)
 *      lo sombrea (mismo basename, hunt final #173 — guard original).
 *   2. DIRECTORY-INDEX `<dir>/index.ts` resuelto → un FILE `<dir>.<cualquierExtVite>` lo
 *      sombrea ENTERO: Vite intenta `<dir>.<ext>` como ARCHIVO antes que `<dir>/index.<ext>`
 *      como directorio (file beats directory). Mi guard original solo miraba el basename
 *      del path resuelto (`<dir>/index`) → se le escapaba el `<dir>.mjs` padre = BYPASS
 *      (hunt scope-aware: file-vs-directory + barrel anidado, 4 confirmados screen/location).
 */
function bundlerShadowSibling(resolvedAbsPath, fileExists) {
  // Caso 2: el gate resolvió un index de DIRECTORIO → un archivo hermano del NOMBRE DEL
  // DIRECTORIO (cualquier ext Vite) lo sombrea, porque Vite prueba file antes que dir.
  const idx = resolvedAbsPath.match(/[\\/]index(\.[mc]?[jt]sx?)$/);
  if (idx) {
    const dirBase = resolvedAbsPath.slice(0, resolvedAbsPath.length - idx[0].length);
    for (const ext of VITE_RESOLVE_EXTS) {
      const sib = `${dirBase}${ext}`;
      if (fileExists(sib)) return sib; // `<dir>.<ext>` archivo gana al directorio
    }
    return null;
  }
  // Caso 1: file resuelto → hermano de mayor precedencia con el mismo basename.
  const m = resolvedAbsPath.match(/(\.[mc]?[jt]sx?)$/);
  if (!m) return null;
  const ext = m[1];
  const rank = VITE_RESOLVE_EXTS.indexOf(ext);
  if (rank <= 0) return null; // .mjs (rank 0) o ext no-Vite → nada gana precedencia
  const base = resolvedAbsPath.slice(0, -ext.length);
  for (let i = 0; i < rank; i++) {
    const sib = `${base}${VITE_RESOLVE_EXTS[i]}`;
    if (fileExists(sib)) return sib;
  }
  return null;
}

/**
 * Resuelve un module specifier a uno de tres resultados:
 *   - `{ kind: "internal", absPath }`: archivo dentro de `src/`. Sigue.
 *   - `{ kind: "external" }`: peer dep / built-in / archivo fuera de src.
 *     No sigue. Responsabilidad del consumer (o del repo, pero fuera del
 *     scope del gate de componentes/hooks).
 *   - `{ kind: "unresolvable", reason }`: relativo o alias que no resuelve
 *     a ningún archivo. El gate falla ruidosamente — un skip silencioso
 *     aquí reproduce el bypass que este gate cierra.
 */
function resolveImportPath(
  specifier,
  importerAbsPath,
  tsconfigPaths,
  fileExists = existsSync,
  rootsOverride,
) {
  // `repoRoot` y `srcRoot` se inyectan para que el orquestador pueda
  // resolver contra un root virtual en tests (la cache real apunta al
  // disco físico, los tests usan `/repo` simulado). El default es el
  // path físico del proyecto.
  //
  // Usamos `crossOsResolve`/`crossOsRelative`/`crossOsDirname` para
  // que la resolución funcione idéntica en los 3 modos:
  //   1. VFS test (`/repo/...` POSIX literal).
  //   2. Real-disk Linux (`/home/...` POSIX).
  //   3. Real-disk Windows (`D:\repo\...` con drive letter).
  // Ver helpers arriba para el desglose (#151 + codex P1 fix sobre
  // PR #121: drive letters no son absolutas en POSIX, requieren
  // preservación manual).
  const projectRoot = rootsOverride?.repoRoot ?? repoRoot;
  const srcRoot = rootsOverride?.srcRoot ?? SRC_ROOT;

  // Bare specifier (no empieza con "." ni "/") → puede ser alias o peer.
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    for (const { prefix, targetPrefix } of tsconfigPaths) {
      if (specifier.startsWith(prefix)) {
        const tail = specifier.slice(prefix.length);
        const noExt = crossOsResolve(projectRoot, targetPrefix + tail);
        const resolved = tryResolveFile(noExt, fileExists);
        if (resolved) {
          const shadow = bundlerShadowSibling(resolved, fileExists);
          if (shadow) {
            return {
              kind: "unresolvable",
              reason: `alias \`${specifier}\` es AMBIGUO: el gate auditaría \`${crossOsRelative(projectRoot, resolved)}\` pero Vite envía \`${crossOsRelative(projectRoot, shadow)}\` (mayor precedencia de extensión). Usa una extensión explícita o elimina el hermano.`,
            };
          }
          return { kind: "internal", absPath: resolved };
        }
        return {
          kind: "unresolvable",
          reason: `alias \`${specifier}\` no resolvió en ${crossOsRelative(projectRoot, noExt) || noExt}{.ts,.tsx,/index.ts,/index.tsx}`,
        };
      }
    }
    // No alias match → peer/built-in. No seguimos.
    return { kind: "external" };
  }
  // Relative.
  const importerDir = crossOsDirname(importerAbsPath);
  const noExt = crossOsResolve(importerDir, specifier);
  const resolved = tryResolveFile(noExt, fileExists);
  if (resolved) {
    // Solo seguimos dentro de src/ (proxy para "archivo del DS, no
    // node_modules, no scripts/ ni fixtures/ ni dist/").
    const rel = crossOsRelative(srcRoot, resolved);
    const inSrc = !rel.startsWith("..") && !rel.startsWith("/");
    if (inSrc) {
      const shadow = bundlerShadowSibling(resolved, fileExists);
      if (shadow) {
        return {
          kind: "unresolvable",
          reason: `relativo \`${specifier}\` es AMBIGUO: el gate auditaría \`${crossOsRelative(projectRoot, resolved)}\` pero Vite envía \`${crossOsRelative(projectRoot, shadow)}\` (mayor precedencia de extensión). Usa una extensión explícita o elimina el hermano.`,
        };
      }
      return { kind: "internal", absPath: resolved };
    }
    return { kind: "external" };
  }
  return {
    kind: "unresolvable",
    reason: `relativo \`${specifier}\` no resolvió en ${crossOsRelative(projectRoot, noExt) || noExt}{.ts,.tsx,/index.ts,/index.tsx}`,
  };
}

/**
 * Devuelve `true` si una `ImportDeclaration` es PURAMENTE type-only en
 * runtime, es decir TypeScript la elide del JS emitido y el módulo no
 * se carga. Tres formas reconocidas:
 *
 *   - Clause-level: `import type X from "./m"`, `import type { Y } from "./m"`.
 *   - Inline en todos los specifiers de NamedImports y sin default:
 *     `import { type A, type B } from "./m"`.
 *
 * NO es type-only:
 *   - Default import value: `import X from "./m"` (incluso si se mezcla
 *     con specifiers inline type-only — el default sigue siendo runtime).
 *   - Namespace import: `import * as ns from "./m"` (no admite inline
 *     `type` por gramática + module sí se carga).
 *   - Side-effect import: `import "./m"` (sin clause — el módulo se
 *     ejecuta por sus side-effects). El parser lo deja sin importClause.
 *   - Mixed: `import { A, type B } from "./m"` — `A` es value, módulo
 *     se carga, hay que seguirlo.
 *   - `import {} from "./m"` con NamedImports vacío — TS emite
 *     `import "./m"`, side-effect runtime. Se sigue.
 *
 * Codex P2 round 1 sobre PR #106: clause-level `isTypeOnly` solo cubre
 * el primer caso. Sin chequear specifier-level se trataban inline-type
 * como value, traversando módulos type-only y arriesgando falsos
 * positivos.
 */
function isImportPurelyTypeOnly(importDecl) {
  const ic = importDecl.importClause;
  if (!ic) return false; // side-effect import
  if (ic.isTypeOnly === true) return true;
  if (ic.name) return false; // default import is runtime value
  const nb = ic.namedBindings;
  if (!nb) return false;
  if (ts.isNamespaceImport(nb)) return false;
  if (ts.isNamedImports(nb)) {
    if (nb.elements.length === 0) return false; // `import {} from "x"` = side-effect
    return nb.elements.every((spec) => spec.isTypeOnly === true);
  }
  return false;
}

/**
 * Equivalente para `ExportDeclaration`. Tres formas type-only puras:
 *
 *   - Clause-level: `export type { X } from "./m"`.
 *   - Inline en todos los specifiers: `export { type A, type B } from "./m"`.
 *
 * NO es type-only:
 *   - `export * from "./m"` (sin clause — barrel runtime).
 *   - `export * as ns from "./m"` (namespace export — runtime).
 *   - Mixed: `export { A, type B } from "./m"` — `A` sí runtime.
 *
 * Codex P2 round 1 sobre PR #106.
 */
function isExportPurelyTypeOnly(exportDecl) {
  if (exportDecl.isTypeOnly === true) return true;
  const ec = exportDecl.exportClause;
  if (!ec) return false; // export * from "./m"
  if (ts.isNamespaceExport(ec)) return false;
  if (ts.isNamedExports(ec)) {
    if (ec.elements.length === 0) return false;
    return ec.elements.every((spec) => spec.isTypeOnly === true);
  }
  return false;
}

/**
 * Extrae referencias a otros módulos desde un SourceFile:
 *   - `import { X } from "..."`, `import type { X } from "..."`, etc.
 *   - `export { X } from "..."`, `export type { X } from "..."`,
 *     `export * from "..."` (barrels).
 *
 * Cada ref lleva `{ specifier, kind, modulePos }`. `kind` es
 * `"value"` o `"type-only"`; este último cubre tanto clause-level
 * (`import type {...}`) como inline (`import { type X }`) — codex round
 * 1 sobre #106.
 *
 * Los `import("...")` dynamic NO se incluyen — hueco conocido
 * documentado en el header del archivo.
 */
function extractModuleReferences(sourceFile) {
  const refs = [];
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
      const isTypeOnly = isImportPurelyTypeOnly(stmt);
      refs.push({
        specifier: stmt.moduleSpecifier.text,
        kind: isTypeOnly ? "type-only" : "value",
        modulePos: stmt.moduleSpecifier.getStart(sourceFile),
      });
      continue;
    }
    if (
      ts.isExportDeclaration(stmt) &&
      stmt.moduleSpecifier &&
      ts.isStringLiteral(stmt.moduleSpecifier)
    ) {
      const isTypeOnly = isExportPurelyTypeOnly(stmt);
      refs.push({
        specifier: stmt.moduleSpecifier.text,
        kind: isTypeOnly ? "type-only" : "value",
        modulePos: stmt.moduleSpecifier.getStart(sourceFile),
      });
      continue;
    }
  }
  return refs;
}

/**
 * Formatea una cadena de imports para mensaje de error. `chain` es un
 * array de paths relativos a repo root, en orden de descenso (entrada
 * primero, archivo con violation último).
 */
function formatChain(chain) {
  if (!chain || chain.length === 0) return "";
  return chain.join(" → ");
}

/**
 * Orquestador recursivo: analiza `entryAbsPath` y todos sus value-imports
 * transitivos dentro de `src/`. Devuelve violations con `.chain` anotada
 * cuando vienen de un archivo descendiente.
 *
 * Opciones:
 *   - `tsconfigPaths`: alias compilados. Default: `getTsconfigPaths()`.
 *   - `readFile(absPath) → string`: inyectable para tests con virtual FS.
 *   - `fileExists(absPath) → boolean`: idem.
 *   - `parseCache`: `Map<absPath, { sourceFile, content }>`. Comparte entre
 *     entradas para amortizar utils compartidos.
 *   - `visited`: `Set<absPath>` para cortar ciclos.
 *   - `chain`: cadena acumulada de paths relativos (interno, no setear).
 */
function checkFileWithImports(entryAbsPath, options = {}) {
  const {
    tsconfigPaths = getTsconfigPaths(),
    readFile = (p) => readFileSync(p, "utf8"),
    fileExists = existsSync,
    parseCache = new Map(),
    visited = new Set(),
    chain = [],
    // `repoRoot` / `srcRoot` se inyectan para tests con virtual FS. En
    // producción no se setean — defaults a los paths físicos del repo.
    repoRoot: optsRepoRoot,
    srcRoot: optsSrcRoot,
  } = options;

  const effectiveRepoRoot = optsRepoRoot ?? repoRoot;
  const effectiveSrcRoot =
    optsSrcRoot ?? (optsRepoRoot ? resolve(optsRepoRoot, "src") : SRC_ROOT);

  const violations = [];
  if (visited.has(entryAbsPath)) return violations;
  visited.add(entryAbsPath);

  const relRaw = relative(effectiveRepoRoot, entryAbsPath);
  const relPath = relRaw.split(pathSep).join("/");

  let cached = parseCache.get(entryAbsPath);
  if (!cached) {
    const content = readFile(entryAbsPath);
    const sourceFile = ts.createSourceFile(
      relPath,
      content,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    cached = { sourceFile, content };
    parseCache.set(entryAbsPath, cached);
  }

  // Per-file analysis. Las violations heredan la chain del caller; el
  // archivo donde aparece la violation se añade al final.
  const fileViolations = checkSourceFile(
    cached.content,
    relPath,
    cached.sourceFile,
  );
  const fullChain = chain.length > 0 ? [...chain, relPath] : null;
  for (const v of fileViolations) {
    violations.push(fullChain ? { ...v, chain: fullChain } : v);
  }

  // Seguir refs (imports + barrels).
  const refs = extractModuleReferences(cached.sourceFile);
  for (const ref of refs) {
    if (ref.kind === "type-only") continue;
    const resolution = resolveImportPath(
      ref.specifier,
      entryAbsPath,
      tsconfigPaths,
      fileExists,
      { repoRoot: effectiveRepoRoot, srcRoot: effectiveSrcRoot },
    );
    if (resolution.kind === "external") continue;
    if (resolution.kind === "unresolvable") {
      violations.push({
        file: relPath,
        rule: "unresolved-import",
        detail: resolution.reason,
        ...(fullChain ? { chain: fullChain } : {}),
      });
      continue;
    }
    const childChain = [...chain, relPath];
    const childViolations = checkFileWithImports(resolution.absPath, {
      tsconfigPaths,
      readFile,
      fileExists,
      parseCache,
      visited,
      chain: childChain,
      repoRoot: effectiveRepoRoot,
      srcRoot: effectiveSrcRoot,
    });
    violations.push(...childViolations);
  }

  return violations;
}

/**
 * Analiza un source file. Devuelve array de violations.
 *
 * @param {string} content - Source text.
 * @param {string} relPath - Path relativo (para reporting).
 * @param {ts.SourceFile} [preparsedSourceFile] - SourceFile ya parseado
 *   (opcional). Si se omite, se parsea aquí. El orquestador
 *   `checkFileWithImports` lo pre-parsea y comparte vía cache para evitar
 *   re-parsear utils importados desde N componentes.
 */
function checkSourceFile(content, relPath, preparsedSourceFile) {
  const violations = [];

  const sourceFile =
    preparsedSourceFile ??
    ts.createSourceFile(
      relPath,
      content,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

  // Nombres declarados a nivel de módulo — para eximir tags JSX uppercase
  // que son componentes (no globals). Se calcula una vez por archivo.
  const moduleDeclaredNames = gatherModuleDeclaredNames(sourceFile);

  // Rule 1: no "use client" directive coexisting con @server-safe.
  // Inspect AST directive prologue: walk top-level statements mientras
  // sean ExpressionStatement con StringLiteral (prologue cohort per
  // ES spec). Robusto frente a `"use client"; // comment`, leading
  // whitespace, otras directivas previas (`"use strict"`), comillas
  // simples vs dobles. Codex round 15 P2.1: el regex anterior
  // perdía esos casos.
  for (const stmt of sourceFile.statements) {
    if (!ts.isExpressionStatement(stmt)) break;
    if (!ts.isStringLiteral(stmt.expression)) break;
    if (stmt.expression.text === "use client") {
      violations.push({
        file: relPath,
        rule: "no-use-client",
        detail: '@server-safe contradice "use client" en el mismo archivo',
      });
      break;
    }
  }

  /**
   * Helper para extender un context con bindings nuevos. Imports van
   * solo a `localBindings`; el resto (params, var, let, const, function,
   * class, catch param, for-init) va a AMBOS sets. Codex round 16 P2.2:
   * la distinción permite chequear si un callee de deferred sink está
   * shadow-eado por un local (skip exemption) vs es el import real (exempt).
   */
  function addToScope(currentContext, names, nonImportNames = names) {
    if (!names || names.size === 0) return currentContext;
    // Un binding NUEVO (const/let/var/param/fn/clase…) SOMBREA cualquier guard-alias
    // outer homónimo → invalidarlo en el scope interno, o `const has = false`
    // (shadow no-guard) seguiría resolviendo al guard outer = BYPASS (deepest re-hunt
    // #173, soundness). El alias propio se re-añade DESPUÉS en visitOrderedStatements.
    let guardAliases = currentContext.guardAliases;
    if (guardAliases && guardAliases.size > 0) {
      let purged = null;
      for (const n of names) {
        if (guardAliases.has(n)) {
          if (!purged) purged = new Map(guardAliases);
          purged.delete(n);
        }
      }
      if (purged) guardAliases = purged;
    }
    // `nonImportNames` (default = `names`) separa los locales NO-import de los
    // import-like (`import X = …`): estos sombrean globals (localBindings) pero NO
    // cuentan como shadow local de un hook (nonImportBindings) — ver
    // extractPostStatementBindings (codex P2).
    return {
      ...currentContext,
      localBindings: new Set([...currentContext.localBindings, ...names]),
      nonImportBindings: new Set([
        ...currentContext.nonImportBindings,
        ...nonImportNames,
      ]),
      ...(guardAliases !== currentContext.guardAliases ? { guardAliases } : {}),
    };
  }

  // Walk AST con contexto:
  //   activeGuards: Set<api> guards activos por scope de typeof.
  //   isInDeferredBody: estamos dentro de un body que NO corre durante
  //                     render — body de handler JSX (onClick, onChange…),
  //                     useEffect / useLayoutEffect / useCallback, timer
  //                     (setTimeout, requestAnimationFrame…), etc.
  //
  // Razón: codex round 10 mostró que el heurístico depth-based del
  // round 8 era demasiado grueso — `function readEnv() { return
  // window.foo; }` invocada desde JSX SÍ ejecuta en render server, y
  // depth>1 la exempt-eaba incorrectamente. Reemplazo: solo exempt-ear
  // cuando una fn está pasada como argumento a un sink de ejecución
  // diferida conocido (lista cerrada). Helpers nested arbitrarios
  // (FunctionDeclaration, IIFE, arrow asignado a variable que pueda
  // llamarse en render) NO quedan exemptos.
  //
  // Lista intencionalmente conservadora: incluir un sink dudoso es
  // peor que omitir uno legítimo — un omitido produce falso positivo
  // (que se corrige reescribiendo en el patrón canónico useCallback +
  // JSX prop directo), uno espurio produce un silent bypass del gate.
  function visit(node, context) {
    // (a) Detectar typeof guards en if-statements: el then-branch
    // hereda el guard activo. El else-branch NO (en else, X está
    // undefined per la negación de la condición positiva).
    if (ts.isIfStatement(node)) {
      // chain-aware vía los mismos colectores que el guard por expresión (no
      // forkeado). POSITIVO (`typeof X !== "undefined"`) → narrowea el THEN;
      // NEGATIVO (`typeof X === "undefined"`) → narrowea el ELSE (X está definido
      // ahí, espejo del ternario whenFalse). re-hunt FP7.
      const posGuards = new Set();
      collectConjunctionGuards(node.expression, posGuards, context.guardAliases);
      const negGuards = new Set();
      collectDisjunctionGuards(node.expression, negGuards, context.guardAliases);
      if (posGuards.size > 0 || negGuards.size > 0) {
        visit(node.expression, context);
        if (node.thenStatement) {
          visit(
            node.thenStatement,
            posGuards.size > 0
              ? { ...context, activeGuards: new Set([...context.activeGuards, ...posGuards]) }
              : context,
          );
        }
        if (node.elseStatement) {
          visit(
            node.elseStatement,
            negGuards.size > 0
              ? { ...context, activeGuards: new Set([...context.activeGuards, ...negGuards]) }
              : context,
          );
        }
        return;
      }
    }

    // (a.2) typeof guards a nivel de EXPRESIÓN — MISMO predicado que el if-guard
    // (reusado, no forkeado: un narrowing duplicado en path paralelo fue el bug
    // del switch-case). El operando/branch guardado hereda el guard; el resto NO.
    //   `typeof X !== "undefined" && <X aquí>`   (positivo → right)
    //   `typeof X === "undefined" || <X aquí>`   (negativo → right)
    //   `typeof X !== "undefined" ? <X> : …`     (positivo → whenTrue)
    //   `typeof X === "undefined" ? … : <X>`     (negativo → whenFalse)
    // La exclusión NON_ABSENCE_DENIALS se hereda vía los extractores → un
    // `typeof Function !== "undefined" && Function("…")()` NO se exime (el guard
    // es vacuamente true sobre un escape sink). El eval-sink (c.2) tampoco se
    // suprime: solo se añade a activeGuards (que gatea no-bare-dom-access, no el
    // eval-sink). beta.27 BLOCKER-1 (re-hunt: FP guard por expresión).
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
        const guards = new Set();
        collectConjunctionGuards(node.left, guards, context.guardAliases);
        if (guards.size > 0) {
          visit(node.left, context);
          visit(node.right, {
            ...context,
            activeGuards: new Set([...context.activeGuards, ...guards]),
          });
          return;
        }
      } else if (op === ts.SyntaxKind.BarBarToken) {
        const guards = new Set();
        collectDisjunctionGuards(node.left, guards, context.guardAliases);
        if (guards.size > 0) {
          visit(node.left, context);
          visit(node.right, {
            ...context,
            activeGuards: new Set([...context.activeGuards, ...guards]),
          });
          return;
        }
      }
    }
    if (ts.isConditionalExpression(node)) {
      const pos = new Set();
      collectConjunctionGuards(node.condition, pos, context.guardAliases);
      const neg = new Set();
      collectDisjunctionGuards(node.condition, neg, context.guardAliases);
      if (pos.size > 0 || neg.size > 0) {
        visit(node.condition, context);
        visit(
          node.whenTrue,
          pos.size > 0
            ? { ...context, activeGuards: new Set([...context.activeGuards, ...pos]) }
            : context,
        );
        visit(
          node.whenFalse,
          neg.size > 0
            ? { ...context, activeGuards: new Set([...context.activeGuards, ...neg]) }
            : context,
        );
        return;
      }
    }

    // (b) Entrar en función/arrow/method: encender isInDeferredBody
    // SI esta function expr es argumento de un sink diferido reconocido.
    // Si ya estamos en deferred body, los bodies anidados heredan
    // el flag (un helper dentro de useEffect sigue siendo no-render).
    if (
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      const deferredKind = isDeferredExecutionContext(node, context);
      const isDeferred = deferredKind !== "none";
      const fnScopeBindings = gatherFunctionVarHoisted(node);
      // `arguments` es un binding implícito en funciones NO-arrow (no existe
      // en arrows). Inyectarlo evita un falso positivo bajo fail-closed:
      // `arguments` es un keyword contextual runtime-safe, no un global.
      // beta.27 BLOCKER-1 (cruce A+B, FP-hunt).
      if (!ts.isArrowFunction(node)) {
        fnScopeBindings.add("arguments");
      }
      // El nombre de una named function-expr está en scope DENTRO de la función — tanto
      // en los defaults de params como en el BODY: `const f = function self(){ return
      // self }` → `self` es la FUNCIÓN, no el global homónimo (deep verify: runtime
      // confirma "IS_FUNCTION"). Sin esto el body lo flaggeaba (FP). Una function
      // DECLARATION ya tiene su nombre en el outer scope; añadirlo es redundante-inocuo.
      if (
        (ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) &&
        node.name
      ) {
        fnScopeBindings.add(node.name.text);
      }
      // Acumular con outer scope. Estas bindings son TODAS non-import
      // (parameters + var hoisted dentro del fn body).
      const bodyContext = {
        ...addToScope(context, fnScopeBindings),
        // Dentro de un cuerpo de función: los reads son call-time. Un nombre
        // declarado a NIVEL DE MÓDULO leído aquí ya está inicializado al llamarse
        // (módulo evaluado) → es un local, no un global, independientemente del
        // orden textual (F4: `function P(){ return X } const X = …`). Render-path
        // directo (fuera de función) sí mantiene el orden TDZ.
        isInFunctionBody: true,
        isInDeferredBody: context.isInDeferredBody || isDeferred,
        // CLIENT-ONLY deferred (hook/handler) vs TIMER (setTimeout/setInterval/
        // queueMicrotask). Sticky: una vez en client-only, los timers anidados
        // también corren en cliente. Los eval-sinks (Function/eval/.constructor)
        // throw en Edge SIEMPRE que se ejecuten, y los timers SÍ disparan en Edge
        // durante SSR → solo se eximen en client-only, NO en timer (deep re-hunt).
        isInClientOnlyDeferredBody:
          context.isInClientOnlyDeferredBody || deferredKind === "client",
        // ¿El cuerpo hereda los guards activos en SU posición de definición?
        // El narrowing es POSICIONAL y sound para todo lo que se invoca según su
        // posición léxica: una función-expr/arrow/método/IIFE solo es llamable
        // DESPUÉS de su definición. Tras un guard-negativo early-return, el server
        // ya retornó → lo definido después es client-only → hereda el guard (clean,
        // SSR-safe). Lo definido ANTES del guard hereda el estado (vacío) → un read
        // se flaggea. Caso 09/10/closure/.map/.reduce → todos correctos heredando.
        //
        // EXCEPCIÓN — function DECLARATION: está HOISTED, llamable ANTES de su
        // posición textual (`const s = read(); if (guard) return; function read(){
        // window }`) o en la rama undefined del guard. Su posición textual NO
        // refleja cuándo se invoca → NO hereda los guards POSICIONALES (negative-
        // early-return acumulados mid-block). Pero SÍ hereda los del BLOQUE entero
        // (`blockEntryGuards`): el positivo de un `if (typeof X !== "undefined") {
        // function read(){ X } }` vale para toda función hoisted del bloque (re-hunt
        // FP5). beta.27 BLOCKER-1 (hunt D + re-hunt).
        activeGuards: ts.isFunctionDeclaration(node)
          ? new Set(context.blockEntryGuards ?? [])
          : context.activeGuards,
      };
      // Los DEFAULTS de los parámetros corren en el scope de PARÁMETROS, padre del
      // body: NO ven los `var` hoisted del body (ES spec). Visitarlos bajo bodyContext
      // suprimía un read del global homónimo de un `var` del body (`function f(x =
      // window.x){ var window }` → el default lee el GLOBAL real → ReferenceError en
      // Edge; deep adversarial bypass). Scope de params = outer + nombres de params
      // (para `f(a, b=a)`) + el nombre de la fn (named function-expr `function self(x =
      // self)`, self visible en sus defaults — codex P2) + `arguments`, SIN los var del
      // body. El body sí usa bodyContext. (Pre-cargar TODOS los params upfront es correcto
      // y compila-equivalente al modelo incremental: un default que referencia un param
      // POSTERIOR directamente lo rechaza tsc — TS2373 "cannot reference identifier
      // declared after it" — así que nunca llega al gate; y el único caso que SÍ compila,
      // un closure que captura un param posterior `f(x = () => p, p)`, lee el PARAM no el
      // global → upfront lo trata bien, el modelo incremental FP-earía. codex P1: no-bug.)
      const paramScope = new Set(context.localBindings);
      if (
        (ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) &&
        node.name
      ) {
        paramScope.add(node.name.text);
      }
      for (const p of node.parameters) addBindingNamesFromPattern(p.name, paramScope);
      if (!ts.isArrowFunction(node)) paramScope.add("arguments");
      const paramContext = { ...bodyContext, localBindings: paramScope };
      const paramNodes = new Set(node.parameters);
      ts.forEachChild(node, (child) => {
        if (child === node.body) {
          visit(child, bodyContext);
        } else if (child === node.name && ts.isComputedPropertyName(child)) {
          // Computed key de método/accessor (`{ [window.x]() {} }`): se EVALÚA al crear
          // el objeto/clase (render path, scope EXTERNO) → si lee un global FLAGGEA aunque
          // un param lo sombree (codex P1). EXCEPCIÓN: un miembro de clase SIN cuerpo
          // (abstract o overload-signature) se BORRA al emit — esbuild emite solo la
          // implementación con cuerpo, su key nunca se evalúa. Saltarla evita el FP
          // (deepest re-hunt #173: abstract/overload computed-key). La implementación
          // (con cuerpo) SÍ visita la key y flaggea un read real.
          const memberErased =
            node.body === undefined &&
            (ts.isMethodDeclaration(node) ||
              ts.isGetAccessorDeclaration(node) ||
              ts.isSetAccessorDeclaration(node));
          if (!memberErased) visit(child, context);
        } else if (ts.isDecorator(child)) {
          // Decoradores de la función/método: se evalúan en la definición (scope externo).
          visit(child, context);
        } else if (paramNodes.has(child)) {
          // Un PARÁMETRO: su DEFAULT corre en el param scope (ve params anteriores), pero
          // sus DECORADORES corren en la DEFINICIÓN (scope externo, antes de que exista el
          // param) → un `m(@(window.x) window)` lee el GLOBAL aunque el param se llame
          // window. Decompón: decoradores→externo, default/tipo/nombre→param (codex P1).
          ts.forEachChild(child, (pc) =>
            visit(pc, ts.isDecorator(pc) ? context : paramContext),
          );
        } else {
          // RETURN TYPE (un type-predicate `x is T` referencia el param → debe verlo;
          // mover esto al scope externo flaggeaba `r` en `refs.filter((r): r is Ref<T> =>
          // …)` — regresión real en composeRefs.ts), type-params y nombre: param scope.
          visit(child, paramContext);
        }
      });
      return;
    }

    // (b.0-ambient) Una clase AMBIENT (`declare class K {…}`) es type-space pura: se
    // borra ENTERA al emit (esbuild no emite nada). NO recursar — su computed-key,
    // tipos de miembro y heritage no leen nada en runtime. Espejo del guard de
    // ModuleDeclaration ambient (b.0a-ns). deepest re-hunt #173: declare-class computed-key.
    if (
      (ts.isClassDeclaration(node) || ts.isClassExpression(node)) &&
      isAmbientDeclaration(node)
    ) {
      return;
    }

    // (b.0) Class: el NOMBRE de la clase está en scope DENTRO de su propio cuerpo
    // — métodos, getters/setters y static blocks corren DESPUÉS de que la clase
    // se define, así que pueden referenciarla (`class Theme { resolve(){ return
    // Theme.defaultColor; } }`). Bajo fail-closed, sin pre-cargar el nombre, esa
    // self-reference se flaggeaba como global bare (FP, re-hunt). El nombre no es
    // un global → añadirlo solo quita FP; si colisiona con un global, la clase
    // LO SOMBREA de verdad (runtime). beta.27 BLOCKER-1.
    if (
      (ts.isClassDeclaration(node) || ts.isClassExpression(node)) &&
      node.name
    ) {
      const classCtx = addToScope(context, new Set([node.name.text]));
      ts.forEachChild(node, (child) => visit(child, classCtx));
      return;
    }

    // (b.0a) Static block de clase: su cuerpo es un SCOPE de var-hoisting PROPIO
    // — los `var` declarados dentro son locales al bloque (no se hoistan a la
    // clase ni a la función externa; por eso collectVarHoistedRecursive PARA en
    // la clase). Sin pre-cargarlos, leer el propio `var` homónimo de un global
    // (`static { var window = {…}; window.x }`) se flaggeaba como global bare
    // (FP, codex P2). Espejo del var-hoist del namespace/función. Soundness: el
    // acceso al GLOBAL real dentro del bloque (sin local) lo sigue flaggeando,
    // y el `var` NO se hoista fuera de la clase (la rama de clase corta el leak).
    if (ts.isClassStaticBlockDeclaration(node) && node.body) {
      const preloaded = gatherBlockFunctionDeclarations(node.body);
      ts.forEachChild(node.body, (child) =>
        collectVarHoistedRecursive(child, preloaded),
      );
      visitOrderedStatements(node.body.statements, context, preloaded);
      return;
    }

    // (b.0a-ns) Una ModuleDeclaration AMBIENT (`declare global`, `declare namespace`,
    // `declare module`) es type-space puro: se borra al emit, no hay reads runtime. NO
    // recursar — un `declare global { class X extends HTMLElement {} }` (augmentación
    // de custom-elements, idiomática en un DS) flaggeaba `HTMLElement` aunque no emite
    // nada (deep adversarial FP). El class-extends ahí NO es runtime (a diferencia de un
    // `namespace NS { class C extends window.Base }` instanciado, que sí emite y flaggea).
    if (ts.isModuleDeclaration(node) && isAmbientDeclaration(node)) {
      return;
    }

    // (b.0b) Namespace/module: el cuerpo es un SCOPE — sus declaraciones locales
    // (const/let/function/class…) son visibles dentro. Procesarlo como un Block
    // (scope-tracked) evita un FP sobre reads de sus propios locales (`namespace N
    // { const SEP = ","; export function f(){ return x.join(SEP); } }`). El NOMBRE
    // del namespace también es un binding runtime dentro de su cuerpo (la IIFE
    // emitida) — `N.x` self-reference; se añade al scope. Para `A.B`, A se añade
    // al entrar A y B al entrar B (la recursión usa el nsCtx con A ya dentro), así
    // que ambos quedan en scope en el cuerpo de B (codex P2). El acceso EXTERNO a
    // un namespace elidido lo siguen flaggeando los colectores del shadow-set.
    if (ts.isModuleDeclaration(node) && node.body) {
      const nsCtx =
        node.name && ts.isIdentifier(node.name)
          ? addToScope(context, new Set([node.name.text]))
          : context;
      if (ts.isModuleBlock(node.body)) {
        const preloaded = gatherBlockFunctionDeclarations(node.body);
        // `var` declarations del cuerpo: hoisted al scope de la IIFE del namespace
        // (`namespace N { var window = {x:1}; … window.x … }` → window es local).
        // extractPostStatementBindings salta `var`, así que se precargan aquí
        // (espejo de gatherFunctionVarHoisted para function bodies). codex P2.
        ts.forEachChild(node.body, (child) =>
          collectVarHoistedRecursive(child, preloaded),
        );
        visitOrderedStatements(node.body.statements, nsCtx, preloaded);
      } else {
        // `namespace A.B {}` — el body es otro ModuleDeclaration (la `B`).
        visit(node.body, nsCtx);
      }
      return;
    }

    // (b.1) Block: pre-cargar function declarations (block-scoped pero
    // pre-initialized desde block-entry, round 13 P1.1), luego iterar
    // statements en orden añadiendo let/const/class al scope solo
    // DESPUÉS de visitar cada statement (round 13 P1.2 — los reads
    // antes de la declaración deben ver el global, no el local en TDZ).
    if (ts.isBlock(node)) {
      const blockFns = gatherBlockFunctionDeclarations(node);
      visitOrderedStatements(node.statements, context, blockFns);
      return;
    }

    // (b.1b) CaseBlock: la spec ES define el body de un switch como un
    // SOLO lexical scope compartido entre TODOS los CaseClause/DefaultClause.
    // let/const/class declarados en cualquier case son visibles en los
    // siguientes cases (TDZ-aware). Function declarations pre-cargadas
    // del CaseBlock entero. Codex round 14 P2.2.
    if (ts.isCaseBlock(node)) {
      const blockFns = new Set();
      for (const clause of node.clauses) {
        for (const stmt of clause.statements) {
          if (ts.isFunctionDeclaration(stmt) && stmt.name && !isAmbientDeclaration(stmt)) {
            blockFns.add(stmt.name.text);
          }
        }
      }
      // `switch (typeof X) { … }`: X está PRESENTE en los cases que lo implican —
      // equivalente a `if (typeof X === "<tipo>")`. Sound con fall-through: solo
      // narrowea un clause si NO se puede entrar por fall-through desde un case
      // ausente/desconocido (es el primero O el anterior TERMINA), y el `default`
      // solo si hay un `case "undefined"` que captura el caso ausente. deepest
      // re-hunt #173 (switch-discriminant). SAFE/NON_ABSENCE_DENIALS excluidos.
      let typeofName = null;
      let hasUndefinedCase = false;
      const sw = node.parent;
      if (sw && ts.isSwitchStatement(sw)) {
        let disc = sw.expression;
        while (disc && isErasedOuterExpr(disc)) disc = disc.expression;
        if (ts.isTypeOfExpression(disc)) {
          let op = disc.expression;
          while (op && isErasedOuterExpr(op)) op = op.expression;
          if (
            ts.isIdentifier(op) &&
            !SAFE_GLOBALS.has(op.text) &&
            !NON_ABSENCE_DENIALS.has(op.text)
          ) {
            typeofName = op.text;
          }
        }
        for (const clause of node.clauses) {
          if (
            ts.isCaseClause(clause) &&
            foldConstString(clause.expression) === "undefined"
          ) {
            hasUndefinedCase = true;
          }
        }
      }
      let current = addToScope(context, blockFns);
      // El CaseBlock es UN scope léxico compartido por TODAS las clauses → purgar
      // guardAliases de los nombres block-lexical (const/let/class/function de cualquier
      // clause) al ENTRAR, igual que visitOrderedStatements. Sin esto, `const has = ...;
      // switch (x) { case 0: const fn = () => has ? X : 0; const has = true; return fn(); }`
      // resolvería `has` al guard outer aunque runtime lo liga al binding interno del
      // CaseBlock = BYPASS (codex P2). var NO entra (function-scoped).
      const caseLexical = new Set();
      for (const clause of node.clauses) {
        for (const n of gatherBlockLexicalNames(clause.statements)) {
          caseLexical.add(n);
        }
      }
      current = purgeGuardAliasShadows(current, caseLexical);
      // PRE-CARGA de sombras léxicas no-react (codex P1 round-10) — todo el CaseBlock es
      // UN scope léxico, así que un `const useEffect = Sync.run` en cualquier clause sombrea
      // las funciones de cualquier otro.
      {
        const caseShadows = new Set();
        for (const clause of node.clauses) {
          for (const n of gatherNonReactLexicalShadows(
            clause.statements,
            current.reactImports,
            current.nonImportBindings,
          )) {
            caseShadows.add(n);
          }
        }
        if (caseShadows.size > 0) {
          current = {
            ...current,
            nonImportBindings: new Set([...current.nonImportBindings, ...caseShadows]),
          };
        }
      }
      let prevTerminates = true; // antes del 1er clause no hay fall-through entrante
      for (const clause of node.clauses) {
        if (ts.isCaseClause(clause) && clause.expression) {
          visit(clause.expression, current);
        }
        // Los guards por early-return son POR-CLAUSE: entrar directamente en
        // otra clause NO ejecuta el `if` guard, así que el narrowing NO debe
        // cruzar el boundary (si lo hiciera, sería un FN). Por eso van en un
        // `clauseCtx` que resetea en cada clause. Los bindings let/const SÍ se
        // comparten (scope léxico del switch) → se acumulan en `current`.
        // beta.27 BLOCKER-1 (codex P2 round 5: guard no propagado en switch).
        let clauseCtx = current;
        if (typeofName) {
          const present = ts.isCaseClause(clause)
            ? prevTerminates &&
              (() => {
                const lbl = foldConstString(clause.expression);
                return lbl !== undefined && lbl !== "undefined";
              })()
            : prevTerminates && hasUndefinedCase; // default
          if (present) {
            clauseCtx = {
              ...clauseCtx,
              activeGuards: new Set([...clauseCtx.activeGuards, typeofName]),
            };
          }
        }
        for (const stmt of clause.statements) {
          visit(stmt, clauseCtx);
          const { all, nonImport } = extractPostStatementBindings(stmt, current.reactImports, current.nonImportBindings);
          current = addToScope(current, all, nonImport);
          clauseCtx = addToScope(clauseCtx, all, nonImport);
          const negGuards = extractNegativeEarlyReturnGuards(stmt, clauseCtx.guardAliases);
          if (negGuards.size > 0) {
            clauseCtx = {
              ...clauseCtx,
              activeGuards: new Set([...clauseCtx.activeGuards, ...negGuards]),
            };
          }
        }
        prevTerminates = caseClauseTerminates(clause.statements);
      }
      return;
    }

    // (b.2) CatchClause: el catch param es block-scoped al body del catch.
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      const catchBindings = new Set();
      addBindingNamesFromPattern(
        node.variableDeclaration.name,
        catchBindings,
      );
      if (catchBindings.size > 0) {
        const bodyContext = addToScope(context, catchBindings);
        ts.forEachChild(node, (child) => visit(child, bodyContext));
        return;
      }
    }

    // (b.3) For/ForIn/ForOf/While: (1) el binding let/const del for-init es visible
    // en condition/incrementor/body, no más allá. (2) un typeof-guard POSITIVO en la
    // condición narrowea el BODY — el body solo corre con la condición truthy, que
    // exige el guard true → el identificador está definido (F3). do-while NO entra:
    // su body corre ANTES del primer check. Solo POSITIVO (collectConjunctionGuards):
    // un `||` o un guard negativo en la condición NO garantiza presencia en el body.
    if (
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node)
    ) {
      const forBindings = new Set();
      const init = ts.isWhileStatement(node) ? undefined : node.initializer;
      if (
        init &&
        ts.isVariableDeclarationList(init) &&
        isBlockScopedDeclList(init.flags)
      ) {
        for (const decl of init.declarations) {
          addBindingNamesFromPattern(decl.name, forBindings);
        }
      }
      const cond = ts.isWhileStatement(node) ? node.expression : node.condition;
      const bodyGuards = new Set();
      if (cond) collectConjunctionGuards(cond, bodyGuards, context.guardAliases);
      if (forBindings.size > 0 || bodyGuards.size > 0) {
        const baseCtx =
          forBindings.size > 0 ? addToScope(context, forBindings) : context;
        const bodyCtx =
          bodyGuards.size > 0
            ? {
                ...baseCtx,
                activeGuards: new Set([...baseCtx.activeGuards, ...bodyGuards]),
              }
            : baseCtx;
        // El body (.statement) hereda los guards; el resto (init/condition/
        // incrementor/expression) solo el scope del for-init, sin los guards.
        ts.forEachChild(node, (child) =>
          visit(child, child === node.statement ? bodyCtx : baseCtx),
        );
        return;
      }
    }

    // (c) Detectar acceso a client global o dynamic eval sink. Cubre:
    //   - PropertyAccessExpression (`x.y`, `x?.y`)
    //   - ElementAccessExpression (`x[y]`, `x?.[y]`)
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const expr = node.expression;
      if (ts.isIdentifier(expr)) {
        const api = expr.text;
        const isUnsafeGlobal = !SAFE_GLOBALS.has(api);
        const isEvalSink = DYNAMIC_EVAL_SINKS.has(api);
        if (isUnsafeGlobal || isEvalSink) {
          // Si el binding está shadow-eado por una local (parameter, var,
          // import, etc.), NO es ref al global — skip. También skip si el
          // property-access está en una heritage TYPE-ONLY (`interface X extends
          // navigator.Foo`) — se borra, no hay read runtime (re-hunt FP).
          // Exención en body diferido: política única (NON_ABSENCE_DENIALS solo en
          // client-only; el resto en cualquier deferred). Ver isExemptInDeferredBody.
          const deferredExempt = isExemptInDeferredBody(api, context);
          if (
            !context.localBindings.has(api) &&
            !deferredExempt &&
            // Nombre declarado a nivel de módulo leído DENTRO de una función (call-
            // time) = local inicializado, no un global — independiente del orden
            // textual (F4: forward value-read). El espejo JSX (regla 9) ya lo hacía.
            !(context.isInFunctionBody && moduleDeclaredNames.has(api)) &&
            !isInTypeOnlyHeritageExpr(node)
          ) {
            if (!context.activeGuards.has(api)) {
              const start = node.getStart(sourceFile);
              const { line } = sourceFile.getLineAndCharacterOfPosition(start);
              const lineText =
                content.split("\n")[line]?.trim().slice(0, 80) ?? "";
              violations.push({
                file: relPath,
                rule: isEvalSink ? "no-dynamic-eval-sink" : "no-bare-dom-access",
                line: line + 1,
                detail: isEvalSink
                  ? `acceso a \`${api}.*\` (dynamic eval sink — bypassea el AST gate): ${lineText}`
                  : `acceso a \`${api}.*\` — \`${api}\` no es global server-safe (ni ES builtin ni global de Node ≥22.12) y no hay guard typeof activo: ${lineText}`,
              });
            }
          }
        }
      }
    }

    // (c.2) Dynamic eval sink vía Function constructor alcanzable por
    // `.constructor` SIN nombrar `Function`. El constructor del constructor
    // de CUALQUIER valor ES `Function` (`[].constructor` → Array;
    // `Array.constructor` → Function), así que `x.constructor.constructor`
    // evalúa código desde un string igual que `eval`/`Function` y bypassea el
    // AST gate. La rama (c) solo lo cazaba cuando la base era un identificador
    // denegado (`globalThis.constructor.*` colateral); con base literal/SAFE
    // pasaba. Flaggeamos un member access `constructor` (`x.constructor` o
    // `x["constructor"]`) cuando está "weaponizado":
    //   (a) su BASE es OTRO member access `constructor` — la cadena
    //       `x.constructor.constructor` ES el Function constructor, se llame
    //       o no (cubre la forma partida `const F = x.constructor.constructor;
    //       F("code")()` y `.call`/`.apply` sobre él), o
    //   (b) es el CALLEE de una CallExpression — `f.constructor("code")`
    //       sobre una base que ya es función.
    // Los usos legítimos (`err.constructor.name`, `x.constructor === Y`, clon
    // `new x.constructor()`, `this.constructor.name`) NO cumplen (a) ni (b)
    // → 0 FP.
    //
    // FRONTERA = LEGIBLE vs OFUSCADO (no decidible vs indecidible): el gate
    // caza lo que un revisor vería leyendo el diff — las formas CONTIGUAS de
    // `.constructor`. RESIDUALES CONOCIDOS POR DISEÑO (detalle en el ADR
    // docs/decisions/D1-P1-server-safe-marker.md, "Frontera del eval-sink") —
    // requieren data-flow / keys computadas / reflexión, y son ofuscación
    // deliberada que no escribe nadie por accidente:
    //   1. cadena partida en vars:  const c = x.constructor; c.constructor("x")()
    //   2. destructuring:           const { constructor: F } = x.constructor; F("x")()
    //   3. computed key vía variable: const k = "constructor"; x[k][k]("x")()
    //   4. reflexión: `Reflect.apply/construct/get(x,"constructor")`, getter
    //   5. `new x.constructor("code")` (colisiona con el clon legítimo — no
    //      separable sin type-info)
    // El caso 3 es la CLASE de indirección, no "la forma const-literal": el
    // mismo ataque tiene infinitas escrituras (let, concat, alias, propiedad de
    // objeto, Reflect, …) — verificadas pasando. Un "Nivel 1" (constant-fold de
    // `const k="constructor"`) cazaría UNA y dejaría pasar el resto → FALSA
    // COMPLETITUD: documentar "manejamos computed-key" sería mentir, y contra un
    // adversario el catch parcial es teatro (usa la escritura siguiente). Además
    // todo computed-key peligroso ya se caza por la RAÍZ (`globalThis[k]` flaggea
    // pase lo que pase). Se EVALUÓ y DESCARTÓ. Ver ADR "Frontera del eval-sink".
    // Se aceptan porque `@server-safe` es opt-in/first-party, NO una frontera
    // de seguridad: un bypass solo crashea RUIDOSO en el consumer del propio
    // contributor (sin activo ni adversario), y lo ofuscado es deliberado →
    // el no-adversario ya descartado. CADUCIDAD: si `@server-safe` deja de ser
    // opt-in/first-party (frontera de confianza sobre código no auditado), esta
    // decisión queda ANULADA.
    // beta.27 BLOCKER-1 (cruce A+B, FN-hunt + re-review).
    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      isConstructorMemberAccess(node) &&
      // eval-sink: throw en Edge siempre → solo exento en client-only deferred,
      // NO en timer (queueMicrotask/setTimeout fire en Edge). deep re-hunt.
      !context.isInClientOnlyDeferredBody &&
      // (a) doble `x.constructor.constructor`; (b) callee directo
      // `x.constructor(...)`; (c) `x.constructor.call/.apply/.bind`; (d) tagged
      // `x.constructor\`code\``. Todas saltando ParenthesizedExpression a ambos
      // lados (`((x).constructor)()` ≡ `x.constructor()`). El control
      // `[].slice.bind(...)` NO flaggea: `.slice` no es `.constructor`.
      isWeaponizedConstructorAccess(node)
    ) {
      const start = node.getStart(sourceFile);
      const { line } = sourceFile.getLineAndCharacterOfPosition(start);
      const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
      violations.push({
        file: relPath,
        rule: "no-dynamic-eval-sink",
        line: line + 1,
        detail: `acceso a \`.constructor.constructor\` / invocación de \`.constructor\` (Function constructor alcanzable desde cualquier base — dynamic eval sink que bypassea el AST gate): ${lineText}`,
      });
    }

    // (d) Detectar bare identifier reference a client global. Cubre:
    //   - `const w = window`
    //   - `if (document)`
    //   - `f(navigator)`
    //   - `{ window }` (ShorthandPropertyAssignment — `{ window: window }`)
    //   - `arr.push(globalThis)`
    //   - `return process`
    //
    // Cualquier posición sintáctica de read del binding cuenta. Las
    // posiciones de declaration / property name / type / typeof short-
    // circuit se filtran via `isNonReferencePosition`. La rama (c) ya
    // captura `window.foo` / `window["foo"]` sobre el outer Property/
    // ElementAccess — aquí explícitamente skipeamos para evitar doble
    // flag (rule 10 de isNonReferencePosition).
    //
    // Codex round 11 P1.2: este check faltaba — los reads bare lanzan
    // ReferenceError igual que property accesses si el binding no existe.
    if (ts.isIdentifier(node)) {
      const api = node.text;
      const isUnsafeGlobal = !SAFE_GLOBALS.has(api);
      const isEvalSink = DYNAMIC_EVAL_SINKS.has(api);
      if (isUnsafeGlobal || isEvalSink) {
        if (
          !context.localBindings.has(api) &&
          // Forward value-read de un nombre module-declared dentro de una función
          // (call-time → ya inicializado, es local no global). Ver rama (c)/F4.
          !(context.isInFunctionBody && moduleDeclaredNames.has(api)) &&
          !isNonReferencePosition(node, moduleDeclaredNames)
        ) {
          // Exención en body diferido: política única (NON_ABSENCE_DENIALS solo en
          // client-only; el resto en cualquier deferred). Ver isExemptInDeferredBody.
          const deferredExempt = isExemptInDeferredBody(api, context);
          if (!deferredExempt && !context.activeGuards.has(api)) {
            const start = node.getStart(sourceFile);
            const { line } = sourceFile.getLineAndCharacterOfPosition(start);
            const lineText =
              content.split("\n")[line]?.trim().slice(0, 80) ?? "";
            violations.push({
              file: relPath,
              rule: isEvalSink ? "no-dynamic-eval-sink" : "no-bare-dom-access",
              line: line + 1,
              detail: isEvalSink
                ? `referencia a \`${api}\` (dynamic eval sink — bypassea el AST gate): ${lineText}`
                : `referencia bare a \`${api}\` — no es global server-safe (ni ES builtin ni global de Node ≥22.12) y no hay guard typeof activo: ${lineText}`,
            });
          }
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, context));
  }

  /**
   * Itera statements en orden, manteniendo un running scope. Pre-loads
   * function declarations IMMEDIATE en este scope (pre-initialized desde
   * scope-entry per ESM semantics) y añade let/const/class al scope
   * DESPUÉS de visitar cada statement (TDZ-aware order: reads antes de
   * la declaración ven el outer scope, no el local en TDZ).
   *
   * Codex round 13 P1.1 + P1.2: corrige hoisting de function decls en
   * nested blocks (block-scoped, no function-scoped) y TDZ de let/const
   * (visible solo desde la declaración hacia adelante).
   */
  function visitOrderedStatements(statements, context, preloadedFns) {
    // Los guards activos al ENTRAR el bloque (p.ej. el positivo de un `if (typeof
    // X !== "undefined") { … }` envolvente) valen para TODO el bloque, incluidas
    // las function declarations hoisted. Se preservan en `blockEntryGuards` a
    // través de la acumulación de negative-early-return guards, que son
    // POSICIONALES (solo valen tras su statement). Un fn-decl resetea a estos, no
    // a vacío (re-hunt FP5: fn-decl en bloque positive-guard).
    let current = {
      ...addToScope(context, preloadedFns),
      blockEntryGuards: context.activeGuards,
    };
    // TDZ / lexical scope: un `const`/`let`/`class`/`function` block-scoped con el nombre
    // de un guard-alias OUTER lo SOMBREA para TODO el bloque (no solo tras su declaración).
    // La purga posicional de addToScope no cubre los usos ANTERIORES a la declaración
    // (un closure `const f = () => has ? X : 0; const has = true; f()` resuelve `has` al
    // guard outer aunque runtime lo liga al binding interno → BYPASS, codex P2). Purgamos
    // esos nombres al ENTRAR el bloque; el alias propio se re-añade posicionalmente tras
    // su `const X = <guard>`.
    current = purgeGuardAliasShadows(current, gatherBlockLexicalNames(statements));
    // PRE-CARGA de sombras léxicas no-react en nonImportBindings: una función visitada
    // ANTES de un `const useEffect = Sync.run` posterior debe ver el shadow para que el
    // deferred-hook shadow-guard dispare (codex P1 round-10, scope-aware no posicional).
    // Solo nonImportBindings (no localBindings, para no tocar el shadow-de-global/TDZ).
    {
      const lexShadows = gatherNonReactLexicalShadows(
        statements,
        current.reactImports,
        current.nonImportBindings,
      );
      if (lexShadows.size > 0) {
        current = {
          ...current,
          nonImportBindings: new Set([...current.nonImportBindings, ...lexShadows]),
        };
      }
    }
    for (const stmt of statements) {
      visit(stmt, current);
      const { all, nonImport } = extractPostStatementBindings(stmt, current.reactImports, current.nonImportBindings);
      current = addToScope(current, all, nonImport);
      // Alias booleano de guard: `const has = typeof X !== "undefined"` → los statements
      // POSTERIORES pueden usar `has` como el guard (`has ? X : …`). Solo const; el map
      // se copia (no se muta) para no filtrar a scopes hermanos. deepest re-hunt #173.
      const alias = extractConstGuardAlias(stmt, current.guardAliases);
      if (alias) {
        current = {
          ...current,
          guardAliases: new Map([...current.guardAliases, alias]),
        };
      }
      // Narrowing por early-return: tras `if (typeof X === "undefined") return;`
      // X existe en los statements posteriores del bloque → guard activo.
      const negGuards = extractNegativeEarlyReturnGuards(stmt, current.guardAliases);
      if (negGuards.size > 0) {
        current = {
          ...current,
          activeGuards: new Set([...current.activeGuards, ...negGuards]),
        };
      }
    }
  }

  // Initial scope: imports + var hoisted (module-preloaded).
  // `all` contiene imports + var; `nonImports` solo var. Necesario para
  // distinguir `import { useEffect } ...; useEffect(cb)` (legítimo, exempt
  // como deferred sink) de `function useEffect(cb) { cb(); }` (shadow
  // local, no es el hook real). Codex round 16 P2.2.
  const { all: moduleAll, nonImports: moduleNonImports } =
    gatherModulePreloadedBindings(sourceFile);
  const sourceFileFns = gatherSourceFileFunctionDeclarations(sourceFile);
  const reactImports = gatherReactImports(sourceFile);
  const baseContext = {
    activeGuards: new Set(),
    blockEntryGuards: new Set(),
    guardAliases: new Map(),
    isInDeferredBody: false,
    isInClientOnlyDeferredBody: false,
    isInFunctionBody: false,
    localBindings: moduleAll,
    nonImportBindings: moduleNonImports,
    reactImports,
  };
  visitOrderedStatements(sourceFile.statements, baseContext, sourceFileFns);
  return violations;
}

// ─── Exports (para tests) ──────────────────────────────────────
//
// `checkSourceFile`, `SAFE_GLOBALS`, `INTENTIONAL_DENY` y
// `DYNAMIC_EVAL_SINKS` se exportan para que
// `src/_audit/server-safe-gate.test.ts` y
// `src/__tests__/server-safe-catalog-vs-node.test.ts` puedan validar el
// modelo fail-closed (whitelist) y que cada bypass conocido (eval,
// Function, Reflect.construct, etc.) realmente lo caza el gate.
//
// `checkFileWithImports`, `resolveImportPath`, `extractModuleReferences`
// añadidos en beta.26 HIGH-2 para validar el cierre de smuggling cross-
// módulo (Claude HIGH-4 del cruce beta.25). Los tests construyen virtual
// FS con fixtures multi-archivo (componente entry + util sucio + barrel)
// y comprueban que el orquestador caza la violation con chain completa.
//
// El runtime CLI sigue invocando primero `listSourceFiles` + filtro
// `@server-safe`, pero luego usa `checkFileWithImports` (no
// `checkSourceFile` directamente) para que el smuggling cross-módulo se
// chequee también en CI.
export {
  SAFE_GLOBALS,
  INTENTIONAL_DENY,
  EDGE_MISSING_GLOBALS,
  DYNAMIC_EVAL_SINKS,
  checkSourceFile,
  checkFileWithImports,
  resolveImportPath,
  extractModuleReferences,
  getTsconfigPaths,
};

// ─── Main (solo si se invoca como CLI) ─────────────────────────

// Detección CLI-entry robusta frente a `process.argv[1]` relativo
// (caso normal cuando npm invoca el script: `node scripts/check-...mjs`
// resuelve `argv[1]` al string literal pasado, NO al path absoluto).
// `pathToFileURL` normaliza ambos casos (relativo y absoluto) al
// mismo file URL absoluto que `import.meta.url`. Codex P1 sobre PR #99.
const isCliEntry =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

/**
 * Recorre el AST COMPLETO buscando el tag JSDoc `@server-safe` y:
 *   - devuelve `true` si hay un marker en posición CANÓNICA (JSDoc de un
 *     statement top-level del módulo),
 *   - FALLA RUIDOSAMENTE (throw) si encuentra el marker en posición
 *     ANIDADA (función interna, método, bloque…).
 *
 * beta.27 BLOCKER-1 (cruce A+B claudegate6): el predecesor solo iteraba
 * `sourceFile.statements` (top-level). Un `@server-safe` en un JSDoc
 * anidado pasaba INADVERTIDO → el archivo no se trataba como marcado →
 * no se auditaba → fail-open silencioso (el dev cree que el invariante se
 * enforça y no es así). Fail-loud (no detección permisiva) fuerza la forma
 * canónica: un marker mal colocado es un ERROR del gate, no comportamiento
 * no especificado que luego se congela.
 *
 * CRÍTICO — usamos `node.jsDoc` (los bloques JSDoc attachados a ESTE nodo
 * host), NO `ts.getJSDocTags(node)`. Dos razones:
 *   1. `getJSDocTags` devuelve solo el ÚLTIMO de varios bloques JSDoc
 *      consecutivos — un `@server-safe` en un bloque previo pasaría
 *      inadvertido (fail-open silencioso: el archivo no se auditaría). Cruce
 *      A+B beta.27.
 *   2. `getJSDocTags` hereda el tag a varios nodos (statement +
 *      declaration + identifier + initializer), forzando un filtro
 *      `tag.parent.parent === node`. `node.jsDoc` solo está en el host real,
 *      así que cada bloque se cuenta UNA vez sin filtro.
 *
 * @param {import("typescript").SourceFile} sourceFile
 * @param {string} relPath
 * @returns {boolean} true si hay `@server-safe` en un statement top-level.
 * @throws {Error} si hay `@server-safe` en posición anidada (no soportada).
 */
function detectServerSafeMarker(sourceFile, relPath) {
  const topLevel = new Set(sourceFile.statements);
  let marked = false;
  const misplacedLines = [];

  const visit = (node) => {
    // `node.jsDoc`: array de bloques JSDoc attachados a este host (no se
    // hereda a hijos). Iteramos TODOS los bloques (no solo el último) para no
    // perder un marker en un bloque previo.
    const jsDocBlocks = node.jsDoc;
    if (Array.isArray(jsDocBlocks)) {
      for (const block of jsDocBlocks) {
        for (const tag of block.tags ?? []) {
          if (tag.tagName.text !== "server-safe") continue;
          // Solo cuenta si el tag está en posición CANÓNICA: al inicio de
          // una línea del JSDoc (tras `/**` o ` * `), no embebido en prosa.
          // TS parsea `@server-safe` como tag aunque aparezca mid-sentence
          // ("no es @server-safe por sí sola"); sin este filtro, prosa en un
          // JSDoc anidado lanzaría un fail-loud FALSO (build break) y prosa
          // top-level marcaría el archivo por error. beta.27 BLOCKER-1.
          const tagPos = tag.getStart(sourceFile);
          const { line, character } =
            sourceFile.getLineAndCharacterOfPosition(tagPos);
          // Normalizamos quitando caracteres invisibles de ancho cero (ZWSP
          // U+200B, ZWNJ, ZWJ, BOM) del prefijo antes del check: un zero-width
          // colado por copy-paste justo antes del `@` no debe SILENCIAR el
          // marker (el archivo dejaría de auditarse sin que nadie lo vea —
          // fail-open accidental, mismo eje que el marker anidado). beta.27
          // BLOCKER-1 (cruce A+B, re-review).
          const linePrefix = sourceFile.text
            .slice(tagPos - character, tagPos)
            .replace(/[\u200B-\u200D\uFEFF]/g, "");
          if (!/^[\s*/]*$/.test(linePrefix)) continue;
          if (topLevel.has(node)) {
            marked = true;
          } else {
            misplacedLines.push(line + 1);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  for (const stmt of sourceFile.statements) visit(stmt);

  if (misplacedLines.length > 0) {
    const plural = misplacedLines.length > 1;
    throw new Error(
      `[server-safe gate] marker \`@server-safe\` en posición no soportada ` +
        `en ${relPath} (línea${plural ? "s" : ""} ${misplacedLines.join(", ")}). ` +
        `El marker SOLO es válido en el JSDoc de un statement top-level del ` +
        `módulo — un marker anidado pasaría inadvertido (fail-open silencioso). ` +
        `Mueve el JSDoc al export/declaración top-level del componente.`,
    );
  }
  return marked;
}

/**
 * Detección AST del marker `@server-safe` (#158, beta.27).
 *
 * El predecesor era `content.includes("@server-safe")` — substring
 * laxa que cazaba 3 vectores de falsos positivos:
 *   (a) String literals que mencionan el marker en texto.
 *   (b) Line comments en prosa describiendo cuándo NO usarlo.
 *   (c) Block comments NO-JSDoc (un solo asterisco al abrir).
 *
 * El parser de JSDoc de TypeScript solo reconoce `@server-safe` como
 * tag cuando aparece en un bloque JSDoc real (doble asterisco). Sigue
 * siendo posible que un contributor escriba prosa con `@server-safe`
 * dentro de un JSDoc y el parser lo capture como tag — eso es propio
 * del parser de JSDoc, no de nuestra detección. La mejora cierra los
 * 3 vectores (a)/(b)/(c) sin coste.
 *
 * @param {string} content - Source text del archivo.
 * @param {string} relPath - Path relativo (para script kind detection).
 * @returns {boolean} true si algún statement top-level tiene
 *   `@server-safe` en su JSDoc.
 */
export function isContentServerSafeMarked(content, relPath) {
  const sourceFile = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  return detectServerSafeMarker(sourceFile, relPath);
}

if (isCliEntry) {
  const allFiles = [
    ...listSourceFiles(COMPONENTS_DIR),
    ...listSourceFiles(HOOKS_DIR),
  ];

  // Cache compartida cross-entries: un util importado por N componentes
  // se parsea y analiza UNA vez. Sin esto, el coste pasa de O(N+M) a
  // O(N·M) (N = marked entries, M = utils tocados). Codex/Claude HIGH-2
  // del cruce beta.25. Hoisted antes del filtro de marker detection para
  // compartir el parse entre las dos fases (#158).
  const parseCache = new Map();

  function isFileServerSafeMarked(filePath) {
    let cached = parseCache.get(filePath);
    if (!cached) {
      const content = readFileSync(filePath, "utf8");
      const relRaw = relative(repoRoot, filePath);
      const relPath = relRaw.split(pathSep).join("/");
      const sourceFile = ts.createSourceFile(
        relPath,
        content,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
        relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      cached = { sourceFile, content };
      parseCache.set(filePath, cached);
    }
    const relRaw = relative(repoRoot, filePath);
    const relPath = relRaw.split(pathSep).join("/");
    return detectServerSafeMarker(cached.sourceFile, relPath);
  }

  const markedFiles = allFiles.filter((f) => isFileServerSafeMarked(f));
  // `visited` se RECREA por entry: si visit-eamos un util al chequear el
  // primer entry, lo skipearíamos en los siguientes y perderíamos
  // reporting de la cadena correcta (cada entry necesita ver el path
  // completo desde sí mismo). Lo que SÍ se comparte es el parseCache.
  const allViolations = [];
  for (const file of markedFiles) {
    const visited = new Set();
    allViolations.push(
      ...checkFileWithImports(file, { parseCache, visited }),
    );
  }

  if (allViolations.length === 0) {
    console.log(
      `✓ @server-safe invariant holds (${String(markedFiles.length)} files marked, 0 violations, ${String(parseCache.size)} files parsed total) [AST]`,
    );
    process.exit(0);
  }

  console.error(
    `\n${String(allViolations.length)} @server-safe violation(s) detected:\n`,
  );
  for (const v of allViolations) {
    const loc = v.line !== undefined ? `:${String(v.line)}` : "";
    console.error(`  [${v.rule}] ${v.file}${loc}`);
    if (v.chain && v.chain.length > 1) {
      console.error(`    via: ${formatChain(v.chain)}`);
    }
    console.error(`    ${v.detail}`);
  }
  console.error(
    `\nFix options:\n` +
      `  - Remove @server-safe marker if the component genuinely needs client APIs.\n` +
      `  - Guard the access with \`typeof X !== "undefined"\` if it's truly conditional.\n` +
      `  - Move the access inside useEffect/event handler (no render side-effect).\n` +
      `  - For dynamic eval sinks (eval/Function): no guard available — refactor.\n` +
      `  - For transitive violations (with \`via:\` chain): refactor the offending\n` +
      `    util to be server-safe, OR move the call into a deferred sink in the\n` +
      `    importer (useEffect / handler), OR break the import.\n` +
      `  - For unresolved-import: fix the path. The gate fails loudly here to\n` +
      `    prevent silent bypass — an import we cannot follow is an import we\n` +
      `    cannot vouch for.\n`,
  );
  process.exit(1);
}
