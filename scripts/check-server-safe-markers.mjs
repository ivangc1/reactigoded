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
    (name) => !INTENTIONAL_DENY.has(name) && !GLOBALS_OVERCLAIMS.has(name),
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
//   - `eval`/`Function`/`globalThis`/`global`: sinks de eval / raíz de escape,
//     SIEMPRE presentes en Node → el guard es vacuamente true y solo
//     suprimiría la detección. (Codex P1 round 3.)
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
  "setImmediate",
  "clearImmediate",
]);

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
 * Devuelve `true` si `fnNode` (ArrowFunction / FunctionExpression /
 * FunctionDeclaration / Method / Accessor / Constructor) está
 * sintácticamente colocado como argumento de un sink de ejecución
 * diferida reconocido — su body NO se invoca durante el render server.
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
  while (
    parent &&
    (ts.isParenthesizedExpression(parent) || ts.isJsxExpression(parent))
  ) {
    current = parent;
    parent = parent.parent;
  }
  if (!parent) return false;

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
          const first = tagName.text.charAt(0);
          if (first && first === first.toLowerCase()) {
            return true;
          }
        }
      }
    }
  }

  // (2) Argumento de CallExpression a sink reconocido.
  if (ts.isCallExpression(parent)) {
    if (parent.expression === current) return false;
    const isArg = parent.arguments.some((a) => a === current);
    if (!isArg) return false;
    const callee = parent.expression;
    let calleeName = null;
    let rootIdent = null;
    if (ts.isIdentifier(callee)) {
      calleeName = callee.text;
      rootIdent = callee.text;
    } else if (ts.isPropertyAccessExpression(callee)) {
      // Soporte para `React.useEffect`, `window.setTimeout`, etc.
      // (Nota: `window.setTimeout` por sí mismo sería otra violación si
      // está en render path, capturada por el check de access bare.)
      if (ts.isIdentifier(callee.name)) calleeName = callee.name.text;
      // Encontrar el root identifier de la cadena para chequear shadow.
      let chain = callee.expression;
      while (ts.isPropertyAccessExpression(chain)) {
        chain = chain.expression;
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
        return false;
      }
      if (DEFERRED_HOOKS.has(calleeName)) {
        // Codex round 17 P1.1: solo exempt si el binding viene
        // específicamente de `"react"`. `import { useEffect } from
        // "./fake-helper"` con synchronous impl NO debe exempt-ear.
        // El check usa root del callee chain — cubre tanto `useEffect`
        // bare como `React.useEffect` (`React` debe venir de "react").
        if (rootIdent !== null && context.reactImports.has(rootIdent)) {
          return true;
        }
        return false;
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
          return false;
        }
        return true;
      }
    }
  }

  return false;
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
 * ¿Un `namespace`/`module` está INSTANCIADO? — i.e. ¿emite un binding runtime
 * `var N`(IIFE)? Si lo está, su nombre ES una sombra runtime legítima; si se
 * elide (`namespace navigator {}`), una ref bare a `navigator` resuelve al global
 * real → debe flaggearse, no sombrearse.
 *
 *   namespace N {}                          → ELIDED  (vacío)
 *   namespace N { export interface I {} }   → ELIDED  (solo tipos)
 *   namespace N { export const x = 1 }      → EMITE   var N;(IIFE)
 *   namespace N { export declare const x }  → EMITE   var N;(IIFE)  ← clave
 *
 * Usamos `ts.isInstantiatedModule`, la semántica de emit AUTORITATIVA de TS, en
 * vez de un whitelist hand-rolled de miembros de valor. La versión previa omitía
 * los value-members AMBIENT (`export declare const/function/class`), que SÍ
 * instancian el namespace (emiten el shell) → FP sobre un patrón typed-config
 * legítimo (re-hunt). preserveConstEnums=false: el proyecto no lo activa
 * (tsconfig) — coincide con el primer emit del build (tsc). beta.27 BLOCKER-1.
 */
