#!/usr/bin/env node
/**
 * EOPT classifier — sistemático, no juicio prop-por-prop.
 *
 * Tarea #155 paso 1 (reclasificación tras descubrir el inventory v1
 * tenía 262 props públicas, no 57).
 *
 * Criterio fijado:
 *
 *   CLASE 2 = la prop alimenta `useControllableState` (cualquier key
 *             del options object pasado al hook) O aparece en un check
 *             de presencia (`"X" in props`).
 *
 *             Detección: por cada archivo de componente, parsear el AST,
 *             encontrar las llamadas a `useControllableState`, extraer
 *             los nombres de las keys del object argument, y marcar
 *             esos nombres como CLASE 2 cuando aparezcan en las
 *             interfaces/types públicas declaradas en el MISMO archivo.
 *
 *   CLASE 1 = todo lo demás (presentación, refs, variants, callbacks
 *             one-off). Por descarte automático.
 *
 *   OUT OF SCOPE:
 *     - `?: undefined` literal (discriminantes de discriminated union).
 *     - `?: never` (escape hatches del hook, derive: never, etc.).
 *
 *   Props heredadas vía `extends X` o `&` con tipos foráneos: NO
 *   contadas (el AST solo mira PropertySignature de la declaración
 *   propia, no las inherited). Documentado como frontera con React.
 *
 * Output: total categorizado + lista de componentes con
 * useControllableState + diff vs inventory v1.
 *
 * @internal Herramienta de auditoría única para #155. Si en el futuro
 *   se quiere mantener como guardrail recurrente, mover a `verify:unit`.
 *   Por ahora vive en scripts/ con prefijo `eopt-` para distinguir.
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

function parseFile(filePath) {
  return ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/**
 * Find calls to `useControllableState(...)` in a sourceFile and extract
 * the keys passed in the object argument(s). Returns Set<string>.
 *
 * Example detected:
 *   useControllableState({ value, defaultValue, onChange })
 *   → returns { value, defaultValue, onChange }
 *
 *   useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
 *   → returns { value, defaultValue, onChange }  ← the KEY NAMES of the hook's options.
 *
 * BUT we want the SOURCE prop names (open, defaultOpen, onOpenChange),
 * not the hook's internal key names. So we extract the SHORTHAND
 * (`{ value }` = same name) and the IDENTIFIER VALUES of properties
 * (`{ value: open }` → "open").
 */
