#!/usr/bin/env node
/**
 * EOPT verifier #155 paso 1.5 — cierre antes de fiarse de las 272 CLASE 1.
 *
 * Verifica que las 35 props clasificadas CLASE 2 por mi
 * `eopt-classify.mjs` coinciden EXACTAMENTE con las props que
 * realmente alimentan `useControllableState` en los 12 componentes
 * controlados, siguiendo el re-mapping interno:
 *
 *   `<MyComp prop={...}>` (consumer-facing name)
 *      ↓ destructure
 *   `const { prop: propInternal } = props;`
 *      ↓ hook call
 *   `useControllableState({ value: propInternal })`
 *
 * Si una prop alimenta el hook pero NO está en mi CLASE 2 set, la
 * enumeración `CONTROLLED_PROP_NAMES` la dejó fuera y se colaría a
 * CLASE 1 (false positive en el codemod). Esa es la situación que
 * este verifier caza.
 *
 * Strategy:
 *   1. Para cada archivo con `useControllableState`, parsear AST.
 *   2. Detectar destructure patterns en function params + body:
 *      - `function Comp({ a, b: c }: Props)` → c=b, a=a.
 *      - `const { a, b: c } = props;` → idem.
 *   3. Resolver cada identifier RHS pasado al hook contra el map de
 *      aliases. El resultado es el nombre original del prop.
 *   4. Output: lista de props que REALMENTE feed el hook por archivo.
 *   5. Comparar con CLASE 2 del classifier. Match exacto = OK.
 *      Discrepancia = flag para investigar manualmente.
 *
 * @internal Verifier único para #155. Se borra tras cerrar la auditoría
 *   o se promueve a gate permanente junto con `eopt-classify.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(p));
    else if (
      (p.endsWith(".tsx") || p.endsWith(".ts")) &&
      !p.endsWith(".test.tsx") &&
      !p.endsWith(".test.ts") &&
      !p.endsWith(".stories.tsx")
    )
      files.push(p);
  }
  return files;
}

/**
 * Recursivamente recolecta destructure mappings: alias → source.
 * Para `{ a }` → a=a. Para `{ a: b }` → b=a. Para `{ a: { x } }` → x=x
 * (nested no relevantes para nuestros props top-level).
 */
function collectDestructure(bindingPattern, map) {
  if (!ts.isObjectBindingPattern(bindingPattern)) return;
  for (const el of bindingPattern.elements) {
    if (!ts.isBindingElement(el)) continue;
    if (!ts.isIdentifier(el.name)) {
      // Nested object/array binding — recurse but skip alias mapping.
      if (
        ts.isObjectBindingPattern(el.name) ||
        ts.isArrayBindingPattern(el.name)
      ) {
        collectDestructure(el.name, map);
      }
      continue;
    }
    const aliasName = el.name.text;
    // propertyName is set when there's a rename: `{ source: alias }`.
    // If not set, source name === alias name.
    const sourceName =
      el.propertyName && ts.isIdentifier(el.propertyName)
        ? el.propertyName.text
        : aliasName;
    map.set(aliasName, sourceName);
  }
}

/**
 * Recolecta destructure de un función completa (param + body assignments).
 */
function buildAliasMap(funcNode) {
  const map = new Map();

  // Param destructure.
  for (const param of funcNode.parameters) {
    if (ts.isObjectBindingPattern(param.name)) {
      collectDestructure(param.name, map);
    }
  }

  // Body assignment destructures: `const { ... } = props;` or similar.
  if (funcNode.body && ts.isBlock(funcNode.body)) {
    function visit(node) {
      if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
        // initializer should reference `props` or a derived value.
        collectDestructure(node.name, map);
      }
      ts.forEachChild(node, visit);
    }
    visit(funcNode.body);
  }

  return map;
}

/**
 * Find useControllableState call args (the RHS identifiers).
 */
