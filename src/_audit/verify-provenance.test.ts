/**
 * verify-provenance.test.ts — gate 1.0.0, §6 R1/R2.
 *
 * Fija el comportamiento de `scripts/verify-provenance.mjs`, el gate que
 * comprueba que la provenance publicada dice la verdad sobre qué se publicó y
 * desde dónde.
 *
 * El fixture NO es sintético: es el bundle real de `reactigoded@1.0.0-rc.1`
 * descargado del registro (`src/_audit/fixtures/provenance/rc1/`), o sea el
 * artefacto que produjo A-REL-01. Eso da al test dos propiedades que un
 * fixture inventado no tendría: (1) las firmas son firmas de verdad, así que
 * la verificación criptográfica se ejercita completa; (2) el caso negativo es
 * un defecto histórico real, no una hipótesis — si alguien "arregla" el gate
 * hasta que rc.1 pase, el test lo caza.
 *
 * El caso POSITIVO se construye reescribiendo el statement (ref/commit/evento
 * correctos) e inyectando firmas válidas: `buildRows` recibe el resultado de
 * la verificación, no la ejecuta, precisamente para poder testear la lógica de
 * comparación sin depender de la red ni de una clave privada.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SLSA_PREDICATE,
  NPM_PREDICATE_PREFIX,
  pae,
  tarballSha512Hex,
  selectAttestations,
  verifyNpmSignatureWithKeys,
  buildRows,
  parseArgs,
  deriveDistTag,
} from "../../scripts/verify-provenance.mjs";
import type {
  Attestation,
  AttestationsDoc,
  NpmMeta,
  ProvenanceRow,
  RegistryKeysDoc,
  SlsaStatement,
} from "../../scripts/verify-provenance.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fx = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(here, "fixtures/provenance/rc1", name), "utf8"));

const META = fx("meta.json") as NpmMeta;
const BUNDLE = fx("attestations.json") as AttestationsDoc;
const KEYS = fx("keys.json") as RegistryKeysDoc;

const decodeStatement = (att: Attestation): SlsaStatement =>
  JSON.parse(Buffer.from(att.bundle.dsseEnvelope.payload, "base64").toString("utf8")) as SlsaStatement;

const RC1_TAG = "v1.0.0-rc.1";
const RC1_COMMIT = "318e159e42492f6d3da8cd4c26e7aecc08a0f148";
/** El commit de `main` que la attestation firmó por error — el corazón de A-REL-01. */
const MAIN_COMMIT = "f4e45d6972a7b2750dc21f68f7babae71ec895a8";

const EXPECTED = {
  pkg: "reactigoded",
  version: "1.0.0-rc.1",
  tag: RC1_TAG,
  commit: RC1_COMMIT,
  repo: "ivangc1/reactigoded",
  workflow: ".github/workflows/release.yml",
  event: "push",
};
const SIGS_OK = {
  slsa: { ok: true, detail: "test" },
  npm: { ok: true, detail: "test" },
};

const red = (rows: ProvenanceRow[]): string[] => rows.filter((r) => !r.ok).map((r) => r.key);
const byKey = (rows: ProvenanceRow[], key: string): ProvenanceRow | undefined =>
  rows.find((r) => r.key === key);
/** Igual que `byKey` pero exige que la fila exista: si el gate deja de emitirla,
 *  el test debe romper ahí y no en un `undefined.ok` opaco. */
const mustRow = (rows: ProvenanceRow[], key: string): ProvenanceRow => {
  const r = byKey(rows, key);
  if (!r) throw new Error(`el gate no emitió la fila '${key}'`);
  return r;
};

/** Desenvuelve lo que el tipo declara opcional. En un test, un elemento
 *  ausente es un fixture roto: mejor reventar con mensaje que arrastrar un
 *  `undefined` hasta una aserción que pasaría por otra razón. */
function must<T>(v: T | undefined, que: string): T {
  if (v === undefined) throw new Error(`falta ${que} en el fixture`);
  return v;
}

/** Reescribe el statement SLSA del fixture y lo vuelve a empaquetar en un bundle. */
function withStatement(mutate: (statement: SlsaStatement) => void): AttestationsDoc {
  const doc = structuredClone(BUNDLE);
  const slsa = doc.attestations.find((a) => a.predicateType === SLSA_PREDICATE);
  if (!slsa) throw new Error("el fixture no trae attestation SLSA");
  const st = decodeStatement(slsa);
  mutate(st);
  slsa.bundle.dsseEnvelope.payload = Buffer.from(JSON.stringify(st), "utf8").toString("base64");
  return doc;
}