function findControllableStateProps(sourceFile) {
  const props = new Set();
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
              // `{ value }` → "value" is both key and source.
              props.add(p.name.text);
            } else if (ts.isPropertyAssignment(p)) {
              // `{ value: open }` → source is "open".
              if (ts.isIdentifier(p.initializer)) {
                props.add(p.initializer.text);
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return props;
}

/**
 * Find `"X" in props` patterns. Returns Set<string> of X.
 */
function findInPropsChecks(sourceFile) {
  const props = new Set();
  function visit(node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.InKeyword &&
      ts.isStringLiteral(node.left)
    ) {
      props.add(node.left.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return props;
}

/**
 * Determine if a TypeNode is exactly `undefined` literal (used as
 * discriminator in discriminated unions like `href?: undefined`).
 */
function isUndefinedLiteral(typeNode) {
  // `?: undefined` puede aparecer en dos formas AST:
  // - Token directo `UndefinedKeyword` (forma habitual en código moderno).
  // - LiteralTypeNode envolviendo UndefinedKeyword (forma legacy).
  return (
    typeNode.kind === ts.SyntaxKind.UndefinedKeyword ||
    (ts.isLiteralTypeNode(typeNode) &&
      typeNode.literal.kind === ts.SyntaxKind.UndefinedKeyword)
  );
}

/**
 * Determine if a TypeNode is `never` (escape hatch).
 */
function isNeverType(typeNode) {
  return (
    typeNode.kind === ts.SyntaxKind.NeverKeyword ||
    (ts.isTypeReferenceNode(typeNode) &&
      ts.isIdentifier(typeNode.typeName) &&
      typeNode.typeName.text === "never")
  );
}

function isTypeAlreadyUndefinedUnion(typeNode, sourceFile) {
  // Heuristic on text: "| undefined" appears.
  const text = typeNode.getText(sourceFile);
  return text.includes("| undefined");
}

const files = walk("src/components").concat(walk("src/hooks"));
const componentsWithHook = []; // { file, controlledProps: Set<string> }
const inventory = []; // { file, interfaceName, propName, typeText, line, verdict, reason }

// Step 1: find controllable state usage + in-props checks per file.
const fileContext = new Map(); // path → { controlled: Set, inProps: Set }
for (const f of files) {
  const sourceFile = parseFile(f);
  const controlled = findControllableStateProps(sourceFile);
  const inProps = findInPropsChecks(sourceFile);
  fileContext.set(f, { controlled, inProps });
  if (controlled.size > 0) {
    componentsWithHook.push({
      file: path.relative(".", f),
      controlledProps: [...controlled].sort(),
    });
  }
}

// Step 2: walk top-level interface/type declarations and classify.
for (const f of files) {
  const sourceFile = parseFile(f);
  const ctx = fileContext.get(f);

  function visit(node) {
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      node.parent === sourceFile
    ) {
      // NOTA: incluimos TODOS los top-level type aliases / interfaces,
      // exported o no. Razón: tipos locales no exportados (como
      // `SingleProps` dentro de `AccordionProps = SingleProps | MultipleProps`)
      // son parte del API público de facto vía la unión exportada. Si
      // filtrásemos por `isExported` perderíamos props que el consumer
      // SÍ puede pasar. El v3 acepta este sobre-conteo controlado —
      // tipos puramente internos (escape hatches del hook, helpers de
      // tests, etc.) los filtra después por nombre / patrón.

      const interfaceName = node.name.text;

      const members = [];
      if (ts.isInterfaceDeclaration(node)) {
        members.push(...node.members);
      } else if (ts.isTypeAliasDeclaration(node)) {
        const collect = (typeNode) => {
          // Los paréntesis primero: un union de intersecciones se escribe
          // `| (A & { x } & B)` y TS mete un ParenthesizedTypeNode entre el
          // union y la intersección. Sin atravesarlo, la rama entera es
          // invisible al clasificador — así se le escaparon las 3 props de
          // `Chip` (A-TYPES-02), que es la forma AST de cualquier union
          // discriminado con intersecciones. No es una frontera EOPT nueva:
          // es un falso negativo de este walker.
          if (ts.isParenthesizedTypeNode(typeNode)) {
            collect(typeNode.type);
          } else if (ts.isTypeLiteralNode(typeNode)) {
            members.push(...typeNode.members);
          } else if (
            ts.isIntersectionTypeNode(typeNode) ||
            ts.isUnionTypeNode(typeNode)
          ) {
            typeNode.types.forEach(collect);
          }
        };
        collect(node.type);
      }

      for (const m of members) {
        if (
          ts.isPropertySignature(m) &&
          m.questionToken &&
          m.type
        ) {
          const propName = m.name.getText(sourceFile);
          const typeText = m.type.getText(sourceFile);
          const line =
            sourceFile.getLineAndCharacterOfPosition(m.getStart(sourceFile))
              .line + 1;

          // Skip if already widened.
          if (isTypeAlreadyUndefinedUnion(m.type, sourceFile)) continue;

          // OUT OF SCOPE: literal undefined (discriminator).
          if (isUndefinedLiteral(m.type)) {
            inventory.push({
              file: f,
              interfaceName,
              propName,
              typeText,
              line,
              verdict: "OUT_OF_SCOPE_UNDEFINED_LITERAL",
              reason: "Discriminator literal `?: undefined` (discriminated union)",
            });
            continue;
          }

          // OUT OF SCOPE: never.
          if (isNeverType(m.type)) {
            inventory.push({
              file: f,
              interfaceName,
              propName,
              typeText,
              line,
              verdict: "OUT_OF_SCOPE_NEVER",
              reason: "Escape hatch `?: never` (discriminated union member)",
            });
            continue;
          }

          // CLASE 2: el archivo usa `useControllableState` (cualquier
          // mapping) Y la prop tiene un nombre de "triada controlled"
          // típica del DS. La detección por extracción de nombres del
          // hook arg falla cuando el componente hace re-mapping local
          // (`useControllableState({ value: valueProp })` → script ve
          // "valueProp", pero el interface declara "value"). Solución
          // pragmática: enumerar los nombres canónicos de control y
          // marcar como CLASE 2 si el archivo es controlled-component
          // (usa el hook) Y la prop matchea.
          //
          // La lista es exhaustiva sobre el DS actual (12 controlled
          // components, ~25 nombres únicos). Si en el futuro se añade
          // un componente con triada nueva, ampliar la lista.
          const CONTROLLED_PROP_NAMES = new Set([
            "value",
            "defaultValue",
            "onValueChange",
            "open",
            "defaultOpen",
            "onOpenChange",
            "checked",
            "defaultChecked",
            "onCheckedChange",
            "page",
            "defaultPage",
            "onPageChange",
            "collapsed",
            "defaultCollapsed",
            "onCollapsedChange",
            "active",
            "defaultActive",
            "onActiveChange",
            "expanded",
            "defaultExpanded",
            "onExpandedChange",
            "theme",
            "defaultTheme",
            "onThemeChange",
            "selected",
            "defaultSelected",
            "onSelectedChange",
            "readOnly",
          ]);
          // Override file-scoped: props que NO están en la triada
          // canónica pero participan en discriminator dentro de un
          // archivo concreto. Verificado por presence-check grep +
          // verifier #155. NO ampliar sin pasar por los dos gates.
          //
          // - Dialog.tsx::onClose participa en
          //   `isPresentationalControlled = isControlled && onOpenChange === undefined && onClose === undefined`.
          //   Alias deprecated de onOpenChange. Alert.tsx::onClose es
          //   callback puro post-dismiss (no discriminator) → CLASE 1.
          const FILE_SCOPED_CLASE_2 = {
            "src/components/Dialog/Dialog.tsx": new Set(["onClose"]),
          };
          const fileUsesHook = ctx.controlled.size > 0;
          const fileScopedHit =
            FILE_SCOPED_CLASE_2[f]?.has(propName) ?? false;
          if (fileUsesHook && (CONTROLLED_PROP_NAMES.has(propName) || fileScopedHit)) {
            inventory.push({
              file: f,
              interfaceName,
              propName,
              typeText,
              line,
              verdict: "CLASE_2",
              reason: `Archivo usa useControllableState + propName en triada controlled canónica`,
            });
            continue;
          }
          if (ctx.inProps.has(propName)) {
            inventory.push({
              file: f,
              interfaceName,
              propName,
              typeText,
              line,
              verdict: "CLASE_2",
              reason: `Presence check "${propName}" in props`,
            });
            continue;
          }

          inventory.push({
            file: f,
            interfaceName,
            propName,
            typeText,
            line,
            verdict: "CLASE_1",
            reason: "Presentación (no useControllableState, no in-props check)",
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const totals = {
  CLASE_1: 0,
  CLASE_2: 0,
  OUT_OF_SCOPE_UNDEFINED_LITERAL: 0,
  OUT_OF_SCOPE_NEVER: 0,
};
for (const p of inventory) totals[p.verdict]++;

console.log("=== EOPT CLASSIFY (v2 sistemático) ===");
console.log("");
console.log(`Total props públicas opcionales sin widen: ${inventory.length}`);
console.log("");
console.log("=== Totales por veredicto ===");
console.log(`CLASE 1 (presentación, codemod AST):       ${totals.CLASE_1}`);
console.log(`CLASE 2 (control, manual + test):          ${totals.CLASE_2}`);
console.log(`OUT OF SCOPE — undefined literal:          ${totals.OUT_OF_SCOPE_UNDEFINED_LITERAL}`);
console.log(`OUT OF SCOPE — never (escape hatch):       ${totals.OUT_OF_SCOPE_NEVER}`);
console.log("");
console.log("=== Componentes que llaman useControllableState ===");
console.log(`(N=${componentsWithHook.length} archivos)`);
for (const c of componentsWithHook) {
  console.log(`  ${c.file}`);
  console.log(`    keys passed → ${c.controlledProps.join(", ")}`);
}
console.log("");
console.log("=== CLASE 2 detail (verifica que cuadra con las triadas) ===");
const class2 = inventory.filter((p) => p.verdict === "CLASE_2");
const byFile = {};
for (const p of class2) {
  const k = path.relative(".", p.file);
  if (!byFile[k]) byFile[k] = [];
  byFile[k].push(`${p.interfaceName}.${p.propName}`);
}
for (const [f, props] of Object.entries(byFile)) {
  console.log(`  ${f}: ${props.join(", ")}`);
}
console.log("");
console.log("=== OUT OF SCOPE (escape hatches + discriminators) ===");
const oos = inventory.filter(
  (p) => p.verdict.startsWith("OUT_OF_SCOPE"),
);
for (const p of oos) {
  console.log(
    `  ${path.basename(p.file)}:${p.line} ${p.interfaceName}.${p.propName} (${p.verdict.replace("OUT_OF_SCOPE_", "")})`,
  );
}

// JSON output (--json flag): para que el codemod AST lo consuma.
if (process.argv.includes("--json")) {
  const jsonPath = "/tmp/eopt-inventory.json";
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(inventory, null, 2),
  );
  console.log(`\n→ Inventory JSON escrito a ${jsonPath}`);
}
