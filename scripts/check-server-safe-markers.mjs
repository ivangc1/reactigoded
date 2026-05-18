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
 *      (b) Dentro del body de una función — arrow, function expression,
 *          method declaration. Esto cubre callbacks (`onClick`,
 *          `onChange`), event handlers, y bodies de `useEffect` /
 *          `useCallback` / `useMemo`. Justificación: estos cuerpos NO
 *          corren en render server.
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
 *   9. (este round) `typeof window.foo` ancestor check exempt-eaba
 *      el property access — pero `typeof` solo suprime ReferenceError
 *      sobre identificadores bare, NO sobre property accesses
 *      descendientes.
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

  // Rule 1: no "use client" directive coexisting con @server-safe.
  if (/^["']use client["'];?\s*$/m.test(content)) {
    violations.push({
      file: relPath,
      rule: "no-use-client",
      detail: '@server-safe contradice "use client" en el mismo archivo',
    });
  }

  const sourceFile = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  // Walk AST con contexto:
  //   functionDepth: número de funciones anidadas (0 = file root,
  //                  1 = body de top-level fn = render path,
  //                  2+ = callback/handler/effect anidado).
  //   activeGuards: Set<api> guards activos por scope de typeof.
  //
  // Razón del depth: en React, el body de un component function
  // (depth 1) ES el render path. Bodies DENTRO del component
  // (`onClick={() => ...}`, `useEffect(() => ...)`) viven en depth 2+
  // y NO corren en render server. Flag solo accesos en depth <= 1.
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

    // (b) Entrar en función/arrow/method: incrementa depth. Solo
    // accesos en depth >= 2 quedan exemptos como "callback body".
    if (
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      const bodyContext = {
        ...context,
        functionDepth: context.functionDepth + 1,
      };
      ts.forEachChild(node, (child) => visit(child, bodyContext));
      return;
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
        if (context.functionDepth <= 1) {
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

    ts.forEachChild(node, (child) => visit(child, context));
  }

  visit(sourceFile, { activeGuards: new Set(), functionDepth: 0 });
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
