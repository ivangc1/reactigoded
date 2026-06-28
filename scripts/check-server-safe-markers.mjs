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
import { isBuiltin } from "node:module";

// ¿`specifier` resuelve a un builtin de Node (bare `fs`, prefijado `node:fs`, subpath `fs/promises`)?
// ORÁCULO = `module.isBuiltin` (la enumeración canónica del runtime, NO una lista a mano → sin la
// deriva de denylist que motivó #173). Subsume el check de esquema `node:`: isBuiltin('node:test')=true,
// isBuiltin('test')=false (prefix-only → bare `test` NO es builtin, no se deniega). Normaliza el subpath
// (corta por el 1er `/` tras quitar `node:`) por si una versión de Node no resuelve `fs/promises` directo.
function isNodeBuiltinSpecifier(specifier) {
  if (isBuiltin(specifier)) return true;
  const base = specifier.replace(/^node:/, "").split("/")[0];
  return base !== specifier && isBuiltin(base);
}
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
//     no `geolocation`/`mediaDevices`) — el ROOT está presente (Node 22+/edge) pero
//     PARCIAL, así que `typeof navigator !== "undefined"` da falsa confianza y
//     `navigator.geolocation.x` revienta en SSR. Por eso va TAMBIÉN en
//     NON_ABSENCE_DENIALS (como setImmediate): presence-guard/timer NO eximen, solo
//     deferred client-only. codex P2.
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
  // SOLO los CONSTRUCTORES `Performance*` son Edge-missing (no se instancian en el isolate). La
  // INSTANCIA `performance` (lowercase) SÍ está en Edge — verificado conductualmente en @edge-runtime/vm
  // (`typeof performance === "object"`, `performance.now()` corre) + ADR D1-P1 §270. NO sale de
  // SAFE_GLOBALS (es bucket-1 en SAFE_PARTIAL_MEMBERS). Quitar la instancia fue un error contra §270.
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

// MIEMBROS browser-only de un global que SÍ es SAFE en su ROOT (existe en Node/edge) pero
// cuyo MÉTODO/propiedad falta en el floor → llamarlo lanza (TypeError: undefined no es función).
// El typeof-guard del root NO protege (el root existe) → como NON_ABSENCE_DENIALS pero a nivel
// de propiedad. Solo exento en client-only deferred (browser, donde el miembro existe). Tabla
// MÍNIMA + verificada (deepest re-hunt: performance.measureUserAgentSpecificMemory revienta en
// Node); extensible al auditar más browser-only de performance/Intl/crypto. beta.27 BLOCKER-1.
const PARTIAL_SAFE_GLOBAL_MEMBERS = {
  // `WebAssembly` existe como namespace en el baseline Edge (Vercel/Workers) → root SAFE, pero la
  // COMPILACIÓN DE BYTES está deshabilitada igual que eval/Function (dynamic code generation). La
  // partición se deriva del semántico de cada API, NO del framing simplificado "WebAssembly
  // deshabilitado" (los docs de Vercel se contradicen; la verdad fina es: el ÚNICO camino Wasm
  // soportado en Edge es `instantiate(<Module importado vía ?module>)`; todo lo que compila bytes
  // lanza — confirmado: `new WebAssembly.Module(bytes)` e `instantiate(bytes)` petan, solo
  // `instantiate(Module)` corre). codex P2 (review genérico).
  //
  // DENY — no tienen forma estática, SIEMPRE compilan bytes → true positive:
  //   `compile`, `compileStreaming`, `instantiateStreaming` (solo toma Response/stream, sin overload
  //   de Module), y el constructor `new WebAssembly.Module(bytes)`.
  // ALLOW — `instantiate`: tiene la forma estática soportada `instantiate(Module)` (el único Wasm
  //   bendecido en Edge para RSC/SSR — highlighter/codec/sanitizer Wasm). Denegarla sería FALSE
  //   positive sobre código que Vercel documenta como soportado, NO "fallar cerrado ante duda". La
  //   incertidumbre real (¿el arg es un buffer o un Module importado?) es PROVENANCE = data-flow, que
  //   el gate renuncia por diseño (§141): `instantiate(bufferSource)` queda RESIDUAL de data-flow,
  //   junto al resto de renuncias de provenance, NO un bypass.
  // SAFE — `Memory`/`Table`/`Global`/`Instance`/`validate` no compilan.
  // `Module` NO va aquí (member-read ban): `WebAssembly.Module` como VALOR no compila — `wasm
  // instanceof WebAssembly.Module`, `WebAssembly.Module.imports(m)`/`.exports(m)` (inspección de un
  // módulo ya importado), `const M = WebAssembly.Module` son Edge-safe. El ÚNICO hazard es la
  // CONSTRUCCIÓN `new WebAssembly.Module(bytes)` (compila bytes SIEMPRE — sin overload estático, a
  // diferencia de `instantiate(Module)`), que se caza en posición `new` aparte. codex P2 (review genérico).
  WebAssembly: new Set(["compile", "compileStreaming", "instantiateStreaming"]),
};

// Roots de PARTIAL_SAFE_GLOBAL_MEMBERS cuyos miembros están PRESENTES en el floor pero LANZAN al
// INVOCARSE (dynamic codegen Edge), a diferencia de los AUSENTES (performance.measure…, donde el
// miembro es undefined). Consecuencia para el safe-probe: `WebAssembly.compile?.()` SÍ invoca →
// lanza, así que el optional-CALL NO es probe seguro (sí lo siguen siendo `typeof` y el optional-
// ACCESS `?.name`, que no compilan). Para los AUSENTES, `?.()` corta a undefined = seguro.
const PARTIAL_PRESENT_THROWS_ROOTS = new Set(["WebAssembly"]);

// NAMESPACES HOST-POPULATED — TRES BUCKETS por la relación runtime↔namespace (el bucket NO se elige,
// lo determina la relación; test checkeable):
//   (1) El runtime expone un SUBSET LIMITADO (el host omite miembros, o Node AÑADE no-estándar) →
//       default DENY, ALLOWLIST de lo confirmado-Edge-present. Complemento (Node-only/browser-only +
//       futuros) denegado por construcción. → `performance`, `crypto`, `console`, `process`, `import.meta`.
//   (2) Superficie estándar COMPLETA pero PROHÍBE ops concretas (seguridad) → default ALLOW, DENYLIST
//       de lo prohibido. → `WebAssembly` (PARTIAL_SAFE_GLOBAL_MEMBERS). Forzarlo a allowlist sería FP
//       sobre miembros estándar NUEVOS (`WebAssembly.Tag`/`Exception` del exception-handling, ya en el
//       V8 de Edge) = allowlist-rot. Por eso NO se unifica.
//   (3) Superficie completa SIN prohibiciones → allow wholesale, sin tabla. → `Intl`, `Math`, `JSON`.
//       Ponerles allowlist = allowlist-rot (FP sobre `Intl.DurationFormat`/`Segmenter` nuevos).
// BAR DE ALLOW = **Edge-present** (NO Web-standard: hay miembros standard ausentes en el isolate
// server — browser-only). Un falso-ALLOW es FAIL-OPEN; un falso-DENY es FP corregible → el rigor va
// entero en los ALLOW. INCIERTO = DENY por construcción (la carga de prueba está en ALLOW: demostrar
// presencia-Edge-y-funcional). Oráculo de la superficie Edge = `@edge-runtime/primitives` (cuando esté
// disponible; hoy ABSENTE → confirmación manual contra la API documentada del Edge Runtime). El subset
// REAL se refina en #190. codex P2 (review genérico). FUERA DE SCOPE: V8-version-drift (`Array.fromAsync`,
// `Promise.withResolvers`, `Object.groupBy`…) — skew de versión Node-V8 vs Edge-V8, NO "Node-only", sin
// oráculo limpio; la clase es presencia-de-miembro-Node-vs-estándar, no version-skew.
const SAFE_PARTIAL_MEMBERS = {
  // `performance` ES bucket-1: la INSTANCIA existe en Edge (VM: `typeof performance==="object"`,
  // `now()` corre; ADR §270). PERO el allowlist de MIEMBROS no se puede derivar de un oráculo: las 3
  // fuentes locales están CONTAMINADAS para performance — doc Vercel OMITE (omisión≠ausencia),
  // @edge-runtime/primitives es passthrough, y @edge-runtime/vm HEREDA el performance de Node (da
  // `eventLoopUtilization → "function"`, que es perf_hooks Node-only → el VM no es fiel a Edge para
  // performance). Bajo INCIERTO=deny, ALLOW = SOLO lo confirmable por CONVERGENCIA-de-fuentes sin
  // depender de fidelidad perf_hooks: `now`/`timeOrigin` (Web-Performance-core; VM+WHATWG+Cloudflare
  // coinciden, no son artefacto de perf_hooks). TODO lo demás —mark/measure/getEntries*/clearMarks/
  // clearMeasures/toJSON (probablemente Edge-present pero SIN fuente fiable) Y eventLoopUtilization/
  // timerify/nodeTiming (Node-only)— al COMPLEMENTO denegado. eventLoopUtilization se cierra por
  // CONSTRUCCIÓN (complemento), NO por denylist → resiste que el VM mienta sobre él. Refinar contra
  // introspección de PRODUCCIÓN (no otro oráculo local) en #190. codex P2 (review genérico).
  performance: new Set(["now", "timeOrigin"]),
  // `crypto` NO es bucket-1: el global Web Crypto = `{subtle, getRandomValues, randomUUID}` IDÉNTICO en
  // browser + Node + Edge (verificado 3-runtime: Chromium real con COOP/COEP, Node, @edge-runtime/vm) →
  // CERO miembro divergente que denegar. El "fail-open de crypto.createHash" era premisa FALSA: createHash/
  // timingSafeEqual NO existen en el global crypto de NINGÚN runtime (viven en el MÓDULO `node:crypto`, que
  // SÍ caza el check de node-builtins por import). `(crypto as any).createHash()` lanza idéntico en los 3 →
  // UNIVERSAL-crash = out-of-mandate (el `npm test` del contributor en Node lo caza, no es divergencia-Edge).
  // → crypto WHOLESALE para presencia-de-miembro. La INVOCACIÓN unbound (`(0,crypto.getRandomValues)(b)`:
  // OK-Node/throw-Edge = divergencia real) SÍ se caza vía RECEIVER_BOUND_MEMBERS (eje ortogonal). codex P2.
  // Edge `console` = consola de debugging MÍNIMA (NO la interfaz WHATWG completa). Set DERIVADO del
  // ORÁCULO `@edge-runtime/primitives` (su `console` es subset propio, NO passthrough del de Node —
  // verificado `=== globalThis.console` → false), intersección Node∩Edge. La spec WHATWG NO sirve de
  // bar: `clear`/`table`/`group*`/`dirxml`/`countReset` están en la spec pero AUSENTES en el isolate
  // Edge → meterlos sería FALSO-ALLOW = fail-open (pasarían el gate y reventarían en SSR). DENY por
  // complemento: `Console` (constructor Node-only) + lo no-confirmado-Edge-present. El DS solo usa
  // `console.error`/`console.warn` (ambos ∈ set) → FP=0. El subset se re-deriva del oráculo en #190.
  // codex P2 (review genérico — corregido: spec→oráculo).
  console: new Set([
    "assert",
    "count",
    "debug",
    "dir",
    "error",
    "info",
    "log",
    "time",
    "timeEnd",
    "timeLog",
    "trace",
    "warn",
  ]),
};

// BUCKET 2, SEPARADO POR TIPO DE OPERACIÓN PELIGROSA (no por nombre): el member-read-ban de
// PARTIAL_SAFE_GLOBAL_MEMBERS es correcto SOLO cuando la operación peligrosa es la LLAMADA al método
// y no hay forma segura de leer el nombre (`compile`/`compileStreaming`/`instantiateStreaming` —
// leerlos es para llamarlos). Para un CONSTRUCTOR que compila bytes (`new WebAssembly.Module(bytes)`)
// la operación peligrosa es la CONSTRUCCIÓN, NO leer `WebAssembly.Module` — el valor se necesita
// Edge-safe (`wasm instanceof WebAssembly.Module`, `WebAssembly.Module.imports(m)`, mismo flujo que
// `instantiate(Module)`). Mezclarlos bajo member-read-ban sobre-captura del valor a la construcción
// (FP). Mecanismo separado: ban-de-CONSTRUCCIÓN, cazado SOLO en posición `new`. codex P2 (review
// genérico — error de origen en el teardown que metió `Module` en el read-ban).
const CONSTRUCTION_DENIED_MEMBERS = {
  WebAssembly: new Set(["Module"]),
};
function isConstructionDeniedMember(root, member) {
  return Boolean(CONSTRUCTION_DENIED_MEMBERS[root]?.has(member));
}

// MÉTODOS bucket-1 ALLOWED RECEIVER-BOUND Y EDGE-ESPECÍFICOS: seguros LIGADOS (`crypto.getRandomValues(b)`)
// pero llamados DESLIGADOS (`(0, crypto.getRandomValues)(b)`) van OK en Node pero LANZAN en Edge (el `this`
// ya no es el objeto Crypto). La REGLA es receiver-bound **Y Edge-específico**, NO "todo receiver-bound":
// el mandato del gate es DIVERGENCIA-Edge (pasa en el entorno del contributor, revienta en producción
// Edge — el gate es la ÚNICA defensa porque su `npm test` en Node NO lo caza), NO corrección-JS-universal.
// Derivado del VM member-a-member por el discriminador "¿funciona en Node?": `getRandomValues`/`randomUUID`
// = OK-Node/throw-Edge → Edge-específico → AQUÍ. EXCLUIDOS (out-of-mandate, NO fail-open — el contributor
// los ve en su propio test, misma categoría que el TDZ universal §"hunt final" — crash idéntico cliente/
// servidor que tsc casi caza): `performance.now` (sync-throw en Node TAMBIÉN = universal) y `crypto.subtle.*`
// (async-reject ERR_INVALID_THIS en Node TAMBIÉN = universal; nested, cubierto por la MISMA regla universal→
// fuera, no como caso aparte). `console.*` = callable-unbound (sin brand) → tampoco aplica. El subset se
// re-deriva en #190 contra producción. codex P1/P2 (review genérico: "branded host methods unbound").
const RECEIVER_BOUND_MEMBERS = {
  crypto: new Set(["randomUUID", "getRandomValues"]),
};

// PREDICADO DE RESOLUCIÓN, **NO de política** (contrato blindado tras el barrido de "ejes ortogonales
// bajo predicado compartido" — el patrón que falló en WebAssembly.Module/crypto). Responde UNA pregunta
// axis-agnóstica: "¿algún check de miembro se interesa por este root? → exprPartialRoot lo resuelve (+ sus
// aliases)". Es la UNIÓN de los 4 sets SOLO para alcanzabilidad. NUNCA usar este predicado para DECIDIR un
// flag: cada POLÍTICA consulta SU PROPIO set por separado — presencia→isDeniedPartialMember (SAFE_PARTIAL/
// PARTIAL_SAFE), construcción→isConstructionDeniedMember (CONSTRUCTION_DENIED), invocación-unbound→el check
// L5005 (RECEIVER_BOUND directamente). Por eso incluir RECEIVER_BOUND aquí es INERTE para presencia: hace
// `crypto` RESOLVIBLE (lo necesita el check unbound) pero NO presence-denied — isDeniedPartialMember NO
// consulta RECEIVER_BOUND y devuelve false (wholesale) para crypto. Resolver ≠ denegar. La inertness está
// pineada por Test H (`(crypto as any).zBogus`→PASA): si alguien rompe el aislamiento (hace crypto
// presence-denied), Test H revienta. ÚNICO call-site: exprPartialRoot (resolución), verificado por grep.
function isPartialMemberRoot(root) {
  return Boolean(
    PARTIAL_SAFE_GLOBAL_MEMBERS[root] ||
      SAFE_PARTIAL_MEMBERS[root] ||
      CONSTRUCTION_DENIED_MEMBERS[root] ||
      RECEIVER_BOUND_MEMBERS[root],
  );
}
// ¿`member` está DENEGADO para `root`? denylist (bucket 2): ∈ set. allowlist (bucket 1): ∉ set.
// wholesale-safe (bucket 3): nunca. Predicado CENTRAL que TODOS los colectores consultan.
function isDeniedPartialMember(root, member) {
  const deny = PARTIAL_SAFE_GLOBAL_MEMBERS[root];
  if (deny) return deny.has(member);
  const allow = SAFE_PARTIAL_MEMBERS[root];
  if (allow) return !allow.has(member);
  return false;
}

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

// Whitelist fail-closed de miembros de `import.meta` disponibles en el baseline Edge — MISMA forma
// que SAFE_GLOBALS (un namespace paralelo poblado por el host/build, no un global). REGLA de
// mantenimiento (checkeable, NO juicio): ALLOW = ESTÁNDAR (∈ spec TC39 import-meta, poblado por el
// host: `url`) ∪ VITE (transformado/borrado en build antes de runtime: `env`, `hot`, `glob`). El
// DENY es el COMPLEMENTO por construcción → `dirname`/`filename` (Node-only) y cualquier miembro
// Node-only futuro caen sin enumerarlos. `resolve` se EXCLUYE pero por INCERTIDUMBRE-Edge (es
// estándar — Node 20.6+/browsers — pero lo puebla el host y V8-a-pelo no lo provee; Vercel/CF Edge
// dudoso en deploy bundled donde la resolución ya ocurrió en build) → pendiente de confirmar en #190,
// NO Node-only. La lista se pudre solo con un EVENTO VERSIONADO (sube spec / sube Vite), no con cada
// release de Node. Whitelist-sobre-denylist = la misma ratificación de SAFE_GLOBALS (codex P2 review
// genérico). El subset definitivo Edge se deriva del baseline real en #190.
const SAFE_IMPORT_META_MEMBERS = new Set(["url", "env", "hot", "glob"]);

// `process` es UN GLOBAL DENEGADO (ausente/stub en el edge baseline; ver CLIENT/denied set), PERO
// `process.env` SÍ lo expone Vercel Edge (env vars). Estructura inversa a PARTIAL_SAFE_GLOBAL_MEMBERS
// (raíz denegada, miembro SEGURO): allow `process.env`, deny bare `process` y el resto (`cwd`,
// `binding`, …). Trato UNIFORME con import.meta.env (mismo idiom host-env-var Edge-safe) — sin esto
// hay incoherencia entre dos objetos que hacen lo mismo. codex P2 (review genérico). #190 refina.
const SAFE_MEMBERS_OF_DENIED_ROOT = { process: new Set(["env"]) };

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
// Difiere de `window`/`document`, cuyo hazard SÍ es la ausencia (no están definidos en el
// baseline) y donde el guard typeof SÍ protege.
const NON_ABSENCE_DENIALS = new Set([
  "eval",
  "Function",
  "globalThis",
  "global",
  "self",
  "setImmediate",
  "clearImmediate",
  // `navigator`: el ROOT está PRESENTE en Node 22+ y en el edge baseline (Workers/
  // Vercel: `navigator.userAgent` definido), pero como SUBSET PARCIAL — `geolocation`/
  // `mediaDevices`/`clipboard` faltan → `typeof navigator !== "undefined"` pasa pero
  // `navigator.geolocation.getCurrentPosition(...)` revienta en SSR (TypeError: undefined).
  // El hazard NO es ausencia-del-root sino shape-parcial → el presence-guard da falsa
  // confianza, igual que setImmediate (stub que lanza). Solo se exime en deferred CLIENT-
  // ONLY (handler/useEffect, browser-only donde navigator es completo), NUNCA en timers ni
  // bajo typeof-guard. Coherencia con el comentario de INTENTIONAL_DENY ("subset inestable").
  // codex P2 sobre 5f7aa4d.
  "navigator",
  // `process`: en el edge baseline (Vercel sin nodejs_compat) está AUSENTE → el typeof-guard
  // protegería; pero en Node está PRESENTE y PARCIAL — `process.permission` solo existe con
  // `--experimental-permission`, así que `if (typeof process !== "undefined") process.permission
  // .has(...)` pasa el guard y revienta (TypeError) en un Node sin el flag. Mismo perfil
  // present-but-partial que navigator → el presence-guard del ROOT da falsa confianza. (process
  // ya está denegado en INTENTIONAL_DENY; aquí se asegura que ningún typeof-guard lo exima.)
  // deepest re-hunt #173.
  "process",
]);

/**
 * Política ÚNICA de exención en body diferido (ramas (c) y (d)). Un global de CLIENTE
 * (window/document/navigator, eval-sink, escape-root, stub-que-lanza — CUALQUIERA) solo es
 * seguro de leer en un body que NO corre en el isolate del SERVIDOR: i.e. CLIENT-ONLY
 * deferred — handler de evento (onClick…) o effect (useEffect/useLayoutEffect), que React/el
 * navegador garantizan que NO se ejecutan durante SSR/Edge.
 *
 * Los TIMERS (setTimeout/setInterval/queueMicrotask…) SÍ disparan en el isolate Edge/SSR
 * (queueMicrotask casi inmediato; setTimeout en el event-loop de Node tras render) → su
 * callback corre en el SERVIDOR → un read de global de cliente ahí LANZA (window/document
 * ausentes; navigator/stub parciales). Por eso TODOS requieren client-only, NO solo las
 * NON_ABSENCE_DENIALS.
 *
 * codex P1: antes los absence-hazard (window/document) se eximían en CUALQUIER deferred
 * (cualquier deferred, incluido timer) → `setTimeout(() => window.scrollTo(0,0))` en
 * render se eximía pero el timer corre en el server y lanza = BYPASS. Coincide con el
 * comentario que ya tenía el walker ("los timers SÍ disparan en Edge durante SSR"), que solo
 * se aplicaba a los eval-sinks; ahora la política es ÚNICA: client-only para TODO global.
 * El `api` ya no diferencia (se conserva por firma/legibilidad). beta.27 BLOCKER-1.
 */
function isExemptInDeferredBody(_api, context) {
  return context.isInClientOnlyDeferredBody;
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
          // [a-z] — la regla REAL del jsx-runtime de React (verificado bajo OXC, el transform
          // de vite 8): `<$Foo>`/`<_Foo>`/`<Upper>` son COMPONENTES (OXC emite `jsx($Foo,…)`),
          // no strings (`<x-custom>` con guion sí es host string). El check viejo
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
    // SOLO el 1er argumento (el CALLBACK) de un sink se difiere; los args 2+ corren en RENDER.
    // El 2º arg de un effect-hook son las DEPS (un array, NO un callback que React invoque): una
    // arrow colocada en deps que lee window y se captura+invoca en render escapaba como deferred
    // = BYPASS (deepest re-hunt). Todos los sinks reconocidos (useEffect/useLayoutEffect/
    // useInsertionEffect + setTimeout/setInterval/queueMicrotask) llevan el callback en posición 0.
    if (parent.arguments.indexOf(current) !== 0) return "none";
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
      // Aliases react SCOPE-AWARE (declarados dentro de la función/namespace
      // actual: `const { useEffect } = React`, `const ue = React.useEffect`,
      // `const useEffect = reactUseEffect`, `import R = React`). Viven solo en el
      // context del scope donde se declararon — NO filtran a scopes hermanos, así
      // que un alias react nested no exime un hook homónimo de OTRA función (el
      // bypass file-global que codex P1 rechazó). Se consultan ANTES del mapa
      // file-global de `gatherReactImports` (que solo cubre top-level).
      // Si el OBJETO react de la familia fue mutado por un member-write en el archivo
      // (`mutatedNamespaceRoots` no-vacío ⟺ familia mutada), NINGÚN binding derivado de react
      // es de fiar — ni el namespace (`React.useEffect`) ni el NAMED (`import { useEffect } from
      // "react"`), porque bajo interop CJS/bundler el named se lee del MISMO objeto mutable
      // (`Object.assign(React,…)` o `React.useEffect = sync` lo vuelve síncrono). Se desactiva
      // toda la exención react del archivo (fail-closed; el caso común SIN mutación no se toca).
      // codex P1 (named-hook taint sobre 8b08896).
      const reactFamilyMutated = (context.mutatedNamespaceRoots?.size ?? 0) > 0;
      let canonicalCallee = null;
      if (reactFamilyMutated) {
        canonicalCallee = null; // objeto react mutado → nada derivado de él es deferred
      } else if (ts.isIdentifier(callee)) {
        const scoped = context.scopeReactNamed?.get(calleeName);
        const mapped =
          scoped !== undefined
            ? scoped
            : context.reactImports.named.get(calleeName);
        if (mapped !== undefined) canonicalCallee = mapped;
      } else if (
        rootIdent !== null &&
        (context.scopeReactNs?.has(rootIdent) ||
          context.reactImports.namespaces.has(rootIdent))
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
      hasExplicitSourceExt(p) && // .ts/.tsx + JS-family (.js/.jsx/.mjs/.cjs/.mts/.cts)
      !/\.(test|stories)\.[mc]?[jt]sx?$/.test(p)
    ) {
      // JS-family se descubre para DETECTAR un marcador @server-safe mal-colocado (el gate no
      // audita JS → fail-loud en el CLI), no para auditarlo. codex P2: un `Foo.jsx` con marcador
      // se ignoraba en silencio porque el discovery solo miraba .ts/.tsx.
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
 * ¿El nombre de un `namespace` COLISIONA con una declaración AMBIENT del MISMO nombre
 * en su MISMO scope (sibling)? — p.ej. `declare var window: any; namespace window {…}`.
 *
 * Bajo declaration-merging de TypeScript, un `declare var/let/const/function/class N`
 * ambient HERMANO del `namespace N` hace que el BUNDLER (rolldown 1.0.2 — el de vite 8,
 * **NO** esbuild; ver nota de oráculo abajo) trate `N` como binding EXTERNO y ELIDA el
 * `var N` que el namespace emitiría en solitario. Resultado: el shell `N || (N = {})` y
 * los reads `N.x` quedan contra el GLOBAL LIBRE → en Edge/SSR `ReferenceError: N is not
 * defined` en MODULE-LOAD. Si el gate tratara `N` como shadow runtime (lo añade a
 * localBindings vía `namespaceIsInstantiated`→`producesRuntimeValue`), eximiría ese read
 * = BYPASS FAIL-OPEN. beta.27 BLOCKER-1, workflow adversarial `verify-export-declare-ns-p1`.
 *
 * ORÁCULO = el BUILD REAL (vite 8 → **rolldown** + transform OXC), medido data-driven, NO
 * `esbuild.transformSync`: transformSync emite `var window` para AMBOS (merge y no-merge) y
 * ENMASCARABA la divergencia — solo el bundle completo de rolldown elide el local. Verificado
 * detrás del gate: gate-exime + build→`ReferenceError` para `declare var/let/const/function/
 * class window` + `namespace window`; gate-exime + build→`undefined` (sound) para el caso
 * PLANO (sin declare hermano), value-member, y `declare global { var window }`.
 *
 * EXCLUIDO `declare global { var N }`: es augmentation del global, NO un sibling del mismo
 * nombre (el bloque se llama `global`; `N` vive ANIDADO dentro) → no colisiona a nivel de
 * statement → el build MANTIENE el local → sound (medido). Fail-closed e INDEPENDIENTE del
 * ORDEN (rolldown solo elide si el `declare` va ANTES, pero ese detalle de impl no se asume:
 * cualquier colisión mismo-scope → no-instanciado). Solo puede AÑADIR flagging (nunca quitar)
 * → no puede introducir bypass; el único riesgo es over-flag de un constructo contrivado.
 */
function namespaceCollidesWithAmbientSibling(moduleDecl) {
  if (!moduleDecl.name || !ts.isIdentifier(moduleDecl.name)) return false;
  const name = moduleDecl.name.text;
  const parent = moduleDecl.parent;
  const siblings =
    parent && ts.isSourceFile(parent)
      ? parent.statements
      : parent && ts.isModuleBlock(parent)
        ? parent.statements
        : null;
  if (!siblings) return false;
  for (const s of siblings) {
    if (s === moduleDecl || !isAmbientDeclaration(s)) continue;
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) {
        const declNames = new Set();
        addBindingNamesFromPattern(d.name, declNames);
        if (declNames.has(name)) return true;
      }
    } else if (
      (ts.isFunctionDeclaration(s) ||
        ts.isClassDeclaration(s) ||
        ts.isEnumDeclaration(s) ||
        // Ambient `declare namespace N` HERMANO de un `namespace N` de valor: la MISMA
        // merge-elision que `declare var N` — rolldown borra el `var N` local → el read
        // filtra al global (deepest re-hunt: 10 instancias window/document/location, ambos
        // órdenes, plano/anidado/self-read). `declare global` no entra: su name es "global".
        ts.isModuleDeclaration(s)) &&
      s.name &&
      ts.isIdentifier(s.name) &&
      s.name.text === name
    ) {
      return true;
    }
  }
  return false;
}

