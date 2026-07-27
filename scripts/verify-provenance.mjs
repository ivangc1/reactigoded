#!/usr/bin/env node
/**
 * verify-provenance.mjs — gate de EVIDENCIA del release (gate 1.0.0, §6 R1/R2/R3)
 *
 * Comprueba que la provenance publicada de una versión de npm dice la verdad
 * sobre QUÉ se publicó y DESDE DÓNDE. No valida el contenido del tarball (de
 * eso ya se encarga `verify`): valida la cadena de afirmaciones que un tercero
 * seguiría para auditarnos.
 *
 * ─── Por qué existe ─────────────────────────────────────────────────────
 * En `1.0.0-rc.1` la provenance quedó firmando `refs/heads/main` + `f4e45d6`
 * mientras el tarball, el `gitHead` y el tag eran `318e159`. El contenido era
 * correcto; la EVIDENCIA apuntaba al commit equivocado, así que quien siguiera
 * la provenance auditaba otro árbol. Causa medida: npm deriva la SLSA de las
 * variables del EVENTO de Actions (`GITHUB_REF`/`GITHUB_SHA`/
 * `GITHUB_WORKFLOW_REF`, ver `libnpmpublish/lib/provenance.js`), NO del
 * `actions/checkout` — y aquel publish salió por `workflow_dispatch` desde
 * main con checkout explícito del tag. De ahí que el tarball fuera correcto y
 * la evidencia no: son dos fuentes distintas.
 *
 * ─── Por qué un script y no bash inline en el workflow ──────────────────
 * El guard anterior vivía embebido en `release.yml` como un one-liner de node.
 * Tres defectos que un script cierra: (1) era intesteable — su modo de fallo
 * era *stringly-typed* (`"- - -"`, indistinguible de un campo legítimo `"-"`);
 * (2) seleccionaba la attestation por ÍNDICE (`attestations[0]`), que es
 * siempre el predicado `npm-publish`, no el SLSA — o sea leía el documento
 * equivocado; (3) decodificaba el sobre DSSE con `Buffer.from(…,"base64")`
 * SIN verificar la firma, con lo que solo probaba «el registro me devolvió
 * este JSON» — justo la premisa que la provenance existe para no asumir.
 * Como script, además, es post-hoc: se puede correr contra CUALQUIER versión
 * ya publicada, hoy o dentro de un año.
 *
 * ─── Las dos firmas NO se verifican igual ───────────────────────────────
 * El bundle trae dos attestations con firmantes distintos: la SLSA la firma
 * **Fulcio** (trust root de sigstore) y la `npm-publish` la firma **el propio
 * registro** con una clave ECDSA P-256 publicada en `/-/npm/v1/keys`. Pasar
 * la segunda por `sigstore.verify()` falla siempre con «key not found»; por
 * eso se verifica aparte contra las claves del registro, en vez de declararla
 * «no verificable» y dejarla sin comprobar.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 *   node scripts/verify-provenance.mjs <version> \
 *     --tag v<version> --commit <sha> \
 *     [--pkg reactigoded] [--repo ivangc1/reactigoded] \
 *     [--workflow .github/workflows/release.yml] [--event push] \
 *     [--check-release-record <fichero.json>] [--json] [--from-dir <dir>]
 *
 * • Invoker: `release.yml` tras publicar y ANTES de escribir la GitHub
 *   Release; y `npm run test:provenance` (unit, offline, sobre fixtures).
 * • `--from-dir` lee `meta.json` + `attestations.json` (+ `keys.json` si
 *   existe) de disco en vez de la red: es lo que permite testear el gate sin
 *   depender del registro.
 * • Fallback: ERROR (exit 1) ante CUALQUIER fila que no se pueda afirmar.
 *   No hay allowlist ni modo permisivo — un dato que no se puede comprobar
 *   cuenta como fallo, porque el propósito del gate es justamente que nadie
 *   pueda afirmar lo que no ha medido.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";

export const SLSA_PREDICATE = "https://slsa.dev/provenance/v1";
export const NPM_PREDICATE_PREFIX = "https://github.com/npm/attestation/";
export const NPM_KEYS_URL = "https://registry.npmjs.org/-/npm/v1/keys";

// ─── Piezas puras (todas exportadas: son lo que testea el unit test) ─────

/**
 * PAE (DSSE Pre-Authentication Encoding): lo que realmente se firma en un
 * sobre DSSE. `DSSEv1 <len(tipo)> <tipo> <len(payload)> <payload>` con los
 * bytes CRUDOS del payload, no su base64.
 */
