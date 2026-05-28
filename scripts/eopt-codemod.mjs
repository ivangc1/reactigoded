#!/usr/bin/env node
/**
 * EOPT codemod AST — paso 3 de #155.
 *
 * Lee `/tmp/eopt-inventory.json` (generado por `eopt-classify.mjs --json`)
 * y aplica widening (`?: T` → `?: T | undefined`) a TODAS las props
 * marcadas CLASE 1 y CLASE 2. La diferencia entre los dos paths no es
 * el cambio textual (mismo widening), sino el accompanying test de
 * comportamiento que las CLASE 2 necesitan (ese se añade aparte).
 *
 * Approach:
 *   1. Para cada archivo con props a widen, parsear con TS Compiler API.
 *   2. Walk top-level type aliases / interfaces.
 *   3. Por cada PropertySignature con questionToken y type, si su nombre
 *      coincide con un target del JSON:
 *        - Obtener posición END del type.
 *        - Inyectar ` | undefined` antes del END.
 *   4. Aplicar todas las modificaciones en orden inverso (descendente
 *      por posición) para preservar offsets.
 *   5. Escribir el archivo de vuelta.
 *   6. Verificar count: lineas modificadas == props target.
 *
 * Preserva tipos compuestos:
 *   - `value?: string | null` → `value?: string | null | undefined`.
 *   - `onValueChange?: (v: T) => void` →
 *     `onValueChange?: (v: T) => void | undefined`.
 *     ↑ NO, NO QUEREMOS esto. El `| undefined` va en la PROP, no en el
 *     return type. El AST inyecta al END del type expression, y para una
 *     function type `(v: T) => void`, el END es después de `void`, lo
 *     que cambia el return type a `void | undefined`.
 *
 *   Solución: envolver el type existente en paréntesis cuando es una
 *   function type / construct type / union sin guarda. La forma robusta:
 *   `value?: (T) | undefined`. La forma minimal: detectar function type
 *   y emitir paréntesis solo en ese caso.
 *
 *   Decision: SIEMPRE envolver en paréntesis cuando el type es:
 *     - FunctionType / ConstructorType
 *     - UnionType (más legible con paréntesis)
 *   Sino, append literal.
 */
import fs from "node:fs";
import ts from "typescript";

const inventory = JSON.parse(
  fs.readFileSync("/tmp/eopt-inventory.json", "utf8"),
);

// Filter: CLASE 1 + CLASE 2 → ambos hacen widening. OUT_OF_SCOPE skip.
const targets = inventory.filter(
  (p) => p.verdict === "CLASE_1" || p.verdict === "CLASE_2",
);
console.log(`Total targets: ${targets.length}`);

// Group by file path.
const byFile = {};
for (const t of targets) {
  if (!byFile[t.file]) byFile[t.file] = [];
  byFile[t.file].push(t);
}

let totalModified = 0;

for (const [filePath, props] of Object.entries(byFile)) {
  const content = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  // Build a Map of (interfaceName, propName) → target.
  const targetMap = new Map();
  for (const p of props) {
    targetMap.set(`${p.interfaceName}::${p.propName}`, p);
  }

  // Collect edits: { start, end, replacement }.
  const edits = [];

  function visit(node) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const interfaceName = node.name.text;
      const members = [];
      if (ts.isInterfaceDeclaration(node)) {
        members.push(...node.members);
      } else if (ts.isTypeAliasDeclaration(node)) {
        const collect = (typeNode) => {
          if (ts.isTypeLiteralNode(typeNode)) {
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
        if (!ts.isPropertySignature(m) || !m.questionToken || !m.type) continue;
        const propName = m.name.getText(sourceFile);
        const key = `${interfaceName}::${propName}`;
        const target = targetMap.get(key);
        if (!target) continue;

        // Determine if type needs parens (function type, ctor type, or
        // bare conditional type — anything where union would bind wrong).
        const typeText = m.type.getText(sourceFile);
        const needsParens =
          ts.isFunctionTypeNode(m.type) ||
          ts.isConstructorTypeNode(m.type) ||
          ts.isConditionalTypeNode(m.type);

        let replacement;
        if (needsParens) {
          // Wrap: `(T) | undefined`.
          replacement = `(${typeText}) | undefined`;
        } else {
          // Append: `T | undefined`.
          replacement = `${typeText} | undefined`;
        }

        edits.push({
          start: m.type.getStart(sourceFile),
          end: m.type.getEnd(),
          replacement,
          key,
        });
        targetMap.delete(key); // mark applied
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (targetMap.size > 0) {
    console.warn(
      `  ${filePath}: ${targetMap.size} targets NO encontrados:`,
      [...targetMap.keys()],
    );
  }

  if (edits.length === 0) continue;

  // Apply edits in reverse order (descending start).
  edits.sort((a, b) => b.start - a.start);
  let modified = content;
  for (const e of edits) {
    modified = modified.slice(0, e.start) + e.replacement + modified.slice(e.end);
  }
  fs.writeFileSync(filePath, modified);
  totalModified += edits.length;
  console.log(`  ${filePath}: ${edits.length} props widened`);
}

console.log(`\nTotal: ${totalModified} props widened in ${Object.keys(byFile).length} files`);
