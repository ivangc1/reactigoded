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
 *     [--check-release-record <fichero.json>] [--dist-tag <tag>] \
 *     [--wait-for-publish <segundos>] \
 *     [--json] [--from-dir <dir>]
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
 * Deriva el dist-tag que le corresponde a una versión: el primer componente del
 * identificador de prerelease, o `latest` si no la hay. `1.0.0-rc.2` → `rc`,
 * `1.0.0` → `latest`.
 *
 * Réplica DELIBERADA de la derivación del workflow (`${PKG#*-}` / `${PRE%%.*}`).
 * No se comparte código a propósito: importar la derivación del productor
 * convertiría la comprobación en una tautología.
 */
export function deriveDistTag(version) {
  const v = String(version);
  const guion = v.indexOf("-");
  if (guion < 0) return "latest";
  const pre = v.slice(guion + 1);
  const punto = pre.indexOf(".");
  return punto < 0 ? pre : pre.slice(0, punto);
}

/**
 * Construye la tabla de afirmaciones. PURA: las verificaciones de firma se le
 * INYECTAN ya resueltas (`signatures`), para que el test pueda ejercitar la
 * lógica de comparación sin red y, a la vez, simular una firma inválida.
 */
/**
 * ¿Es este error el 404 de «esa versión todavía no existe»?
 *
 * Recibe SOLO `stderr`, y exige la línea ESTRUCTURADA que emite npm:
 *
 *     npm error code E404
 *
 * Antes buscaba `\bE404\b` en cualquier parte de `stderr + message`, que es
 * justo lo que el comentario decía no hacer. `execFileSync` refleja el comando
 * en `message` (`Command failed: npm view <pkg>@<version> --json`), así que con
 * una versión que contenga el token —`1.0.0-E404` es SemVer válido— CUALQUIER
 * fallo (E401, red, JSON corrupto) se clasificaba como «aún no existe» y se
 * reintentaba hasta agotar el plazo, enterrando la causa real bajo un timeout
 * (codex).
 *
 * `ERR!` se acepta además de `error` porque es el prefijo de npm < 10; el
 * formato medido en npm 11 es `npm error code E404`.
 */
export function esVersionAusente(stderr) {
  return /^\s*npm (?:error|ERR!)\s+code\s+E404\s*$/m.test(String(stderr ?? ""));
}

/**
 * Lee `npm view <pkg>@<version> --json`, opcionalmente esperando a que la
 * versión sea VISIBLE.
 *
 * Por qué existe la espera, medido en el release de `1.0.0-rc.2`: el paso
 * `Publicar` terminó a las 21:08:53 y este gate corrió a las 21:08:53 — el
 * mismo segundo. `npm view` respondió `E404 No match found for version
 * 1.0.0-rc.2` sobre un paquete que SÍ estaba publicado (`gitHead` correcto,
 * `dist-tags.rc` aplicado). El publish escribe y la vía de lectura del registro
 * tarda en reflejarlo; el gate leía sin margen y tumbaba el job DESPUÉS de
 * haber publicado, dejando el registro durable sin escribir.
 *
 * La espera es OPT-IN y acotada, no un retry global:
 *  - Sin `--wait-for-publish`, un E404 falla al instante. Es lo correcto en el
 *    uso post-hoc, donde «no existe» es la respuesta verdadera y esperar dos
 *    minutos para confirmarlo solo enmascara el resultado.
 *  - Solo se reintenta el E404. Cualquier otro fallo de `npm view` (red, auth,
 *    JSON corrupto) es terminal: reintentarlo convertiría un fallo real en un
 *    timeout, que informa peor.
 *  - Agotado el presupuesto, FALLA. No hay salida silenciosa.
 */
export function limiteDePropagacion(waitForPublish) {
  const espera = Number(waitForPublish ?? 0);
  // ALLOWLIST POSITIVO, no lista de casos malos. `Number("bogus")` y
  // `Number(undefined)` —esto último es `--wait-for-publish` sin valor al final
  // de argv— dan `NaN`, y con `NaN` el presupuesto deja de acotar:
  // `Date.now() >= NaN` es SIEMPRE falso y la pausa calculada sale `NaN`, que
  // `setTimeout` trata como 0. O sea un bucle infinito martilleando el registro
  // justo en el gate que existe para no publicar a ciegas. `Infinity` hace lo
  // mismo por la otra puerta (codex).
  //
  // Enumerar `NaN` e `Infinity` habría dejado fuera la siguiente categoría que
  // no se me ocurriera. Se exige finito y no negativo: lo demás cae, sin haber
  // tocado el registro todavía.
  //
  // Y el techo NO es adorno. Con solo `Number.isFinite` bastaba `1e308` para
  // reabrirlo: es finito, pero `1e308 * 1000` DESBORDA a `Infinity`, así que
  // `limite` volvía a ser inalcanzable (codex). Validar el deadline calculado
  // tampoco cerraría del todo — `1e15` segundos es finito y el bucle correría
  // igual hasta que muriese el job. Lo que acota es el INTERVALO aceptado.
  //
  // 3600 sale de para qué existe esto: el desfase de propagación del registro
  // se mide en segundos (el caso real fueron <2 minutos), y una espera mayor
  // que una hora no sobreviviría al job de todas formas. No es un número
  // mágico, es el límite de lo que el mecanismo puede afirmar que hace.
  if (!Number.isFinite(espera) || espera < 0 || espera > 3600) {
    throw new Error(
      `--wait-for-publish inválido: ${String(waitForPublish)}. ` +
        "Debe ser un número de segundos entre 0 y 3600.",
    );
  }
  return { espera, limite: Date.now() + espera * 1000 };
}