/** El statement que un publish correcto por push de tag habría producido. */
function correctedBundle(): AttestationsDoc {
  return withStatement((st) => {
    const bd = st.predicate.buildDefinition;
    bd.externalParameters.workflow.ref = `refs/tags/${RC1_TAG}`;
    const dep = must(bd.resolvedDependencies[0], 'resolvedDependencies[0]');
    dep.uri = `git+https://github.com/ivangc1/reactigoded@refs/tags/${RC1_TAG}`;
    dep.digest.gitCommit = RC1_COMMIT;
    bd.internalParameters.github.event_name = "push";
  });
}

describe("selección de attestation por predicateType (R2)", () => {
  it("el bundle real trae 2 attestations y el índice 0 NO es la SLSA", () => {
    // Esta es la razón por la que el guard anterior leía el documento
    // equivocado: cogía `attestations[0]` a ciegas.
    expect(BUNDLE.attestations).toHaveLength(2);
    expect(must(BUNDLE.attestations[0], 'attestations[0]').predicateType).toMatch(NPM_PREDICATE_PREFIX);
    expect(must(BUNDLE.attestations[1], 'attestations[1]').predicateType).toBe(SLSA_PREDICATE);
  });

  it("selecciona la SLSA sea cual sea el orden del array", () => {
    const straight = selectAttestations(BUNDLE);
    const shuffled = selectAttestations({ attestations: [...BUNDLE.attestations].reverse() });
    expect(straight.slsa).toHaveLength(1);
    expect(shuffled.slsa).toHaveLength(1);
    expect(must(straight.slsa[0], 'slsa[0]').predicateType).toBe(SLSA_PREDICATE);
    expect(must(shuffled.slsa[0], 'slsa[0]').predicateType).toBe(SLSA_PREDICATE);
  });

  it("0 y >1 SLSA son AMBOS fallo — nunca se elige una arbitrariamente", () => {
    const slsa = BUNDLE.attestations.find((a) => a.predicateType === SLSA_PREDICATE);

    const vacio = buildRows({ meta: META, bundleDoc: { attestations: [] }, expected: EXPECTED, signatures: SIGS_OK });
    expect(mustRow(vacio, "slsa-count").ok).toBe(false);
    expect(mustRow(vacio, "slsa-count").medido).toBe("0");

    const doble = buildRows({
      meta: META,
      bundleDoc: { attestations: [slsa, structuredClone(slsa)] },
      expected: EXPECTED,
      signatures: SIGS_OK,
    });
    expect(mustRow(doble, "slsa-count").ok).toBe(false);
    expect(mustRow(doble, "slsa-count").medido).toBe("2");
    // Fail-closed de verdad: al no haber SLSA única no se emiten filas que
    // afirmen nada sobre el contenido.
    expect(byKey(doble, "attested-ref")).toBeUndefined();
  });
});

describe("el caso negativo real: rc.1 (A-REL-01)", () => {
  it("caza exactamente las 4 afirmaciones derivadas del evento, y ninguna más", () => {
    const rows = buildRows({ meta: META, bundleDoc: BUNDLE, expected: EXPECTED, signatures: SIGS_OK });
    expect(red(rows).sort()).toEqual(["attested-commit", "attested-ref", "event-name", "resolved-uri"]);
  });

  it("el tarball y el gitHead SÍ estaban bien — lo roto era la evidencia", () => {
    const rows = buildRows({ meta: META, bundleDoc: BUNDLE, expected: EXPECTED, signatures: SIGS_OK });
    expect(mustRow(rows, "gitHead").ok).toBe(true);
    expect(mustRow(rows, "subject-digest").ok).toBe(true);
    expect(mustRow(rows, "attested-commit").medido).toBe(MAIN_COMMIT);
    expect(mustRow(rows, "event-name").medido).toBe("workflow_dispatch");
  });
});