function namespaceIsInstantiated(moduleDecl) {
  return ts.isInstantiatedModule(moduleDecl, false);
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
 * `var` declarations: hoisted al function/module scope. Recurre a
 * través de blocks anidados, if/else, try/catch, for/while bodies,
 * switch — pero NO en nested function-likes (otro scope).
 *
 * NO incluye `function` declarations: en strict ESM (todos los .ts/.tsx
 * de un DS) son block-scoped, NO function-hoisted. Codex round 13 P1.1.
 *
 * NO incluye `let`/`const`/`class`: block-scoped y order-aware (TDZ).
 * Codex round 13 P1.2.
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
    const blockScoped =
      (flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
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
function extractPostStatementBindings(stmt) {
  const names = new Set();
  if (ts.isVariableStatement(stmt)) {
    const flags = stmt.declarationList.flags;
    const blockScoped =
      (flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
    if (blockScoped) {
      for (const decl of stmt.declarationList.declarations) {
        if (isAmbientDeclaration(decl)) continue; // declare const/let → erased
        addBindingNamesFromPattern(decl.name, names);
      }
    }
  } else if (
    (ts.isClassDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt) ||
      ts.isModuleDeclaration(stmt)) &&
    stmt.name &&
    ts.isIdentifier(stmt.name) &&
    // `class`/`enum` emiten binding; `namespace` SOLO si está instanciado (≥1
    // miembro de valor). Un namespace type-only/vacío se elide → NO sombra: si
    // se añadiera, `navigator.x` con `namespace navigator {}` pasaría como
    // local. `producesRuntimeValue` cierra la CLASE (fail-closed, no denylist).
    // beta.27 BLOCKER-1 (erased-shadow #3: type-only import → declare → ns).
    producesRuntimeValue(stmt)
  ) {
    names.add(stmt.name.text);
  }
  return names;
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

function gatherReactImports(sourceFile) {
  const names = new Set();
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== "react") continue;
    addRuntimeImportBindings(stmt.importClause, names);
  }
  return names;
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
    // `import X = NS.Y` / `import X = require("y")` (TS import-equals): si no es
    // type-only, emite un binding runtime `X`. beta.27 BLOCKER-1.
    if (ts.isImportEqualsDeclaration(stmt) && !stmt.isTypeOnly) {
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
 * Si la expresión es `typeof <ident> !== "undefined"` (o `!=`), donde
 * `<ident>` es un client global, devuelve el nombre. Si no, null.
 */
function extractPositiveTypeofGuard(expr) {
  if (!ts.isBinaryExpression(expr)) return null;
  const op = expr.operatorToken.kind;
  // Solo formas positivas: !== y !=. El negativo (=== / ==) NO es guard.
  if (
    op !== ts.SyntaxKind.ExclamationEqualsEqualsToken &&
    op !== ts.SyntaxKind.ExclamationEqualsToken
  ) {
    return null;
  }
  // Permitir orden: `typeof X !== "undefined"` O `"undefined" !== typeof X`.
  const candidates = [
    { typeofExpr: expr.left, stringExpr: expr.right },
    { typeofExpr: expr.right, stringExpr: expr.left },
  ];
  for (const { typeofExpr, stringExpr } of candidates) {
    if (!ts.isTypeOfExpression(typeofExpr)) continue;
    const operand = typeofExpr.expression;
    if (!ts.isIdentifier(operand)) continue;
    // fail-closed: el guard `typeof X !== "undefined"` es significativo
    // para cualquier global NO-seguro. Los SAFE nunca se flaggean, así que
    // reconocer el guard sobre ellos es irrelevante — skip.
    if (SAFE_GLOBALS.has(operand.text)) continue;
    // …pero un guard NO se reconoce para los sinks de eval/escape
    // (`eval`/`Function`/`globalThis`/`global`): están siempre presentes en
    // Node, el guard es siempre true y NO hace el body safe — reconocerlo
    // suprimiría la detección eval-sink/escape. Codex P1 round 3.
    if (NON_ABSENCE_DENIALS.has(operand.text)) continue;
    if (!ts.isStringLiteral(stringExpr)) continue;
    if (stringExpr.text !== "undefined") continue;
    return operand.text;
  }
  return null;
}

/**
 * Como `extractPositiveTypeofGuard` pero para la forma NEGATIVA
 * `typeof X === "undefined"` (=== / ==). Devuelve el nombre o null. Usado
 * para el narrowing por early-return (abajo).
 */
function extractNegativeTypeofGuard(expr) {
  if (!ts.isBinaryExpression(expr)) return null;
  const op = expr.operatorToken.kind;
  if (
    op !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
    op !== ts.SyntaxKind.EqualsEqualsToken
  ) {
    return null;
  }
  const candidates = [
    { typeofExpr: expr.left, stringExpr: expr.right },
    { typeofExpr: expr.right, stringExpr: expr.left },
  ];
  for (const { typeofExpr, stringExpr } of candidates) {
    if (!ts.isTypeOfExpression(typeofExpr)) continue;
    const operand = typeofExpr.expression;
    if (!ts.isIdentifier(operand)) continue;
    if (SAFE_GLOBALS.has(operand.text)) continue;
    if (NON_ABSENCE_DENIALS.has(operand.text)) continue;
    if (!ts.isStringLiteral(stringExpr)) continue;
    if (stringExpr.text !== "undefined") continue;
    return operand.text;
  }
  return null;
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
  return false;
}

/**
 * Narrowing por EARLY-RETURN: `if (typeof X === "undefined") return null;`
 * (sin else, then-branch que sale abrupto) implica que TRAS el `if`, X existe
 * → acceso a X es safe en los statements posteriores del mismo bloque. Es el
 * idioma React/SSR dominante (equivalente al narrowing de TS/ESLint). Devuelve
 * el nombre guardado o null. beta.27 BLOCKER-1 (workflow honest-construct).
 */
function extractNegativeEarlyReturnGuard(stmt) {
  if (!ts.isIfStatement(stmt) || stmt.elseStatement) return null;
  const name = extractNegativeTypeofGuard(stmt.expression);
  if (!name) return null;
  if (!statementAlwaysExits(stmt.thenStatement)) return null;
  return name;
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
    const arg = node.argumentExpression;
    if (arg !== undefined && ts.isStringLiteralLike(arg)) return arg.text;
  }
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

/** Desenvuelve hacia ABAJO todos los wrappers erased: `((x as any)!)` → `x`. */
function skipErasedDown(node) {
  while (node && isErasedOuterExpr(node)) node = node.expression;
  return node;
}

/**
 * El member access `constructor` `node` está "weaponizado" (alcanza+invoca el
 * `Function` constructor). Salta los wrappers ERASED a AMBOS lados (parens, `!`,
 * `as`, `satisfies`, `<T>`): son contiguos y legibles, NO ofuscación —
 * `((x).constructor)()` ≡ `x.constructor!()` ≡ `x.constructor()`, y exigir
 * `node.parent` directo dejaba escapar la forma envuelta (hunt: paren-wrap C;
 * re-hunt: hermanos `!`/`as`/`satisfies`). beta.27 BLOCKER-1.
 */
function isWeaponizedConstructorAccess(node) {
  // (a) doble `x.constructor.constructor` (ES Function, se llame o no) — la base
  //     puede venir envuelta en wrappers erased: `(x.constructor as any).constructor`.
  if (isConstructorMemberAccess(skipErasedDown(node.expression))) return true;
  // Ancestro efectivo saltando wrappers erased hacia ARRIBA; `child` es el nodo
  // (quizá envuelto) que es hijo directo de ese ancestro.
  let child = node;
  let parent = node.parent;
  while (parent && isErasedOuterExpr(parent)) {
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

  // 2. Operand of TypeOfExpression: `typeof window` short-circuita
  //    ReferenceError sobre identifiers bare.
  if (ts.isTypeOfExpression(parent) && parent.expression === node) {
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
    if (inSrc) return { kind: "internal", absPath: resolved };
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
  function addToScope(currentContext, names) {
    if (!names || names.size === 0) return currentContext;
    return {
      ...currentContext,
      localBindings: new Set([...currentContext.localBindings, ...names]),
      nonImportBindings: new Set([
        ...currentContext.nonImportBindings,
        ...names,
      ]),
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
      const guardedApi = extractPositiveTypeofGuard(node.expression);
      if (guardedApi) {
        visit(node.expression, context);
        const thenContext = {
          ...context,
          activeGuards: new Set([...context.activeGuards, guardedApi]),
        };
        if (node.thenStatement) visit(node.thenStatement, thenContext);
        if (node.elseStatement) visit(node.elseStatement, context);
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
      const isDeferred = isDeferredExecutionContext(node, context);
      const fnScopeBindings = gatherFunctionVarHoisted(node);
      // `arguments` es un binding implícito en funciones NO-arrow (no existe
      // en arrows). Inyectarlo evita un falso positivo bajo fail-closed:
      // `arguments` es un keyword contextual runtime-safe, no un global.
      // beta.27 BLOCKER-1 (cruce A+B, FP-hunt).
      if (!ts.isArrowFunction(node)) {
        fnScopeBindings.add("arguments");
      }
      // Acumular con outer scope. Estas bindings son TODAS non-import
      // (parameters + var hoisted dentro del fn body).
      const bodyContext = {
        ...addToScope(context, fnScopeBindings),
        isInDeferredBody: context.isInDeferredBody || isDeferred,
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
        // refleja cuándo se invoca → se resetea (no hereda). Es el único caso
        // genuinamente desacoplado. beta.27 BLOCKER-1 (hunt D + re-hunt: el reset
        // incondicional FP-eaba closures/.map/.reduce, que SÍ son posicionales).
        activeGuards: ts.isFunctionDeclaration(node)
          ? new Set()
          : context.activeGuards,
      };
      ts.forEachChild(node, (child) => visit(child, bodyContext));
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
      let current = addToScope(context, blockFns);
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
        for (const stmt of clause.statements) {
          visit(stmt, clauseCtx);
          const additions = extractPostStatementBindings(stmt);
          current = addToScope(current, additions);
          clauseCtx = addToScope(clauseCtx, additions);
          const negGuard = extractNegativeEarlyReturnGuard(stmt);
          if (negGuard) {
            clauseCtx = {
              ...clauseCtx,
              activeGuards: new Set([...clauseCtx.activeGuards, negGuard]),
            };
          }
        }
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

    // (b.3) For/ForIn/ForOf con initializer let/const: el binding es
    // visible en el initializer (condition/incrementor) y el body del
    // for, no más allá.
    if (
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node)
    ) {
      const init = node.initializer;
      if (init && ts.isVariableDeclarationList(init)) {
        const flags = init.flags;
        const blockScoped =
          (flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
        if (blockScoped) {
          const forBindings = new Set();
          for (const decl of init.declarations) {
            addBindingNamesFromPattern(decl.name, forBindings);
          }
          if (forBindings.size > 0) {
            const bodyContext = addToScope(context, forBindings);
            ts.forEachChild(node, (child) => visit(child, bodyContext));
            return;
          }
        }
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
          if (
            !context.localBindings.has(api) &&
            !context.isInDeferredBody &&
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
      !context.isInDeferredBody &&
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
          !isNonReferencePosition(node, moduleDeclaredNames)
        ) {
          if (!context.isInDeferredBody && !context.activeGuards.has(api)) {
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
    let current = addToScope(context, preloadedFns);
    for (const stmt of statements) {
      visit(stmt, current);
      const additions = extractPostStatementBindings(stmt);
      current = addToScope(current, additions);
      // Narrowing por early-return: tras `if (typeof X === "undefined") return;`
      // X existe en los statements posteriores del bloque → guard activo.
      const negGuard = extractNegativeEarlyReturnGuard(stmt);
      if (negGuard) {
        current = {
          ...current,
          activeGuards: new Set([...current.activeGuards, negGuard]),
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
    isInDeferredBody: false,
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