/**
 * Reintenta `intento` mientras el fallo signifique «todavía no propagado» y
 * quede presupuesto. Agotado, lanza.
 *
 * Existe porque la espera se puso donde se vio el fallo en vez de donde está la
 * clase. En `rc.2` reventó `npm view`; se le puso espera, y en `rc.3` reventó la
 * SIGUIENTE lectura del registro —el bundle de attestations, 404— que no tenía
 * ninguna. Publicar deja un intervalo en el que el paquete existe y sus
 * documentos derivados aún no, y eso afecta a TODA lectura por versión, no a la
 * que casualmente falló primero.
 */
export async function reintentarMientrasPropague(
  intento,
  { esAusente, limite, pausa, mensajeAgotado },
) {
  let n = 0;
  for (;;) {
    try {
      return await intento();
    } catch (err) {
      if (!esAusente(err)) throw err;
      if (Date.now() >= limite) throw new Error(mensajeAgotado(), { cause: err });
      n += 1;
      // Backoff con techo: los primeros reintentos son rápidos porque la
      // propagación suele resolverse en segundos, y el techo evita dormir más
      // de lo que queda de presupuesto.
      await pausa(Math.min(2000 * n, 15000, Math.max(0, limite - Date.now())));
    }
  }
}

/**
 * Lee `npm view <pkg>@<version> --json`, esperando opcionalmente a que la
 * versión sea visible. `limite` permite COMPARTIR el presupuesto con las demás
 * lecturas del registro: la espera es «este publish tiene N segundos para
 * hacerse visible», no N segundos por endpoint.
 */
