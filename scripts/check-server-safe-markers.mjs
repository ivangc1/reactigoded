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
 *   2. **No accesos DOM en render path**: `document.X`, `window.X`,
 *      `navigator.X`, `process.X`, `Buffer.X`, `globalThis.X` (cualquier
 *      forma — `.foo`, `?.foo`, `["foo"]`, `?.["foo"]`) deben aparecer
 *      SOLO en uno de estos contextos:
 *
 *      (a) Bajo guard `typeof X !== "undefined"` ACTIVO según scope
 *          (positive typeof, dentro del then-branch del if).
 *      (b) Dentro del body de una función pasada a un sink de ejecución
 *          diferida reconocido: JSX event handler (`onClick`,
 *          `onChange`, etc), hook de React diferido (`useEffect`,
 *          `useLayoutEffect`, `useInsertionEffect`, `useCallback`,
 *          `useImperativeHandle`), o timer (`setTimeout`,
 *          `setInterval`, `setImmediate`, `queueMicrotask`,
 *          `requestAnimationFrame`, `requestIdleCallback`,
 *          `startTransition`).
 *
 *          NOT incluido en (b): `useMemo` / `useState` lazy init /
 *          `useRef` lazy init (corren durante render server), helpers
 *          nested (`function readEnv() { return window.x; }` invocada
 *          desde JSX corre durante render), IIFE (`(() => x)()`),
 *          y referencias indirectas (`const h = () => ...; <X
 *          onClick={h}>` — el body del arrow no queda en posición
 *          sintáctica reconocida; el consumer debe inline-ar o
 *          envolver en `useCallback`).
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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const COMPONENTS_DIR = resolve(repoRoot, "src/components");
const HOOKS_DIR = resolve(repoRoot, "src/hooks");