describe("el caso positivo: un publish por push de tag", () => {
  it("no deja ninguna fila roja", () => {
    const rows = buildRows({ meta: META, bundleDoc: correctedBundle(), expected: EXPECTED, signatures: SIGS_OK });
    expect(red(rows)).toEqual([]);
  });

  it("una firma inválida tumba el conjunto aunque los datos cuadren", () => {
    const rows = buildRows({
      meta: META,
      bundleDoc: correctedBundle(),
      expected: EXPECTED,
      signatures: { slsa: { ok: false, detail: "firma manipulada" }, npm: { ok: true, detail: "test" } },
    });
    expect(red(rows)).toEqual(["slsa-signature"]);
  });

  it("un digest de subject alterado se caza aunque el resto cuadre", () => {
    const doc = withStatement((st) => {
      const bd = st.predicate.buildDefinition;
      bd.externalParameters.workflow.ref = `refs/tags/${RC1_TAG}`;
      must(bd.resolvedDependencies[0], 'resolvedDependencies[0]').uri = `git+https://github.com/ivangc1/reactigoded@refs/tags/${RC1_TAG}`;
      must(bd.resolvedDependencies[0], 'resolvedDependencies[0]').digest.gitCommit = RC1_COMMIT;
      bd.internalParameters.github.event_name = "push";
      must(st.subject[0], 'subject[0]').digest.sha512 = "00".repeat(64);
    });
    const rows = buildRows({ meta: META, bundleDoc: doc, expected: EXPECTED, signatures: SIGS_OK });
    expect(red(rows)).toEqual(["subject-digest"]);
  });
});

describe("verificación criptográfica real contra las claves del registro", () => {
  const npmAtt = must(
    BUNDLE.attestations.find((a) => a.predicateType.startsWith(NPM_PREDICATE_PREFIX)),
    'attestation npm-publish',
  );

  it("la attestation npm-publish del fixture verifica con su clave declarada", () => {
    const res = verifyNpmSignatureWithKeys(npmAtt.bundle, KEYS, new Date("2026-07-27T00:00:00Z"));
    expect(res.ok).toBe(true);
  });

  it("un byte alterado en el payload invalida la firma", () => {
    const tampered = structuredClone(npmAtt.bundle);
    const bytes = Buffer.from(tampered.dsseEnvelope.payload, "base64");
    bytes.writeUInt8(must(bytes.at(10), "byte 10 del payload") ^ 0xff, 10);
    tampered.dsseEnvelope.payload = bytes.toString("base64");
    expect(verifyNpmSignatureWithKeys(tampered, KEYS).ok).toBe(false);
  });

  it("una clave desconocida es fallo, no un pase silencioso", () => {
    expect(verifyNpmSignatureWithKeys(npmAtt.bundle, { keys: [] }).ok).toBe(false);
  });

  it("una clave caducada es fallo aunque la firma cuadre", () => {
    const expirada = { keys: KEYS.keys.map((k) => ({ ...k, expires: "2020-01-01T00:00:00.000Z" })) };
    expect(verifyNpmSignatureWithKeys(npmAtt.bundle, expirada).ok).toBe(false);
  });

  it("PAE codifica según DSSEv1 (longitudes en bytes, no en caracteres)", () => {
    // El acento fuerza la diferencia byte≠carácter: si alguien reimplementa
    // PAE con `.length` de string, este vector lo caza.
    expect(pae("app/x.é", Buffer.from("hola", "utf8")).toString("utf8")).toBe("DSSEv1 8 app/x.é 4 hola");
  });
});

describe("piezas de apoyo", () => {
  it("tarballSha512Hex convierte la integrity del registro al formato del subject", () => {
    const hex = tarballSha512Hex(META.dist?.integrity);
    const slsa = BUNDLE.attestations.find((a) => a.predicateType === SLSA_PREDICATE);
    if (!slsa) throw new Error("el fixture no trae attestation SLSA");
    expect(hex).toBe(must(decodeStatement(slsa).subject[0], 'subject[0]').digest.sha512);
  });

  it("tarballSha512Hex rechaza lo que no sea sha512 en vez de inventarse un valor", () => {
    expect(tarballSha512Hex("sha1-abc")).toBeNull();
    expect(tarballSha512Hex(undefined)).toBeNull();
  });

  it("parseArgs no confunde el valor de una flag con el posicional", () => {
    const a = parseArgs(["--tag", "v1.2.3", "1.2.3", "--commit", "deadbeef"]);
    expect(a.version).toBe("1.2.3");
    expect(a.tag).toBe("v1.2.3");
    expect(a.commit).toBe("deadbeef");
  });

  it("el tag por defecto se deriva de la versión", () => {
    expect(parseArgs(["9.9.9", "--commit", "x"]).tag).toBe("v9.9.9");
  });
});

/**
 * El registro durable existe para afirmar el DIST-TAG: la provenance prueba
 * paquete, commit y workflow, pero no el canal, y en el registro npm un
 * dist-tag es un puntero mutable. Se verificaba todo el documento MENOS ese
 * campo, así que una regresión del generador o una sobrescritura del asset
 * colaban un canal falso con el gate en verde (codex).
 */
