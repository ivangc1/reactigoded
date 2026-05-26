#!/usr/bin/env node
/**
 * Rewrites relative module specifiers in emitted `.d.ts` files so they are
 * valid for TypeScript consumers using `moduleResolution: "NodeNext"`.
 *
 * `tsc`/`vite-plugin-dts` emit extensionless specifiers such as
 * `export * from "./components"` while the package is ESM (`type: "module"`).
 * Bundler resolution accepts those declarations, but NodeNext requires an
 * explicit runtime-looking specifier: `./components/index.js` or `./Button.js`.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");

if (!existsSync(distDir)) {
  console.log("[fix-dts-esm-extensions] dist/ no existe, nada que reescribir.");
  process.exit(0);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

function hasKnownExtension(specifier) {
  return /\.[cm]?(?:js|jsx|ts|tsx|json|css|svg|png|jpg|jpeg|gif|webp|avif)$/i.test(
    specifier,
  );
}

function resolveDtsSpecifier(fromFile, specifier) {
  if (!specifier.startsWith(".") || hasKnownExtension(specifier)) {
    return specifier;
  }

  const fromDir = dirname(fromFile);
  const absBase = resolve(fromDir, specifier);
  if (existsSync(`${absBase}.d.ts`)) {
    return `${specifier}.js`;
  }
  if (existsSync(join(absBase, "index.d.ts"))) {
    return `${specifier.replace(/\/$/, "")}/index.js`;
  }

  throw new Error(
    `[fix-dts-esm-extensions] No se pudo resolver "${specifier}" desde ${fromFile}`,
  );
}

const dtsFiles = walk(distDir);
let changedFiles = 0;
let rewrittenSpecifiers = 0;

for (const file of dtsFiles) {
  const before = readFileSync(file, "utf8");
  let rewrittenInFile = 0;

  const after = before
    .replace(
      /\b(from\s*)(["'])(\.[^"']+)(\2)/g,
      (match, prefix, quote, specifier, closingQuote) => {
        const next = resolveDtsSpecifier(file, specifier);
        if (next !== specifier) rewrittenInFile += 1;
        return `${prefix}${quote}${next}${closingQuote}`;
      },
    )
    .replace(
      /\b(import\s*\(\s*)(["'])(\.[^"']+)(\2)(\s*\))/g,
      (match, prefix, quote, specifier, closingQuote, suffix) => {
        const next = resolveDtsSpecifier(file, specifier);
        if (next !== specifier) rewrittenInFile += 1;
        return `${prefix}${quote}${next}${closingQuote}${suffix}`;
      },
    );

  if (after !== before) {
    writeFileSync(file, after);
    changedFiles += 1;
    rewrittenSpecifiers += rewrittenInFile;
  }
}

console.log(
  `[fix-dts-esm-extensions] OK — ${String(rewrittenSpecifiers)} specifier(s) reescritos en ${String(changedFiles)} archivo(s).`,
);