export async function leerDelRegistro(opts, { dormir, ejecutar, limite } = {}) {
  const { espera, limite: propio } = limiteDePropagacion(opts.waitForPublish);
  const tope = limite ?? propio;
  const pausa = dormir ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  // Se INYECTA en vez de mockear `node:child_process`: el mock de módulo se
  // demostró frágil —dejaba pasar la llamada real al registro en unos tests y
  // no en otros, con lo que el test verde no probaba lo que decía— y además
  // esto deja el gate ejercitable sin red.
  const correr =
    ejecutar ??
    (async () => {
      const { execFileSync } = await import("node:child_process");
      return execFileSync("npm", ["view", `${opts.pkg}@${opts.version}`, "--json"], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
    });
  return reintentarMientrasPropague(
    async () => {
      try {
        return JSON.parse(await correr());
      } catch (err) {
        // La CLASIFICACIÓN va contra `stderr` solo; el `message` se usa nada
        // más que para el informe. Mezclarlos era el bug: `message` lleva el
        // comando reflejado, o sea la versión pedida, o sea texto controlado
        // por la entrada dentro del dato con el que se decide.
        const stderr = String(err?.stderr ?? "");
        // El E404 se re-lanza CRUDO para que el reintento pueda reconocerlo.
        if (esVersionAusente(stderr)) throw err;
        // Un fallo terminal se re-lanza con la salida incorporada: `execFileSync`
        // deja el motivo real en `stderr` y pone «Command failed» en `message`,
        // así que propagarlo tal cual esconde la causa.
        const salida = `${stderr}\n${err?.message ?? ""}`;
        throw new Error(`npm view ${opts.pkg}@${opts.version} falló:\n${salida.trim()}`, {
          cause: err,
        });
      }
    },
    {
      esAusente: (err) => esVersionAusente(String(err?.stderr ?? "")),
      limite: tope,
      pausa,
      // LANZA, no devuelve. `die` imprime y devuelve 1, así que un
      // `return die(...)` dejaría `meta = 1` y el fallo se reportaría como «no
      // tiene attestations» — un mensaje falso tapando el real.
      mensajeAgotado: () =>
        espera > 0
          ? `${opts.pkg}@${opts.version} sigue sin aparecer en el registro tras ${espera}s de espera.`
          : `${opts.pkg}@${opts.version} no está publicado (E404).`,
    },
  );
}

/**
 * Descarga el bundle de attestations, con la MISMA espera acotada y el MISMO
 * presupuesto que la lectura de metadatos.
 *
 * Un 404 aquí justo después de publicar no significa «este paquete no tiene
 * provenance», significa «todavía no». Es lo que tumbó el release de `rc.3`:
 * `npm view` ya respondía —la espera hizo su trabajo— y este endpoint aún no.
 * Cualquier otro estado (500, red, JSON inválido) es terminal.
 */
export async function descargarAttestations(attUrl, { limite, pausa, buscar } = {}) {
  const pedir = buscar ?? ((url) => fetch(url));
  const dormir = pausa ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  return reintentarMientrasPropague(
    async () => {
      const res = await pedir(attUrl);
      if (res.ok) return res.json();
      const err = new Error(
        `no se pudo descargar el bundle de attestations (${String(res.status)}) desde ${attUrl}`,
      );
      err.status = res.status;
      throw err;
    },
    {
      esAusente: (err) => err?.status === 404,
      limite: limite ?? Date.now(),
      pausa: dormir,
      mensajeAgotado: () =>
        `el bundle de attestations sigue dando 404 tras agotar la espera: ${attUrl}`,
    },
  );
}

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

    // El dist-tag es LA razón de ser de este registro: la provenance prueba
    // paquete, commit y workflow, pero no dice nada del canal, y en el registro
    // npm el dist-tag es un puntero MUTABLE. Se comprobaba todo menos justo el
    // campo por el que existe el artefacto, así que una regresión del generador
    // o una sobrescritura manual del asset colaban un canal falso con el gate
    // en verde (codex).
    //
    // El esperado se DERIVA de la versión con la misma regla que el workflow,
    // reimplementada aquí a propósito: un verificador que importase la
    // derivación del productor no verificaría nada, se limitaría a estar de
    // acuerdo consigo mismo. Si las dos derivaciones divergen, esto falla — que
    // es exactamente lo que se quiere.
    row(
      "record-distTag",
      expected.distTag ?? deriveDistTag(version),
      record.distTag ?? "<ausente>",
      expected.distTag ? "esperado forzado con --dist-tag" : "derivado de la versión",
    );

    // Coherencia interna del propio registro. El workflow valida al escribirlo
    // que el dist-tag aplicado apunte de verdad a esta versión, así que un
    // registro válido tiene su `distTag` dentro de los observados. Si no, el
    // documento se contradice a sí mismo.
    //
    // La fila se emite SIEMPRE. Estaba bajo un `if (Array.isArray(...))`, o sea
    // que un registro sin el campo —regresión del generador, asset
    // sobrescrito a mano— no producía fila y el gate salía verde por no haber
    // nada que comparar (codex). Eso contradecía el contrato escrito en la
    // cabecera de este mismo fichero: error ante CUALQUIER cosa que no se
    // pueda afirmar. Ausente no es «no aplica», es «no verificable» ⇒ fallo.
    const observados = record.distTagsObservados;
    row(
      "record-distTag-coherente",
      true,
      Array.isArray(observados) ? observados.includes(record.distTag) : "<ausente>",
      Array.isArray(observados)
        ? `observados al escribir: ${observados.join(", ") || "(ninguno)"}`
        : "el registro no trae `distTagsObservados`",
    );
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
  "dist-tag", "wait-for-publish",
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
    distTag: flag("dist-tag"),
    waitForPublish: Number(flag("wait-for-publish", "0")),
    asJson: argv.includes("--json"),
  };
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts.version || !opts.commit) {
    console.error(
      "uso: node scripts/verify-provenance.mjs <version> --tag <tag> --commit <sha>\n" +
        "     [--pkg <nombre>] [--repo <owner/repo>] [--workflow <path>] [--event <nombre>]\n" +
        "     [--check-release-record <fichero>] [--dist-tag <tag>] [--wait-for-publish <s>]\n" +
        "     [--from-dir <dir>] [--json]\n\n" +
        (opts.version ? "falta --commit <sha>: sin el commit esperado no hay nada que afirmar." : ""),
    );
    return 2;
  }

  const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
  const die = (msg) => {
    console.error(`\n✖ verify-provenance: ${msg}\n`);
    return 1;
  };

  // UN SOLO presupuesto para todas las lecturas del registro. La espera es
  // «este publish tiene N segundos para hacerse visible», no N por endpoint:
  // con un plazo nuevo por lectura el peor caso se multiplicaría por el número
  // de endpoints, que es justo lo que un límite existe para impedir.
  let limite;
  try {
    ({ limite } = limiteDePropagacion(opts.waitForPublish));
  } catch (err) {
    return die(err instanceof Error ? err.message : String(err));
  }

  let meta;
  if (opts.fromDir) {
    meta = readJson(resolve(opts.fromDir, "meta.json"));
  } else {
    try {
      meta = await leerDelRegistro(opts, { limite });
    } catch (err) {
      return die(err instanceof Error ? err.message : String(err));
    }
  }

  const attUrl = meta?.dist?.attestations?.url;
  if (!attUrl) return die(`${opts.pkg}@${opts.version} no tiene attestations — un publish manual no las adjunta.`);

  let bundleDoc;
  if (opts.fromDir) {
    bundleDoc = readJson(resolve(opts.fromDir, "attestations.json"));
  } else {
    try {
      bundleDoc = await descargarAttestations(attUrl, { limite });
    } catch (err) {
      return die(err instanceof Error ? err.message : String(err));
    }
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
    ...(opts.distTag ? { distTag: opts.distTag } : {}),
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
