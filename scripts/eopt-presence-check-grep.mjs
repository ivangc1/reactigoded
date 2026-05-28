#!/usr/bin/env node
/**
 * EOPT presence-check grep — paso 1.7 #155.
 *
 * Caza TODAS las formas de presence-check / control-mode-detection que
 * mi `eopt-classify.mjs` puede haber dejado fuera. El hallazgo de
 * `Dialog.onClose` reveló que el detector solo capturaba `"X" in props`
 * literal, y se perdió la forma `props.X === undefined`.
 *
 * Patrones que busca (7 formas):
 *   1. `props.X === undefined` / `props.X !== undefined`
 *   2. `X === undefined` / `X !== undefined` post-destructure
 *   3. `"X" in props`
 *   4. `props.X == null` / `props.X != null`
 *   5. `X ?? defaultValue` (fallback que cambia comportamiento)
 *   6. `typeof X === "undefined"` / `typeof X !== "undefined"`
 *   7. `X !== undefined ? ... : ...` ternarios
 *
 * Para cada hit, comprueba si la prop X está en CLASE 2 (set fijo del
 * classifier ampliado con `onClose`). Si no, FLAG y reportar para
 * decisión.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (
      (p.endsWith(".tsx") || p.endsWith(".ts")) &&
      !p.endsWith(".test.tsx") &&
      !p.endsWith(".test.ts") &&
      !p.endsWith(".stories.tsx")
    )
      out.push(p);
  }
  return out;
}

// CLASE 2 set (36 props): triada controlled × 12 componentes + Dialog.onClose.
// Nombres únicos (sin duplicados, los duplicados vienen del classifier por
// componente):
const CLASE_2_PROP_NAMES = new Set([
  // Triada genérica
  "value", "defaultValue", "onValueChange",
  // Open/close (Alert, Dialog, Menu)
  "open", "defaultOpen", "onOpenChange", "onClose",
  // Checked
  "checked",
  // Page (Pagination)
  "page", "defaultPage", "onPageChange",
  // Collapsed (Sidebar)
  "collapsed", "defaultCollapsed", "onCollapsedChange",
  // Active (Stepper)
  "active", "defaultActive", "onActiveChange",
  // Theme (ThemeToggle)
  "theme", "defaultTheme", "onThemeChange",
  // Rating extra
  "readOnly",
]);

// Identifiers que pueden parecer props pero son hooks/state/locals
// comunes. Se excluyen del flag.
const NON_PROP_IDENTS = new Set([
  "isControlled",
  "isControlledRef",
  "controlledValue",
  "controlledNum",
  "internalValue",
  "internal",
  "stored",
  "override",
  "previousValue",
  "prevValue",
  "current",
  "ref",
  // Comparators contra primitives / no-prop contexts.
  "null", "true", "false", "0", "1", "''", "\"\"",
  "node", "event", "e",
  "container",
  "child",
  "children",
]);

const files = walk("src/components");
const findings = []; // { file, line, pattern, propName, raw }

for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  const sourceFile = ts.createSourceFile(
    f,
    content,
    ts.ScriptTarget.Latest,
    true,
    f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function getLine(node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }
  function recordHit(node, pattern, propName) {
    if (NON_PROP_IDENTS.has(propName)) return;
    findings.push({
      file: path.relative(".", f),
      line: getLine(node),
      pattern,
      propName,
      raw: node.getText(sourceFile).slice(0, 80),
    });
  }

  function visit(node) {
    // 1+2+4: BinaryExpression con === / !== / == / != contra undefined o null.
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const isEqOp =
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken;
      if (isEqOp) {
        const left = node.left;
        const right = node.right;
        // Verificar si uno de los lados es `undefined` o `null`.
        function isNullishLiteral(n) {
          return (
            (ts.isIdentifier(n) && n.text === "undefined") ||
            n.kind === ts.SyntaxKind.NullKeyword
          );
        }
        if (isNullishLiteral(right) || isNullishLiteral(left)) {
          const operand = isNullishLiteral(right) ? left : right;
          // Pattern 1/4: props.X
          if (
            ts.isPropertyAccessExpression(operand) &&
            ts.isIdentifier(operand.expression) &&
            operand.expression.text === "props" &&
            ts.isIdentifier(operand.name)
          ) {
            recordHit(node, "props.X cmp", operand.name.text);
          }
          // Pattern 2: bare identifier (post-destructure)
          else if (ts.isIdentifier(operand)) {
            recordHit(node, "X cmp undefined/null", operand.text);
          }
        }
      }

      // 3: BinaryExpression con InKeyword: `"X" in props`
      if (
        node.operatorToken.kind === ts.SyntaxKind.InKeyword &&
        ts.isStringLiteral(node.left)
      ) {
        recordHit(node, '"X" in props', node.left.text);
      }
    }

    // 6: typeof X === "undefined"
    if (ts.isTypeOfExpression(node)) {
      // Solo si el padre es un binary con === / !== contra "undefined" string.
      if (
        node.parent &&
        ts.isBinaryExpression(node.parent) &&
        (node.parent.operatorToken.kind ===
          ts.SyntaxKind.EqualsEqualsEqualsToken ||
          node.parent.operatorToken.kind ===
            ts.SyntaxKind.ExclamationEqualsEqualsToken)
      ) {
        const otherSide =
          node.parent.left === node ? node.parent.right : node.parent.left;
        if (
          ts.isStringLiteral(otherSide) &&
          otherSide.text === "undefined" &&
          ts.isIdentifier(node.expression)
        ) {
          recordHit(node, "typeof X === undefined", node.expression.text);
        }
      }
    }

    // 5: NullishCoalescing `X ?? default`
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    ) {
      const left = node.left;
      // Pattern: props.X ?? d
      if (
        ts.isPropertyAccessExpression(left) &&
        ts.isIdentifier(left.expression) &&
        left.expression.text === "props" &&
        ts.isIdentifier(left.name)
      ) {
        recordHit(node, "props.X ?? default", left.name.text);
      }
      // Pattern: X ?? d (post-destructure)
      else if (ts.isIdentifier(left)) {
        recordHit(node, "X ?? default", left.text);
      }
    }

    // 7: Ternary X !== undefined ? ... : ... (ya capturado en el binary
    // operator de arriba; el ternario es solo el contexto).

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

// Reduce findings to unique propNames in scope (filter NON_PROP_IDENTS
// once more, dedupe).
const propsFoundByPattern = {};
for (const f of findings) {
  if (!propsFoundByPattern[f.propName]) {
    propsFoundByPattern[f.propName] = [];
  }
  propsFoundByPattern[f.propName].push(f);
}

const candidatePropsAll = new Set(Object.keys(propsFoundByPattern));
const notInClase2 = [...candidatePropsAll].filter(
  (n) => !CLASE_2_PROP_NAMES.has(n),
);

console.log("=== EOPT presence-check grep (cierre completo) ===");
console.log("");
console.log(`Files analizados: ${files.length}`);
console.log(`Unique prop identifiers detectados en patrones de presence-check: ${candidatePropsAll.size}`);
console.log(`Identifiers ya en CLASE 2: ${candidatePropsAll.size - notInClase2.length}`);
console.log(`Identifiers NO en CLASE 2 (candidatos a inspección): ${notInClase2.length}`);
console.log("");

console.log("=== Identifiers NO en CLASE 2 (revisión requerida) ===");
for (const propName of notInClase2.sort()) {
  console.log(`\n  ▌ ${propName}  (${propsFoundByPattern[propName].length} hits)`);
  // Print first 3 hits as samples.
  for (const hit of propsFoundByPattern[propName].slice(0, 3)) {
    console.log(`     ${hit.file}:${hit.line}  [${hit.pattern}]`);
    console.log(`       ${hit.raw}`);
  }
}