const CLIENT_GLOBALS = new Set([
  "document",
  "window",
  "navigator",
  "process",
  "Buffer",
  "globalThis",
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
//
// EXCLUIDO intencionalmente:
//   - `startTransition`: NO es un timer. React invoca la `action`
//     SÍNCRONAMENTE en el call site — el "diferimiento" se aplica a
//     la prioridad del state update, no a la ejecución de la función.
//     `startTransition(() => window.foo)` ejecuta `window.foo` durante
//     render, lanza ReferenceError en SSR. Codex round 11 P1 cazó este
//     bypass cuando intentamos exempt-earlo aquí.
const DEFERRED_LATER_FNS = new Set([
  "setTimeout",
  "setInterval",
  "setImmediate",
  "queueMicrotask",
  "requestAnimationFrame",
  "requestIdleCallback",
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
function isDeferredExecutionContext(fnNode) {
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

  // (1) JSX event handler: <X onFoo={fn}>
  if (ts.isJsxAttribute(parent)) {
    const name = parent.name;
    if (ts.isIdentifier(name) && /^on[A-Z]/.test(name.text)) return true;
  }

  // (2) Argumento de CallExpression a sink reconocido.
  if (ts.isCallExpression(parent)) {
    // Si current es el callee mismo (IIFE), no es deferred.
    if (parent.expression === current) return false;
    // Verificar que current esté en la lista de arguments.
    const isArg = parent.arguments.some((a) => a === current);
    if (!isArg) return false;
    const callee = parent.expression;
    let calleeName = null;
    if (ts.isIdentifier(callee)) {
      calleeName = callee.text;
    } else if (ts.isPropertyAccessExpression(callee)) {
      // Soporte para `React.useEffect`, `window.setTimeout`, etc.
      // (Nota: `window.setTimeout` por sí mismo sería otra violación si
      // está en render path, capturada por el check de access bare.)
      if (ts.isIdentifier(callee.name)) calleeName = callee.name.text;
    }
    if (calleeName !== null) {
      if (DEFERRED_HOOKS.has(calleeName)) return true;
      if (DEFERRED_LATER_FNS.has(calleeName)) return true;
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
    ts.isConstructorDeclaration(node)
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
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
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
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
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
        addBindingNamesFromPattern(decl.name, names);
      }
    }
  } else if (ts.isClassDeclaration(stmt) && stmt.name) {
    names.add(stmt.name.text);
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
 */
function gatherModulePreloadedBindings(sourceFile) {
  const names = new Set();
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      const importClause = stmt.importClause;
      if (importClause) {
        if (importClause.name) names.add(importClause.name.text);
        const namedBindings = importClause.namedBindings;
        if (namedBindings) {
          if (ts.isNamespaceImport(namedBindings)) {
            names.add(namedBindings.name.text);
          } else if (ts.isNamedImports(namedBindings)) {
            for (const spec of namedBindings.elements) {
              names.add(spec.name.text);
            }
          }
        }
      }
      continue;
    }
    collectVarHoistedRecursive(stmt, names);
  }
  return names;
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
    if (!CLIENT_GLOBALS.has(operand.text)) continue;
    if (!ts.isStringLiteral(stringExpr)) continue;
    if (stringExpr.text !== "undefined") continue;
    return operand.text;
  }
  return null;
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
function isNonReferencePosition(node) {
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
      ts.isLabeledStatement(parent) ||
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

  // 9. JSX tag name: `<window />`, `<Buffer />`. Lowercase = string
  //    literal HTML element (no ref). Uppercase ES ref a binding,
  //    pero el caso es extremadamente raro y skip pragmático.
  if (
    (ts.isJsxOpeningElement(parent) ||
      ts.isJsxClosingElement(parent) ||
      ts.isJsxSelfClosingElement(parent)) &&
    parent.tagName === node
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
// El walker solo chequea PropertyAccessExpression y
// ElementAccessExpression — no chequea reads de Identifier bare —
// así que `typeof window` solo (sin acceso) ni se detecta ni se
// flagea, que es el comportamiento correcto.

/**
 * Analiza un source file. Devuelve array de violations.
 */
function checkSourceFile(content, relPath) {
  const violations = [];

  const sourceFile = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

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
      const isDeferred = isDeferredExecutionContext(node);
      const fnScopeBindings = gatherFunctionVarHoisted(node);
      // Acumular con outer scope para que closures vean los bindings
      // del enclosing function (parámetros + var hoisted).
      const localBindings =
        fnScopeBindings.size === 0
          ? context.localBindings
          : new Set([...context.localBindings, ...fnScopeBindings]);
      const bodyContext = {
        ...context,
        isInDeferredBody: context.isInDeferredBody || isDeferred,
        localBindings,
      };
      ts.forEachChild(node, (child) => visit(child, bodyContext));
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
          if (ts.isFunctionDeclaration(stmt) && stmt.name) {
            blockFns.add(stmt.name.text);
          }
        }
      }
      let current =
        blockFns.size > 0
          ? {
              ...context,
              localBindings: new Set([...context.localBindings, ...blockFns]),
            }
          : context;
      for (const clause of node.clauses) {
        if (ts.isCaseClause(clause) && clause.expression) {
          visit(clause.expression, current);
        }
        for (const stmt of clause.statements) {
          visit(stmt, current);
          const additions = extractPostStatementBindings(stmt);
          if (additions.size > 0) {
            current = {
              ...current,
              localBindings: new Set([
                ...current.localBindings,
                ...additions,
              ]),
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
        const bodyContext = {
          ...context,
          localBindings: new Set([
            ...context.localBindings,
            ...catchBindings,
          ]),
        };
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
            const bodyContext = {
              ...context,
              localBindings: new Set([
                ...context.localBindings,
                ...forBindings,
              ]),
            };
            ts.forEachChild(node, (child) => visit(child, bodyContext));
            return;
          }
        }
      }
    }

    // (c) Detectar acceso a client global. Cubre:
    //   - PropertyAccessExpression (`x.y`, `x?.y`)
    //   - ElementAccessExpression (`x[y]`, `x?.[y]`)
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const expr = node.expression;
      if (ts.isIdentifier(expr) && CLIENT_GLOBALS.has(expr.text)) {
        const api = expr.text;
        // Si el binding está shadow-eado por una local (parameter, var,
        // import, etc.), NO es ref al global — skip.
        if (!context.localBindings.has(api) && !context.isInDeferredBody) {
          if (!context.activeGuards.has(api)) {
            const start = node.getStart(sourceFile);
            const { line } = sourceFile.getLineAndCharacterOfPosition(start);
            const lineText =
              content.split("\n")[line]?.trim().slice(0, 80) ?? "";
            violations.push({
              file: relPath,
              rule: "no-bare-dom-access",
              line: line + 1,
              detail: `acceso bare a \`${api}\` sin guard typeof activo: ${lineText}`,
            });
          }
        }
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
    if (ts.isIdentifier(node) && CLIENT_GLOBALS.has(node.text)) {
      const api = node.text;
      if (
        !context.localBindings.has(api) &&
        !isNonReferencePosition(node)
      ) {
        if (!context.isInDeferredBody && !context.activeGuards.has(api)) {
          const start = node.getStart(sourceFile);
          const { line } = sourceFile.getLineAndCharacterOfPosition(start);
          const lineText =
            content.split("\n")[line]?.trim().slice(0, 80) ?? "";
          violations.push({
            file: relPath,
            rule: "no-bare-dom-access",
            line: line + 1,
            detail: `referencia bare al binding \`${api}\` sin guard typeof activo: ${lineText}`,
          });
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
    let current =
      preloadedFns && preloadedFns.size > 0
        ? {
            ...context,
            localBindings: new Set([
              ...context.localBindings,
              ...preloadedFns,
            ]),
          }
        : context;
    for (const stmt of statements) {
      visit(stmt, current);
      const additions = extractPostStatementBindings(stmt);
      if (additions.size > 0) {
        current = {
          ...current,
          localBindings: new Set([...current.localBindings, ...additions]),
        };
      }
    }
  }

  // Initial scope: imports + var hoisted (module-preloaded).
  const modulePreloaded = gatherModulePreloadedBindings(sourceFile);
  const sourceFileFns = gatherSourceFileFunctionDeclarations(sourceFile);
  const baseContext = {
    activeGuards: new Set(),
    isInDeferredBody: false,
    localBindings: modulePreloaded,
  };
  // Iterate top-level statements with function pre-load + order-aware
  // let/const/class accumulation.
  visitOrderedStatements(sourceFile.statements, baseContext, sourceFileFns);
  return violations;
}

// ─── Main ──────────────────────────────────────────────────────

const allFiles = [
  ...listSourceFiles(COMPONENTS_DIR),
  ...listSourceFiles(HOOKS_DIR),
];

const markedFiles = allFiles.filter((f) =>
  readFileSync(f, "utf8").includes("@server-safe"),
);

const allViolations = [];
for (const file of markedFiles) {
  const content = readFileSync(file, "utf8");
  const relPath = relative(repoRoot, file);
  allViolations.push(...checkSourceFile(content, relPath));
}

if (allViolations.length === 0) {
  console.log(
    `✓ @server-safe invariant holds (${String(markedFiles.length)} files marked, 0 violations) [AST]`,
  );
  process.exit(0);
}

console.error(
  `\n${String(allViolations.length)} @server-safe violation(s) detected:\n`,
);
for (const v of allViolations) {
  const loc = v.line !== undefined ? `:${String(v.line)}` : "";
  console.error(`  [${v.rule}] ${v.file}${loc}`);
  console.error(`    ${v.detail}`);
}
console.error(
  `\nFix options:\n` +
    `  - Remove @server-safe marker if the component genuinely needs client APIs.\n` +
    `  - Guard the access with \`typeof X !== "undefined"\` if it's truly conditional.\n` +
    `  - Move the access inside useEffect/event handler (no render side-effect).\n`,
);
process.exit(1);