/**
 * ¿Un `namespace`/`module` está INSTANCIADO? — i.e. ¿el emit de RUNTIME produce
 * `var N;(IIFE)`? Si lo está, su nombre ES una sombra runtime legítima; si se
 * elide, una ref bare a `N` (= global ausente en Edge) resuelve al global real →
 * debe flaggearse.
 *
 * ORÁCULO = el EMISOR DE RUNTIME DEL BUILD, **NO** `ts.isInstantiatedModule`. tsc NO
 * emite el JS (`tsconfig.build.json` es `emitDeclarationOnly`); el build es `vite build`,
 * cuyo emisor en **vite 8 es OXC (transform) + rolldown 1.0.2 (bundle)** — esbuild 0.27.7
 * es SOLO minify (`transformWithEsbuild` está deprecado; `transformWithOxc` es el activo).
 * El emisor DIVERGE de `ts.isInstantiatedModule`, que cuenta instanciado un namespace cuyo
 * único value-member vive en un `namespace` AMBIENT anidado → el nombre entraría en
 * localBindings → ref bare al global NO se flaggearía. La regla de instanciación se calibró
 * data-driven contra `esbuild.transformSync` (PROXY rápido per-statement) y se RE-VERIFICÓ
 * behavioralmente contra el build real OXC/rolldown (workflow `audit-esbuild-vs-rolldown-
 * premise`): coinciden en TODAS las formas per-statement salvo dos casos donde rolldown es
 * MÁS conservador (mantiene un shell vacío donde esbuild elide) → el over-flag fail-closed
 * sigue siendo SOUND. La ÚNICA divergencia que importaba (rolldown ELIDE donde esbuild
 * mantiene) es el declaration-merge, cerrado aparte (`namespaceCollidesWithAmbientSibling`).
 * Ver `feedback_esbuild_emit_oracle`. Regla del emit (medida sobre ~10 formas):
 *
 *   INSTANCIA: miembro DIRECTO var/let/const/function/class/enum (declare o no),
 *              o `namespace` anidado NO-ambient que a su vez instancia.
 *   ELIDE:     `namespace` anidado AMBIENT (declare), interface/type/import-type, vacío.
 *
 * Nota clave: el build SÍ instancia por un value-member ambient TOP-LEVEL (`export declare
 * const z` → `var N`), pero el predicado NO cuenta el ambient ANIDADO → fail-closed: ante
 * un statement no reconocido devolvemos `false` (over-flag seguro, nunca bypass). beta.27
 * BLOCKER-1.
 */