export function pae(payloadType, payloadBytes) {
  return Buffer.concat([
    Buffer.from(
      `DSSEv1 ${String(Buffer.byteLength(payloadType))} ${payloadType} ${String(payloadBytes.length)} `,
      "utf8",
    ),
    payloadBytes,
  ]);
}

/** hex de los bytes del sha512, que es el formato del subject de la attestation. */
export function tarballSha512Hex(integrity) {
  if (typeof integrity !== "string" || !integrity.startsWith("sha512-")) return null;
  return Buffer.from(integrity.slice("sha512-".length), "base64").toString("hex");
}

/**
 * Selección POR `predicateType`, nunca por índice. 0 y >1 SLSA son ambos
 * fallo: con dos no se puede saber cuál rige, y elegir una sería reintroducir
 * por la puerta de atrás la arbitrariedad que este gate existe para eliminar.
 */
export function selectAttestations(bundleDoc) {
  const all = Array.isArray(bundleDoc?.attestations) ? bundleDoc.attestations : [];
  return {
    slsa: all.filter((a) => a?.predicateType === SLSA_PREDICATE),
    npm: all.filter((a) => String(a?.predicateType ?? "").startsWith(NPM_PREDICATE_PREFIX)),
  };
}

/** Verificación de la attestation del registro. Pura: recibe las claves ya cargadas. */
export function verifyNpmSignatureWithKeys(bundle, keysDoc, now = new Date()) {
  const env = bundle?.dsseEnvelope;
  if (!env) return { ok: false, detail: "sin dsseEnvelope" };
  const sigEntry = env.signatures?.[0];
  if (!sigEntry) return { ok: false, detail: "sobre DSSE sin firma" };
  const key = keysDoc?.keys?.find((k) => k.keyid === sigEntry.keyid);
  if (!key) return { ok: false, detail: `keyid ${String(sigEntry.keyid)} no está en ${NPM_KEYS_URL}` };
  if (key.expires && new Date(key.expires) < now) {
    return { ok: false, detail: `la clave ${key.keyid} expiró el ${key.expires}` };
  }
  try {
    const payloadBytes = Buffer.from(env.payload, "base64");
    const pub = createPublicKey({ key: Buffer.from(key.key, "base64"), format: "der", type: "spki" });
    const ok = cryptoVerify("sha256", pae(env.payloadType, payloadBytes), pub, Buffer.from(sigEntry.sig, "base64"));
    return { ok, detail: ok ? `clave del registro ${key.keyid}` : "firma inválida para la clave declarada" };
  } catch (err) {
    // Una clave malformada o un base64 corrupto son FALLO, no "no evaluable":
    // el gate no puede afirmar nada sobre una firma que no ha podido leer.
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

/** La SLSA la firma Fulcio: trust root de sigstore. */
export async function verifySlsaSignature(bundle) {
  let sigstore;
  try {
    sigstore = await import("sigstore");
  } catch {
    return { ok: false, detail: "devDep `sigstore` no resoluble — fail-closed, no se salta la comprobación" };
  }
  try {
    await sigstore.verify(bundle);
    return { ok: true, detail: "Fulcio/Rekor OK" };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Construye la tabla de afirmaciones. PURA: las verificaciones de firma se le
 * INYECTAN ya resueltas (`signatures`), para que el test pueda ejercitar la
 * lógica de comparación sin red y, a la vez, simular una firma inválida.
 */
export function buildRows({ meta, bundleDoc, expected, signatures, record = null }) {
  const rows = [];
  const row = (key, esperado, medido, nota) =>
    rows.push({
      key,
      ok: String(esperado) === String(medido),
      esperado: String(esperado),
      medido: String(medido),
      ...(nota ? { nota } : {}),
    });
  const rowRaw = (key, ok, esperado, medido, nota) =>
    rows.push({ key, ok, esperado: String(esperado), medido: String(medido), ...(nota ? { nota } : {}) });

  const { pkg, version, tag, commit, repo, workflow, event } = expected;

  // (1) gitHead: lo que el registro dice que se empaquetó.
  row("gitHead", commit, meta?.gitHead ?? "<ausente>");

  // (2) digest del tarball que sirve el registro, en el formato del subject.
  const tarballSha512 = tarballSha512Hex(meta?.dist?.integrity);
  if (tarballSha512 === null) {
    rowRaw("tarball-digest", false, "sha512-<base64>", String(meta?.dist?.integrity ?? "<ausente>"), "dist.integrity ausente o no-sha512");
  }

  // (3) selección por predicateType.
  const { slsa: slsaAll, npm: npmAll } = selectAttestations(bundleDoc);
  row("slsa-count", 1, slsaAll.length, `predicateType=${SLSA_PREDICATE}`);
  if (slsaAll.length !== 1) return rows;

  // (4) firmas (inyectadas)
  rowRaw("slsa-signature", signatures.slsa.ok, "firma válida", signatures.slsa.ok ? "válida" : "INVÁLIDA", signatures.slsa.detail);
  if (npmAll.length === 1) {
    rowRaw("npm-signature", signatures.npm.ok, "firma válida", signatures.npm.ok ? "válida" : "INVÁLIDA", signatures.npm.detail);
  } else {
    rowRaw("npm-signature", false, "1 attestation npm-publish", `${String(npmAll.length)} encontradas`);
  }

  // (5) el statement, con su firma ya verificada arriba
  let statement;
  try {
    statement = JSON.parse(Buffer.from(slsaAll[0].bundle.dsseEnvelope.payload, "base64").toString("utf8"));
  } catch (err) {
    rowRaw("slsa-payload", false, "JSON decodificable", err instanceof Error ? err.message : String(err));
    return rows;
  }

  const subject = statement.subject?.[0] ?? {};
  row("subject-name", `pkg:npm/${pkg}@${version}`, subject.name ?? "<ausente>");
  if (tarballSha512 !== null) {
    row("subject-digest", tarballSha512, subject.digest?.sha512 ?? "<ausente>", "sha512 del tarball que sirve el registro");
  }

  // (6) de dónde dice la build que salió
  const bd = statement.predicate?.buildDefinition ?? {};
  const wf = bd.externalParameters?.workflow ?? {};
  row("workflow-repo", `https://github.com/${repo}`, wf.repository ?? "<ausente>");
  row("workflow-path", workflow, wf.path ?? "<ausente>");
  row("attested-ref", `refs/tags/${tag}`, wf.ref ?? "<ausente>");

  // (7) el commit que la propia attestation declara como fuente
  const dep = bd.resolvedDependencies?.[0] ?? {};
  row("resolved-uri", `git+https://github.com/${repo}@refs/tags/${tag}`, dep.uri ?? "<ausente>");
  row("attested-commit", commit, dep.digest?.gitCommit ?? "<ausente>");

  // (8) el evento: un `workflow_dispatch` no puede producir provenance del tag
  //     por construcción, porque npm lee GITHUB_REF/GITHUB_SHA del evento.
  row("event-name", event, bd.internalParameters?.github?.event_name ?? "<ausente>");

  // (9) registro durable de la Release, si se pide
  if (record) {
    row("record-version", version, record.version ?? "<ausente>");
    row("record-tag", tag, record.tag ?? "<ausente>");
    row("record-tagCommit", commit, record.tagCommit ?? "<ausente>");
    if (tarballSha512 !== null) row("record-tarballSha512", tarballSha512, record.tarballSha512 ?? "<ausente>");
    row("record-attestationUrl", meta?.dist?.attestations?.url ?? "<ausente>", record.attestationUrl ?? "<ausente>");
  }

  return rows;
}

export function formatReport(rows, { pkg, version, tag, commit }) {
  const w = Math.max(...rows.map((r) => r.key.length));
  const out = [`\nprovenance de ${pkg}@${version}  (tag ${tag} · commit ${String(commit).slice(0, 12)})\n`];
  for (const r of rows) {
    out.push(`  ${r.ok ? "✓" : "✖"} ${r.key.padEnd(w)}  ${r.ok ? r.medido : `${r.medido}   ≠ esperado: ${r.esperado}`}`);
    if (r.nota) out.push(`    ${" ".repeat(w)}  ${r.nota}`);
  }
  return out.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────

const VALUE_FLAGS = new Set([
  "pkg", "tag", "commit", "repo", "workflow", "event", "from-dir", "check-release-record",
]);

export function parseArgs(argv) {
  const flag = (name, fallback = undefined) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
  };
  // Enumerar las flags-con-valor evita el clásico de tratar el valor de una
  // flag como posicional (o al revés) según el orden en la línea de comandos.
  const positional = argv.filter((a, i) => {
    if (a.startsWith("--")) return false;
    const prev = argv[i - 1];
    return !(prev?.startsWith("--") && VALUE_FLAGS.has(prev.slice(2)));
  });
  const version = positional[0];
  return {
    version,
    pkg: flag("pkg", "reactigoded"),
    tag: flag("tag", version ? `v${version}` : undefined),
    commit: flag("commit"),
    repo: flag("repo", "ivangc1/reactigoded"),
    workflow: flag("workflow", ".github/workflows/release.yml"),
    event: flag("event", "push"),
    fromDir: flag("from-dir"),
    record: flag("check-release-record"),
    asJson: argv.includes("--json"),
  };
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts.version || !opts.commit) {
    console.error(
      "uso: node scripts/verify-provenance.mjs <version> --tag <tag> --commit <sha>\n" +
        "     [--pkg <nombre>] [--repo <owner/repo>] [--workflow <path>] [--event <nombre>]\n" +
        "     [--check-release-record <fichero>] [--from-dir <dir>] [--json]\n\n" +
        (opts.version ? "falta --commit <sha>: sin el commit esperado no hay nada que afirmar." : ""),
    );
    return 2;
  }

  const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
  const die = (msg) => {
    console.error(`\n✖ verify-provenance: ${msg}\n`);
    return 1;
  };

  let meta;
  if (opts.fromDir) {
    meta = readJson(resolve(opts.fromDir, "meta.json"));
  } else {
    const { execFileSync } = await import("node:child_process");
    meta = JSON.parse(
      execFileSync("npm", ["view", `${opts.pkg}@${opts.version}`, "--json"], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      }),
    );
  }

  const attUrl = meta?.dist?.attestations?.url;
  if (!attUrl) return die(`${opts.pkg}@${opts.version} no tiene attestations — un publish manual no las adjunta.`);

  let bundleDoc;
  if (opts.fromDir) {
    bundleDoc = readJson(resolve(opts.fromDir, "attestations.json"));
  } else {
    const res = await fetch(attUrl);
    if (!res.ok) return die(`no se pudo descargar el bundle de attestations (${String(res.status)}) desde ${attUrl}`);
    bundleDoc = await res.json();
  }

  const { slsa: slsaAll, npm: npmAll } = selectAttestations(bundleDoc);
  const signatures = {
    slsa: slsaAll.length === 1 ? await verifySlsaSignature(slsaAll[0].bundle) : { ok: false, detail: "sin SLSA única" },
    npm: { ok: false, detail: "no evaluada" },
  };
  if (npmAll.length === 1) {
    let keysDoc;
    const localKeys = opts.fromDir ? resolve(opts.fromDir, "keys.json") : null;
    if (localKeys && existsSync(localKeys)) {
      keysDoc = readJson(localKeys);
    } else {
      const res = await fetch(NPM_KEYS_URL);
      if (!res.ok) return die(`no se pudieron descargar las claves del registro (${String(res.status)})`);
      keysDoc = await res.json();
    }
    signatures.npm = verifyNpmSignatureWithKeys(npmAll[0].bundle, keysDoc);
  }

  let record = null;
  if (opts.record) {
    if (!existsSync(opts.record)) return die(`--check-release-record: no existe ${opts.record}`);
    record = readJson(opts.record);
  }

  const expected = {
    pkg: opts.pkg,
    version: opts.version,
    tag: opts.tag,
    commit: opts.commit,
    repo: opts.repo,
    workflow: opts.workflow,
    event: opts.event,
  };
  const rows = buildRows({ meta, bundleDoc, expected, signatures, record });
  const failed = rows.filter((r) => !r.ok);

  if (opts.asJson) {
    console.log(JSON.stringify({ ...expected, ok: failed.length === 0, rows }, null, 2));
    return failed.length === 0 ? 0 : 1;
  }

  console.log(formatReport(rows, expected));
  if (failed.length === 0) {
    console.log(`\n✓ verify-provenance: ${String(rows.length)} afirmaciones verificadas.\n`);
    return 0;
  }
  console.error(
    `\n✖ verify-provenance: ${String(failed.length)} de ${String(rows.length)} afirmaciones NO se sostienen.\n\n` +
      `La provenance es lo que un tercero seguiría para auditar este release. Si \`attested-ref\`\n` +
      `o \`attested-commit\` no coinciden con el tag, la firma es criptográficamente válida pero\n` +
      `apunta al árbol equivocado: peor que no tener provenance, porque parece correcta.\n\n` +
      `Si esto salta en el workflow: NO reintentes con \`workflow_dispatch\` — npm deriva la SLSA\n` +
      `del evento, no del checkout, así que un dispatch volvería a firmar \`refs/heads/main\`.\n` +
      `La salida correcta es un tag nuevo con el workflow ya arreglado.`,
  );
  return 1;
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) process.exit(await main(process.argv.slice(2)));
