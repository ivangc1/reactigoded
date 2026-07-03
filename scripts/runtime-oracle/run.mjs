#!/usr/bin/env node
/**
 * Oráculo de runtime — runner (Auditoría B R5 §4.2 / D3).
 * Arranca workerd REAL contra worker.js, lee el JSON de premisas y ASERTA cada una
 * contra lo medido (2026-07-03). Exit 0 = todas las premisas del catálogo verifican
 * contra el runtime; exit 1 = premisa rota (drift de workerd) o workerd ausente.
 *
 * Diseño:
 * - FAIL-LOUD, nunca skip: si workerd no está, exit 1 con instrucciones (un oráculo
 *   que "pasa" por ausencia del runtime es cobertura falsa).
 * - workerd NO va en devDependencies por defecto (~90 MB binario nativo): se resuelve
 *   vía $WORKERD_BIN, o node_modules/.bin/workerd si el repo/CI lo instala.
 * - COMPAT_DATE está PINEADA a propósito: la compatibility date es PARTE de la premisa
 *   (un miembro puede aparecer detrás de una compat flag futura). Subirla es una
 *   decisión de catálogo, no un chore.
 *
 * Uso:   node scripts/runtime-oracle/run.mjs
 *        WORKERD_BIN=/ruta/a/workerd node scripts/runtime-oracle/run.mjs
 */
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const COMPAT_DATE = "2026-07-01";

/** Premisas pineadas (medición 2026-07-03, workerd 2026-07-03). */
const CHECKS = [
  ["perf", (v) => v === "object", "performance presente (objeto)"],
  ["elu", (v) => v === "undefined", "eventLoopUtilization AUSENTE — hazard=absence (sonda ?.() válida)"],
  ["createObjectURL", (v) => v === "function", "URL.createObjectURL typeof=function — ¡el typeof engaña!"],
  ["createObjectURLCall", (v) => /not implemented/i.test(String(v)), "URL.createObjectURL LANZA — hazard=present-but-throws (?.() NO protege)"],
  ["revokeCall", (v) => /THROWS/.test(String(v)), "URL.revokeObjectURL LANZA — present-but-throws"],
  ["canParse", (v) => v === "function", "URL.canParse presente — control: URL NO se registra blanket"],
  ["newURL", (v) => v === "https://a.b/c", "new URL() funciona — control no-divergente"],
  ["blob", (v) => v === "function", "Blob presente"],
  ["waCompile", (v) => v === "function", "WebAssembly.compile typeof=function"],
  ["waCompileCall", (v) => /CompileError|disallowed/i.test(String(v)), "WebAssembly.compile LANZA CompileError — present-but-throws"],
  ["fnCtor", (v) => /EvalError/.test(String(v)), "Function-ctor LANZA EvalError — premisa eval-sink (#10)"],
  ["consoleTable", (v) => v === "function", "console.table PRESENTE en workerd"],
  ["tableCall", (v) => v === "OK", "console.table FUNCIONA en workerd — su divergencia vive en EdgeVM (heterogeneidad por runtime)"],
];

function findWorkerd() {
  const env = process.env.WORKERD_BIN;
  if (env && existsSync(env)) return env;
  let dir = here;
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, "node_modules", ".bin", "workerd");
    if (existsSync(p)) return p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });

async function main() {
  const bin = findWorkerd();
  if (!bin) {
    console.error(
      "[oracle] workerd NO encontrado. FAIL-LOUD por diseño (skip = cobertura falsa).\n" +
        "  - local:  npm i -D workerd   (o instala el binario y exporta WORKERD_BIN)\n" +
        "  - CI:     instala workerd en el runner y ejecuta `npm run oracle`.",
    );
    process.exit(1);
  }

  const port = await freePort();
  const tmp = mkdtempSync(path.join(tmpdir(), "server-safe-oracle-"));
  copyFileSync(path.join(here, "worker.js"), path.join(tmp, "worker.js"));
  const cfgPath = path.join(tmp, "config.capnp");
  writeFileSync(
    cfgPath,
    `using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [ (name = "main", worker = .mainWorker) ],
  sockets = [ (name = "http", address = "127.0.0.1:${port}", http = (), service = "main") ]
);
const mainWorker :Workerd.Worker = (
  modules = [ (name = "worker.js", esModule = embed "worker.js") ],
  compatibilityDate = "${COMPAT_DATE}",
);
`,
  );

  const child = spawn(bin, ["serve", cfgPath], { stdio: ["ignore", "pipe", "pipe"] });
  let stderrBuf = "";
  child.stderr.on("data", (d) => (stderrBuf += d));
  child.on("error", (e) => {
    console.error("[oracle] fallo al lanzar workerd:", e.message);
    process.exit(1);
  });

  let json = null;
  for (let i = 0; i < 40 && !json; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`http://127.0.0.1:${port}`);
      json = await res.json();
    } catch {
      /* aún arrancando */
    }
  }
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 1500).unref();
  rmSync(tmp, { recursive: true, force: true });

  if (!json) {
    console.error("[oracle] workerd no respondió. stderr:\n" + stderrBuf.slice(0, 2000));
    process.exit(1);
  }

  let failed = 0;
  console.log(`[oracle] workerd: ${path.basename(bin)} · compat ${COMPAT_DATE} · puerto ${port}`);
  for (const [key, ok, desc] of CHECKS) {
    const v = json[key];
    const pass = ok(v);
    if (!pass) failed++;
    console.log(`${pass ? " PASS" : " FAIL"}  ${key.padEnd(20)} ${desc}${pass ? "" : `  → medido: ${JSON.stringify(v)}`}`);
  }
  if (failed) {
    console.error(`\n[oracle] ${failed} premisa(s) del catálogo NO verifican contra workerd — drift de runtime o de compat date. Revisar catálogo/hazard-kind antes de tocar nada.`);
    process.exit(1);
  }
  console.log(`\n[oracle] ${CHECKS.length}/${CHECKS.length} premisas verifican. Catálogo consistente con el runtime.`);
}

main();