function namespaceIsInstantiated(moduleDecl) {
  // Colisión ambient-merge mismo-scope (`declare var window` + `namespace window`): el
  // bundler (rolldown/vite 8) ELIDE el `var N` local → `N` NO es shadow runtime, el read
  // `N.x` filtra al global → debe flaggearse. Ver `namespaceCollidesWithAmbientSibling`.
  // FAIL-CLOSED (solo añade flagging). beta.27 BLOCKER-1 (workflow adversarial).
  if (namespaceCollidesWithAmbientSibling(moduleDecl)) return false;
  const body = moduleDecl.body;
  if (!body) return false;
  // `namespace X.Y { … }`: el body es otro ModuleDeclaration (forma dotted).
  if (ts.isModuleDeclaration(body)) {
    return isAmbientDeclaration(body) ? false : namespaceIsInstantiated(body);
  }
  if (!ts.isModuleBlock(body)) return false;
  return body.statements.some(buildInstantiatesViaStatement);
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
 * Un statement de cuerpo de namespace que hace que el BUILD (OXC/rolldown) EMITA el shell
 * `var N`. (Oráculo = el emisor real del build; `esbuild.transformSync` es PROXY rápido y
 * coincide salvo bundle-level — ver `namespaceIsInstantiated` + `feedback_esbuild_emit_oracle`.)
 *
 * **UNDER-APPROXIMATION CONSERVADORA (fail-closed) — NO igualdad exacta con el emit.**
 * La invariante de soundness es `true ⟹ el-build-instancia` (si decimos instanciado, lo
 * está → el nombre es shadow runtime → eximir el read es seguro). El REVERSO no se cumple:
 * esto es un WHITELIST de productores de valor DECIDIBLES; un namespace instanciado SOLO
 * por un statement runtime-only (expression-statement `Q.z;`, control-flow `if(){}`) NO se
 * reconoce → devolvemos `false` → over-flag FAIL-CLOSED (codex P2 round-9, verificado: esos
 * casos divergen del emit pero 100% en la dirección segura). Cerrar ese FP exigiría
 * RECONOCER MÁS instanciación (default-true / blacklist) = la dirección FAIL-OPEN que abrió
 * los 17 bypasses (§184): un statement que añadiéramos y que el build ELIDA sería bypass. Se
 * mantiene el whitelist; el FP es contrivado (`namespace window { Q.z; }`, 0 en source real).
 *
 * REGLA DE EMIT DEL BUILD para el whitelist (medida empíricamente, deepest final hunt #173 —
 * NO la que asumía el código anterior). El error previo: tratar TODO value-producer (incl.
 * `declare` no-exportado y `import Q = N` value-dead) como instanciante. El build NO los emite
 * → un `namespace document { declare var x }` se ELIDE entero y `document.title` leía el
 * GLOBAL real con el gate exento = BYPASS (17 confirmados: window/document/navigator/…).
 *
 *   INSTANCIA: const/let/var/function/class/enum NO-ambient; o `declare` (ambient)
 *              PERO SOLO si va `export` (`export declare const z` re-exporta una
 *              propiedad → `var N`; un `declare const z` pelado es ambient puro →
 *              ELIDE); o `import Y = Z` que el build emite = value-USED o `export
 *              import`; o `namespace` anidado NO-ambient que a su vez instancia.
 *   ELIDE:     `declare …` no-exportado, `import Y = Z` value-dead no-exportado,
 *              `namespace` anidado ambient, interface/type/import-type, vacío.
 *
 * Para import-equals la value-use es binder-territory (parser-puro no la prueba
 * barato) → fail-closed: solo cuenta `export import` (la forma que el build SIEMPRE
 * emite). Un `import Q = N` no-exportado value-USED igual instancia el namespace
 * por SU statement de uso (`export const y = Q.z`), no por el import → no se pierde
 * ningún caso legítimo. Fail-closed: statement no reconocido → false (over-flag).
 */
function buildInstantiatesViaStatement(stmt) {
  // Productores de valor: const/let/var/function/class/enum. NO-ambient siempre
  // instancia; `declare` (ambient) solo si `export` (verificado contra el build OXC/rolldown).
  if (
    ts.isVariableStatement(stmt) ||
    ts.isFunctionDeclaration(stmt) ||
    ts.isClassDeclaration(stmt) ||
    ts.isEnumDeclaration(stmt)
  ) {
    return isAmbientDeclaration(stmt) ? hasExportModifier(stmt) : true;
  }
  // `import Y = Z`: el build instancia si la value-use ocurre, o si es `export import`
  // (re-export, siempre emitido). El `import` pelado value-dead se ELIDE (raíz de 5
  // bypasses) → fail-closed: solo `export import` de valor cuenta.
  if (ts.isImportEqualsDeclaration(stmt)) {
    return hasExportModifier(stmt) && !stmt.isTypeOnly;
  }
  // Namespace anidado: instancia SOLO si NO es ambient Y a su vez instancia. El
  // ambient anidado (`export declare namespace I { … }`) el build lo BORRA entero →
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
function gatherNonReactLexicalShadows(statements, scope) {
  const reactImports = scope.reactImports;
  const baseNonImport = scope.nonImportBindings ?? new Set();
  const shadows = new Set();
  // Pase 1 — nombres block-lexical de function/class/enum/module: SIEMPRE shadow no-react (un
  // class/function no es un alias react). Hoisted (función) o no, se pre-cargan antes del pase 2
  // para que una `const useEffect = React.useEffect` donde `React` es una `function React(){}`
  // hoisted LATER lo vea como sombra.
  for (const stmt of statements) {
    if (
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
  // Pase 2 — var block-scoped + import-equals en ORDEN TEXTUAL, ACUMULANDO los react-aliases del
  // MISMO bloque (nsSet/namedMap) y las sombras no-react. El TDZ de const/let garantiza root-
  // declarado-antes-de-uso, así que un único pase resuelve las cadenas del bloque:
  //   `const React = FakeReact; const useEffect = React.useEffect` → React∈shadows → useEffect
  //     es sombra SÍNCRONA (codex P1: el pre-load lo perdía con solo el scope externo → una
  //     función hoisted antes de la cadena se eximía = BYPASS).
  //   `const R = React; const useEffect = R.useEffect` → R∈nsSet → useEffect es hook react (no sombra).
  // Antes esto se delegaba al purge posicional, que NO alcanza a una función hoisted visitada
  // ANTES de la cadena (el purge corre al llegar a la declaración, demasiado tarde).
  const nsSet = new Set(scope.scopeReactNs ?? []);
  const namedMap = new Map(scope.scopeReactNamed ?? []);
  for (const stmt of statements) {
    const scopeNow = {
      reactImports,
      scopeReactNs: nsSet,
      scopeReactNamed: namedMap,
      nonImportBindings: new Set([...baseNonImport, ...shadows]),
    };
    if (
      ts.isVariableStatement(stmt) &&
      isBlockScopedDeclList(stmt.declarationList.flags)
    ) {
      const { ns, named } = reactAliasesDeclaredBy(stmt, scopeNow);
      for (const n of ns) nsSet.add(n);
      for (const [l, c] of named) namedMap.set(l, c);
      const aliasNames = new Set(ns);
      for (const [l] of named) aliasNames.add(l);
      for (const d of stmt.declarationList.declarations) {
        if (isAmbientDeclaration(d)) continue;
        const names = new Set();
        addBindingNamesFromPattern(d.name, names);
        for (const n of names) {
          if (!aliasNames.has(n)) shadows.add(n);
        }
      }
    } else if (
      ts.isImportEqualsDeclaration(stmt) &&
      stmt.name &&
      ts.isIdentifier(stmt.name) &&
      producesRuntimeValue(stmt)
    ) {
      const { ns, named } = reactAliasesDeclaredBy(stmt, scopeNow);
      for (const n of ns) nsSet.add(n);
      for (const [l, c] of named) namedMap.set(l, c);
      if (ns.length === 0 && named.length === 0) {
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
function extractPostStatementBindings(stmt, scope) {
  // `all`: todos los bindings (para localBindings — sombrean globals). `nonImport`:
  // SOLO los locales NO-import (para nonImportBindings, que distingue un shadow local
  // de un hook real). `import X = …` es IMPORT-LIKE → va a `all` pero NO a `nonImport`
  // (si entrara, `import ue = React.useEffect; ue(cb)` se trataría como shadow local y
  // se flaggearía — regresión). Espejo de gatherModulePreloadedBindings.
  //
  // Los nombres que `stmt` declara como aliases REACT (`reactAliasNamesDeclaredBy`,
  // scope-aware + const-only) se EXCLUYEN de `nonImport`: NO son shadows síncronos sino
  // el hook react genuino, así que el deferred-hook shadow-guard no debe flaggearlos. El
  // control no-react (`const { useEffect } = Sync`, `let ue = React.useEffect` reasignable)
  // NO es alias → entra en nonImport → flagea. Núcleo único = sin divergencia file-global.
  const all = new Set();
  const nonImport = new Set();
  const aliasNames = reactAliasNamesDeclaredBy(stmt, scope);
  if (ts.isVariableStatement(stmt)) {
    const flags = stmt.declarationList.flags;
    const blockScoped = isBlockScopedDeclList(flags);
    if (blockScoped) {
      for (const decl of stmt.declarationList.declarations) {
        if (isAmbientDeclaration(decl)) continue; // declare const/let → erased
        addBindingNamesFromPattern(decl.name, all);
        const declNames = new Set();
        addBindingNamesFromPattern(decl.name, declNames);
        for (const n of declNames) {
          if (!aliasNames.has(n)) nonImport.add(n);
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
    } else if (!aliasNames.has(stmt.name.text)) {
      // Un import-equals es import-like (exempt como hook) SOLO si aliasa REACT
      // (`import ue = React.useEffect` → FP14/15). Un alias a un valor NO-react
      // (`import useEffect = Sync.run`, `import React = FakeReact`) SOMBREA el nombre
      // localmente → debe ir a nonImport para que el shadow-guard de
      // isDeferredExecutionContext dispare y lo flaggee (hunt final #173, deferred import-equals).
      nonImport.add(stmt.name.text);
    }
  }
  return { all, nonImport };
}

/**
 * NÚCLEO ÚNICO de resolución de aliases REACT declarados por UN statement, scope-aware.
 * Reemplaza la lógica antes CUADRUPLICADA y divergente (`gatherReactImports` var-branch
 * file-global; `variableInitAliasesReact`/`importEqualsAliasesReact` para la exclusión de
 * `nonImportBindings`; y la computación interna de `addReactAliases`). La DIVERGENCIA entre
 * esas copias era la fuente recurrente de bypasses/FPs (codex P1 let-reassign; hunt #173:
 * root scope-local, element-access, computed-spoof). Una sola resolución la cierra de raíz.
 *
 * `scope` = `{ reactImports, scopeReactNs?, scopeReactNamed?, nonImportBindings? }`.
 * Devuelve `{ ns: string[], named: Array<[local, canónico]> }`:
 *   ns    → nombres que son un NAMESPACE react (React, o un alias `const` de él) en este scope.
 *   named → `[localName, exportCanónico]` de hooks/miembros react (`ue`→"useEffect").
 *
 * **SOLO `const` (codex P1, BYPASS fail-open):** un `let`/`var` puede REASIGNARSE a una función
 * síncrona DESPUÉS del init (`let ue = React.useEffect; ue = sync; ue(cb)`) → confiar en el init
 * es fail-OPEN (el cb corre síncrono en render y se eximía). Un alias por `const` es inmutable →
 * seguro. Un alias `let`/`var` queda fail-closed (over-flag, residual aceptado, raro). `import X = …`
 * es inmutable → exento del check `const`.
 *
 * Resuelve roots contra `scopeReactNs ∪ reactImports.namespaces`; named contra
 * `scopeReactNamed ∪ reactImports.named`; roots ∈ `nonImportBindings` (shadow no-react) excluidos
 * (codex P1 root-shadow). Member-name de property-access (`React.useEffect`) Y element-access con
 * STRING LITERAL (`React["useEffect"]`); un computed/element NO-literal NO se registra (fail-closed
 * — cierra el spoof `const { ["useState"]: useEffect } = React`, donde el binding real es useState
 * render-phase). Rest de un namespace react (`const { C, ...rest } = React`) → `rest ∈ ns` (sus
 * miembros siguen siendo canónicos react).
 */
function reactAliasesDeclaredBy(stmt, scope) {
  const reactImports = scope.reactImports;
  const ns = [];
  const named = [];
  if (!reactImports) return { ns, named };
  const nsSet = scope.scopeReactNs;
  const namedMap = scope.scopeReactNamed;
  const nonImport = scope.nonImportBindings;
  const mutated = scope.mutatedNamespaceRoots;
  // Acumuladores LOCALES al statement — avanzan declarador-a-declarador izquierda-a-derecha. JS
  // resuelve `React` en el 2º initializer de `const React = FakeReact, useEffect = React.useEffect`
  // al `const React` LOCAL del 1º declarador, no al import file-global. Sin avanzar, el 2º se
  // clasificaba contra el scope de ANTES del statement = BYPASS (codex P1). Tienen PRECEDENCIA sobre
  // el scope externo (sombra léxica más cercana).
  const localNs = new Set();
  const localNamed = new Map();
  const localShadow = new Set();
  const isReactNs = (name) =>
    !localShadow.has(name) &&
    !(nonImport && nonImport.has(name)) &&
    !(mutated && mutated.has(name)) && // namespace mutado por member-write → no inmutable (codex P1)
    (localNs.has(name) ||
      (nsSet && nsSet.has(name)) ||
      reactImports.namespaces.has(name));
  const canonicalNamed = (name) => {
    if (localShadow.has(name)) return undefined;
    if (nonImport && nonImport.has(name)) return undefined;
    if (localNamed.has(name)) return localNamed.get(name);
    const scoped = namedMap && namedMap.get(name);
    return scoped !== undefined ? scoped : reactImports.named.get(name);
  };
  // member string de `React.X` (property) o `React["X"]` (element-access string literal).
  // Computed/element NO-literal → null (no resoluble → fail-closed).
  const memberName = (node) => {
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (ts.isElementAccessExpression(node)) {
      const arg = node.argumentExpression
        ? unwrapErased(node.argumentExpression)
        : null;
      if (arg && ts.isStringLiteralLike(arg)) return arg.text;
    }
    return null;
  };
  // propertyName de un BindingElement → string del miembro, o null si no-resoluble.
  const bindingMember = (el) => {
    const pn = el.propertyName;
    if (!pn) return el.name.text; // shorthand `{ useEffect }`
    if (ts.isIdentifier(pn)) return pn.text; // `{ useEffect: ue }`
    if (ts.isStringLiteralLike(pn)) return pn.text; // `{ "useEffect": ue }`
    if (ts.isComputedPropertyName(pn)) {
      const e = unwrapErased(pn.expression); // `{ [("useEffect")]: ue }`, `{ ["useEffect" as const]: ue }`
      if (ts.isStringLiteralLike(e)) return e.text; // literal computed
    }
    return null; // computed NO-literal `{ [k]: ue }` → no resoluble → fail-closed
  };

  const handleVarInit = (name, initializer) => {
    const init = unwrapErased(initializer);
    // `const useEffect = reactUseEffect` — alias de un NAMED react (no namespace).
    if (ts.isIdentifier(name) && ts.isIdentifier(init)) {
      if (isReactNs(init.text)) {
        ns.push(name.text);
        return;
      }
      const canon = canonicalNamed(init.text);
      if (canon !== undefined) named.push([name.text, canon]);
      return;
    }
    let root = init;
    while (
      ts.isPropertyAccessExpression(root) ||
      ts.isElementAccessExpression(root)
    ) {
      root = unwrapErased(root.expression);
    }
    if (!ts.isIdentifier(root) || !isReactNs(root.text)) return;
    if (ts.isIdentifier(name) && init === root) {
      ns.push(name.text); // const R = React
    } else if (ts.isIdentifier(name)) {
      const member = memberName(init); // const ue = React.useEffect / React["useEffect"]
      if (member !== null) named.push([name.text, member]);
    } else if (ts.isObjectBindingPattern(name) && init === root) {
      for (const el of name.elements) {
        if (!ts.isBindingElement(el) || !ts.isIdentifier(el.name)) continue;
        if (el.dotDotDotToken) {
          // `const { C, ...rest } = React` — el rest crea un OBJETO PLANO MUTABLE (copia de
          // props enumerables), NO el namespace read-only de react. `rest.useEffect = sync`
          // reasigna el miembro y el cb corre síncrono en render → tratar rest como namespace
          // react es fail-OPEN (codex P1 sobre 1defc39). NO se registra → `rest.useEffect`
          // queda fail-closed (flagea, residual SOUND). Distinto de `const R = React`: R apunta
          // al Module Namespace Object, cuyos miembros son read-only (no reasignables).
          continue;
        }
        const member = bindingMember(el);
        if (member !== null) named.push([el.name.text, member]);
      }
    }
  };

  if (ts.isVariableStatement(stmt)) {
    if ((stmt.declarationList.flags & ts.NodeFlags.Const) === 0) {
      return { ns, named }; // const-only (codex P1) — let/var reasignable → no se confía
    }
    for (const d of stmt.declarationList.declarations) {
      const nsBefore = ns.length;
      const namedBefore = named.length;
      if (d.initializer && !isAmbientDeclaration(d)) {
        handleVarInit(d.name, d.initializer);
      }
      // Avanzar los acumuladores locales con lo que ESTE declarador aportó, para que el SIGUIENTE
      // declarador del mismo statement lo vea (orden léxico izquierda-a-derecha). Los nombres que
      // son alias react → localNs/localNamed; el resto de los bindings del declarador → localShadow.
      const aliasNames = new Set();
      for (let i = nsBefore; i < ns.length; i++) {
        localNs.add(ns[i]);
        aliasNames.add(ns[i]);
      }
      for (let i = namedBefore; i < named.length; i++) {
        localNamed.set(named[i][0], named[i][1]);
        aliasNames.add(named[i][0]);
      }
      if (!isAmbientDeclaration(d)) {
        const declNames = new Set();
        addBindingNamesFromPattern(d.name, declNames);
        for (const n of declNames) {
          if (!aliasNames.has(n)) localShadow.add(n);
        }
      }
    }
  } else if (
    ts.isImportEqualsDeclaration(stmt) &&
    !stmt.isTypeOnly &&
    ts.isIdentifier(stmt.name)
  ) {
    const ref = stmt.moduleReference;
    if (ref && !ts.isExternalModuleReference(ref)) {
      let r = ref;
      while (ts.isQualifiedName(r)) r = r.left;
      if (ts.isIdentifier(r) && isReactNs(r.text)) {
        if (ts.isIdentifier(ref)) {
          ns.push(stmt.name.text); // import R = React
        } else if (ts.isQualifiedName(ref) && ts.isIdentifier(ref.right)) {
          named.push([stmt.name.text, ref.right.text]); // import ue = React.useEffect
        }
      }
    }
  }
  return { ns, named };
}

/** Conjunto de nombres locales que son aliases react (ns ∪ named) declarados por `stmt`. */
function reactAliasNamesDeclaredBy(stmt, scope) {
  const { ns, named } = reactAliasesDeclaredBy(stmt, scope);
  const names = new Set(ns);
  for (const [local] of named) names.add(local);
  return names;
}

/**
 * Acumula en el `context` (scope-aware) los aliases react declarados por `stmt`, vía el
 * núcleo `reactAliasesDeclaredBy`. Los guarda en `scopeReactNs` / `scopeReactNamed` —
 * campos que viven SOLO en el scope donde se declaran y NO filtran a hermanos (el bypass
 * file-global que codex P1 rechazó). Devuelve el mismo `context` si no hay aliases.
 */
function addReactAliases(context, stmt) {
  const { ns, named } = reactAliasesDeclaredBy(stmt, context);
  if (ns.length === 0 && named.length === 0) return context;
  return {
    ...context,
    ...(ns.length > 0
      ? { scopeReactNs: new Set([...(context.scopeReactNs ?? []), ...ns]) }
      : {}),
    ...(named.length > 0
      ? { scopeReactNamed: new Map([...(context.scopeReactNamed ?? []), ...named]) }
      : {}),
  };
}

/**
 * Purga de `nonImportBindings` los nombres que `stmt` redeclara como aliases react. Un
 * `const ue = React.useEffect` en un scope interno SOMBREA léxicamente un binding no-react
 * homónimo del scope externo (`const ue = Sync.run` afuera) → ese nombre ya NO es un shadow
 * síncrono aquí y debe salir del set para que el deferred-hook shadow-guard no lo flaggee.
 * Gemelo de `purgeGuardAliasShadows`. Cierra FPs scope-shadow (react-alias sobre sync externo).
 */
function purgeNonImportReactAliases(context, stmt) {
  const aliasNames = reactAliasNamesDeclaredBy(stmt, context);
  if (aliasNames.size === 0 || context.nonImportBindings.size === 0) return context;
  let purged = null;
  for (const n of aliasNames) {
    if (context.nonImportBindings.has(n)) {
      if (!purged) purged = new Set(context.nonImportBindings);
      purged.delete(n);
    }
  }
  return purged ? { ...context, nonImportBindings: purged } : context;
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
 * Roots identifier de cualquier MEMBER-WRITE en el archivo: `X.m = …`, `X[m] = …` (incl.
 * compuesto `+=`/`??=`/…), `++X.m`/`X.m--`, `delete X.m`, y `Object.assign/defineProperty/
 * defineProperties(X, …)`. Un namespace react cuyo root aparezca aquí está MUTADO → NO se
 * puede tratar `X.useEffect` como el hook diferido inmutable (codex P1 sobre b35a87c).
 *
 * **Por qué importa el default import:** `import * as React` es un Module Namespace Object
 * READ-ONLY (`React.useEffect = sync` lanza TypeError en ESM strict → inmutable, sound). Pero
 * `import React from "react"` / `import { default as React }` es el objeto export MUTABLE bajo
 * interop CJS/bundler → `React.useEffect = sync; React.useEffect(()=>window)` corre síncrono y se
 * eximía = BYPASS. En vez de dejar de eximir TODO default-import (FP masivo: `React.useEffect(cb)`
 * es el patrón ubicuo), se INVALIDA solo si hay un member-write en el archivo (la opción "invalidate
 * on member writes" que codex sugirió). File-wide y conservador: el objeto React es COMPARTIDO, así
 * que una mutación en cualquier punto puede alcanzar cualquier llamada (independiente del orden
 * textual). Residual de diseño: mutación CROSS-MÓDULO o vía `Reflect.set`/aliasing indirecto (fuera
 * del scope single-file del gate).
 */
function gatherMutatedNamespaceRoots(sourceFile) {
  const roots = new Set();
  // Roots identifier a los que el RECEIVER (objeto mutado) puede evaluar, atravesando
  // wrappers VALUE-TRANSPARENTES (no solo erased): `(0, React)` (coma), `(a && React)`,
  // `(cond ? React : b)`, etc. — el valor ES React, sintácticamente visible = token-en-su-
  // sitio. Antes solo `unwrapErased` (paréntesis/as/!) → `((0, React) as any).useEffect = sync`
  // escapaba (codex P2). Multi-hoja (||/??/ternario) → taintea TODAS las ramas (fail-closed).
  // NOTA DE FRONTERA: esto resuelve el TARGET; el CALLEE (`calleeObjMember`) sigue en
  // `unwrapErased`, así que `(0, Object.assign)(React,…)` (coma en el callee = invocación
  // indirecta) sigue siendo el RESIDUAL ratificado (codex P1 #7) — modelar qué función se
  // invoca es el subsistema que §141 renuncia. La coma en el TARGET sí se caza.
  const addReceiverRoots = (node) => {
    for (const leaf of valueTransparentLeaves(node)) {
      if (
        ts.isPropertyAccessExpression(leaf) ||
        ts.isElementAccessExpression(leaf)
      ) {
        addReceiverRoots(leaf.expression); // root del chain = root(es) de la base
      } else if (ts.isIdentifier(leaf)) {
        roots.add(leaf.text);
      }
    }
  };
  const addIfMemberAccess = (node) => {
    const n = unwrapErased(node);
    if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) {
      addReceiverRoots(n.expression);
    }
  };
  // Recorre un TARGET de asignación (LHS de `=` / patrón de for-of/for-in) recogiendo los
  // roots de los member-access target. Un destructuring-assignment `({ x: React.useEffect } =
  // …)` o `[React.useEffect] = …` muta React aunque el LHS sea un object/array literal (no un
  // member-access directo) — el target member ESTÁ sintácticamente presente (codex P1, token-en-
  // su-sitio). Recursa en object/array patterns, defaults (`{ x: T = d }`) y rest (`{ ...T }`).
  const collectWriteTargets = (target) => {
    const t = unwrapErased(target);
    if (ts.isPropertyAccessExpression(t) || ts.isElementAccessExpression(t)) {
      addReceiverRoots(t.expression);
    } else if (ts.isObjectLiteralExpression(t)) {
      for (const prop of t.properties) {
        if (ts.isPropertyAssignment(prop)) collectWriteTargets(prop.initializer);
        else if (ts.isSpreadAssignment(prop)) collectWriteTargets(prop.expression);
        // ShorthandPropertyAssignment `{ x }` → x es identifier target, no member.
      }
    } else if (ts.isArrayLiteralExpression(t)) {
      for (const el of t.elements) {
        if (ts.isOmittedExpression(el)) continue;
        if (ts.isSpreadElement(el)) collectWriteTargets(el.expression);
        else collectWriteTargets(el);
      }
    } else if (
      ts.isBinaryExpression(t) &&
      t.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      collectWriteTargets(t.left); // default en destructuring: `{ x: T = d }` → T es t.left
    }
  };
  // `[obj, member]` de un callee `Obj.m(…)` (dot) o `Obj["m"](…)` (bracket string literal) — misma
  // normalización dot/bracket que el resto del gate (codex P1: el bracket-form se colaba).
  // Receiver del mutador value-transparente (`(0, Object).assign(React, …)`, `(c ? Fake : Object).
  // assign(…)`) → TODAS las hojas identifier VT (ALTERNATIVAS), no solo la primera; el caller
  // taintea si CUALQUIERA es un mutador para el member, fail-closed (codex P1).
  const mutatorReceiverIdents = (recv) =>
    valueTransparentLeaves(recv)
      .filter((o) => ts.isIdentifier(o))
      .map((o) => o.text);
  const calleeObjMember = (callee) => {
    if (ts.isPropertyAccessExpression(callee)) {
      const objs = mutatorReceiverIdents(callee.expression);
      if (objs.length > 0 && ts.isIdentifier(callee.name)) {
        return [objs, callee.name.text];
      }
    }
    if (ts.isElementAccessExpression(callee)) {
      const objs = mutatorReceiverIdents(callee.expression);
      // Desenvolver la KEY: `Object[("assign")]` (paréntesis), `Object["assign" as const]`
      // (as) — nodos ERASED en runtime → misma normalización que los otros member-name paths
      // (codex P1: la key envuelta se colaba). NO se foldea una key COMPUTADA por un OPERADOR
      // (`Object[1 && "assign"]`, `Object[(0, "assign")]`, `Object["as"+"sign"]`, ternario): exige
      // constant-folding del operador → es la frontera §141 ratificada (token-UNIDAD literal en su
      // sitio se caza; ENSAMBLAJE/operador-computed = RESIDUAL). Aquí el residual es FAIL-OPEN (la key
      // no resuelve → el mutador no se detecta → React no se taintea → su hook sigue exento), MISMA
      // clase que la invocación indirecta del mutador (`.call`/`.bind`/alias del callee) ya residual.
      // Cerrarlo = reimplementar el evaluador de constantes (whack-a-mole: &&, ||, comma, ?:, concat,
      // array-access, method-call…), justo lo que §141 renuncia por diseño (codex P2 sobre 9c97cdd).
      const key = callee.argumentExpression
        ? unwrapErased(callee.argumentExpression)
        : null;
      if (objs.length > 0 && key && ts.isStringLiteralLike(key)) {
        return [objs, key.text];
      }
    }
    return null;
  };
  // Mutadores cuyo PRIMER argumento es el objeto target: `Object.assign/defineProperty/
  // defineProperties(X, …)`, `Reflect.set/defineProperty/deleteProperty(X, …)`. Token-en-su-sitio
  // (el mutador está a la vista). Pasar X a una función arbitraria que lo muta = data-flow → residual.
  const MUTATORS = {
    Object: new Set(["assign", "defineProperty", "defineProperties"]),
    Reflect: new Set(["set", "defineProperty", "deleteProperty"]),
  };
  const visit = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      collectWriteTargets(node.left); // X.m=… / X[m]+=… / ({x:X.m}=…) / [X.m]=…
    } else if (
      (ts.isForOfStatement(node) || ts.isForInStatement(node)) &&
      !ts.isVariableDeclarationList(node.initializer)
    ) {
      collectWriteTargets(node.initializer); // for ({x: React.m} of …) — patrón sin const/let
    } else if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      addIfMemberAccess(node.operand); // ++X.m / X.m--
    } else if (ts.isDeleteExpression(node)) {
      addIfMemberAccess(node.expression); // delete X.m
    } else if (ts.isCallExpression(node)) {
      const om = calleeObjMember(unwrapErased(node.expression));
      if (
        om &&
        om[0].some((o) => MUTATORS[o]?.has(om[1])) &&
        node.arguments.length > 0
      ) {
        // Object.assign(X,…) / Reflect.set(X,…) — X (1er arg) es el target. Value-transparent
        // (`Object.assign((0, React), …)` → React). El CALLEE (Object.assign) se resolvió
        // arriba con unwrapErased (callee indirecto = residual); el target sí cruza VT. El modelo
        // de candidatos branch-aware cubre spread literal/ALTERNATIVAS (`Object.assign(...(c ?
        // [React, …] : []))`) — taintea el target de TODAS las ramas (codex P2).
        for (const cand of candidatesAt(node.arguments, 0)) addReceiverRoots(cand);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return roots;
}

/**
 * FAMILIA de aliases del OBJETO de un import react — todos los nombres que apuntan al MISMO
 * objeto (file-wide, cualquier scope, `const`/`let`/`var`/import-equals identifier-alias). Para
 * PROPAGAR el taint por member-write (codex P1 #4): el objeto default-export es COMPARTIDO, así
 * que `const A = React; A.useEffect = sync` muta el mismo objeto que `React` → si CUALQUIER miembro
 * de la familia tiene un member-write, NINGUNO es de fiar. Incluye `let`/`var` (un alias mutable
 * sigue apuntando al objeto al momento de la escritura → su mutación también lo contamina).
 *
 * Scope-blind (file-wide) por diseño: el taint es file-wide y debe alcanzar cualquier llamada sin
 * importar el orden. Over-aproxima en el caso raro de colisión de nombre entre scopes (`const A =
 * React` en uno, `const A = otro` mutado en otro) → over-taint fail-closed (acepta). Sólo se usa
 * si la familia ESTÁ mutada; sin member-write a la familia, no taintea nada (0-FP del caso común).
 */
function gatherReactNamespaceFamily(sourceFile) {
  const family = new Set();
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) {
      continue;
    }
    if (stmt.moduleSpecifier.text !== "react") continue;
    const clause = stmt.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name) family.add(clause.name.text); // import React (default)
    const nb = clause.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) family.add(nb.name.text); // import * as React
    if (nb && ts.isNamedImports(nb)) {
      for (const spec of nb.elements) {
        if (spec.isTypeOnly) continue;
        const exp = spec.propertyName ? spec.propertyName.text : spec.name.text;
        if (exp === "default") family.add(spec.name.text); // import { default as React }
      }
    }
  }
  if (family.size === 0) return family;
  let changed = true;
  // ¿El VALOR de `expr` es (value-transparente) un miembro de la familia react? Incluye la
  // proyección array-literal-index `[React][0]` (token-en-su-sitio: el elemento está a la vista).
  const exprIsFamilyValue = (expr) => {
    if (!expr) return false;
    for (const leaf of valueTransparentLeaves(expr)) {
      if (ts.isIdentifier(leaf) && family.has(leaf.text)) return true;
      if (ts.isElementAccessExpression(leaf)) {
        // Base value-transparente (`(c ? [React] : [React])[0]`) → arrayLiteralAlternatives (codex P2).
        const idx = leaf.argumentExpression
          ? unwrapErased(leaf.argumentExpression)
          : null;
        if (idx && ts.isNumericLiteral(idx)) {
          for (const arr of arrayLiteralAlternatives(leaf.expression)) {
            const el = arr.elements[Number(idx.text)];
            if (el && exprIsFamilyValue(el)) return true;
          }
        }
      }
    }
    return false;
  };
  // Enrola los identifiers de `target` ligados a un valor react de `init`. Cubre: identifier
  // (`A = React`), object/array binding-pattern (decl `const {a:A}=…`) y object/array literal
  // como target de assignment (`({a:A}={a:React})`, `[A]=[React]`). Match ESTRUCTURAL para no
  // over-taintear hermanos no-react (`const {a:A,b:B}={a:React,b:x}` enrola solo A). deepest re-hunt.
  const enrollBinding = (target, init) => {
    if (!target) return;
    const t = unwrapErased(target);
    if (ts.isIdentifier(t)) {
      if (!family.has(t.text) && exprIsFamilyValue(init)) {
        family.add(t.text);
        changed = true;
      }
      return;
    }
    // Element DEFAULTS de un binding-pattern (`{ R = React }`, `[R = React]`) son aliases
    // INTRÍNSECOS al pattern, independientes del init: el elemento puede resolver a su default →
    // taint fail-closed. Cubre param destructurado `f({ R = React } = {})` Y `const { R = React }
    // = x` (codex P2). Se compone con el match estructural contra el object/array literal de abajo.
    if (ts.isObjectBindingPattern(t) || ts.isArrayBindingPattern(t)) {
      for (const e of t.elements) {
        if (!ts.isBindingElement(e)) continue;
        if (e.initializer) enrollBinding(e.name, e.initializer); // default de ESTE elemento
        if (
          ts.isObjectBindingPattern(e.name) ||
          ts.isArrayBindingPattern(e.name)
        ) {
          // Pattern ANIDADO (`{ opts: { R = React } }`): recurre por sus propios defaults,
          // independiente del match estructural contra el init (codex P2).
          enrollBinding(e.name, undefined);
        }
      }
    }
    // Iterar TODAS las alternativas literal de init (`c ? { R: React } : { R: React }`), fail-closed
    // — paridad con collectStructuralAliases (codex P2).
    for (const lit of literalLeaves(init)) {
    if (
      (ts.isObjectBindingPattern(t) || ts.isObjectLiteralExpression(t)) &&
      ts.isObjectLiteralExpression(lit)
    ) {
      const elems = ts.isObjectBindingPattern(t) ? t.elements : t.properties;
      for (const e of elems) {
        // sub + DEFAULT del elemento, paridad con collectStructuralAliases: `{ R = React }` (shorthand
        // -default, objectAssignmentInitializer), `{ x: R = React }` (rename-default, BinaryExpression),
        // `{ x: R = React }` binding-default — el default provee el alias react cuando la key falta (codex P2).
        let keyNode, sub, def;
        def = null;
        if (ts.isBindingElement(e)) {
          keyNode = e.propertyName || e.name;
          sub = e.name;
          def = e.initializer ?? null;
        } else if (ts.isPropertyAssignment(e)) {
          keyNode = e.name;
          const v = e.initializer;
          if (
            v &&
            ts.isBinaryExpression(v) &&
            v.operatorToken.kind === ts.SyntaxKind.EqualsToken
          ) {
            sub = v.left;
            def = v.right;
          } else {
            sub = v;
          }
        } else if (ts.isShorthandPropertyAssignment(e)) {
          keyNode = e.name;
          sub = e.name;
          def = e.objectAssignmentInitializer ?? null;
        } else continue;
        // Key COMPUTADA value-transparente (`{ ["a"]: A } = { a: React }`) → "a", como el resto del
        // gate (structuralKeyText), para no dejar `A` fuera de la familia react (codex P2).
        if (structuralKeyTexts(keyNode).length === 0 || !sub) continue;
        const ip = lit.properties.find(
          (p) =>
            ts.isPropertyAssignment(p) &&
            p.name &&
            structuralKeysOverlap(p.name, keyNode),
        );
        if (ip) enrollBinding(sub, ip.initializer);
        if (def) enrollBinding(sub, def);
      }
    }
    if (
      (ts.isArrayBindingPattern(t) || ts.isArrayLiteralExpression(t)) &&
      ts.isArrayLiteralExpression(lit)
    ) {
      const elems = t.elements;
      elems.forEach((e, i) => {
        if (ts.isOmittedExpression(e)) return;
        const sub = ts.isBindingElement(e) ? e.name : e;
        enrollBinding(sub, lit.elements[i]);
      });
    }
    }
  };
  while (changed) {
    changed = false;
    const visit = (node) => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        // `const A = (0, React)` / binding-pattern `const {a:A}=…` / `const [A]=[React]`.
        enrollBinding(node.name, node.initializer);
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isIdentifier(node.name)
      ) {
        const ref = node.moduleReference;
        if (
          ref &&
          ts.isIdentifier(ref) &&
          family.has(ref.text) &&
          !family.has(node.name.text)
        ) {
          family.add(node.name.text); // import X = Y (Y ∈ familia)
          changed = true;
        }
      } else if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        // ASSIGNMENT-alias: `A = React`, `[A] = [React]`, `({a:A} = {a:React})`. El target
        // member-path (`box.r = React`) NO se enrola (alias de miembro = data-flow, residual).
        enrollBinding(node.left, node.right);
      } else if (ts.isParameter(node)) {
        if (ts.isIdentifier(node.name)) {
          // PARAM-default identifier: `function go(A = React) { A.useEffect = sync }`.
          if (
            node.initializer &&
            !family.has(node.name.text) &&
            exprIsFamilyValue(node.initializer)
          ) {
            family.add(node.name.text);
            changed = true;
          }
        } else {
          // PARAM binding-pattern: `function go({ R = React } = {})` — defaults intrínsecos +
          // match estructural contra el param-default literal (codex P2).
          enrollBinding(node.name, node.initializer);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return family;
}

const TIMER_GLOBAL_NAMES = new Set([
  "setTimeout",
  "setInterval",
  "setImmediate",
]);

/**
 * ¿`expr` resuelve (value-transparente) a un timer GLOBAL no sombreado, o a un alias ya conocido
 * en este scope? `setTimeout`/`globalThis.setInterval`/un alias previo. El shadow se evalúa contra
 * `context.localBindings` (SCOPE-ACCURATE en el punto de la declaración) — NO file-level: un
 * `setTimeout` declarado en un scope HERMANO/interno NO debe ocultar un alias del global real aquí
 * (codex P2). Los timers están en SAFE_GLOBALS → su read no se flaggea aguas arriba (≠ eval, sink)
 * → sin resolver el alias `later("código")` sería fail-open.
 */
// La única hoja value-transparente de `expr` SI es un literal object/array (para matchear patrones
// de destructuring contra `{a: X}` / `[X]`). Versión module-level del `literalInit` de react-family.
// TODOS los object/array literal leaves value-transparentes de `expr` — ALTERNATIVAS incluidas
// (`cond ? { a: X } : { a: Y }` → [{a:X},{a:Y}]). Fail-closed: el match estructural corre contra
// CADA uno (si CUALQUIER rama liga el token, enrola/flaggea) (codex P2).
function literalLeaves(expr) {
  if (!expr) return [];
  return valueTransparentLeaves(expr).filter(
    (l) => ts.isObjectLiteralExpression(l) || ts.isArrayLiteralExpression(l),
  );
}

/**
 * Recorre `target` (identifier | array/object binding pattern) contra `init`, llamando
 * `emit(name, value)` por cada binding cuyo valor (vía `resolve(expr, context)` → truthy) es un
 * alias. Cubre: identifier directo, DEFAULTS de binding-element (`{ X = WebAssembly }`), match
 * ESTRUCTURAL contra object/array literal (`const [later] = [setTimeout]`, `const {a:X}={a:React}`),
 * patterns ANIDADOS, y proyección `[X][i]` (vía resolve). Espejo genérico de `enrollBinding`
 * (react-family) para los colectores de timer/partial alias. codex P2 (alias-form completeness).
 */
// Texto de una key de propiedad/binding, foldeando keys COMPUTADAS value-transparentes
// (`["wa"]`, `[1 && "wa"]` → "wa"), como el resto de paths del gate (codex P2). null si no es
// estáticamente conocible.
// TODAS las candidatas string de una key de pattern/propiedad — incluye ALTERNATIVAS de una key
// COMPUTADA value-transparente (`[c ? "a" : "b"]` → ["a","b"]); fail-closed, cualquiera cuenta
// (codex P2). Operador no-VT (concat) = ensamblaje §141 residual (no produce string-literal leaf).
function structuralKeyTexts(keyNode) {
  if (!keyNode) return [];
  if (ts.isComputedPropertyName(keyNode)) {
    return valueTransparentLeaves(keyNode.expression)
      .filter((l) => ts.isStringLiteralLike(l))
      .map((l) => l.text);
  }
  return ts.isIdentifier(keyNode) || ts.isStringLiteralLike(keyNode)
    ? [keyNode.text]
    : [];
}

// ¿comparten las keys `a` y `b` alguna candidata? (match estructural fail-closed entre alternativas).
function structuralKeysOverlap(a, b) {
  const sa = structuralKeyTexts(a);
  const sb = structuralKeyTexts(b);
  return sa.some((k) => sb.includes(k));
}

function collectStructuralAliases(target, init, context, resolve, emit, enrollRest = false) {
  if (!target) return;
  const t = unwrapErased(target);
  if (ts.isIdentifier(t)) {
    const v = resolve(init, context);
    if (v) emit(t.text, v);
    return;
  }
  // Element DEFAULTS de un binding-pattern (`{ X = setTimeout }`) + patterns ANIDADOS,
  // independientes del init.
  if (ts.isObjectBindingPattern(t) || ts.isArrayBindingPattern(t)) {
    for (const e of t.elements) {
      if (!ts.isBindingElement(e)) continue;
      // OBJECT-REST `const { ...WA } = WebAssembly`: WA es un (shallow copy del) root → los miembros
      // peligrosos van con él (o faltan igual) → alias del partial-root (codex P2). Solo PARTIAL
      // (enrollRest): para un timer, `{ ...later } = setTimeout` da un objeto NO invocable (TypeError
      // genérico al llamarlo, no eval del navegador), así que no es un timer-alias.
      if (
        enrollRest &&
        ts.isObjectBindingPattern(t) &&
        e.dotDotDotToken &&
        ts.isIdentifier(e.name)
      ) {
        const v = resolve(init, context);
        if (v) emit(e.name.text, v);
        continue;
      }
      if (e.initializer) {
        collectStructuralAliases(e.name, e.initializer, context, resolve, emit, enrollRest);
      }
      if (
        ts.isObjectBindingPattern(e.name) ||
        ts.isArrayBindingPattern(e.name)
      ) {
        collectStructuralAliases(e.name, undefined, context, resolve, emit, enrollRest);
      }
    }
  }
  // OBJECT-REST en un ASSIGNMENT-pattern (`({ ...WA } = WebAssembly)`): el SpreadAssignment del
  // object-literal TARGET copia el root → WA aliasa el partial-root (codex P2). Gemelo del
  // binding-rest de arriba; solo PARTIAL (enrollRest).
  if (enrollRest && ts.isObjectLiteralExpression(t)) {
    for (const e of t.properties) {
      if (ts.isSpreadAssignment(e) && ts.isIdentifier(e.expression)) {
        const v = resolve(init, context);
        if (v) emit(e.expression.text, v);
      }
    }
  }
  // DEFAULTS de un object/array-LITERAL target (assignment-destructure `({ X = setTimeout } = …)`,
  // for-of `for ({ X = setTimeout } of …)`) — INDEPENDIENTES del init, como los binding-element
  // defaults de arriba; el default ejecuta cuando la prop/índice falta (codex P2).
  if (ts.isObjectLiteralExpression(t)) {
    for (const e of t.properties) {
      if (
        ts.isShorthandPropertyAssignment(e) &&
        e.objectAssignmentInitializer
      ) {
        collectStructuralAliases(e.name, e.objectAssignmentInitializer, context, resolve, emit, enrollRest);
      } else if (
        ts.isPropertyAssignment(e) &&
        e.initializer &&
        ts.isBinaryExpression(e.initializer) &&
        e.initializer.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        collectStructuralAliases(e.initializer.left, e.initializer.right, context, resolve, emit, enrollRest);
      }
    }
  }
  if (ts.isArrayLiteralExpression(t)) {
    for (const e of t.elements) {
      if (
        ts.isBinaryExpression(e) &&
        e.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        collectStructuralAliases(e.left, e.right, context, resolve, emit, enrollRest);
      }
    }
  }
  // Iterar TODAS las alternativas literal (`cond ? {a:X} : {a:Y}`): el match estructural corre
  // contra cada rama, fail-closed (codex P2).
  for (const lit of literalLeaves(init)) {
  // Object: binding-pattern DECL (`const {a:X}=…`) O object-LITERAL target de assignment-destr
  // (`({a:X}={a:setTimeout})`). Match estructural por key (codex P2).
  if (
    (ts.isObjectBindingPattern(t) || ts.isObjectLiteralExpression(t)) &&
    ts.isObjectLiteralExpression(lit)
  ) {
    const elems = ts.isObjectBindingPattern(t) ? t.elements : t.properties;
    for (const e of elems) {
      let keyNode;
      let sub;
      if (ts.isBindingElement(e)) {
        keyNode = e.propertyName || e.name;
        sub = e.name;
      } else if (ts.isPropertyAssignment(e)) {
        keyNode = e.name;
        sub = e.initializer;
        // default en assignment-destr RENOMBRADO `({ x: later = setTimeout } = {})`: el initializer
        // es `later = setTimeout` (BinaryExpression). Desempaquetar: target=left, default=right —
        // el target puede resolver a su default aunque el init no matchee la key (codex P2).
        if (
          sub &&
          ts.isBinaryExpression(sub) &&
          sub.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
          collectStructuralAliases(sub.left, sub.right, context, resolve, emit, enrollRest);
          sub = sub.left;
        }
      } else if (ts.isShorthandPropertyAssignment(e)) {
        keyNode = e.name;
        sub = e.name;
        // default en assignment-destr `({ X = setTimeout } = {})`.
        if (e.objectAssignmentInitializer) {
          collectStructuralAliases(
            e.name,
            e.objectAssignmentInitializer,
            context,
            resolve,
            emit,
            enrollRest,
          );
        }
      } else continue;
      if (structuralKeyTexts(keyNode).length === 0) continue;
      const ip = lit.properties.find(
        (p) =>
          ts.isPropertyAssignment(p) &&
          p.name &&
          structuralKeysOverlap(p.name, keyNode),
      );
      if (ip) {
        collectStructuralAliases(sub, ip.initializer, context, resolve, emit, enrollRest);
      }
    }
  }
  // Array: binding-pattern DECL (`const [X]=…`) O array-LITERAL target (`[X]=[setTimeout]`).
  if (
    (ts.isArrayBindingPattern(t) || ts.isArrayLiteralExpression(t)) &&
    ts.isArrayLiteralExpression(lit)
  ) {
    t.elements.forEach((e, i) => {
      if (ts.isOmittedExpression(e)) return;
      let sub = ts.isBindingElement(e) ? e.name : e;
      // default en array assignment-destr `[WA = WebAssembly] = []`: el elemento es la
      // BinaryExpression `WA = WebAssembly`. Desempaquetar: target=left, default=right (codex P2).
      if (
        sub &&
        ts.isBinaryExpression(sub) &&
        sub.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        collectStructuralAliases(sub.left, sub.right, context, resolve, emit, enrollRest);
        sub = sub.left;
      }
      collectStructuralAliases(sub, lit.elements[i], context, resolve, emit, enrollRest);
    });
  }
  }
}

function exprIsTimerValued(expr, context) {
  if (!expr) return false;
  const known = context.scopeTimerAliases;
  for (const leaf of valueTransparentLeaves(expr)) {
    if (ts.isIdentifier(leaf)) {
      if (known && known.has(leaf.text)) return true;
      if (
        TIMER_GLOBAL_NAMES.has(leaf.text) &&
        !context.localBindings.has(leaf.text)
      ) {
        return true;
      }
    } else if (
      ts.isPropertyAccessExpression(leaf) ||
      ts.isElementAccessExpression(leaf)
    ) {
      // Receiver value-transparente (`(0, globalThis).setTimeout`, `(c ? window : self).setTimeout`)
      // → resolver por valueTransparentLeaves, no solo unwrapErased; paridad con la rama de callee
      // directo del string-timer (codex P2). Shadow-aware.
      const receiverIsGlobalObj = valueTransparentLeaves(leaf.expression).some(
        (r) =>
          ts.isIdentifier(r) &&
          (r.text === "globalThis" ||
            r.text === "window" ||
            r.text === "self" ||
            r.text === "global") &&
          !context.localBindings.has(r.text),
      );
      if (receiverIsGlobalObj) {
        const mn = accessedMemberName(leaf);
        if (mn && TIMER_GLOBAL_NAMES.has(mn)) return true;
      }
      // Proyección array-literal-index `[setTimeout][0]` (token-en-su-sitio). Base value-transparente
      // (`(c ? [setTimeout] : [setTimeout])[0]`) → arrayLiteralAlternatives, no solo unwrapErased (codex P2).
      if (ts.isElementAccessExpression(leaf)) {
        const idx = leaf.argumentExpression
          ? unwrapErased(leaf.argumentExpression)
          : null;
        if (idx && ts.isNumericLiteral(idx)) {
          for (const arr of arrayLiteralAlternatives(leaf.expression)) {
            const el = arr.elements[Number(idx.text)];
            if (el && exprIsTimerValued(el, context)) return true;
          }
        }
      }
    } else if (ts.isCallExpression(leaf)) {
      // `<timer>.bind(thisArg?)` SIN handler bindeado → la fn ligada SIGUE siendo un timer (el
      // handler llega en la llamada externa: `setTimeout.bind(null)("código")`). Con ≥1 handler
      // bindeado el string ya está en los args de `.bind` (lo caza la rama `.bind`). codex P2.
      const callee = unwrapErased(leaf.expression);
      if (
        (ts.isPropertyAccessExpression(callee) ||
          ts.isElementAccessExpression(callee)) &&
        accessedMemberName(callee) === "bind" &&
        leaf.arguments.length <= 1 &&
        exprIsTimerValued(callee.expression, context)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Nombres de alias de timer global declarados por `stmt` (`const later = setTimeout`, `f = later`).
 * SCOPE-AWARE: el shadow del nombre-timer se resuelve contra `context.localBindings` en este punto.
 */
function timerAliasNamesDeclaredBy(stmt, context) {
  const names = new Set();
  const emit = (name) => names.add(name);
  // import-equals value-alias: `import later = setTimeout` / `import Y = X` (X alias). El
  // moduleReference es un EntityName; un Identifier que resuelve a timer enrola el alias (codex P2).
  if (
    ts.isImportEqualsDeclaration(stmt) &&
    !stmt.isTypeOnly &&
    ts.isIdentifier(stmt.moduleReference) &&
    exprIsTimerValued(stmt.moduleReference, context)
  ) {
    names.add(stmt.name.text);
    return names;
  }
  // Un único VariableDeclaration (un declarador suelto, p.ej. desde el walk multi-declarator).
  if (ts.isVariableDeclaration(stmt)) {
    collectStructuralAliases(stmt.name, stmt.initializer, context, exprIsTimerValued, emit);
    // Assignments EMBEBIDAS en el initializer (`const _ = (later = setTimeout)`) (codex P2).
    eachEmbeddedAssignment(stmt.initializer, (a) =>
      collectStructuralAliases(a.left, a.right, context, exprIsTimerValued, emit),
    );
    return names;
  }
  // Acepta un VariableStatement O un VariableDeclarationList directo (el init de un for; codex P2).
  const declList = ts.isVariableStatement(stmt)
    ? stmt.declarationList
    : ts.isVariableDeclarationList(stmt)
      ? stmt
      : null;
  if (declList) {
    // identifier / array-object-destructure / binding-element-default / `[X][i]` (codex P2).
    // Declaradores LEFT-TO-RIGHT: un alias en cadena dentro del mismo statement (`const a =
    // setTimeout, b = a`) — `b` debe ver `a` ya enrolado (codex P2). Avanzar un ctx local.
    let ctx = context;
    for (const d of declList.declarations) {
      const local = new Set();
      const addLocal = (n) => {
        local.add(n);
        names.add(n);
      };
      collectStructuralAliases(d.name, d.initializer, ctx, exprIsTimerValued, addLocal);
      // Assignments EMBEBIDAS en el initializer (`const _ = (later = setTimeout), id = …`) (codex P2).
      eachEmbeddedAssignment(d.initializer, (a) =>
        collectStructuralAliases(a.left, a.right, ctx, exprIsTimerValued, addLocal),
      );
      if (local.size > 0) {
        ctx = {
          ...ctx,
          scopeTimerAliases: new Set([
            ...(ctx.scopeTimerAliases ?? []),
            ...local,
          ]),
        };
      }
    }
  } else if (ts.isExpressionStatement(stmt)) {
    // Assignments TOP-LEVEL (`later = setTimeout;`, `({later}={…})`) Y EMBEBIDAS en operadores value-
    // transparentes (`(later = setTimeout, 0);`) → enrolar para statements POSTERIORES (la asignación
    // YA ejecutó antes del sink siguiente; codex P2). `eachEmbeddedAssignment` (mismo predicado §141,
    // sin path paralelo) cubre las tres; threadea ctx left-to-right para cadenas.
    let ctx = context;
    eachEmbeddedAssignment(stmt.expression, (assign) => {
      const local = new Set();
      collectStructuralAliases(assign.left, assign.right, ctx, exprIsTimerValued, (n) => {
        local.add(n);
        names.add(n);
      });
      if (local.size > 0) {
        ctx = {
          ...ctx,
          scopeTimerAliases: new Set([...(ctx.scopeTimerAliases ?? []), ...local]),
        };
      }
    });
  }
  return names;
}

/**
 * Acumula (scope-aware) en `context.scopeTimerAliases` los alias de timer declarados por `stmt`.
 * Gemelo de `addReactAliases`: vive en el scope donde se declara, no filtra a hermanos; un alias
 * forward (`const a = setTimeout; const b = a`) se reconoce porque `a` ya está en el set al
 * procesar la siguiente sentencia. Devuelve el mismo context si no hay alias.
 */
function addTimerAliases(context, stmt) {
  const names = timerAliasNamesDeclaredBy(stmt, context);
  if (names.size === 0) return context;
  return {
    ...context,
    scopeTimerAliases: new Set([
      ...(context.scopeTimerAliases ?? []),
      ...names,
    ]),
  };
}

/**
 * Nombre del GLOBAL parcial-safe al que `expr` resuelve (value-transparente): un identifier que ES
 * un root de PARTIAL_SAFE_GLOBAL_MEMBERS no sombreado (`WebAssembly`, `performance`), o un alias ya
 * conocido en scope (`const WA = WebAssembly` → "WebAssembly"). null si no. El read del root está en
 * SAFE_GLOBALS → un alias sería invisible aguas arriba = bypass del partial-member gate (codex P2),
 * misma asimetría que los timer-alias. Respeta shadow (localBindings) y forward value-read.
 */
function exprPartialRoot(expr, context) {
  if (!expr) return null;
  const known = context.scopePartialAliases;
  for (const leaf of valueTransparentLeaves(expr)) {
    if (ts.isIdentifier(leaf)) {
      if (known && known.has(leaf.text)) return known.get(leaf.text);
      if (
        isPartialMemberRoot(leaf.text) &&
        !context.localBindings.has(leaf.text) &&
        !(
          context.isInFunctionBody &&
          context.moduleDeclaredNames?.has(leaf.text)
        )
      ) {
        return leaf.text;
      }
    } else if (ts.isElementAccessExpression(leaf)) {
      // Proyección array-literal-index `[WebAssembly][0]`. Base value-transparente
      // (`(c ? [WebAssembly] : [WebAssembly])[0]`) → arrayLiteralAlternatives (codex P2).
      const idx = leaf.argumentExpression
        ? unwrapErased(leaf.argumentExpression)
        : null;
      if (idx && ts.isNumericLiteral(idx)) {
        for (const arr of arrayLiteralAlternatives(leaf.expression)) {
          const el = arr.elements[Number(idx.text)];
          const r = el ? exprPartialRoot(el, context) : null;
          if (r) return r;
        }
      }
    }
  }
  return null;
}

/** Mapa aliasName→rootGlobalName declarados por `stmt` (`const WA = WebAssembly`, `p = performance`). */
function partialAliasesDeclaredBy(stmt, context) {
  const out = new Map();
  const emit = (name, root) => out.set(name, root);
  // import-equals ROOT-alias: `import WA = WebAssembly` (Identifier moduleReference) → WA aliasa el
  // root parcial. (El `import compile = WA.compile` MIEMBRO lo caza la rama c.1d.) codex P2.
  if (
    ts.isImportEqualsDeclaration(stmt) &&
    !stmt.isTypeOnly &&
    ts.isIdentifier(stmt.moduleReference)
  ) {
    const root = exprPartialRoot(stmt.moduleReference, context);
    if (root) out.set(stmt.name.text, root);
    return out;
  }
  // Un único VariableDeclaration (un declarador suelto, p.ej. desde el walk multi-declarator).
  if (ts.isVariableDeclaration(stmt)) {
    collectStructuralAliases(stmt.name, stmt.initializer, context, exprPartialRoot, emit, true);
    eachEmbeddedAssignment(stmt.initializer, (a) =>
      collectStructuralAliases(a.left, a.right, context, exprPartialRoot, emit, true),
    );
    return out;
  }
  // Acepta un VariableStatement O un VariableDeclarationList directo (el init de un for; codex P2).
  const declList = ts.isVariableStatement(stmt)
    ? stmt.declarationList
    : ts.isVariableDeclarationList(stmt)
      ? stmt
      : null;
  if (declList) {
    // identifier / array-object-destructure / binding-element-default / `[X][i]` (codex P2).
    // Declaradores LEFT-TO-RIGHT: cadena en el mismo statement (`const A = WebAssembly, B = A`) —
    // `B` debe ver `A` ya enrolado (codex P2). Avanzar un ctx local.
    let ctx = context;
    for (const d of declList.declarations) {
      const local = new Map();
      const addLocal = (n, root) => {
        local.set(n, root);
        out.set(n, root);
      };
      collectStructuralAliases(d.name, d.initializer, ctx, exprPartialRoot, addLocal, true);
      // Assignments EMBEBIDAS en el initializer (`const _ = (WA = WebAssembly), …`) (codex P2).
      eachEmbeddedAssignment(d.initializer, (a) =>
        collectStructuralAliases(a.left, a.right, ctx, exprPartialRoot, addLocal, true),
      );
      if (local.size > 0) {
        ctx = {
          ...ctx,
          scopePartialAliases: new Map([
            ...(ctx.scopePartialAliases ?? []),
            ...local,
          ]),
        };
      }
    }
  } else if (ts.isExpressionStatement(stmt)) {
    // Assignments TOP-LEVEL (`({WA}={…})`) Y EMBEBIDAS (`(WA = WebAssembly, 0);`) → enrolar para
    // statements POSTERIORES (codex P2). Mismo eachEmbeddedAssignment del §141; threadea ctx.
    let ctx = context;
    eachEmbeddedAssignment(stmt.expression, (assign) => {
      const local = new Map();
      collectStructuralAliases(
        assign.left,
        assign.right,
        ctx,
        exprPartialRoot,
        (n, r) => {
          local.set(n, r);
          out.set(n, r);
        },
        true,
      );
      if (local.size > 0) {
        ctx = {
          ...ctx,
          scopePartialAliases: new Map([
            ...(ctx.scopePartialAliases ?? []),
            ...local,
          ]),
        };
      }
    });
  }
  return out;
}

/** Acumula (scope-aware) en `context.scopePartialAliases` los alias de root parcial-safe de `stmt`. */
function addPartialAliases(context, stmt) {
  const m = partialAliasesDeclaredBy(stmt, context);
  if (m.size === 0) return context;
  return {
    ...context,
    scopePartialAliases: new Map([
      ...(context.scopePartialAliases ?? []),
      ...m,
    ]),
  };
}

/**
 * Purga de `scopeTimerAliases` / `scopePartialAliases` los nombres que `names` REDECLARA en este
 * scope (param/const/función/…). Un binding homónimo SOMBREA el alias → en este scope ya no es el
 * global (codex P2: `const later = setTimeout; function f(later){ later("x") }`). Devuelve solo los
 * campos que cambian (para no romper la igualdad referencial del resto del context).
 */
function purgeScopeAliasShadows(context, names) {
  if (!names || names.size === 0) return null;
  const out = {};
  const timers = context.scopeTimerAliases;
  if (timers && timers.size > 0) {
    let changed = false;
    const next = new Set(timers);
    for (const n of names) if (next.delete(n)) changed = true;
    if (changed) out.scopeTimerAliases = next;
  }
  const partials = context.scopePartialAliases;
  if (partials && partials.size > 0) {
    let changed = false;
    const next = new Map(partials);
    for (const n of names) if (next.delete(n)) changed = true;
    if (changed) out.scopePartialAliases = next;
  }
  return Object.keys(out).length > 0 ? out : null;
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
 *
 * `mutatedRoots`: la familia react tainteada (si hubo member-write a cualquier alias) → esos
 * namespaces NO se reconocen como react (su `.useEffect` puede ser síncrono).
 */
function gatherReactImports(sourceFile, mutatedRoots) {
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
  // SOLO TOP-LEVEL (sourceFile.statements). La recursión a cuerpos de función/namespace era
  // INSEGURA (codex P1): un `const { useEffect } = React` en `helper` registraría useEffect
  // file-global, y un `useEffect` de OTRO scope —importado de un módulo no-react (`./sync`,
  // que NO está en nonImportBindings → el shadow-guard NO dispara)— se eximiría como hook
  // diferido aunque corra síncrono = BYPASS. La resolución de alias react NO puede ser
  // file-global; un alias en scope hermano no aplica. El destructure/alias TOP-LEVEL (caso
  // COMÚN) se reconoce aquí (sound: top-level ES el scope externo). El NESTED lo cierra
  // `addReactAliases` SCOPE-AWARE (acumulado posicionalmente en context.scopeReactNs/Named
  // durante el walk, vive solo en su scope → no filtra a hermanos) — NO aquí.
  // Fixpoint para cadenas (`const R = React; const { ue } = R`; `import R = React; import ue =
  // R.useEffect`). Usa el MISMO núcleo `reactAliasesDeclaredBy` que el path scope-aware → const-only
  // (un top-level `let ue = React.useEffect` reasignable NO se registra, codex P1), element-access,
  // computed-literal y rest-de-namespace tratados idénticos aquí. SOLO TOP-LEVEL (sound: top-level ES
  // el scope externo); el NESTED lo cierra `addReactAliases` scope-aware (no filtra a hermanos).
  let changed = true;
  while (changed) {
    changed = false;
    for (const stmt of sourceFile.statements) {
      const { ns: aliasNs, named: aliasNamed } = reactAliasesDeclaredBy(stmt, {
        reactImports: { named, namespaces },
        mutatedNamespaceRoots: mutatedRoots,
      });
      for (const n of aliasNs) {
        if (!namespaces.has(n)) {
          namespaces.add(n);
          changed = true;
        }
      }
      for (const [local, canon] of aliasNamed) {
        if (named.get(local) !== canon) {
          named.set(local, canon);
          changed = true;
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

// TODAS las candidatas del member-name accedido — incluye ALTERNATIVAS de una key computada
// (`WebAssembly[c ? "compile" : "validate"]` → ["compile","validate"]); fail-closed, cualquiera
// cuenta para el chequeo partial-member (codex P2). `accessedMemberName` (singular) prioriza el
// weaponizable para el eval-sink; ésta enumera para el set partial.
function accessedMemberNames(node) {
  if (ts.isPropertyAccessExpression(node)) return [node.name.text];
  if (ts.isElementAccessExpression(node)) {
    return valueTransparentLeaves(node.argumentExpression)
      .map(foldConstString)
      .filter((s) => s !== undefined);
  }
  return [];
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

// ASCENSO inverso de `unwrapErased`+`valueTransparentLeaves`: desde `node` sube por los MISMOS wrappers
// —erased (`isErasedOuterExpr`, el predicado que usa `unwrapErased`) + operadores value-transparent
// (`isValueTransparentParent`)— hasta el member-access que lo ENVUELVE; lo devuelve si `node` (a través de
// los wrappers) es su `.expression`/root, si no null. La allowance de root-de-miembro-seguro es sobre el
// VALOR (¿`process`/`import.meta` llega al member-access?), y los wrappers (erased Y VT) PRESERVAN el valor:
// `(0, process).env` ≡ `process.env`, Edge-safe, NO diverge → el gate caza divergencia, no ofuscación, así
// que no le toca penalizarlo (mandato divergencia-Edge, ratificado B). Espeja el camino DESCENDENTE de
// import.meta (`valueSurvivalLeaves`) → los dos roots de la familia tratan VT IGUAL, sin drift. ORTOGONAL al
// eje receiver-detach: éste extiende la allowance de miembros-VALOR no-método (env/url ∈ SAFE_MEMBERS_OF_
// DENIED_ROOT/SAFE_IMPORT_META_MEMBERS); el detach-de-this por VT aplica a métodos branded (RECEIVER_BOUND,
// crypto) — sets distintos, checks distintos, no se pisan. codex P2 + ratificación mandato (Iván).
function wrapperEnclosingMemberAccess(node) {
  let top = node;
  while (
    top.parent &&
    ((isErasedOuterExpr(top.parent) && top.parent.expression === top) ||
      isValueTransparentParent(top.parent, top))
  ) {
    top = top.parent;
  }
  const acc = top.parent;
  return acc &&
    (ts.isPropertyAccessExpression(acc) ||
      ts.isElementAccessExpression(acc)) &&
    acc.expression === top
    ? acc
    : null;
}

/**
 * Mapeo ÚNICO del set ACOTADO de constructos VALUE-TRANSPARENTES → las sub-expresiones
 * cuyo valor ES (sintácticamente) el de la expresión, sin evaluar nada: wrappers erased
 * (`()`,`!`,`as`,`satisfies`,`<T>`) + `await` (→operando — transparente para no-thenables,
 * cuyo `await` es identidad; un THENABLE corre `.then` y NO es transparente, por eso este
 * cruce SOLO vale para FLAGGING fail-closed —cazar `(await fn.constructor)(...)`—; la
 * EXENCIÓN rechaza receivers que cruzan await vía `valueTransparentPathCrossesAwait`, codex
 * P2) + coma (→right) + `&&`/`&&=` (→right:
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

// VALUE-SURVIVAL: las hojas a las que se reduce el VALOR de `expr` saltando erased (parens/as/!/satisfies)
// Y operadores value-transparent (ternario/coma/`&&`/`||`/`??`/`=`), o `[expr-erased]` si no hay wrapper VT.
// Helper CENTRALIZADO del eje value-survival ("¿el token/valor peligroso llega a la operación a través de
// wrappers?"), consultado por TODOS los checks value-survival: eval-sink (`.constructor`), construcción
// (`new <root>.Module`), `import.meta.<member>`. Cierra la clase "olvido-VT sobre operación-en-sitio" POR
// CONSTRUCCIÓN: un check value-survival nuevo reusa esto en vez de re-implementar/olvidar el VT-skip.
// ⚠️ NO es para el eje RECEIVER-DETACH (unbound branded methods): ese usa el set VT SPLIT (this-detaching
// detecta / this-preserving preserva el bound) — pregunta ortogonal, fusionarla aquí re-crearía el bug
// "ejes ortogonales bajo predicado compartido". value-survival = set UNIFORME; receiver-detach = set SPLIT.
function valueSurvivalLeaves(expr) {
  const u = unwrapErased(expr);
  return valueTransparentChildren(u).length > 0
    ? valueTransparentLeaves(u).map(unwrapErased)
    : [u];
}

// Desliga una cadena de `.bind(...)` al receiver subyacente: `X.bind(a).bind(b)` → X. Un bound function,
// al hacer `new` o llamarse, construye/invoca el ORIGINAL (`new (X.bind(t,...a))()` ≡ `new X(...a)`;
// `(X.m.bind(t))()` ≡ `X.m.call(t)`). RESOLUCIÓN axis-agnóstica (no política) COMPARTIDA por las DOS ramas
// de detach-por-bind — construcción (constructor ligado) y unbound (método branded ligado) — para que la
// forma `.bind` ENCADENADA esté cubierta con la MISMA exhaustividad en ambas (el sub-hueco simétrico que
// si no reaparece de rama en rama). dotted/bracket(`["bind"]`)/optional vía accessedMemberNames; el caller
// aplica DESPUÉS su política (isConstructionDeniedMember / RECEIVER_BOUND) → desligar un `.bind` inocuo es
// inerte (se filtra después). depth-guard anti-runaway. Devuelve el expr erased si no hay `.bind`.
function unwrapBindChain(expr) {
  // ITERATIVO (no recursivo) → SIN cap de profundidad: la PROFUNDIDAD de `.bind` encadenado tiene final
  // (el member base) y el bucle TERMINA por descenso estricto del AST (`ic.expression` es un sub-nodo).
  // Un cap numérico sería una frontera-FALSA (dejaría pasar 9+ niveles); la profundidad es decidible
  // hasta el fondo, así que se cierra hasta el fondo. (codex P1 + barra "no-residual-si-tiene-final".)
  let u = unwrapErased(expr);
  while (ts.isCallExpression(u)) {
    const ic = unwrapErased(u.expression);
    if (
      (ts.isPropertyAccessExpression(ic) || ts.isElementAccessExpression(ic)) &&
      accessedMemberNames(ic).includes("bind")
    ) {
      u = unwrapErased(ic.expression);
      continue;
    }
    break;
  }
  return u;
}

// Pela la CADENA DE RECEIVER completa hasta el member base: `.bind(...)` calls (constructor/método LIGADO
// construye/invoca el receiver → `unwrapBindChain`) Y `.call`/`.apply` members (INVOCAN el receiver `Y` →
// ver a través a `Y`). Iterativo, sin cap (profundidad e INTERLEAVING arbitrarios `.bind(a).call(b)`,
// `.call.bind(c)()`, etc. cierran hasta el fondo por construcción). El branded method está en la cadena de
// RECEIVER (resoluble sin ejecutar). NO pela cuando el branded llega por ARGUMENTO (`.bind.call(X,…)`: `X`
// es el arg de `.call`, no el receiver → requiere data-flow del arg = §141 residual, eval, no estructural).
function peelReceiverChain(expr) {
  let u = unwrapBindChain(expr);
  while (
    (ts.isPropertyAccessExpression(u) || ts.isElementAccessExpression(u)) &&
    accessedMemberNames(u).some((m) => m === "call" || m === "apply")
  ) {
    u = unwrapBindChain(u.expression);
  }
  return u;
}

// ¿`n` es `Reflect.construct(T,…)` o `Reflect.apply(T,…)`? → {method, target=arg0}. `Reflect` construye/
// invoca FUERA del universo `new`/`.call/.apply/.bind` (`Reflect.construct(T,a)≡new T(...a)`,
// `Reflect.apply(T,t,a)≡T.apply(t,a)`) → salta los checks NewExpression/detach. PERO el TARGET es el arg0
// EN-SITIO (decidible con los MISMOS resolvers, NO data-flow) → gap a cerrar, no residual. El gate ya
// modela esto para el eval-sink (`.constructor→Function`); aquí se extiende a construcción-denegada
// (WebAssembly.Module) y receiver-bound (crypto). El callee resuelve value-transparent (`(0,Reflect).apply`,
// `(0,Reflect.apply)(…)`). RESIDUAL (target NO-en-sitio): `Reflect.get(x,"k")()` (key-string→getter),
// alias (`const rc=Reflect.construct; rc(T,a)`), `Reflect.construct.bind(…)()` = data-flow/value-passing.
function reflectCallTarget(n) {
  if (!ts.isCallExpression(n) || n.arguments.length === 0) return null;
  for (const callee of valueTransparentLeaves(unwrapErased(n.expression))) {
    const c = unwrapErased(callee);
    if (
      !ts.isPropertyAccessExpression(c) &&
      !ts.isElementAccessExpression(c)
    ) {
      continue;
    }
    const method = accessedMemberNames(c).find(
      (x) => x === "construct" || x === "apply",
    );
    if (
      method &&
      valueTransparentLeaves(c.expression).some((o) => {
        const oo = unwrapErased(o);
        return ts.isIdentifier(oo) && oo.text === "Reflect";
      })
    ) {
      return { method, target: n.arguments[0] };
    }
  }
  return null;
}

// Targets de CONSTRUCCIÓN de `expr`: hojas value-survival, DESLIGANDO `.bind(...)` recursivamente (un
// constructor LIGADO, al `new`, construye el ORIGINAL: `new (X.M.bind(t,...a))()` ≡ `new X.M(...a)`).
// SIN cap (termina por descenso del AST). Compartido por el check `NewExpression` Y `Reflect.construct`
// (mismo target-en-sitio decidible). El member-alias (`const M=X.M; new M(b)`) sigue residual (no en-sitio).
function constructionTargets(expr) {
  return valueSurvivalLeaves(expr).flatMap((leaf) => {
    const receiver = unwrapBindChain(leaf);
    if (receiver !== leaf) return constructionTargets(receiver);
    // ClassExpression con `extends <ctor>` EN-SITIO: `new (class extends X.Module {})(b)` ≡ `super(b)` ≡
    // `new X.Module(b)` — toda subclase INSTANCIABLE de un ctor llama `super` (un derived class DEBE llamar
    // super antes de usar `this`), así que construir la subclase construye el ORIGINAL. El `extends` está
    // a-la-vista (contiguo con el `new`) → decidible: resolver la heritage-extends como target (recursivo →
    // extends VT-envuelto `extends (c?X.Module:Y)`). El `class X extends X.Module {}; new X(b)` con X NOMBRADA
    // = data-flow residual (X es variable, el extends no está en-sitio en el `new`). codex P1.
    if (ts.isClassExpression(leaf) && leaf.heritageClauses) {
      const ext = leaf.heritageClauses.find(
        (h) => h.token === ts.SyntaxKind.ExtendsKeyword,
      );
      if (ext && ext.types.length > 0) {
        return constructionTargets(ext.types[0].expression);
      }
    }
    return [leaf];
  });
}

// Aplana los SPREAD de ARRAY-LITERAL en una lista de args: `f(...["a", b], c)` → ["a", b, c]. Un
// spread de VARIABLE (`...args`) NO se aplana (data-flow residual): se conserva como SpreadElement
// (no produce un string-leaf, así que no flaggea). Usado para que el handler/target/string de un
// sink (timer directo/.call/.apply/.bind, Reflect.apply, mutador react) no quede oculto tras un
// spread literal (codex P2). Token-en-su-sitio: el array literal está a la vista.
// Ramas array-literal que un arg-expr puede tomar value-transparentemente: array directo `["a"]` o
// ALTERNATIVAS `cond ? ["a"] : ["b"]` (codex P2). Fail-closed: cualquiera cuenta.
function arrayLiteralAlternatives(expr) {
  return valueTransparentLeaves(expr).filter((l) =>
    ts.isArrayLiteralExpression(l),
  );
}

// Enumera las listas de args APLANADAS posibles, RAMIFICANDO en cada spread de ALTERNATIVAS de
// array-literal y reconstruyendo la lista COMPLETA por rama — incl. ramas de longitud DISTINTA que
// desplazan los args trailing (`...(cond ? [] : [fn]), "x"` → ["x"] | [fn, "x"]), e inner-spreads
// ANIDADOS (recursión: la rama se vuelve a expandir). Un spread OPACO (variable) TRUNCA la rama
// (data-flow residual). Devuelve [{ nodes, truncated }]. codex P2.
function expandArgLists(rawArgs) {
  let lists = [{ nodes: [], truncated: false }];
  for (const a of rawArgs) {
    if (ts.isSpreadElement(a)) {
      const alts = arrayLiteralAlternatives(a.expression);
      if (alts.length === 0) {
        lists = lists.map((l) => ({ ...l, truncated: true }));
        continue;
      }
      const next = [];
      for (const l of lists) {
        if (l.truncated) {
          next.push(l);
          continue;
        }
        for (const alt of alts) {
          for (const sub of expandArgLists(alt.elements)) {
            next.push({
              nodes: [...l.nodes, ...sub.nodes],
              truncated: sub.truncated,
            });
          }
        }
      }
      lists = next;
    } else {
      lists = lists.map((l) =>
        l.truncated ? l : { ...l, nodes: [...l.nodes, a] },
      );
    }
  }
  return lists;
}

// Candidatos al nodo en la posición lógica `idx` de `rawArgs` sobre TODAS las ramas posibles
// (codex P2). Descarta los SpreadElement residuales (spread opaco → posición indeterminable).
function candidatesAt(rawArgs, idx) {
  const cands = [];
  for (const l of expandArgLists(rawArgs)) {
    const n = l.nodes[idx];
    if (n && !ts.isSpreadElement(n)) cands.push(n);
  }
  return cands;
}

// Elemento [0] del array de args de `.apply`/`Reflect.apply` (`apply(thisArg, ["código"])`),
// considerando alternativas del array Y inner-spreads/longitud-variable (codex P2).
function applyHandlerCandidates(arg) {
  if (!arg) return [];
  const cands = [];
  for (const alt of arrayLiteralAlternatives(arg)) {
    cands.push(...candidatesAt(alt.elements, 0));
  }
  return cands;
}

// ¿`node` es un NODO operador value-transparente? Mismo SET de operadores que `valueTransparentChildren`
// (erased/await/?:/coma/&&/||/??/=) — si se añade uno allí, añadirlo aquí. Usado para detectar el TOP
// de una cadena value-transparente (enrolar alias embebidos una sola vez).
function isValueTransparentOperatorNode(node) {
  if (!node) return false;
  if (
    isErasedOuterExpr(node) ||
    ts.isAwaitExpression(node) ||
    ts.isConditionalExpression(node)
  ) {
    return true;
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    return (
      op === ts.SyntaxKind.CommaToken ||
      op === ts.SyntaxKind.AmpersandAmpersandToken ||
      op === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.BarBarEqualsToken ||
      op === ts.SyntaxKind.QuestionQuestionToken ||
      op === ts.SyntaxKind.QuestionQuestionEqualsToken ||
      op === ts.SyntaxKind.EqualsToken
    );
  }
  return false;
}

/**
 * Twin SIDE-EFFECT de `valueTransparentChildren`: recorre los operandos EVALUADOS del MISMO set de
 * operadores value-transparentes (no solo el value-child del `&&`/coma — también el operando lateral
 * con efecto), llamando `visit(assignmentNode)` por cada assignment-expression embebida (`X = Y`,
 * `X &&=/||=/??= Y`). NO atraviesa CALLS/IIFE — el caveat del §141: un RHS que exige evaluar un call
 * es data-flow → residual. Cierra el under-catch de `(later = setTimeout) && later("…")`: el root está
 * presente COMO UNIDAD y el alias se forma con operadores value-transparentes ya ratificados → lado
 * CAZAR de la frontera, no el assembled/indirection residual.
 */
function eachEmbeddedAssignment(node, visit) {
  if (!node) return;
  if (isErasedOuterExpr(node) || ts.isAwaitExpression(node)) {
    eachEmbeddedAssignment(node.expression, visit);
    return;
  }
  if (ts.isConditionalExpression(node)) {
    eachEmbeddedAssignment(node.condition, visit);
    eachEmbeddedAssignment(node.whenTrue, visit);
    eachEmbeddedAssignment(node.whenFalse, visit);
    return;
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (
      op === ts.SyntaxKind.EqualsToken ||
      op === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
      op === ts.SyntaxKind.BarBarEqualsToken ||
      op === ts.SyntaxKind.QuestionQuestionEqualsToken
    ) {
      visit(node); // `X = Y` (o `X &&=/||=/??= Y` → X←Y condicional)
      eachEmbeddedAssignment(node.right, visit); // cadena `a = b = root`
      return;
    }
    if (
      op === ts.SyntaxKind.CommaToken ||
      op === ts.SyntaxKind.AmpersandAmpersandToken ||
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken
    ) {
      eachEmbeddedAssignment(node.left, visit);
      eachEmbeddedAssignment(node.right, visit);
      return;
    }
  }
  // call / identifier / member / literal / arrow / etc. → STOP (no atravesar calls — caveat §141).
}

/**
 * `context` enriquecido con los alias de timer/partial creados por assignment-expressions embebidas
 * en `node` (operadores value-transparentes). Reusa `collectStructuralAliases` (un solo predicado, no
 * un path paralelo). Order-INDEPENDENT fail-closed: un use-before-assign sobre-flaggea (seguro).
 */
function withEmbeddedAssignmentAliases(context, node) {
  // `eachEmbeddedAssignment` visita en ORDEN DE EVALUACIÓN (left-to-right). Threadeamos un ctx
  // evolutivo para que una cadena en la misma expresión (`(later = setTimeout, alias = later,
  // alias)(…)`) reconozca el alias creado por una asignación ANTERIOR (codex P2).
  let ctx = context;
  eachEmbeddedAssignment(node, (assign) => {
    let timer = null;
    let partial = null;
    collectStructuralAliases(
      assign.left,
      assign.right,
      ctx,
      exprIsTimerValued,
      (n) => (timer ||= new Set()).add(n),
    );
    collectStructuralAliases(
      assign.left,
      assign.right,
      ctx,
      exprPartialRoot,
      (n, r) => (partial ||= new Map()).set(n, r),
      true,
    );
    if (timer) {
      ctx = {
        ...ctx,
        scopeTimerAliases: new Set([...(ctx.scopeTimerAliases ?? []), ...timer]),
      };
    }
    if (partial) {
      ctx = {
        ...ctx,
        scopePartialAliases: new Map([
          ...(ctx.scopePartialAliases ?? []),
          ...partial,
        ]),
      };
    }
  });
  return ctx;
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
 * ¿El receiver de un `.constructor` tiene un valor PROVABLEMENTE no-función? — i.e. TODAS
 * sus hojas value-transparentes son literales cuyo `.constructor` es un builtin conocido
 * ≠ `Function`: `{}`→Object, `[]`→Array, string/template→String, number→Number,
 * bigint→BigInt, `true`/`false`→Boolean, regex→RegExp. Entonces `recv.constructor` NUNCA
 * es `Function` → invocarlo (`({}).constructor()`, `[].constructor(3)`, `.call/.apply/.bind`,
 * tagged) NO es eval, solo construye Object/Array/… → flaggearlo es FP (codex P2 sobre
 * 27c5d18: bloqueaba server-safe legítimo). El escape al eval-sink exige un receiver FUNCIÓN
 * (class/function expr, identifier, call, `this`…) o un SEGUNDO `.constructor` (rama (a),
 * que SÍ dispara con base literal: `({}).constructor.constructor()` = Function). Cualquier
 * hoja NO-literal → no se excluye → FAIL-CLOSED. **NO** incluye class/function expressions
 * (su `.constructor` ES Function → eval) ni null/undefined (lanzan TypeError, no instancian).
 * beta.27 BLOCKER-1.
 */
/**
 * ¿El valor del receiver pasa por un `await` en su estructura value-transparente? — codex
 * P2 (fail-open): `await` es transparente SOLO para no-thenables; un objeto THENABLE corre
 * su `.then` y resuelve a un valor ARBITRARIO, incluida una función → `(await { then(r){
 * r(function f(){}) } }).constructor("...")` alcanza `Function`. Como parser-puro NO puede
 * probar que el operando es no-thenable, la EXENCIÓN (provably-non-function) debe rechazar
 * cualquier receiver que cruce un await. (El FLAGGING sí cruza await en `valueTransparent
 * Children` —fail-closed— para cazar `(await fn.constructor)(...)`; la asimetría es a
 * propósito: cruzar await flagea de más, jamás exime de más.)
 */
function valueTransparentPathCrossesAwait(node) {
  if (!node) return false;
  if (ts.isAwaitExpression(node)) return true;
  return valueTransparentChildren(node).some(valueTransparentPathCrossesAwait);
}

function constructorReceiverIsProvablyNonFunction(receiver) {
  // Un receiver tras `await` puede ser un thenable que resuelve a Function → NO es
  // provably-non-function (codex P2). Fail-closed: no eximir.
  if (valueTransparentPathCrossesAwait(receiver)) return false;
  const leaves = valueTransparentLeaves(receiver);
  if (leaves.length === 0) return false;
  return leaves.every(
    (leaf) =>
      (ts.isObjectLiteralExpression(leaf) &&
        objectLiteralCannotOverrideConstructor(leaf)) ||
      // Los demás literales NO pueden definir un `constructor` propio (sintaxis
      // imposible): array/string/template/number/bigint/regex/boolean → su
      // `.constructor` ES SIEMPRE el builtin heredado (Array/String/…).
      ts.isArrayLiteralExpression(leaf) ||
      ts.isStringLiteralLike(leaf) ||
      ts.isTemplateExpression(leaf) ||
      ts.isNumericLiteral(leaf) ||
      ts.isBigIntLiteral(leaf) ||
      ts.isRegularExpressionLiteral(leaf) ||
      leaf.kind === ts.SyntaxKind.TrueKeyword ||
      leaf.kind === ts.SyntaxKind.FalseKeyword,
  );
}

/**
 * ¿Un OBJECT LITERAL tiene `.constructor` PROVABLEMENTE = `Object` (heredado), o
 * podría OVERRIDEarlo? — codex P1 (fail-open que abrió el fast-path de literales):
 * `({ constructor: (()=>{}).constructor }).constructor("return window")()` define un
 * `constructor` PROPIO = `Function` → alcanza eval sin nombrar `Function`. También vía
 * `__proto__` (cadena de prototipo → `Function.prototype.constructor`), spread (puede
 * traer `constructor`/`__proto__`), o key computada (podría ser "constructor").
 * FAIL-CLOSED: el fast-path solo aplica si NINGUNA propiedad puede afectar la resolución
 * de `.constructor` — sin spread, sin key computada, y ningún nombre (id/string)
 * `constructor` ni `__proto__` (cualquier kind: assignment/shorthand/método/get/set).
 */
function objectLiteralCannotOverrideConstructor(objLit) {
  for (const prop of objLit.properties) {
    if (ts.isSpreadAssignment(prop)) return false; // `...x` puede traer constructor/__proto__
    const name = prop.name;
    if (!name || ts.isComputedPropertyName(name)) return false; // computed → podría ser "constructor"
    if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
      if (name.text === "constructor" || name.text === "__proto__") return false;
    } else if (!ts.isNumericLiteral(name)) {
      return false; // forma de nombre desconocida → fail-closed
    }
  }
  return true;
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
  // (codex P2) Receiver PROVABLEMENTE no-función (`({}).constructor()` = Object(),
  // `[].constructor(3)` = Array(3)) → su `.constructor` ≠ Function → NO es eval. Tras (a)
  // (que ya cazó el doble-constructor con base literal), un single `.constructor` de un
  // literal no-función no es weaponizable. Base variable/no-literal → fail-closed.
  if (constructorReceiverIsProvablyNonFunction(node.expression)) return false;
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
  // (e) `Reflect.construct(x.constructor, [...])` / `Reflect.apply(x.constructor, …)` — el
  //     `.constructor` (acceso DIRECTO contiguo) se INVOCA vía un builtin Reflect nombrado
  //     directamente, con el `.constructor` como 1er arg TOKEN-EN-SU-SITIO (análogo a
  //     `Object.assign(React,…)`/`Reflect.set(React,…)` del member-write taint). `Reflect.
  //     construct(F,a) ≡ new F(...a)`, `Reflect.apply(F,t,a) ≡ F.apply(t,a)` → si F = Function,
  //     es eval. El guard de receiver (arriba) ya descartó `Reflect.construct(({}).constructor,…)`
  //     (= new Object, no eval). DISTINTO del residual `Reflect.get(x,"constructor")` (ACCESO
  //     indirecto, sin nodo `.constructor` a la vista). dot O bracket-string. codex P1.
  // El `.constructor` puede llegar como 1er arg DIRECTO o dentro de un array/spread/condicional
  // (`Reflect.construct(...[F.constructor, […]])`, `...(c ? [F.constructor, […]] : [])`): subir por
  // los wrappers array-literal / spread / value-transparentes hasta el call, y exigir que el
  // `.constructor` sea un CANDIDATO de la posición 0 (modelo branch-aware) — token-en-su-sitio. codex P2.
  let callNode = parent;
  while (
    callNode &&
    (ts.isArrayLiteralExpression(callNode) ||
      ts.isSpreadElement(callNode) ||
      ts.isParenthesizedExpression(callNode) ||
      isValueTransparentOperatorNode(callNode))
  ) {
    callNode = callNode.parent;
  }
  if (
    callNode &&
    ts.isCallExpression(callNode) &&
    callNode.arguments.length > 0 &&
    candidatesAt(callNode.arguments, 0).some(
      (c) => c === child || valueTransparentLeaves(c).includes(child),
    )
  ) {
    // El CALLEE entero puede ir VALUE-TRANSPARENTE: receiver Reflect (`(0, Reflect).apply(…)`) Y/O
    // la member-access completa (`(0, Reflect.apply)(…)`, `(c ? Reflect.apply : Reflect.apply)(…)`).
    // Resolver AMBOS por valueTransparentLeaves: una hoja member-access `Reflect.construct`/`.apply`
    // cuyo receiver resuelve VT a `Reflect` (codex P2). No solo unwrapErased.
    for (const callee of valueTransparentLeaves(callNode.expression)) {
      if (
        !ts.isPropertyAccessExpression(callee) &&
        !ts.isElementAccessExpression(callee)
      ) {
        continue;
      }
      const member = accessedMemberName(callee);
      const receiverIsReflect = valueTransparentLeaves(callee.expression).some(
        (o) => ts.isIdentifier(o) && o.text === "Reflect",
      );
      if (
        receiverIsReflect &&
        (member === "construct" || member === "apply")
      ) {
        return true;
      }
    }
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
      // `export * as Icons from "./icons"` (y `export type * as …`): el alias es un
      // NamespaceExport (NO un NamespaceExportDeclaration, que es el `export as namespace
      // Foo` de UMD). El nombre es metadata del re-export, sin read runtime; el módulo
      // target lo sigue extractModuleReferences aparte. Antes caía al fail-closed y FP-eaba
      // un barrel con alias homónimo de un global (`export * as location from …`). codex P2.
      ts.isNamespaceExport(parent) ||
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

// Vite resuelve un import SIN extensión a estas exts NO-auditables (JS-family + `.mts` ESM-TS)
// — están en `resolve.extensions` ANTES o junto a `.ts`/`.tsx` (VITE_RESOLVE_EXTS). Si la cascada
// auditable falla pero existe uno de estos, el import SÍ resuelve en el bundler, a un archivo que
// el gate no audita → debe reportar el error PRECISO "JS no auditable" (fail-closed), no el genérico
// "no resolvió" — que MIENTE (el archivo existe; el `.mts` modelado en VITE_RESOLVE_EXTS exigía un
// resolver coherente). `.cjs`/`.cts` NO están: Vite no los resuelve extensionless. codex P3.
const RESOLUTION_NONAUDITABLE_CASCADE = [
  ".mjs",
  ".js",
  ".mts",
  ".jsx",
  "/index.mjs",
  "/index.js",
  "/index.mts",
  "/index.jsx",
];
function tryResolveNonAuditable(noExtAbsPath, fileExists) {
  for (const ext of RESOLUTION_NONAUDITABLE_CASCADE) {
    const candidate = `${noExtAbsPath}${ext}`;
    if (fileExists(candidate)) return candidate;
  }
  return null;
}

// Orden REAL de `resolve.extensions` de Vite (DEFAULT_EXTENSIONS, .json excluido
// — no se audita). El gate resuelve `.ts` primero; Vite rankea `.mjs`/`.js`/`.mts` ANTES
// que `.ts` (y `.jsx` antes que `.tsx`). Si para un import extensionless existe un hermano
// que Vite preferiría, el BUNDLER ENVÍA ESE archivo y el gate auditaría OTRO → divergencia
// silenciosa (hunt final: helper.ts limpio + helper.mjs `screen.width` → gate `[]`, Vite
// envía el .mjs) = bypass cross-module. Hoy LATENTE (0 .mjs/.js en src) → fail-closed.
const VITE_RESOLVE_EXTS = [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx"];

// Extensiones de SOURCE que TS/Vite resuelven (sin .json — no se audita). Un specifier que YA las
// trae (`./helper.mjs`, `@/x/helper.ts`) es EXPLÍCITO: Vite lo resuelve EXACTAMENTE (resolve.extensions
// solo aplica a imports SIN extensión), así que se chequea el archivo exacto ANTES de la cascada y NO
// se corre el shadow-check de precedencia (no hay ambigüedad: la extensión está fijada). codex P2: sin
// esto, seguir el consejo del propio gate ("usa extensión explícita") rompía el resolver — `./helper.mjs`
// caía a la cascada `helper.mjs.ts`/`helper.mjs.tsx` y se reportaba unresolved aunque Vite sí lo envía.
const EXPLICIT_SOURCE_EXTS = [
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
];
function hasExplicitSourceExt(p) {
  return EXPLICIT_SOURCE_EXTS.some((e) => p.endsWith(e));
}

// El gate AUDITA solo `.ts`/`.tsx` (el formato de autoría del DS; 0 archivos JS en src). Auditar
// JS-family (`.js/.jsx/.mjs/.cjs/.mts/.cts`) requeriría seguir edges `require()` de CJS (data-flow),
// descubrir entries JS y modelar su parser — un subsistema que el gate no necesita. codex P1: incluir
// `.cjs` como interno reabría el smuggling cross-módulo (el walker solo extrae imports ESM, no
// `require()`). Frontera fail-closed: un import del grafo @server-safe a un archivo JS-family →
// unresolvable RUIDOSO (no se audita JS, no se asume safe). El DS usa `.ts`/`.tsx`.
const AUDITABLE_EXTS = [".ts", ".tsx"];
function isAuditableExt(p) {
  // `.d.ts`/`.d.mts`/`.d.cts` terminan en `.ts` pero son DECLARACIONES type-only (sin runtime que
  // auditar) → NO auditables: un `Foo.d.ts` marcado @server-safe debe fallar ruidoso, no "pasar"
  // auditando declaraciones borradas (falsa sensación de enforcement; codex P2). Marca la implementación.
  return !/\.d\.[mc]?ts$/.test(p) && AUDITABLE_EXTS.some((e) => p.endsWith(e));
}

// ScriptKind por extensión — determina si el parser de TS habilita JSX. `ScriptKind.TS` trata
// `<X>` como TYPE ASSERTION (Standard), así que parsear un `.jsx`/`.js` con JSX como TS lo mal-parsea
// y se PIERDE el read de global del componente JSX (`<HTMLElement/>`) = BYPASS. JSX/TSX/JS habilitan
// JSX (LanguageVariant.JSX); TS no. codex P2: al resolver `.jsx` como interno (exact-file), el gate
// ahora los SIGUE → hay que parsearlos con el ScriptKind correcto.
function scriptKindForPath(p) {
  if (p.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (p.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (p.endsWith(".js") || p.endsWith(".mjs") || p.endsWith(".cjs")) {
    return ts.ScriptKind.JS; // .js/.mjs/.cjs → JSX habilitado (LanguageVariant.JSX)
  }
  return ts.ScriptKind.TS; // .ts/.mts/.cts
}

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
    // (2a) `<dir>.<ext>` ARCHIVO gana al directorio ENTERO (Vite prueba file antes que dir).
    const dirBase = resolvedAbsPath.slice(0, resolvedAbsPath.length - idx[0].length);
    for (const ext of VITE_RESOLVE_EXTS) {
      const sib = `${dirBase}${ext}`;
      if (fileExists(sib)) return sib; // `<dir>.<ext>` archivo gana al directorio
    }
    // (2b) MISMO index-dir, extensión de MAYOR precedencia: `<dir>/index.mjs` gana a
    // `<dir>/index.ts` (Vite rankea por VITE_RESOLVE_EXTS dentro del index también). Antes
    // solo se probaba `<dir>.<ext>` → un `helper/index.mjs` sucio junto a `helper/index.ts`
    // limpio se auditaba mal = BYPASS (codex P1). El index resuelto tiene ext `idx[1]`; un
    // index hermano con rank menor lo sombrea. (`.cjs`/`.cts` no están en VITE_RESOLVE_EXTS
    // → idxRank -1 → se salta; el index auditable es `.ts`/`.tsx`.)
    const idxRank = VITE_RESOLVE_EXTS.indexOf(idx[1]);
    if (idxRank > 0) {
      const indexBase = resolvedAbsPath.slice(0, -idx[1].length); // `<dir>/index`
      for (let i = 0; i < idxRank; i++) {
        const sib = `${indexBase}${VITE_RESOLVE_EXTS[i]}`;
        if (fileExists(sib)) return sib; // `<dir>/index.<extMayorPrecedencia>`
      }
    }
    // (2c) `<dir>/package.json`: su `main`/`module`/`exports`(browser/import/default) puede
    // REDIRIGIR a Vite a otro archivo que el gate NO audita (el resolver parser-puro no lee
    // package.json — es el subsistema de resolución de paquetes) → el gate auditaría index.ts
    // mientras Vite envía el archivo del redirect = BYPASS. Fail-NOISY: devolver el package.json
    // como shadow → import unresolvable/AMBIGUO. (0 package.json en src del DS; contrivado y
    // fail-closed.) deepest re-hunt #173.
    const pkg = `${dirBase}/package.json`;
    if (fileExists(pkg)) return pkg;
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
// LOADERS de asset de bundler (flags BARE, no `key=value`): transforman el import en algo NO ejecutado en
// el render (`?raw`/`?url`→string/URL, `?worker`/`?sharedworker`→bundle en otro thread, `?module`/`?init`→
// WebAssembly.Module/init, `?inline`). Una query ARBITRARIA (`?v=1` cache-bust) NO es loader: Vite resuelve/
// transforma el `.ts` como CÓDIGO igual → hay que AUDITARLO. codex P1 (el `?→external` incondicional previo
// era over-broad = fail-open: `./x.ts?v=1` se saltaba la auditoría).
const ASSET_LOADER_QUERIES = new Set([
  "raw",
  "url",
  "worker",
  "sharedworker",
  "inline",
  "module",
  "init",
]);
// ¿`p` (path resuelto, extensión explícita) es un ASSET no-código? — NO `.ts/.tsx` (auditable) ni
// `.js/.jsx/.cjs/.mjs` (JS no-auditable → fail-closed convert-to-ts). `.wasm/.css/.scss/.png/.svg/.json/…`
// = asset que el bundler maneja, no código ejecutado en el render → el gate no lo audita (external si
// EXISTE; si no existe, cae a unresolvable fail-loud — typo en el path). codex P2 (mismo eje que `?query`).
function hasAssetExt(p) {
  const base = p.slice(Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")) + 1);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return false;
  const ext = base.slice(dot).toLowerCase();
  return ![".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"].includes(ext);
}
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

  // Sufijo de QUERY: distinguir un LOADER de asset (transforma el import en algo NO ejecutado en el render
  // → external) de una query ARBITRARIA (`?v=1` cache-bust → Vite transforma el `.ts` como CÓDIGO, hay que
  // AUDITARLO). LOADER (flag bare ∈ ASSET_LOADER_QUERIES) → external; cualquier otra query → DESLIGAR y
  // resolver el módulo base. codex P1 (el `?→external` incondicional previo era over-broad = fail-open:
  // `./edge-only.ts?v=1` con `process.cwd()` se saltaba la auditoría).
  const qIdx = specifier.indexOf("?");
  if (qIdx >= 0) {
    const isAssetLoader = specifier
      .slice(qIdx + 1)
      .split("&")
      .some((part) => !part.includes("=") && ASSET_LOADER_QUERIES.has(part));
    if (isAssetLoader) {
      return { kind: "external" };
    }
    specifier = specifier.slice(0, qIdx);
  }

  // Bare specifier (no empieza con "." ni "/") → puede ser alias o peer.
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    // Builtin de Node (bare `fs`/`path`, prefijado `node:fs`, subpath `fs/promises`) — Node-only POR
    // CONSTRUCCIÓN, fuera de la intersección cross-runtime. En el baseline Edge (Vercel/Workers) la
    // mayoría no existen → un import `@server-safe` lanza en bundle/render (igual clase que
    // `setImmediate`: algo Node-only clasificado como seguro). El bare `fs` es el caso COMÚN, no el
    // exótico — y "¿es fs un builtin?" es un lookup ESTÁTICO contra el oráculo (`isBuiltin`), no
    // data-flow → cazable, NO un residual §141. Blanket-deny vía el oráculo (sin lista a mano); el
    // allowlist del subset disponible-en-Edge (`node:buffer`, …) es #190. La ambigüedad bare-shim-vs-
    // builtin (`import {Buffer} from "buffer"` = builtin o npm-shim según el bundler) SÍ es resolución/
    // provenance que el gate renuncia (§141) → deny-conservador-ahora + allowlist-#190. codex P1/P2
    // (review genérico). El `import type` ya se salta antes (type-only, erased).
    if (isNodeBuiltinSpecifier(specifier)) {
      return { kind: "edge-denied", specifier };
    }
    for (const { prefix, targetPrefix } of tsconfigPaths) {
      if (specifier.startsWith(prefix)) {
        const tail = specifier.slice(prefix.length);
        const noExt = crossOsResolve(projectRoot, targetPrefix + tail);
        // Extensión explícita (`@/x/helper.mjs`) → archivo exacto, sin cascada ni shadow-check.
        const exact =
          hasExplicitSourceExt(noExt) && fileExists(noExt) ? noExt : null;
        const resolved = exact ?? tryResolveFile(noExt, fileExists);
        if (resolved) {
          if (exact && !isAuditableExt(exact)) {
            return {
              kind: "unresolvable",
              reason: `alias \`${specifier}\` resuelve a un archivo JS NO auditable (\`${crossOsRelative(projectRoot, exact)}\`): el gate solo audita .ts/.tsx (los edges \`require()\` de CJS no se siguen). Conviértelo a .ts/.tsx.`,
            };
          }
          const shadow = exact ? null : bundlerShadowSibling(resolved, fileExists);
          if (shadow) {
            return {
              kind: "unresolvable",
              reason: `alias \`${specifier}\` es AMBIGUO: el gate auditaría \`${crossOsRelative(projectRoot, resolved)}\` pero Vite envía \`${crossOsRelative(projectRoot, shadow)}\` (mayor precedencia de extensión). Usa una extensión explícita \`.ts\`/\`.tsx\` o elimina el hermano JS.`,
            };
          }
          return { kind: "internal", absPath: resolved };
        }
        const nonAuditable = tryResolveNonAuditable(noExt, fileExists);
        if (nonAuditable) {
          return {
            kind: "unresolvable",
            reason: `alias \`${specifier}\` resuelve (extensionless) a un archivo JS NO auditable (\`${crossOsRelative(projectRoot, nonAuditable)}\`): el gate solo audita .ts/.tsx (los edges \`require()\` de CJS no se siguen). Conviértelo a .ts/.tsx.`,
          };
        }
        if (hasAssetExt(noExt) && fileExists(noExt)) {
          return { kind: "external" };
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
  // Extensión explícita (`./helper.mjs`) → archivo exacto, sin cascada ni shadow-check.
  const exact = hasExplicitSourceExt(noExt) && fileExists(noExt) ? noExt : null;
  const resolved = exact ?? tryResolveFile(noExt, fileExists);
  if (resolved) {
    // Solo seguimos dentro de src/ (proxy para "archivo del DS, no
    // node_modules, no scripts/ ni fixtures/ ni dist/").
    const rel = crossOsRelative(srcRoot, resolved);
    const inSrc = !rel.startsWith("..") && !rel.startsWith("/");
    if (inSrc) {
      if (exact && !isAuditableExt(exact)) {
        // JS-family dentro de src importado desde el grafo @server-safe → fail-closed (no auditable).
        return {
          kind: "unresolvable",
          reason: `relativo \`${specifier}\` resuelve a un archivo JS NO auditable (\`${crossOsRelative(projectRoot, exact)}\`): el gate solo audita .ts/.tsx (los edges \`require()\` de CJS no se siguen). Conviértelo a .ts/.tsx.`,
        };
      }
      const shadow = exact ? null : bundlerShadowSibling(resolved, fileExists);
      if (shadow) {
        return {
          kind: "unresolvable",
          reason: `relativo \`${specifier}\` es AMBIGUO: el gate auditaría \`${crossOsRelative(projectRoot, resolved)}\` pero Vite envía \`${crossOsRelative(projectRoot, shadow)}\` (mayor precedencia de extensión). Usa una extensión explícita \`.ts\`/\`.tsx\` o elimina el hermano JS.`,
        };
      }
      return { kind: "internal", absPath: resolved };
    }
    return { kind: "external" };
  }
  const nonAuditable = tryResolveNonAuditable(noExt, fileExists);
  if (nonAuditable) {
    const relNA = crossOsRelative(srcRoot, nonAuditable);
    const naInSrc = !relNA.startsWith("..") && !relNA.startsWith("/");
    // Fuera de src (node_modules/peer) → external; dentro → JS-family no auditable (fail-closed).
    if (naInSrc) {
      return {
        kind: "unresolvable",
        reason: `relativo \`${specifier}\` resuelve (extensionless) a un archivo JS NO auditable (\`${crossOsRelative(projectRoot, nonAuditable)}\`): el gate solo audita .ts/.tsx (los edges \`require()\` de CJS no se siguen). Conviértelo a .ts/.tsx.`,
      };
    }
    return { kind: "external" };
  }
  // Asset no-código que EXISTE (`./styles.css`, `./add.wasm`): el bundler lo maneja, no es módulo
  // ejecutado en el render → external (el `?query` ya salió arriba; esto cubre el asset sin query).
  if (hasAssetExt(noExt) && fileExists(noExt)) {
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
    // Bajo verbatimModuleSyntax (ACTIVO en este repo, tsconfig.json), un named-imports clause
    // —AUNQUE todos los specifiers sean inline-type (`import { type A, type B } from "./m"`)—
    // se PRESERVA como side-effect import `import "./m"` → el módulo SE EJECUTA en SSR (sus
    // reads top-level de window crashean). Solo el CLAUSE-level `import type { … }`
    // (ic.isTypeOnly, arriba) se borra entero. Así que cualquier named-imports → SEGUIRLO.
    // codex P1: el chequeo inline-specifier (pre-verbatim) asumía elisión y colaba un módulo
    // sucio importado solo por su tipo = BYPASS cross-módulo.
    return false;
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
    // Igual que los imports: bajo verbatimModuleSyntax `export { type A } from "./m"` preserva
    // el re-export → "./m" se carga/ejecuta. Solo `export type { … }` (clause-level) se borra.
    // Cualquier named re-export → SEGUIRLO. codex P1.
    return false;
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
      scriptKindForPath(relPath),
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
    if (resolution.kind === "edge-denied") {
      violations.push({
        file: relPath,
        rule: "no-node-builtin",
        detail: `import de \`${resolution.specifier}\` — builtin \`node:*\`, Node-only y ausente del baseline Edge (Vercel/Workers) → lanza en render/SSR. El subset disponible-en-Edge (\`node:buffer\`, …) se allowlistará en #190.`,
        ...(fullChain ? { chain: fullChain } : {}),
      });
      continue;
    }
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
      scriptKindForPath(relPath),
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
      // Un binding nuevo que SOMBREA un timer/partial alias lo purga en este scope (codex P2).
      ...(purgeScopeAliasShadows(currentContext, names) ?? {}),
    };
  }

  // Walk AST con contexto:
  //   activeGuards: Set<api> guards activos por scope de typeof.
  //   isInClientOnlyDeferredBody: estamos dentro de un body que solo corre
  //                     en el CLIENTE (no en SSR/Edge) — handler JSX (onClick,
  //                     onChange…), useEffect / useLayoutEffect / useCallback.
  //                     Un TIMER (setTimeout/queueMicrotask) NO cuenta: dispara
  //                     en el isolate del server → no exime globals de cliente.
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
    // §141 — alias de assignment-expressions EMBEBIDAS evaluadas ANTES de que `node` sea relevante
    // para un sink, enroladas ANTES de los checks (codex P2): (1) operandos hermanos en una cadena
    // value-transparente (`(later = setTimeout) && later(…)`) — enrolar en el TOP de la cadena; (2) el
    // callee/receiver de un call/member/new/tagged (`((later = setTimeout), later)("x")`, `((WA =
    // WebAssembly), WA).compile(…)`) — el head se EVALÚA antes del sink, y su check corre en ESTE
    // nodo (no al descender). Mismo unwrap value-transparente; NO atraviesa calls (RHS-call = residual).
    if (
      isValueTransparentOperatorNode(node) &&
      !isValueTransparentOperatorNode(node.parent)
    ) {
      context = withEmbeddedAssignmentAliases(context, node);
    }
    if (
      ts.isCallExpression(node) ||
      ts.isNewExpression(node) ||
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) ||
      ts.isTaggedTemplateExpression(node)
    ) {
      const head = ts.isTaggedTemplateExpression(node)
        ? node.tag
        : node.expression;
      context = withEmbeddedAssignmentAliases(context, head);
    }
    // `import(<literal builtin>)` — import() DINÁMICO con specifier LITERAL EN-SITIO (`import("fs")`,
    // `import("node:fs")`): no data-flow → cazable, rompe en Edge igual que el import estático.
    // `extractModuleReferences` (grafo) solo ve estáticos → este es el hueco de dynamic-import.
    // VALUE-survival: el specifier puede llegar por operadores VT (`import((0,"fs"))` coma,
    // `import(c?"fs":"x")` ternario MULTI-hoja) → se resuelve por `valueSurvivalLeaves` (helper
    // compartido) y se flaggea FAIL-CLOSED si CUALQUIER hoja es un builtin literal (paridad con
    // construcción: una rama builtin basta). `import(variable)` = data-flow residual; `createRequire(
    // ...)("fs")` = indirección residual (ambos §141). codex P1 + barrido VT (gap del ternario multi-hoja).
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      !context.isInClientOnlyDeferredBody
    ) {
      const litNode = valueSurvivalLeaves(node.arguments[0]).find(
        (l) => ts.isStringLiteralLike(l) && isNodeBuiltinSpecifier(l.text),
      );
      if (litNode) {
        const start = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(start);
        const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
        violations.push({
          file: relPath,
          rule: "no-node-builtin",
          line: line + 1,
          detail: `import() dinámico de \`${litNode.text}\` — builtin Node-only, ausente del baseline Edge (Vercel/Workers) → falla al resolver en render/SSR. El subset disponible-en-Edge se allowlistará en #190. ${lineText}`,
        });
      }
    }
    // LLAMADA UNBOUND de método branded host (codex P1): un método bucket-1 ALLOWED ∈
    // RECEIVER_BOUND_MEMBERS es Edge-safe LIGADO (`crypto.getRandomValues(b)`; parens/cast preservan
    // `this`) pero LANZA DESLIGADO (`(0, crypto.getRandomValues)(b)` → `this` ya no es el objeto host).
    // El set value-transparente preserva el VALOR pero `,`/`&&`/`||`/`??`/`?:`/`=` DETACHAN el `this`;
    // parens/`as`/`!`/`<T>` (erased) NO. Por eso este check SPLIT-ea el set SOLO aquí: `unwrapErased`
    // (this-preserving) deja un nodo VT residual ⟺ el callee cruzó un operador this-detaching. El set
    // VT unificado para eval-sinks (rama ①, `.constructor`) queda INTACTO. Se caza SOLO el callee
    // INVOCADO en-sitio; el detach NO-invocado (`const f=(0,X.m)`) y el var-extract (`const r=X.m; r()`)
    // = indirección/data-flow §141 residual (el receiver se pierde por seguimiento de valor, no en-sitio).
    if (ts.isCallExpression(node) && !context.isInClientOnlyDeferredBody) {
      // ¿`expr` resuelve a un método ∈ RECEIVER_BOUND con el receiver DESLIGADO en-sitio? → {r, member}.
      // Robusto a: wrapper VT (resuelve por las hojas this-detaching), alias del root (exprPartialRoot),
      // y la CADENA DE RECEIVER de `.call/.apply/.bind` a CUALQUIER profundidad/orden (`peelReceiverChain`,
      // iterativo sin cap → `X.m.call`, `X.m.bind(a).call(b)`, `(X.m.call).bind(X.m)()`, profundidad 50…
      // todos pelan hasta el member base). Una hoja CallExpression (`.bind(…)` call) es candidata pelable.
      const boundMemberOf = (expr) => {
        const lu = unwrapErased(expr);
        const candidates =
          ts.isPropertyAccessExpression(lu) ||
          ts.isElementAccessExpression(lu) ||
          ts.isCallExpression(lu)
            ? [lu]
            : valueTransparentChildren(lu).length > 0
              ? valueTransparentLeaves(lu).map(unwrapErased)
              : [];
        for (const cand of candidates) {
          const c = peelReceiverChain(cand);
          if (
            !ts.isPropertyAccessExpression(c) &&
            !ts.isElementAccessExpression(c)
          ) {
            continue;
          }
          const r = exprPartialRoot(c.expression, context);
          const bound = r ? RECEIVER_BOUND_MEMBERS[r] : null;
          const member = bound
            ? accessedMemberNames(c).find((mm) => bound.has(mm))
            : null;
          if (member) return { r, member };
        }
        return null;
      };
      const calleeStripped = unwrapErased(node.expression);
      let hit = null;
      let via = null;
      // (a) DETACH por operador this-detaching: `(0, X.m)()`, `(X.m||y)()`, ternario, alias de root.
      if (valueTransparentChildren(calleeStripped).length > 0) {
        hit = boundMemberOf(calleeStripped);
        via = "operador this-detaching";
      }
      // (b) DETACH por `Function.prototype.call/apply/bind` invocado EN-SITIO (simétrico con `.constructor.call`).
      // `X.m.call(recv,…)` / `.apply` / `.bind(…)()` invocan el método con `this` controlado, contiguo → la
      // MISMA divergencia-Edge que (a) (OK-Node / throws-Edge). Cubre dotted + bracket-literal (`X.m["call"]`)
      // + optional (`X.m?.call?.()`) vía accessedMemberNames. NO se cazan (residual data-flow §141): `.bind(…)`
      // cuyo resultado NO se invoca aquí (crea fn, no llama el método) ni el bind-extraído cross-statement
      // (`const f=X.m.bind(null); f(b)`). `.call(<receiver-correcto>,…)` no diverge pero es indistinguible sin
      // data-flow del 1er arg → flag-all fail-closed (over-strict-FP aceptado: nadie escribe `.call(crypto,…)`).
      if (!hit) {
        let detachTarget = null;
        if (
          ts.isPropertyAccessExpression(calleeStripped) ||
          ts.isElementAccessExpression(calleeStripped)
        ) {
          const fm = accessedMemberNames(calleeStripped);
          if (fm.includes("call") || fm.includes("apply")) {
            detachTarget = calleeStripped.expression;
          }
        } else if (ts.isCallExpression(calleeStripped)) {
          // `X.m.bind(…)()`: el callee de la call externa (este `node`) es la call a `X.m.bind`.
          const innerCallee = unwrapErased(calleeStripped.expression);
          if (
            (ts.isPropertyAccessExpression(innerCallee) ||
              ts.isElementAccessExpression(innerCallee)) &&
            accessedMemberNames(innerCallee).includes("bind")
          ) {
            // `boundMemberOf` → `peelReceiverChain` pela el resto de la cadena de receiver (`.bind`
            // encadenado, `.call/.apply` intercalados, VT-antes) a cualquier profundidad.
            detachTarget = innerCallee.expression;
          }
        }
        if (detachTarget) {
          hit = boundMemberOf(detachTarget);
          via = "Function.prototype.call/apply/bind";
        }
      }
      // (c) `Reflect.apply(T, thisArg, args)` ≡ `T.apply(thisArg, args)` — invoca T con `this` CONTROLADO
      // (arg1) → MISMO detach que `.call/.apply`, pero T (arg0) llega vía un builtin Reflect (fuera del
      // universo `.call/.apply/.bind`). T EN-SITIO → decidible con `boundMemberOf` (el gate ya modela
      // Reflect para el eval-sink). `Reflect.construct` → más abajo (construcción). codex P1.
      const reflectTgt = reflectCallTarget(node);
      if (!hit && reflectTgt && reflectTgt.method === "apply") {
        hit = boundMemberOf(reflectTgt.target);
        if (hit) via = "Reflect.apply (this controlado)";
      }
      if (hit) {
        const start = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(start);
        const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
        violations.push({
          file: relPath,
          rule: "no-bare-dom-access",
          line: line + 1,
          detail: `llamada UNBOUND de \`${hit.r}.${hit.member}\` — método branded host DESLIGADO de su receiver (${via}) → \`this\` no es el objeto ${hit.r} → TypeError en Edge/SSR. La llamada LIGADA (\`${hit.r}.${hit.member}(…)\`, o envuelta en parens/cast) es Edge-safe: ${lineText}`,
        });
      }
      // `Reflect.construct(T, args)` ≡ `new T(...args)` — construye T (arg0) SIN `new` → salta el check
      // `NewExpression`. T EN-SITIO → mismo resolver `constructionTargets`; cierra la construcción-vía-Reflect.
      if (reflectTgt && reflectTgt.method === "construct") {
        for (const target of constructionTargets(reflectTgt.target)) {
          if (
            !ts.isPropertyAccessExpression(target) &&
            !ts.isElementAccessExpression(target)
          ) {
            continue;
          }
          const ctorRoot = exprPartialRoot(target.expression, context);
          const ctorMember =
            ctorRoot &&
            accessedMemberNames(target).find((mm) =>
              isConstructionDeniedMember(ctorRoot, mm),
            );
          if (ctorMember) {
            const start = node.getStart(sourceFile);
            const { line } = sourceFile.getLineAndCharacterOfPosition(start);
            const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
            violations.push({
              file: relPath,
              rule: "no-bare-dom-access",
              line: line + 1,
              detail: `\`Reflect.construct(${ctorRoot}.${ctorMember}, …)\` ≡ \`new ${ctorRoot}.${ctorMember}(bytes)\` — compila bytes en runtime (dynamic codegen deshabilitado en el baseline Edge) → lanza en SSR/render: ${lineText}`,
            });
            break;
          }
        }
      }
    }
    // CONSTRUCCIÓN denegada: `new WebAssembly.Module(bytes)` compila bytes SIEMPRE (sin overload
    // estático) → dynamic codegen deshabilitado en Edge. Bucket-2-por-OPERACIÓN: se caza SOLO en
    // posición `new`, NO como member-read (`WebAssembly.Module` valor / instanceof / static-methods son
    // Edge-safe). Root directo o vía ALIAS de WebAssembly (`new WA.Module(...)`). `new M(bytes)` con M =
    // member-alias de `WebAssembly.Module` = indirección §141 residual (el token Module no está en-sitio).
    // codex P2 (review genérico).
    if (ts.isNewExpression(node) && !context.isInClientOnlyDeferredBody) {
      // VALUE-survival: el callee del `new` puede alcanzar el constructor a través de operadores
      // value-transparent (ternario/coma/`&&`/`||`/`??`/`=`) — el VALOR construido es el mismo, sigue
      // compilando bytes. MISMA resolución value-survival que el eval-sink (`.constructor`): se resuelve
      // por las hojas vía `valueSurvivalLeaves` (helper value-survival CENTRALIZADO), NO solo el callee
      // directo/erased (codex P1 @fdd3fe5: `new (c?WebAssembly.Module:X)(bytes)` se saltaba). NOTA: bracket
      // (`new WebAssembly["Module"]`) y cast (`new (… as any)`) YA estaban cubiertos (ElementAccess /
      // unwrapErased); el gap era SOLO los operadores VT. El member-alias (`const M=WebAssembly.Module;
      // new M(bytes)`) sigue residual §141 (token no en-sitio). Eje VALUE-survival (compartido con
      // eval-sink/import.meta), DISTINTO del eje receiver-detach del unbound (set VT SPLIT, no fusionar).
      // `constructionTargets` (module-level): hojas value-survival DESLIGANDO `.bind(...)` recursivo
      // (`new (X.Module.bind(t,...a))()` ≡ `new X.Module(...a)`; `.bind` encadenado + VT-antes + dotted/
      // bracket/optional). `.call/.apply` NO aplican a construcción. El member-alias sigue residual.
      for (const target of constructionTargets(node.expression)) {
        if (
          !ts.isPropertyAccessExpression(target) &&
          !ts.isElementAccessExpression(target)
        ) {
          continue;
        }
        const ctorRoot = exprPartialRoot(target.expression, context);
        const ctorMember =
          ctorRoot &&
          accessedMemberNames(target).find((mm) =>
            isConstructionDeniedMember(ctorRoot, mm),
          );
        if (ctorMember) {
          const start = node.getStart(sourceFile);
          const { line } = sourceFile.getLineAndCharacterOfPosition(start);
          const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
          violations.push({
            file: relPath,
            rule: "no-bare-dom-access",
            line: line + 1,
            detail: `\`new ${ctorRoot}.${ctorMember}(bytes)\` — compila bytes en runtime (dynamic codegen deshabilitado en el baseline Edge) → lanza en SSR/render. El VALOR \`${ctorRoot}.${ctorMember}\` (instanceof, static methods) es Edge-safe: ${lineText}`,
          });
          break;
        }
      }
    }
    // `import.meta.<member>` — namespace ESM poblado por el host/build; sus miembros se whitelistean
    // fail-closed (SAFE_IMPORT_META_MEMBERS). `dirname`/`filename` son Node-only → ausentes en Edge →
    // leer/derefenciarlos lanza en SSR/render. Forma dot Y bracket-LITERAL (`import.meta["dirname"]`,
    // fold del literal vía accessedMemberNames); `import.meta[dynamicKey]` = §141 residual (data-flow).
    // El ROOT `import.meta` puede llegar por operadores VT value-survival (`(c?import.meta:x).dirname`) →
    // se resuelve por `valueSurvivalLeaves` (helper compartido), NO solo MetaProperty directo/erased
    // (codex P1 @fdd3fe5, familia value-survival, simétrico con el constructor-Module). `import.meta[dynKey]`
    // sigue §141 residual. `new.target` NO es vector (no poblado por host, sin miembros Node-only).
    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      valueSurvivalLeaves(node.expression).some(
        (l) =>
          ts.isMetaProperty(l) &&
          l.keywordToken === ts.SyntaxKind.ImportKeyword,
      ) &&
      !context.isInClientOnlyDeferredBody
    ) {
      const members = accessedMemberNames(node);
      const unsafe = members.find((mm) => !SAFE_IMPORT_META_MEMBERS.has(mm));
      if (members.length > 0 && unsafe !== undefined) {
        const start = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(start);
        const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
        violations.push({
          file: relPath,
          rule: "no-bare-dom-access",
          line: line + 1,
          detail: `\`import.meta.${unsafe}\` — miembro Node-only, ausente del \`import.meta\` del baseline Edge/web-standard → lanza en SSR/render. Disponible-en-Edge: ${[...SAFE_IMPORT_META_MEMBERS].join("/")} (subset definitivo en #190): ${lineText}`,
        });
      }
    }
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

    // (b) Entrar en función/arrow/method: encender isInClientOnlyDeferredBody
    // SI esta function expr es argumento de un sink diferido CLIENT-ONLY reconocido
    // (handler/effect; un timer NO). Si ya estamos en client-only, los bodies anidados heredan
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
        // CLIENT-ONLY deferred (hook/handler) vs TIMER (setTimeout/setInterval/
        // queueMicrotask). Sticky: una vez en client-only, los timers anidados
        // también corren en cliente. CUALQUIER global de cliente (window/document,
        // eval-sink, …) solo se exime en client-only, NO en timer: los timers disparan
        // en el isolate Edge/SSR → su callback corre en el server → el read lanza (codex
        // P1). Por eso solo se trackea el subset client-only (`isExemptInDeferredBody`).
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
      // PARÁMETROS con DEFAULT que aliasa un timer/partial-root (`function run(later = setTimeout)`,
      // `run(WA = WebAssembly)`): el default corre en el scope de params pero el ALIAS vale en el
      // BODY. Sin esto el body ve `later`/`WA` como locales OPACOS → bypass (codex P2). Threadea
      // left-to-right (`f(a = setTimeout, b = a)`), resuelto contra el scope de params (shadow-aware).
      // El partial-MEMBER de un pattern-param (`run({ compile } = WA)`) lo caza flagPartialDestructure.
      let bodyCtx = bodyContext;
      {
        let pCtx = paramContext;
        const tAdds = new Set();
        const pAdds = new Map();
        for (const p of node.parameters) {
          // NO saltar por `!p.initializer`: un DEFAULT de binding-element dentro del pattern
          // (`run({ later = setTimeout })`) ejecuta aunque el parámetro no tenga default ENTERO —
          // collectStructuralAliases recursa esos defaults desde el pattern (codex P2).
          const lt = new Set();
          collectStructuralAliases(
            p.name,
            p.initializer,
            pCtx,
            exprIsTimerValued,
            (n) => {
              lt.add(n);
              tAdds.add(n);
            },
          );
          const lp = new Map();
          collectStructuralAliases(
            p.name,
            p.initializer,
            pCtx,
            exprPartialRoot,
            (n, r) => {
              lp.set(n, r);
              pAdds.set(n, r);
            },
            true,
          );
          if (lt.size) {
            pCtx = {
              ...pCtx,
              scopeTimerAliases: new Set([
                ...(pCtx.scopeTimerAliases ?? []),
                ...lt,
              ]),
            };
          }
          if (lp.size) {
            pCtx = {
              ...pCtx,
              scopePartialAliases: new Map([
                ...(pCtx.scopePartialAliases ?? []),
                ...lp,
              ]),
            };
          }
        }
        if (tAdds.size) {
          bodyCtx = {
            ...bodyCtx,
            scopeTimerAliases: new Set([
              ...(bodyCtx.scopeTimerAliases ?? []),
              ...tAdds,
            ]),
          };
        }
        if (pAdds.size) {
          bodyCtx = {
            ...bodyCtx,
            scopePartialAliases: new Map([
              ...(bodyCtx.scopePartialAliases ?? []),
              ...pAdds,
            ]),
          };
        }
      }
      const paramNodes = new Set(node.parameters);
      ts.forEachChild(node, (child) => {
        if (child === node.body) {
          visit(child, bodyCtx);
        } else if (child === node.name && ts.isComputedPropertyName(child)) {
          // Computed key de método/accessor (`{ [window.x]() {} }`): se EVALÚA al crear
          // el objeto/clase (render path, scope EXTERNO) → si lee un global FLAGGEA aunque
          // un param lo sombree (codex P1). EXCEPCIÓN: un miembro de clase SIN cuerpo
          // (abstract o overload-signature) se BORRA al emit — el build emite solo la
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
    // borra ENTERA al emit (el build no emite nada). NO recursar — su computed-key,
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
      // El NOMBRE del namespace es un binding runtime DENTRO de su cuerpo SOLO si el
      // namespace INSTANCIA un local limpio (`namespaceIsInstantiated`, que ya incluye el
      // guard de colisión ambient-merge). Si NO instancia —colisión `declare var N` hermano
      // que rolldown elide, o type-only—, el nombre NO es local: un read `N.x` en el cuerpo
      // (`namespace window { export const z = window.innerWidth }`) filtra al GLOBAL en el
      // build → debe flaggearse. Mismo criterio de instanciación que el shadow EXTERNO
      // (consistencia inner/outer). Codex P1 (d007dd6, body-internal del merge). FAIL-CLOSED.
      const nsCtx =
        node.name && ts.isIdentifier(node.name) && namespaceIsInstantiated(node)
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
      // ⚠️ PARIDAD con `visitOrderedStatements` — el CaseBlock es un walker PARALELO que replica su
      // lógica a mano (deuda estructural; unificar post-freeze). DEBE espejear sus 9 pasos o sale FP/
      // bypass (2 P2 ya cazados: guard-alias + blockEntryGuards). Auditados step-by-step (codex 8º
      // genérico) — completos a `2e61d5c`. Si tocas uno de los dos walkers, replica en el otro:
      //   SETUP: (1) blockEntryGuards = context.activeGuards; (2) purgeGuardAliasShadows(block-lexical);
      //          (3) gatherNonReactLexicalShadows pre-load.
      //   PER-STMT: (4) visit; (5) extractPostStatementBindings→addToScope; (6) purgeNonImportReactAliases;
      //          (7) addReactAliases; (8) extractConstGuardAlias; (9) extractNegativeEarlyReturnGuards.
      // El CaseBlock usa el MODELO FALL-THROUGH (ver abajo): un solo `clauseCtx` por clause que
      // acumula los pasos 5-9; al cerrar, propaga TODO al siguiente clause solo con fall-through (no
      // termina). Entrada directa a un clause posterior empieza desde `entryCtx`. NO hay un `current`
      // compartido sin fall-through (eso era fail-OPEN: 3 P2 — guard-alias, value-binding, react-alias).
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
      // `blockEntryGuards: context.activeGuards` — paridad con visitOrderedStatements (codex P2):
      // un `if (typeof window !== "undefined") switch (x) { case 1: function read(){ window } }`
      // entra el switch BAJO el guard activo; una función HOISTED en un case resetea a
      // blockEntryGuards (no a vacío), así que sin este snapshot se trataría como NO-guardada y se
      // sobre-flaggearía (FP). El CaseBlock es UN scope léxico → hereda los guards de entrada.
      let current = {
        ...addToScope(context, blockFns),
        blockEntryGuards: context.activeGuards,
      };
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
            current,
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
      // MODELO PER-CLAUSE (codex P2 ×3 — guard-alias, value-binding `const window={}`, react-alias).
      // CADA clause empieza desde `entryCtx` (outer + pre-load de sombras + blockEntryGuards). Un
      // case/default labeled SIEMPRE puede entrarse DIRECTO (jump al label / no-match para default),
      // SIN ejecutar los clauses anteriores → sus const/let están en TDZ y sus guards/aliases no
      // corrieron. El gate debe ser safe en TODOS los paths de entrada → el estado al entrar un clause
      // es la INTERSECCIÓN = entryCtx (lo único cierto en entrada directa). El fall-through NUNCA es el
      // ÚNICO path (el siguiente case también es jump target), así que NINGÚN estado clause-local
      // (bindings/aliases/guards) propaga entre clauses — compartirlo era fail-OPEN (un binding/alias/
      // guard de un clause suprimía checks en hermanos). Dentro de UN clause sí acumula posicionalmente.
      // Sustituye el modelo dual current/clauseCtx (cada divergencia salía como P2). El typeof-
      // discriminant del switch sigue siendo per-clause según el label (con prevTerminates para el
      // fall-through entrante desde un case ausente).
      const entryCtx = current;
      let prevTerminates = true; // antes del 1er clause no hay fall-through entrante
      for (const clause of node.clauses) {
        if (ts.isCaseClause(clause) && clause.expression) {
          visit(clause.expression, entryCtx);
        }
        let clauseCtx = entryCtx;
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
          const { all, nonImport } = extractPostStatementBindings(stmt, clauseCtx);
          clauseCtx = addToScope(clauseCtx, all, nonImport);
          // Purga de nonImportBindings los nombres que este stmt redeclara como alias react.
          clauseCtx = purgeNonImportReactAliases(clauseCtx, stmt);
          // Aliases react scope-aware declarados por este statement.
          clauseCtx = addReactAliases(clauseCtx, stmt);
          // Alias de timer global scope-aware (`const later = setTimeout`) — codex P2.
          clauseCtx = addTimerAliases(clauseCtx, stmt);
          // Alias de root parcial-safe (`const WA = WebAssembly`) — codex P2.
          clauseCtx = addPartialAliases(clauseCtx, stmt);
          // Guard alias `const has = typeof X !== "undefined"` (narrowing — se resuelve contra
          // clauseCtx.guardAliases; propaga al siguiente clause solo con fall-through).
          const guardAlias = extractConstGuardAlias(stmt, clauseCtx.guardAliases);
          if (guardAlias) {
            clauseCtx = {
              ...clauseCtx,
              guardAliases: new Map([...clauseCtx.guardAliases, guardAlias]),
            };
          }
          const negGuards = extractNegativeEarlyReturnGuards(stmt, clauseCtx.guardAliases);
          if (negGuards.size > 0) {
            clauseCtx = {
              ...clauseCtx,
              activeGuards: new Set([...clauseCtx.activeGuards, ...negGuards]),
            };
          }
        }
        // NO se propaga estado al siguiente clause (per-clause; ver arriba). Solo `prevTerminates`
        // para el typeof-discriminant (¿puede entrarse el siguiente case por fall-through desde uno
        // ausente?).
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
        let bodyContext = addToScope(context, catchBindings);
        // El catch param no tiene init, pero sus binding-element DEFAULTS aliasan un timer/partial-
        // root cuando el valor capturado omite la prop (`catch ({ later = setTimeout })`) → enrolar
        // como en el param-loop, paridad con flagPartialDestructure que caza su member-extract (codex P2).
        const pat = node.variableDeclaration.name;
        const tAdds = new Set();
        collectStructuralAliases(pat, undefined, bodyContext, exprIsTimerValued, (n) =>
          tAdds.add(n),
        );
        const pAdds = new Map();
        collectStructuralAliases(pat, undefined, bodyContext, exprPartialRoot, (n, r) =>
          pAdds.set(n, r), true,
        );
        if (tAdds.size > 0) {
          bodyContext = {
            ...bodyContext,
            scopeTimerAliases: new Set([
              ...(bodyContext.scopeTimerAliases ?? []),
              ...tAdds,
            ]),
          };
        }
        if (pAdds.size > 0) {
          bodyContext = {
            ...bodyContext,
            scopePartialAliases: new Map([
              ...(bodyContext.scopePartialAliases ?? []),
              ...pAdds,
            ]),
          };
        }
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
      // Alias de timer/partial del for-init: const/let Y `var` (`for (var later = setTimeout;;)` —
      // el var-binding lo añade el hoisting, pero el ALIAS no se enrolaba; codex P2). NO gateado por
      // isBlockScopedDeclList. Se calcula aquí para poder entrar al bloque especial aunque no haya
      // forBindings (caso var) ni guards.
      const forTimerAliases =
        init && ts.isVariableDeclarationList(init)
          ? timerAliasNamesDeclaredBy(init, context)
          : new Set();
      const forPartialAliases =
        init && ts.isVariableDeclarationList(init)
          ? partialAliasesDeclaredBy(init, context)
          : new Map();
      // for-init que es una EXPRESIÓN (no declaración): assignments embebidas (`for (later =
      // setTimeout; later(…); )`) ejecutan ANTES de la condición/body → enrolar (codex P2).
      const forExprInit =
        init && !ts.isVariableDeclarationList(init) ? init : null;
      let baseFromExpr = forExprInit
        ? withEmbeddedAssignmentAliases(context, forExprInit)
        : context;
      // for-OF/for-IN con assignment-PATTERN (`for ({ later = setTimeout } of rows)`): los DEFAULTS
      // de binding-element del pattern ejecutan antes del body → enrolar via collectStructuralAliases
      // (withEmbeddedAssignmentAliases no los ve: no son `=` embebidos sino un pattern) (codex P2).
      if (
        forExprInit &&
        (ts.isObjectLiteralExpression(forExprInit) ||
          ts.isArrayLiteralExpression(forExprInit))
      ) {
        const tA = new Set();
        collectStructuralAliases(forExprInit, undefined, context, exprIsTimerValued, (n) =>
          tA.add(n),
        );
        const pA = new Map();
        collectStructuralAliases(forExprInit, undefined, context, exprPartialRoot, (n, r) =>
          pA.set(n, r), true,
        );
        if (tA.size > 0) {
          baseFromExpr = {
            ...baseFromExpr,
            scopeTimerAliases: new Set([
              ...(baseFromExpr.scopeTimerAliases ?? []),
              ...tA,
            ]),
          };
        }
        if (pA.size > 0) {
          baseFromExpr = {
            ...baseFromExpr,
            scopePartialAliases: new Map([
              ...(baseFromExpr.scopePartialAliases ?? []),
              ...pA,
            ]),
          };
        }
      }
      const hasExprAliases = baseFromExpr !== context;
      const cond = ts.isWhileStatement(node) ? node.expression : node.condition;
      const bodyGuards = new Set();
      if (cond) collectConjunctionGuards(cond, bodyGuards, context.guardAliases);
      if (
        forBindings.size > 0 ||
        bodyGuards.size > 0 ||
        forTimerAliases.size > 0 ||
        forPartialAliases.size > 0 ||
        hasExprAliases
      ) {
        let baseCtx =
          forBindings.size > 0
            ? addToScope(baseFromExpr, forBindings)
            : baseFromExpr;
        if (forTimerAliases.size > 0) {
          baseCtx = {
            ...baseCtx,
            scopeTimerAliases: new Set([
              ...(baseCtx.scopeTimerAliases ?? []),
              ...forTimerAliases,
            ]),
          };
        }
        if (forPartialAliases.size > 0) {
          baseCtx = {
            ...baseCtx,
            scopePartialAliases: new Map([
              ...(baseCtx.scopePartialAliases ?? []),
              ...forPartialAliases,
            ]),
          };
        }
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
          // MIEMBRO SEGURO de una raíz DENEGADA: `process.env` — `process` denegado pero `process.env`
          // lo expone Vercel Edge. Eximir SOLO el acceso a un miembro seguro (`env`, dot o bracket-
          // LITERAL, todas las ramas seguras); `process.cwd()`/`process[dynKey]` siguen flaggeando.
          // Trato uniforme con import.meta.env. codex P2 (review genérico). #190 refina el subset.
          const safeRootMembers = SAFE_MEMBERS_OF_DENIED_ROOT[api];
          const memberCands = safeRootMembers ? accessedMemberNames(node) : [];
          const isSafeMemberOfDeniedRoot =
            safeRootMembers &&
            memberCands.length > 0 &&
            memberCands.every((mm) => safeRootMembers.has(mm));
          if (
            !context.localBindings.has(api) &&
            !deferredExempt &&
            !isSafeMemberOfDeniedRoot &&
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

    // (c.1b) MIEMBRO browser-only de un global SAFE en su root (performance.measureUserAgent
    // SpecificMemory): `performance` existe en Node/edge pero el método falta → la llamada
    // lanza TypeError en SSR. El typeof-guard del root NO protege (el root existe); solo
    // exento en client-only deferred (browser, donde el miembro existe). deepest re-hunt #173.
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      // El RECEIVER se desenvuelve VALUE-TRANSPARENTE: `(performance as any).x`, `(0,
      // performance).x` — el cast a `any` es PROBABLE para un método no-estándar (codex P1).
      // Key con ALTERNATIVAS (`WebAssembly[c ? "compile" : "validate"]`) → enumerar candidatas y
      // cazar si CUALQUIERA es un miembro denegado, fail-closed (codex P2).
      const memberCandidates = accessedMemberNames(node);
      // El receiver resuelve a un root parcial-safe DIRECTO (`performance`/`WebAssembly` no
      // sombreado) o vía ALIAS scope-aware (`const WA = WebAssembly; WA.compile()` — el root está en
      // SAFE_GLOBALS, así que el alias era invisible = bypass, codex P2). exprPartialRoot ya respeta
      // shadow/forward value-read; los guards localBindings/moduleDeclared de abajo se pliegan aquí.
      const resolvedPartialRoot =
        memberCandidates.length > 0
          ? exprPartialRoot(node.expression, context)
          : null;
      // Predicado CENTRAL: denylist (WebAssembly) → miembro ∈ set; allowlist (performance/crypto) →
      // miembro ∉ set. Cualquier candidato denegado (fail-closed sobre las alternativas).
      const partialMember = resolvedPartialRoot
        ? (memberCandidates.find((m) =>
            isDeniedPartialMember(resolvedPartialRoot, m),
          ) ?? null)
        : null;
      const partialRootName = partialMember ? resolvedPartialRoot : null;
      // PROBE SEGURO (codex P2): feature-detection que NO crashea — (1) operando de `typeof`
      // (`typeof performance.x` → "undefined", no lee); (2) short-circuit opcional (`x?.()`,
      // `x?.foo`, `x?.[i]` → undefined si el miembro falta). Reading el miembro ausente da
      // undefined; solo CRASHEA si se INVOCA/derefencia sin guardia. (El if-guard a nivel de
      // miembro `if (typeof X.y === "function") X.y()` queda residual fail-closed — el gate no
      // trackea guards de member-path.)
      // Ascenso saltando wrappers RUNTIME-TRANSPARENTES (erased + value-transparent) para hallar
      // el contexto efectivo del probe: `typeof (performance.x)`, `(performance.x as any)?.()` —
      // el nodo va envuelto en parens/cast/coma (codex P2). Mismo ascenso que el eval-sink.
      let probe = node;
      let p = node.parent;
      while (
        p &&
        (isErasedOuterExpr(p) || valueTransparentChildren(p).includes(probe))
      ) {
        probe = p;
        p = p.parent;
      }
      const isTypeofProbe =
        p && ts.isTypeOfExpression(p) && p.expression === probe;
      // Optional probe (`x?.()`, `x?.foo`, `x?.[i]`): el resultado es undefined si el miembro
      // falta. SEGURO salvo que se DEREFERENCIE rompiendo la cadena con PARÉNTESIS — `(x?.()).foo`
      // ejecuta `undefined.foo` y crashea; SIN paréntesis `x?.().foo` corta la cadena entera =
      // seguro (codex P2). El paren ROMPE el optional-chain (semántica JS): un deref no-opcional
      // tras paren = unsafe.
      let isSafeOptionalProbe =
        p &&
        (ts.isCallExpression(p) ||
          ts.isPropertyAccessExpression(p) ||
          ts.isElementAccessExpression(p)) &&
        p.expression === probe &&
        p.questionDotToken !== undefined;
      if (isSafeOptionalProbe) {
        // Solo el PARÉNTESIS rompe la cadena opcional en runtime; `as`/`!`/`satisfies` son
        // transparentes y NO la rompen (`a?.b!.c` corta entero = seguro). Ascender por TODOS los
        // erased-wrappers, pero exigir que se haya cruzado ≥1 paréntesis antes del deref.
        let r = p;
        let crossedParen = false;
        while (r.parent && isErasedOuterExpr(r.parent)) {
          if (ts.isParenthesizedExpression(r.parent)) crossedParen = true;
          r = r.parent;
        }
        if (crossedParen) {
          const consumer = r.parent;
          // El TaggedTemplate guarda el callee en `.tag` (no `.expression`); un tagged-template
          // nunca es opcional (`a?.\`x\`` es error de sintaxis) → siempre rompe sobre undefined.
          const consumerRefersToR = consumer
            ? ts.isTaggedTemplateExpression(consumer)
              ? consumer.tag === r
              : consumer.expression === r && consumer.questionDotToken === undefined
            : false;
          if (
            consumer &&
            (ts.isPropertyAccessExpression(consumer) ||
              ts.isElementAccessExpression(consumer) ||
              ts.isCallExpression(consumer) ||
              ts.isTaggedTemplateExpression(consumer)) &&
            consumerRefersToR
          ) {
            isSafeOptionalProbe = false; // `(x?.()).foo` → undefined deref'd → unsafe
          }
        }
      }
      // Miembro PRESENTE-pero-throws (WebAssembly.compile): NO es probe seguro si el optional-probe
      // INVOCA el método (dynamic codegen Edge → lanza):
      //   - optional-CALL directo `compile?.()` (p = CallExpression)
      //   - optional-ACCESS a `call`/`apply`/`bind` `compile?.call(null,bytes)` — Function.prototype
      //     invoca igual → compila → lanza (codex P1). El optional-access a METADATA (`?.name`,
      //     `?.length`) NO compila → sigue exento. (≠ miembro AUSENTE, donde `?.x` corta a undefined.)
      if (
        isSafeOptionalProbe &&
        p &&
        partialRootName &&
        PARTIAL_PRESENT_THROWS_ROOTS.has(partialRootName)
      ) {
        if (ts.isCallExpression(p)) {
          isSafeOptionalProbe = false;
        } else if (
          ts.isPropertyAccessExpression(p) ||
          ts.isElementAccessExpression(p)
        ) {
          const mn = accessedMemberName(p);
          if (mn === "call" || mn === "apply" || mn === "bind") {
            isSafeOptionalProbe = false;
          }
        }
      }
      const safelyProbed = isTypeofProbe || isSafeOptionalProbe;
      // shadow/forward value-read ya resueltos en exprPartialRoot (directo) o en la purga del alias.
      if (
        partialRootName &&
        !safelyProbed &&
        !context.isInClientOnlyDeferredBody
      ) {
        const start = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(start);
        const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
        violations.push({
          file: relPath,
          rule: "no-bare-dom-access",
          line: line + 1,
          detail: PARTIAL_PRESENT_THROWS_ROOTS.has(partialRootName)
            ? `\`${partialRootName}.${partialMember}\` — dynamic code generation deshabilitada en el baseline Edge (Vercel/Workers), como eval/Function → lanza en SSR/render: ${lineText}`
            : `\`${partialRootName}.${partialMember}\` — miembro BROWSER-ONLY de un global SAFE; falta en el floor Node/edge → la llamada lanza en SSR: ${lineText}`,
        });
      }
    }

    // (c.1c) DESTRUCTURING de un miembro browser-only de un SAFE global: `const {
    // measureUserAgentSpecificMemory: m } = performance` copia el método (undefined en Node) a
    // un local → `m()` crashea sin atarse al miembro (escapa al check de property-access). Fail-
    // closed: flaggear la EXTRACCIÓN del miembro parcial desde un root partial (token-en-su-
    // sitio: key + root visibles en el patrón). Cubre decl `const {…}=` y assignment `({…}=…)`.
    // codex P2.
    {
      let pattern = null;
      let initExpr = null;
      if (
        (ts.isObjectBindingPattern(node) ||
          ts.isArrayBindingPattern(node)) &&
        (ts.isVariableDeclaration(node.parent) ||
          ts.isParameter(node.parent))
      ) {
        // VariableDeclaration `const { compile } = WebAssembly` o PARÁMETRO con DEFAULT
        // `function run({ compile } = WebAssembly)` — el default es el root destructurado (codex P2).
        pattern = node;
        initExpr = node.parent.initializer;
      } else if (
        (ts.isObjectLiteralExpression(node) ||
          ts.isArrayLiteralExpression(node)) &&
        ts.isBinaryExpression(node.parent) &&
        node.parent.left === node &&
        node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        pattern = node;
        initExpr = node.parent.right;
      } else if (
        (ts.isObjectLiteralExpression(node) ||
          ts.isArrayLiteralExpression(node)) &&
        (ts.isForOfStatement(node.parent) ||
          ts.isForInStatement(node.parent)) &&
        node.parent.initializer === node
      ) {
        // for-OF/for-IN assignment-PATTERN (`for ({ x: { compile } = WebAssembly } of rows)`): el
        // valor viene de la iteración (sin init), pero los binding-element DEFAULTS sí ejecutan →
        // member-extract via default-scan (init undefined). Paridad con el alias-enroll del for-of (codex P2).
        pattern = node;
        initExpr = undefined;
      }
      // Correr aunque NO haya init ENTERO: un catch-pattern (`catch ({ x: { compile } = WebAssembly })`)
      // y un param-pattern sin default nunca tienen init, pero sus binding-element DEFAULTS sí ejecutan
      // (cuando la key/índice falta) → flagPartialDestructure escanea los defaults con init undefined (codex P2).
      if (pattern && !context.isInClientOnlyDeferredBody) {
        // El root resuelve DIRECTO (no sombreado / forward) o vía ALIAS scope-aware (`const WA =
        // WebAssembly; const { compile } = WA`) — exprPartialRoot lo cubre. Y RECURSE por las mismas
        // formas estructurales que `collectStructuralAliases` (`const { x: { compile } } = { x:
        // WebAssembly }`): el init es un object/array literal, no el root directo (codex P2).
        const isDestructurePattern = (n) =>
          ts.isObjectBindingPattern(n) ||
          ts.isObjectLiteralExpression(n) ||
          ts.isArrayBindingPattern(n) ||
          ts.isArrayLiteralExpression(n);
        const flagPartialDestructure = (pat, init) => {
          const isObjPat =
            ts.isObjectBindingPattern(pat) ||
            ts.isObjectLiteralExpression(pat);
          const elems = ts.isObjectLiteralExpression(pat)
            ? pat.properties
            : pat.elements;
          // init puede ser undefined (catch-pattern / param sin default) → solo el default-scan corre.
          const partialRootName = init ? exprPartialRoot(init, context) : null;
          if (partialRootName) {
            // Solo un OBJECT pattern extrae un MIEMBRO por key; un array pattern sobre el root es
            // iteración (no member-access). init ES el root → sin literal anidado que recursar.
            if (!isObjPat) return;
            for (const el of elems) {
              const kn = ts.isBindingElement(el)
                ? el.propertyName || el.name
                : ts.isPropertyAssignment(el) ||
                    ts.isShorthandPropertyAssignment(el)
                  ? el.name
                  : null;
              // Key con ALTERNATIVAS (`[c ? "compile" : "validate"]`) → cualquier rama denegada
              // cuenta, fail-closed; predicado central (denylist O allowlist) (codex P2).
              const key =
                structuralKeyTexts(kn).find((k) =>
                  isDeniedPartialMember(partialRootName, k),
                ) ?? null;
              // ¿DEFAULT? `{ measure: m = () => 0 }` (decl), `{ x = d }` / `{ x: y = d }` (assign).
              // Miembro AUSENTE (performance.measure undefined) → default SE ACTIVA → seguro. Root
              // PRESENT-throws (WebAssembly.compile EXISTE) → default NO se activa → sigue lanzando.
              const hasDefault =
                (ts.isBindingElement(el) && el.initializer !== undefined) ||
                (ts.isShorthandPropertyAssignment(el) &&
                  el.objectAssignmentInitializer !== undefined) ||
                (ts.isPropertyAssignment(el) &&
                  el.initializer &&
                  ts.isBinaryExpression(el.initializer) &&
                  el.initializer.operatorToken.kind ===
                    ts.SyntaxKind.EqualsToken);
              if (
                key &&
                hasDefault &&
                !PARTIAL_PRESENT_THROWS_ROOTS.has(partialRootName)
              ) {
                continue; // miembro ausente con default → seguro
              }
              if (key) {
                const start = el.getStart(sourceFile);
                const { line } =
                  sourceFile.getLineAndCharacterOfPosition(start);
                const lineText =
                  content.split("\n")[line]?.trim().slice(0, 80) ?? "";
                violations.push({
                  file: relPath,
                  rule: "no-bare-dom-access",
                  line: line + 1,
                  detail: PARTIAL_PRESENT_THROWS_ROOTS.has(partialRootName)
                    ? `destructuring de \`${partialRootName}.${key}\` — dynamic code generation deshabilitada en el baseline Edge (Vercel/Workers) → lanza en render: ${lineText}`
                    : `destructuring de \`${partialRootName}.${key}\` — miembro BROWSER-ONLY de un global SAFE extraído a un local; la llamada lanza en SSR: ${lineText}`,
                });
              }
            }
            return; // init ES el root → no hay literal anidado que recursar
          }
          // sub-patrón + DEFAULT del elemento (`{ x: { compile } = WebAssembly }`): el default provee
          // el root cuando la key falta → recursar contra él, paridad con los alias collectors (codex
          // P2). PropertyAssignment con rename-default (`{ x: t = d }`) = BinaryExpression `=`.
          const subAndDefault = (el) => {
            if (ts.isBindingElement(el)) {
              return { sub: el.name, def: el.initializer ?? null };
            }
            if (ts.isPropertyAssignment(el)) {
              const v = el.initializer;
              if (
                v &&
                ts.isBinaryExpression(v) &&
                v.operatorToken.kind === ts.SyntaxKind.EqualsToken
              ) {
                return { sub: v.left, def: v.right };
              }
              return { sub: v ?? null, def: null };
            }
            if (
              ts.isBinaryExpression(el) &&
              el.operatorToken.kind === ts.SyntaxKind.EqualsToken
            ) {
              return { sub: el.left, def: el.right };
            }
            return { sub: el, def: null };
          };
          // DEFAULTS: se evalúan cuando la key/índice FALTA, INDEPENDIENTE de si el init es un literal
          // o un source OPACO (`const { x: { compile } = WebAssembly } = props`) → escanear SIEMPRE,
          // antes del early-return por init no-literal (codex P2).
          for (const el of elems) {
            if (ts.isOmittedExpression(el) || ts.isSpreadElement(el)) continue;
            const { sub, def } = subAndDefault(el);
            if (def && sub && isDestructurePattern(sub)) {
              flagPartialDestructure(sub, def);
            }
          }
          // RECURSIÓN ESTRUCTURAL por VALOR MATCHEADO: por cada ALTERNATIVA literal de init
          // (`cond ? { x: WebAssembly } : {…}`) → matchear sub-patrones (por key / por índice) y
          // bajar. Cubre object, array, mezclas y alternativas — paridad con collectStructuralAliases.
          for (const lit of init ? literalLeaves(init) : []) {
            if (isObjPat && ts.isObjectLiteralExpression(lit)) {
              for (const el of elems) {
                const kn = ts.isBindingElement(el)
                  ? el.propertyName || el.name
                  : ts.isPropertyAssignment(el)
                    ? el.name
                    : null;
                const { sub } = subAndDefault(el);
                if (
                  structuralKeyTexts(kn).length === 0 ||
                  !sub ||
                  !isDestructurePattern(sub)
                ) {
                  continue;
                }
                const ip = lit.properties.find(
                  (p) =>
                    ts.isPropertyAssignment(p) &&
                    p.name &&
                    structuralKeysOverlap(p.name, kn),
                );
                if (ip) flagPartialDestructure(sub, ip.initializer);
              }
            } else if (!isObjPat && ts.isArrayLiteralExpression(lit)) {
              for (let i = 0; i < elems.length; i++) {
                const el = elems[i];
                if (ts.isOmittedExpression(el) || ts.isSpreadElement(el)) {
                  continue;
                }
                const { sub } = subAndDefault(el);
                if (!sub || !isDestructurePattern(sub)) continue;
                const initEl = lit.elements[i];
                if (initEl && !ts.isOmittedExpression(initEl)) {
                  flagPartialDestructure(sub, initEl);
                }
              }
            }
          }
        };
        flagPartialDestructure(pattern, initExpr);
      }
    }

    // (c.1d) import-equals que aliasa un MIEMBRO partial-denied de un SAFE root: `import compile =
    // WebAssembly.compile` emite `var compile = WebAssembly.compile`, y `compile(bytes)` invoca el
    // dynamic codegen — el qualified name NO produce un PropertyAccess que cace (c.1b), y el root SAFE
    // no flaggea por (d). Flaggear la EXTRACCIÓN (codex P2), análogo al destructuring (c.1c). Root no
    // sombreado; exento solo en client-only deferred.
    if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isQualifiedName(node.moduleReference) &&
      ts.isIdentifier(node.moduleReference.left) &&
      ts.isIdentifier(node.moduleReference.right) &&
      !context.isInClientOnlyDeferredBody
    ) {
      // El root resuelve DIRECTO (no sombreado) o vía ALIAS scope-aware (`import WA = WebAssembly;
      // import compile = WA.compile`) — exprPartialRoot ya pliega shadow/forward/alias (codex P2).
      const ieRootName = exprPartialRoot(node.moduleReference.left, context);
      const ieMember = node.moduleReference.right.text;
      if (ieRootName && isDeniedPartialMember(ieRootName, ieMember)) {
        const start = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(start);
        const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
        violations.push({
          file: relPath,
          rule: "no-bare-dom-access",
          line: line + 1,
          detail: PARTIAL_PRESENT_THROWS_ROOTS.has(ieRootName)
            ? `import-equals de \`${ieRootName}.${ieMember}\` — dynamic code generation deshabilitada en el baseline Edge (Vercel/Workers) → lanza en render: ${lineText}`
            : `import-equals de \`${ieRootName}.${ieMember}\` — miembro BROWSER-ONLY de un global SAFE extraído a un local; la llamada lanza en SSR: ${lineText}`,
        });
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
    //   4. reflexión por ACCESO indirecto: `Reflect.get(x,"constructor")` (la key es un
    //      string, no hay nodo `.constructor` a la vista), getter. NOTA: `Reflect.construct/
    //      apply(x.constructor, …)` —acceso DIRECTO + invocación vía Reflect nombrado— SÍ se
    //      caza (rama (e) de isWeaponizedConstructorAccess, codex P1); solo el acceso
    //      indirecto vía Reflect.get queda residual.
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

    // (c.3) STRING-HANDLER timer = eval IMPLÍCITO. `setTimeout("código", …)` /
    // `setInterval`/`setImmediate` con 1er arg STRING (literal o template): el navegador lo
    // EVALÚA (lee window etc.); Node NO soporta el string-handler → lanza TypeError SÍNCRONO
    // en la llamada → crashea en SSR/Edge. El gate caza eval()/Function()/new Function() pero
    // el string-timer escapaba (el timer está en SAFE_GLOBALS y su 1er-arg no se inspeccionaba).
    // Token-en-su-sitio (el string a la vista; un string-VARIABLE = data-flow residual). Como
    // los otros eval-sinks: exento solo en client-only deferred (browser, donde sí evalúa).
    if (ts.isCallExpression(node) && !context.isInClientOnlyDeferredBody) {
      // El callee se desenvuelve VALUE-TRANSPARENTE: `(0, setTimeout)("x",0)`, `(setTimeout as
      // any)("x")` — coma/erased igual que el resto de sinks del gate (codex P2). Cualquier hoja
      // que sea el timer (identifier o `<global>.setTimeout`) lo reconoce.
      let timerName = null;
      for (const leaf of valueTransparentLeaves(node.expression)) {
        if (ts.isIdentifier(leaf)) {
          if (
            (leaf.text === "setTimeout" ||
              leaf.text === "setInterval" ||
              leaf.text === "setImmediate") &&
            // Un binding LOCAL homónimo (import/función/const wrapper) NO es el timer global →
            // su string-arg no es eval del navegador. Mismo respeto al shadow que la rama (d)
            // bare-identifier (codex P3). El alias del global real exige leer el global = flaggea
            // aguas arriba, así que skipear el shadow no abre bypass.
            !context.localBindings.has(leaf.text)
          ) {
            timerName = leaf.text;
            break;
          }
          // Alias SINTÁCTICO de un timer global (`const later = setTimeout; later("código")`): el
          // read del timer está en SAFE_GLOBALS → invisible aguas arriba (≠ eval, que es sink), así
          // que sin esto el alias sería fail-open (codex P2). Acumulado SCOPE-AWARE en el walk.
          if (context.scopeTimerAliases?.has(leaf.text)) {
            timerName = leaf.text;
            break;
          }
        } else if (
          ts.isPropertyAccessExpression(leaf) ||
          ts.isElementAccessExpression(leaf)
        ) {
          // Receiver value-transparente: `(0, globalThis).setTimeout(…)`, `(c ? window : self).
          // setTimeout(…)` — resolver por valueTransparentLeaves, no solo unwrapErased (globalThis/
          // window/… y setTimeout son SAFE → sin esto no flaggea aguas arriba) (codex P2). Shadow-aware.
          const receiverIsGlobalObj = valueTransparentLeaves(
            leaf.expression,
          ).some(
            (r) =>
              ts.isIdentifier(r) &&
              (r.text === "globalThis" ||
                r.text === "window" ||
                r.text === "self" ||
                r.text === "global") &&
              !context.localBindings.has(r.text),
          );
          if (receiverIsGlobalObj) {
            const mn = accessedMemberName(leaf);
            if (
              mn === "setTimeout" ||
              mn === "setInterval" ||
              mn === "setImmediate"
            ) {
              timerName = mn;
              break;
            }
          }
          // Proyección token-local de un timer (`[setTimeout][0]("código")`) — exprIsTimerValued ya
          // conoce `[X][i]` y respeta el shadow; sin esto el callee array-indexado bypassea (codex
          // P2). Llamada directa → handler en arg[0].
          if (timerName === null && exprIsTimerValued(leaf, context)) {
            timerName = "timer.projection";
            break;
          }
        } else if (ts.isCallExpression(leaf)) {
          // BIND-only: `setTimeout.bind(null)("código")` — la fn ligada (sin handler bindeado) es un
          // timer cuyo handler llega en ESTA llamada externa (arg[0]). exprIsTimerValued reconoce
          // `<timer>.bind(≤1)`. Con handler bindeado el string va en los args de `.bind` (rama .bind).
          if (exprIsTimerValued(leaf, context)) {
            timerName = "timer.bind";
            break;
          }
        }
      }
      // Posición del arg que debe ser string según la FORMA de invocación, sobre el modelo de
      // candidatos branch-aware (`expandArgLists`/`candidatesAt`, módulo-level): captura spread
      // literal/alternativas/longitud-distinta/inner-spread; spread variable = residual. codex P2.
      //   directo  `<timer>("código", …)`           → arg[0]
      //   `.call`  `<timer>.call(thisArg, "c", …)`   → arg[1]
      //   `.apply` `<timer>.apply(thisArg, ["c", …])` → arg[1] es array-literal → su elemento [0]
      let stringArgCandidates =
        timerName !== null ? candidatesAt(node.arguments, 0) : [];
      if (timerName === null) {
        // `<timer>.call`/`.apply`/`.bind` — Function.prototype sobre el timer. El read del timer es
        // SAFE → no se flaggea aguas arriba; sin esto `setTimeout.call(null,"c")` bypassea (codex P2).
        for (const leaf of valueTransparentLeaves(node.expression)) {
          if (
            !ts.isPropertyAccessExpression(leaf) &&
            !ts.isElementAccessExpression(leaf)
          ) {
            continue;
          }
          const mn = accessedMemberName(leaf);
          if (
            (mn === "call" || mn === "apply" || mn === "bind") &&
            exprIsTimerValued(leaf.expression, context)
          ) {
            timerName = `timer.${mn}`;
            stringArgCandidates =
              mn === "apply"
                ? candidatesAt(node.arguments, 1).flatMap(
                    applyHandlerCandidates,
                  )
                : candidatesAt(node.arguments, 1);
            break;
          }
        }
      }
      if (timerName === null) {
        // `Reflect.apply(<timer>, thisArg, ["código"])` — el timer es arg[0], el handler es
        // arg[2] array-literal → su elemento [0]. Reflect/setTimeout son SAFE → no flaggea aguas
        // arriba; misma clase que `.apply`. Posiciones por el modelo de candidatos (codex P2).
        for (const leaf of valueTransparentLeaves(node.expression)) {
          if (
            (ts.isPropertyAccessExpression(leaf) ||
              ts.isElementAccessExpression(leaf)) &&
            accessedMemberName(leaf) === "apply" &&
            // Receiver Reflect value-transparente (`(0, Reflect).apply(setTimeout, …)`) → VT, no solo
            // unwrapErased; paridad con los otros receiver paths (codex P2). Shadow-aware.
            valueTransparentLeaves(leaf.expression).some(
              (r) =>
                ts.isIdentifier(r) &&
                r.text === "Reflect" &&
                !context.localBindings.has("Reflect"),
            ) &&
            candidatesAt(node.arguments, 0).some((c) =>
              exprIsTimerValued(c, context),
            )
          ) {
            timerName = "Reflect.apply(timer)";
            stringArgCandidates = candidatesAt(node.arguments, 2).flatMap(
              applyHandlerCandidates,
            );
            break;
          }
        }
      }
      const isStringArg = stringArgCandidates.some((c) =>
        valueTransparentLeaves(c).some(
          (a) => ts.isStringLiteralLike(a) || ts.isTemplateExpression(a),
        ),
      );
      if (timerName !== null && isStringArg) {
        const start = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(start);
        const lineText = content.split("\n")[line]?.trim().slice(0, 80) ?? "";
        violations.push({
          file: relPath,
          rule: "no-dynamic-eval-sink",
          line: line + 1,
          detail: `\`${timerName}(<string>, …)\` — el 1er-arg string es eval implícito del navegador; en Node/Edge lanza TypeError (string-handler no soportado) → crash SSR: ${lineText}`,
        });
      }
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
      // MIEMBRO SEGURO de una raíz DENEGADA a través de WRAPPER: `process` está denegado bare pero
      // `process.env` lo expone Edge. La rama (c) lo exime cuando `process.env` es DIRECTO (root = Identifier),
      // pero un wrapper erased/value-transparent (`(process as any).env`, `(process).env`, `(0,process).env`)
      // rompe esa rama y el `process` interno cae aquí como bare = FP (codex P2). Trato uniforme con
      // import.meta.env (que resuelve el wrapper por valueSurvivalLeaves): ascender por los wrappers hasta el
      // member-access y eximir SOLO si el miembro ∈ SAFE_MEMBERS_OF_DENIED_ROOT. `(process as any).cwd` (no
      // seguro) / `process` bare-sin-miembro siguen flaggeando.
      const denialSafe = SAFE_MEMBERS_OF_DENIED_ROOT[api];
      let safeMemberOfDeniedRoot = false;
      if (denialSafe) {
        const acc = wrapperEnclosingMemberAccess(node);
        if (acc) {
          const mems = accessedMemberNames(acc);
          safeMemberOfDeniedRoot =
            mems.length > 0 && mems.every((mm) => denialSafe.has(mm));
        }
      }
      if ((isUnsafeGlobal || isEvalSink) && !safeMemberOfDeniedRoot) {
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

    // Declaradores LEFT-TO-RIGHT: en `const a = {x:1}, b = a.x`, el read de `a` en el 2º declarador
    // resuelve al 1º (ya inicializado en orden de evaluación). Visitar el statement entero ANTES de
    // bindear hacía ver `a` como global no-bound = FP (codex P2). Bindea cada declarador antes del
    // siguiente; el binding queda LOCAL al recorrido (la per-stmt loop sigue añadiéndolos al scope
    // que se propaga a los statements posteriores).
    if (ts.isVariableDeclarationList(node)) {
      let declCtx = context;
      for (const decl of node.declarations) {
        visit(decl, declCtx);
        const declNames = new Set();
        addBindingNamesFromPattern(decl.name, declNames);
        if (declNames.size > 0) declCtx = addToScope(declCtx, declNames);
        // Enrolar el alias del declarador para que el SIGUIENTE initializer del mismo statement lo
        // reconozca (`const later = setTimeout, id = later("código")`) — codex P2.
        declCtx = addTimerAliases(declCtx, decl);
        declCtx = addPartialAliases(declCtx, decl);
      }
      return;
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
      const lexShadows = gatherNonReactLexicalShadows(statements, current);
      if (lexShadows.size > 0) {
        current = {
          ...current,
          nonImportBindings: new Set([...current.nonImportBindings, ...lexShadows]),
        };
      }
    }
    for (const stmt of statements) {
      visit(stmt, current);
      const { all, nonImport } = extractPostStatementBindings(stmt, current);
      current = addToScope(current, all, nonImport);
      // Purga de nonImportBindings los nombres que este stmt redeclara como alias react
      // (sombra léxica de un sync homónimo del scope externo) → no se flaggean como shadow.
      current = purgeNonImportReactAliases(current, stmt);
      // Aliases react SCOPE-AWARE declarados por este statement (`const { useEffect } =
      // React`, `import R = React`, …). Acumulados en el context del scope actual — no
      // filtran a hermanos. DESPUÉS de addToScope para que el shadow check use el
      // nonImportBindings ya actualizado. Resuelve los NESTED [6]/[9]/[10] sin reabrir
      // el bypass file-global de codex P1.
      current = addReactAliases(current, stmt);
      // Alias de timer global SCOPE-AWARE (`const later = setTimeout`) → los statements
      // POSTERIORES reconocen `later("código")` como string-timer eval-sink (codex P2).
      current = addTimerAliases(current, stmt);
      // Alias de root parcial-safe (`const WA = WebAssembly`) → reconocer `WA.compile()` (codex P2).
      current = addPartialAliases(current, stmt);
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
  // Taint de namespace react por MEMBER-WRITE (codex P1 b35a87c + #4). Un default import es el
  // objeto export MUTABLE (no el Module Namespace read-only) → `React.useEffect = sync` lo vuelve
  // síncrono = BYPASS. El objeto es COMPARTIDO entre todos sus aliases (`const A = React`), así que
  // un write a CUALQUIER miembro de la familia contamina a TODA (codex P1 #4: taint debe propagar
  // por aliases, no solo el root sintáctico del write). Si la familia está mutada, se taintea
  // entera; sin write, no se taintea nada (0-FP del caso común `React.useEffect(cb)`).
  const memberWriteRoots = gatherMutatedNamespaceRoots(sourceFile);
  const reactNsFamily = gatherReactNamespaceFamily(sourceFile);
  const familyMutated = [...reactNsFamily].some((n) => memberWriteRoots.has(n));
  const mutatedNamespaceRoots = familyMutated ? reactNsFamily : new Set();
  const reactImports = gatherReactImports(sourceFile, mutatedNamespaceRoots);
  const baseContext = {
    activeGuards: new Set(),
    blockEntryGuards: new Set(),
    guardAliases: new Map(),
    isInClientOnlyDeferredBody: false,
    isInFunctionBody: false,
    localBindings: moduleAll,
    nonImportBindings: moduleNonImports,
    reactImports,
    // Aliases react SCOPE-AWARE acumulados posicionalmente durante el walk
    // (NO file-global): `const { useEffect } = React`, `const ue = React.useEffect`,
    // `const useEffect = reactUseEffect`, `import R = React`. Viven solo en el scope
    // donde se declaran (function/namespace body) — un alias nested NO filtra a scopes
    // hermanos, evitando el bypass file-global que codex P1 rechazó. Complementan
    // `reactImports` (top-level file-global) para reconocer destructure/alias NESTED.
    scopeReactNs: new Set(),
    scopeReactNamed: new Map(),
    mutatedNamespaceRoots,
    // Alias de timer global acumulados SCOPE-AWARE durante el walk (no file-level) — codex P2.
    scopeTimerAliases: new Set(),
    // Alias de root parcial-safe (`const WA = WebAssembly`) → rootName, scope-aware — codex P2.
    scopePartialAliases: new Map(),
    // Para los helpers de alias (exprPartialRoot): forward value-read module-level.
    moduleDeclaredNames,
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
  SAFE_PARTIAL_MEMBERS,
  PARTIAL_SAFE_GLOBAL_MEMBERS,
  CONSTRUCTION_DENIED_MEMBERS,
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
    scriptKindForPath(relPath),
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
        scriptKindForPath(relPath),
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
    const relPath = relative(repoRoot, file).split(pathSep).join("/");
    if (!isAuditableExt(file)) {
      // @server-safe en un archivo JS no auditable → fail-loud (el gate solo audita .ts/.tsx).
      // codex P2: antes el discovery ni lo veía; ahora se descubre y se reporta en vez de ignorar.
      allViolations.push({
        rule: "server-safe-marker",
        file: relPath,
        detail: `marca @server-safe en un archivo NO auditable: el gate solo audita .ts/.tsx con runtime (un .d.ts es type-only sin runtime; JS-family no se modela: require()/CJS y parser JS). Marca la implementación .ts/.tsx.`,
      });
      continue;
    }
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