describe("el dist-tag del registro durable", () => {
  const RECORD_BASE = {
    version: EXPECTED.version,
    tag: EXPECTED.tag,
    tagCommit: EXPECTED.commit,
    distTag: "rc",
    distTagsObservados: ["rc"],
    attestationUrl: META.dist?.attestations?.url ?? null,
    tarballSha512: tarballSha512Hex(META.dist?.integrity),
  };
  const filasCon = (record: Record<string, unknown>): ProvenanceRow[] =>
    buildRows({ meta: META, bundleDoc: correctedBundle(), expected: EXPECTED, signatures: SIGS_OK, record });
  const fila = (rows: ProvenanceRow[], key: string): ProvenanceRow => {
    const r = rows.find((x) => x.key === key);
    if (!r) throw new Error(`no se emitió la fila ${key}`);
    return r;
  };

  it("acepta el dist-tag que corresponde a la versión", () => {
    expect(fila(filasCon(RECORD_BASE), "record-distTag").ok).toBe(true);
  });

  it("RECHAZA un canal falso — el caso que se colaba entero", () => {
    // Un registro por lo demás perfecto, con `latest` en vez de `rc`: la
    // prerelease diciendo que salió por el canal estable.
    const rows = filasCon({ ...RECORD_BASE, distTag: "latest", distTagsObservados: ["latest"] });
    expect(fila(rows, "record-distTag").ok).toBe(false);
    // Y ninguna otra fila del registro se entera, que es justo por qué hacía
    // falta esta: sin ella el documento pasa verde.
    for (const k of ["record-version", "record-tag", "record-tagCommit", "record-attestationUrl"]) {
      expect(fila(rows, k).ok).toBe(true);
    }
  });

  it("rechaza el campo ausente en vez de darlo por bueno", () => {
    const sinTag = Object.fromEntries(
      Object.entries(RECORD_BASE).filter(([k]) => k !== "distTag"),
    );
    expect(fila(filasCon(sinTag), "record-distTag").ok).toBe(false);
  });

  it("caza un registro que se contradice a sí mismo", () => {
    // Aplicado `rc` pero observados solo `latest`: el workflow valida al
    // escribir que el tag apunte de verdad a esta versión, así que esto no
    // puede salir de una ejecución sana.
    const rows = filasCon({ ...RECORD_BASE, distTagsObservados: ["latest"] });
    expect(fila(rows, "record-distTag").ok).toBe(true);
    expect(fila(rows, "record-distTag-coherente").ok).toBe(false);
  });

  it("--dist-tag fuerza el esperado, para un release publicado a mano", () => {
    const rows = buildRows({
      meta: META,
      bundleDoc: correctedBundle(),
      expected: { ...EXPECTED, distTag: "canary" },
      signatures: SIGS_OK,
      record: { ...RECORD_BASE, distTag: "canary", distTagsObservados: ["canary"] },
    });
    expect(fila(rows, "record-distTag").ok).toBe(true);
  });
});

/**
 * `deriveDistTag` REPLICA la derivación del workflow (`${PKG#*-}` /
 * `${PRE%%.*}`) en vez de compartir código con ella: un verificador que
 * importase la derivación del productor no verificaría nada. El precio de esa
 * decisión es que las dos pueden divergir, así que la tabla fija la
 * equivalencia — cada fila se midió ejecutando el `case` real de bash.
 */
describe("deriveDistTag replica la derivación del workflow", () => {
  const TABLA: [string, string][] = [
    ["1.0.0", "latest"],
    ["1.0.0-rc.1", "rc"],
    ["1.0.0-rc.2", "rc"],
    ["1.0.0-beta.26", "beta"],
    ["1.0.0-alpha", "alpha"],
    ["1.0.0-rc", "rc"],
    ["1.0.0-0", "0"],
    ["1.0.0-2026.1", "2026"],
    ["2.0.0-next.1+build.5", "next"],
    ["1.0.0-x.7.z.92", "x"],
    ["1.0.0+build", "latest"],
    ["1.0.0-alpha-beta.1", "alpha-beta"],
    ["1.0.0-rc.1+meta", "rc"],
    ["1.0.0+a-b", "b"],
    ["0.0.1-canary.abc.def", "canary"],
    ["1.0.0-", ""],
    ["1.0.0-.", ""],
    ["10.20.30-RC.1", "RC"],
  ];
  it.each(TABLA)("%s → %s", (version, esperado) => {
    expect(deriveDistTag(version)).toBe(esperado);
  });
});
