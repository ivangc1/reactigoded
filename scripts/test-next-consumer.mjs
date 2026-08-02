#!/usr/bin/env node
/**
 * test-next-consumer.mjs — consumer Next.js App Router REAL (gate 1.0.0, CI4).
 *
 * ─── Por qué existe ─────────────────────────────────────────────────────
 * `A-RSC-01`: el `tsc` de Next acepta un import client-only desde un Server
 * Component y el BUILD falla después. El mecanismo, medido:
 *
 *   • `tsc` resuelve los tipos por `dist/index.d.ts` (condición `default`),
 *     donde están los 97 exports.
 *   • El grafo RSC del build resuelve runtime por la condición `react-server`
 *     → `dist/server-safe.js`, que solo tiene 44.
 *
 * Los 53 que faltan no dan error de tipos, dan error de build. Verde en el
 * editor y en `npm run typecheck`, rojo tarde — y en un consumer, "tarde"
 * significa en su CI, no en el nuestro.
 *
 * ─── Por qué NO lo cubría ninguna fixture ───────────────────────────────
 * `fixtures/rsc/` es ciego a esto POR CONSTRUCCIÓN, no por cobertura: fuerza
 * `customConditions: ["react-server"]` **y** `paths: { reactigoded:
 * dist/server-safe.d.ts }`, o sea resuelve los tipos al subset server-safe.
 * Eso es exactamente la mitad OPUESTA del fallo. Ninguna fixture de tipos
 * puede cazarlo: hace falta el resolver de Next de verdad.
 *
 * ─── Las cuatro celdas ──────────────────────────────────────────────────
 *   (1) Server Component + exports server-safe   → build PASA
 *   (2) "use client" + exports client-only       → build PASA
 *   (3) Server Component + export client-only    → build FALLA   ← el control
 *   (4) lo anterior, con Webpack Y con Turbopack → los dos resuelven igual
 *
 * (3) es lo que convierte esto en un gate y no en teatro: sin el control
 * negativo, el job quedaría verde aunque `server-safe` dejara de excluir nada.
 *
 * ─── Convenciones heredadas de `test-consumer-pack.mjs` ─────────────────
 * • Se instala el TARBALL, no `file:../..` ni `npm link`: `scripts.prepare`
 *   viaja en el manifest publicado y hace fallar ambos en el npm del floor
 *   (`SYM-1`), y `--ignore-scripts` no lo evita ahí.
 * • Sandbox en `os.tmpdir()`, nunca en el repo ni en `/mnt/c` (WSL).
 * • Versiones EXACTAS leídas de `node_modules`, no rangos: el gate debe ser
 *   determinista respecto al estado del repo, no respecto a lo que npm tenga
 *   publicado hoy.
 * • `next` va PINEADO en este fichero. Es una dependencia externa de release
 *   rápido y breaking: un rango la metería en el camino crítico de CI sin
 *   control. Subirla es un cambio deliberado, con su PR.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 * • Invoker: `npm run test:next-consumer`, y el job `next-consumer` de
 *   `verify.yml`. NO se encadena en `verify:unit`: instala Next y corre dos
 *   builds (~4-6 min), coste que no tiene sentido en cada verify local.
 * • Fallback: ERROR (exit 1). Si una celda no se puede evaluar, es fallo —
 *   un gate que no puede medir no está pasando.
 */
import { execSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Pineado a propósito. Ver cabecera. */
const NEXT_VERSION = "16.2.12";

/** Export que SÍ está en `dist/server-safe.js` (44 exports). */
const SERVER_SAFE_EXPORT = "Button";
/** Export que NO está en `dist/server-safe.js` — solo en el root (53 exports). */
const CLIENT_ONLY_EXPORT = "Accordion";

// `CI: "true"` SIEMPRE, también en local. Next cambia de comportamiento según
// esa variable: fuera de CI auto-instala en silencio lo que le falte (typescript,
// @types/*), y dentro de CI se niega y aborta. Sin fijarla, este gate pasaba en
// local por una auto-instalación que en CI no ocurre — verde prestado, y la
// divergencia solo se veía después de pushear. Fijarla hace que correrlo en
// local mida lo mismo que mide en CI, que es la única razón por la que un gate
// local sirve de algo.
const CHILD_ENV = { ...process.env, npm_config_yes: "true", CI: "true" };

function run(cmd, opts = {}) {
  return execSync(cmd, {
    stdio: opts.capture ? "pipe" : "inherit",
    encoding: "utf8",
    cwd: opts.cwd ?? repoRoot,
    env: { ...CHILD_ENV, ...opts.env },
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Corre un build y devuelve `{ ok, salida }` sin lanzar: el fallo puede ser lo esperado. */
function build(cwd, { turbopack }) {
  const cmd = turbopack ? "npx next build --turbopack" : "npx next build";
  try {
    const salida = run(cmd, { cwd, capture: true });
    return { ok: true, salida };
  } catch (err) {
    const e = /** @type {{stdout?: string, stderr?: string}} */ (err);
    return { ok: false, salida: `${e.stdout ?? ""}\n${e.stderr ?? ""}` };
  }
}

function installedVersion(name) {
  return JSON.parse(
    readFileSync(join(repoRoot, "node_modules", name, "package.json"), "utf8"),
  ).version;
}

let sandbox;
let packDest;
let exitCode = 0;
const fallos = [];

try {
  // ─── 1. Tarball ─────────────────────────────────────────────────
  packDest = mkdtempSync(join(tmpdir(), "reactigoded-next-pack-"));
  console.log(`\n[next-consumer 1/6] npm pack → ${packDest}`);
  run(`npm pack --ignore-scripts --pack-destination "${packDest}"`);
  const tarballs = readdirSync(packDest).filter(
    (f) => f.startsWith("reactigoded-") && f.endsWith(".tgz"),
  );
  if (tarballs.length !== 1) {
    throw new Error(`Esperaba 1 tarball, encontré ${String(tarballs.length)}`);
  }
  const tarball = join(packDest, tarballs[0]);

  // ─── 2. Sandbox con la app ──────────────────────────────────────
  sandbox = mkdtempSync(join(tmpdir(), "reactigoded-next-app-"));
  console.log(`[next-consumer 2/6] sandbox: ${sandbox}`);

  writeFileSync(
    join(sandbox, "package.json"),
    JSON.stringify(
      {
        name: "reactigoded-next-consumer-test",
        version: "0.0.0-test",
        private: true,
        dependencies: {
          next: NEXT_VERSION,
          react: installedVersion("react"),
          "react-dom": installedVersion("react-dom"),
          reactigoded: `file:${tarball}`,
          // `next build` corre su propio typecheck cuando hay `tsconfig.json` +
          // ficheros TS, y para eso necesita estas tres. Declararlas NO es
          // opcional aunque en local parezca que sí: fuera de CI, Next las
          // AUTO-INSTALA en silencio, y con `CI=true` se niega y aborta el
          // build. Así que sin esta línea el gate pasa en local y falla en CI
          // — un verde prestado por una auto-instalación, que es justo el tipo
          // de diferencia de entorno que este gate existe para no tener.
          typescript: installedVersion("typescript"),
          "@types/react": installedVersion("@types/react"),
          "@types/node": installedVersion("@types/node"),
        },
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(sandbox, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(sandbox, "next.config.mjs"),
    "/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;\n",
  );

  const app = join(sandbox, "app");
  mkdirSync(app, { recursive: true });
  mkdirSync(join(app, "client"), { recursive: true });

  writeFileSync(
    join(app, "layout.tsx"),
    `import "reactigoded/styles/all.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
`,
  );

  // (1) Server Component + export server-safe → debe compilar.
  writeFileSync(
    join(app, "page.tsx"),
    `import { ${SERVER_SAFE_EXPORT} } from "reactigoded";

export default function Page() {
  return <${SERVER_SAFE_EXPORT}>servidor</${SERVER_SAFE_EXPORT}>;
}
`,
  );

  // (2) "use client" + export client-only → debe compilar.
  writeFileSync(
    join(app, "client", "page.tsx"),
    `"use client";

import { ${CLIENT_ONLY_EXPORT}, ${CLIENT_ONLY_EXPORT}Item, ${CLIENT_ONLY_EXPORT}Header, ${CLIENT_ONLY_EXPORT}Content } from "reactigoded";

export default function ClientPage() {
  return (
    <${CLIENT_ONLY_EXPORT} type="single">
      <${CLIENT_ONLY_EXPORT}Item value="a">
        <${CLIENT_ONLY_EXPORT}Header>A</${CLIENT_ONLY_EXPORT}Header>
        <${CLIENT_ONLY_EXPORT}Content>contenido</${CLIENT_ONLY_EXPORT}Content>
      </${CLIENT_ONLY_EXPORT}Item>
    </${CLIENT_ONLY_EXPORT}>
  );
}
`,
  );

  // ─── 3. Install ─────────────────────────────────────────────────
  console.log(`\n[next-consumer 3/6] npm install (next@${NEXT_VERSION})`);
  run("npm install --no-audit --no-fund", { cwd: sandbox });

  // ─── 4. Celda positiva ──────────────────────────────────────────
  for (const turbopack of [false, true]) {
    const nombre = turbopack ? "Turbopack" : "Webpack";
    console.log(`\n[next-consumer 4/6] build ${nombre} — grafos server + client`);
    const r = build(sandbox, { turbopack });
    if (r.ok) {
      console.log(`  ✓ ${nombre}: compila`);
    } else {
      fallos.push(
        `${nombre}: el build de la app CORRECTA falló. Un Server Component usando solo ` +
          `exports server-safe y una página "use client" usando exports client-only deben ` +
          `compilar los dos.\n${r.salida.slice(-2000)}`,
      );
    }
  }

  // ─── 5. Control negativo ────────────────────────────────────────
  // Server Component importando un export client-only. Bajo la condición
  // `react-server` eso resuelve a `dist/server-safe.js`, que NO lo exporta.
  // Si esto COMPILA, o el export map dejó de discriminar o `server-safe`
  // empezó a incluir client-only: en ambos casos el gate debe gritar.
  console.log(`\n[next-consumer 5/6] control negativo — Server Component + ${CLIENT_ONLY_EXPORT}`);
  mkdirSync(join(app, "malo"), { recursive: true });
  writeFileSync(
    join(app, "malo", "page.tsx"),
    `import { ${CLIENT_ONLY_EXPORT} } from "reactigoded";

export default function MalaPage() {
  return <${CLIENT_ONLY_EXPORT} type="single" />;
}
`,
  );

  for (const turbopack of [false, true]) {
    const nombre = turbopack ? "Turbopack" : "Webpack";
    const r = build(sandbox, { turbopack });
    if (r.ok) {
      fallos.push(
        `${nombre}: el CONTROL NEGATIVO compiló. Un Server Component importando ` +
          `\`${CLIENT_ONLY_EXPORT}\` debería fallar: la condición \`react-server\` resuelve a ` +
          `dist/server-safe.js, que no lo exporta. Que pase significa que la frontera ` +
          `server-safe dejó de discriminar — y este gate existe justo para eso.`,
      );
    } else {
      const menciona = new RegExp(CLIENT_ONLY_EXPORT).test(r.salida);
      console.log(
        `  ✓ ${nombre}: falla como debe${menciona ? ` (el error nombra \`${CLIENT_ONLY_EXPORT}\`)` : ""}`,
      );
      if (!menciona) {
        fallos.push(
          `${nombre}: el control negativo falló, pero el error NO menciona ` +
            `\`${CLIENT_ONLY_EXPORT}\`. Puede estar fallando por otra causa y dar un verde ` +
            `falso a este gate.\n${r.salida.slice(-1500)}`,
        );
      }
    }
  }

  // ─── 6. Veredicto ───────────────────────────────────────────────
  console.log("\n[next-consumer 6/6] veredicto");
  if (fallos.length > 0) {
    exitCode = 1;
    console.error(`\n✖ next-consumer: ${String(fallos.length)} celda(s) no se sostienen:\n`);
    for (const f of fallos) console.error(`  − ${f}\n`);
  } else {
    console.log(
      `\n✓ next-consumer: Next ${NEXT_VERSION}, Webpack y Turbopack.\n` +
        `  · Server Component + exports server-safe → compila\n` +
        `  · "use client" + exports client-only → compila\n` +
        `  · Server Component + export client-only → falla (control negativo)\n`,
    );
  }
} catch (err) {
  exitCode = 1;
  console.error(`\n✖ next-consumer: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  for (const dir of [sandbox, packDest]) {
    if (dir) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* limpieza best-effort: no convertir un fallo de rm en un fallo del gate. */
      }
    }
  }
}

process.exit(exitCode);