function findHookArgIdents(sourceFile) {
  const idents = new Set();
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "useControllableState"
    ) {
      for (const arg of node.arguments) {
        if (ts.isObjectLiteralExpression(arg)) {
          for (const p of arg.properties) {
            if (ts.isShorthandPropertyAssignment(p)) {
              idents.add(p.name.text);
            } else if (ts.isPropertyAssignment(p)) {
              if (ts.isIdentifier(p.initializer)) {
                idents.add(p.initializer.text);
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return idents;
}

/**
 * Find the top-level exported function declaration(s) that look like a
 * component (TitleCase name).
 */
function findComponentFunctions(sourceFile) {
  const funcs = [];
  function visit(node) {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isVariableStatement(node)) &&
      node.parent === sourceFile
    ) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        funcs.push(node);
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer))
          ) {
            funcs.push(decl.initializer);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return funcs;
}

const files = walk("src/components");
const results = [];

for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  if (!content.includes("useControllableState")) continue;

  const sourceFile = ts.createSourceFile(
    f,
    content,
    ts.ScriptTarget.Latest,
    true,
    f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const hookArgIdents = findHookArgIdents(sourceFile);
  if (hookArgIdents.size === 0) continue;

  // Build alias map from all component functions in this file.
  const aliasMap = new Map();
  for (const fn of findComponentFunctions(sourceFile)) {
    const map = buildAliasMap(fn);
    for (const [k, v] of map) {
      // Last writer wins; for our case unlikely to conflict.
      aliasMap.set(k, v);
    }
  }

  // Resolve hook arg identifiers to source prop names.
  const resolvedProps = new Set();
  const unresolved = new Set();
  for (const arg of hookArgIdents) {
    if (aliasMap.has(arg)) {
      resolvedProps.add(aliasMap.get(arg));
    } else {
      // Identifier not destructured — could be a computed const like
      // `const sanitizedDefaultPage = ...;`. Mark as unresolved.
      unresolved.add(arg);
    }
  }

  results.push({
    file: path.relative(".", f),
    hookArgs: [...hookArgIdents].sort(),
    aliasResolutions: Object.fromEntries(
      [...hookArgIdents].map((a) => [a, aliasMap.get(a) ?? "<computed>"]),
    ),
    resolvedProps: [...resolvedProps].sort(),
    unresolved: [...unresolved].sort(),
  });
}

console.log("=== EOPT VERIFIER — CLASE 2 cierre (paso 1.5) ===");
console.log("");
for (const r of results) {
  console.log(`▌ ${r.file}`);
  console.log(`   hook recibe: ${r.hookArgs.join(", ")}`);
  for (const [arg, source] of Object.entries(r.aliasResolutions)) {
    if (source !== arg) {
      console.log(`     ${arg} ← (destructure alias) ${source}`);
    } else {
      console.log(`     ${arg} ← (same name)`);
    }
  }
  console.log(`   props que feed el hook: ${r.resolvedProps.join(", ") || "(ninguna resuelta)"}`);
  if (r.unresolved.length > 0) {
    console.log(`   UNRESOLVED (computed/derived, NO son props directas): ${r.unresolved.join(", ")}`);
  }
  console.log("");
}

// Aggregate: total props que alimentan hooks (unique).
const allHookFed = new Set();
for (const r of results) {
  for (const p of r.resolvedProps) {
    allHookFed.add(p);
  }
}

// Compare with CLASE 2 from classifier (enumerated CONTROLLED_PROP_NAMES).
const CONTROLLED_PROP_NAMES_FROM_CLASSIFIER = new Set([
  "value", "defaultValue", "onValueChange",
  "open", "defaultOpen", "onOpenChange",
  "checked", "defaultChecked", "onCheckedChange",
  "page", "defaultPage", "onPageChange",
  "collapsed", "defaultCollapsed", "onCollapsedChange",
  "active", "defaultActive", "onActiveChange",
  "expanded", "defaultExpanded", "onExpandedChange",
  "theme", "defaultTheme", "onThemeChange",
  "selected", "defaultSelected", "onSelectedChange",
  "readOnly",
]);

const hookFedNotInClassifier = [...allHookFed].filter(
  (p) => !CONTROLLED_PROP_NAMES_FROM_CLASSIFIER.has(p),
);
const classifierNotInHook = [...CONTROLLED_PROP_NAMES_FROM_CLASSIFIER].filter(
  (p) => !allHookFed.has(p),
);

console.log("=== CIERRE ===");
console.log("");
console.log(`Props únicas que alimentan useControllableState: ${allHookFed.size}`);
console.log(`Set CONTROLLED_PROP_NAMES del classifier:        ${CONTROLLED_PROP_NAMES_FROM_CLASSIFIER.size}`);
console.log("");
if (hookFedNotInClassifier.length > 0) {
  console.log(`⚠ Props que alimentan el hook pero NO están en CONTROLLED_PROP_NAMES:`);
  console.log(`  ${hookFedNotInClassifier.join(", ")}`);
  console.log(`  → ESTAS PROPS SE COLARÍAN A CLASE 1 EN EL CODEMOD (falso negativo).`);
} else {
  console.log(`✓ Todas las props que alimentan el hook están en CONTROLLED_PROP_NAMES.`);
  console.log(`  Las 35 CLASE 2 del classifier capturan correctamente.`);
}
console.log("");
if (classifierNotInHook.length > 0) {
  console.log(`(Info) Nombres en CONTROLLED_PROP_NAMES que NO se usan hoy en ningún hook:`);
  console.log(`  ${classifierNotInHook.join(", ")}`);
  console.log(`  → No es bug; son nombres canónicos que el set incluye por completitud.`);
  console.log(`  → Si ningún componente actual los usa, su presencia en el set no afecta:`);
  console.log(`    se evalúa "fileUsesHook && CONTROLLED_PROP_NAMES.has(name)", y si no hay`);
  console.log(`    componente con esa prop, la cuenta de CLASE 2 no se infla.`);
}
