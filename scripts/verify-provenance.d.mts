/**
 * Declaration file para `verify-provenance.mjs`. Solo describe la superficie
 * exportada para tests (`src/_audit/verify-provenance.test.ts`); el CLI no
 * necesita types. Mantener en sync manualmente con el script.
 */

/** `https://slsa.dev/provenance/v1` — el predicado que lleva las claims de build. */
export declare const SLSA_PREDICATE: string;
/** Prefijo del predicado que firma el registro, no Fulcio. */
export declare const NPM_PREDICATE_PREFIX: string;
/** Endpoint de claves públicas del registro de npm. */
export declare const NPM_KEYS_URL: string;

/** Sobre DSSE tal como viaja dentro de un bundle de sigstore. */
export interface DsseEnvelope {
  /** Statement in-toto serializado y codificado en base64. */
  payload: string;
  /** Normalmente `application/vnd.in-toto+json`. Entra en el PAE. */
  payloadType: string;
  signatures: { sig: string; keyid?: string }[];
}

export interface AttestationBundle {
  dsseEnvelope: DsseEnvelope;
  [k: string]: unknown;
}

export interface Attestation {
  predicateType: string;
  bundle: AttestationBundle;
}

/** El documento que sirve `dist.attestations.url`. */
export interface AttestationsDoc {
  attestations: Attestation[];
}

/** Clave publicada por el registro en `/-/npm/v1/keys`. */
export interface RegistryKey {
  keyid: string;
  keytype: string;
  scheme: string;
  /** SPKI DER en base64. */
  key: string;
  /** ISO-8601, o `null` si no caduca. */
  expires: string | null;
}

export interface RegistryKeysDoc {
  keys: RegistryKey[];
}

/**
 * Statement in-toto que viaja dentro del sobre DSSE de la SLSA. Solo se
 * declaran los campos que el gate lee — el resto del predicado es amplio y
 * tiparlo entero sería copiar la spec sin usarla.
 */
export interface SlsaStatement {
  subject: { name: string; digest: { sha512: string } }[];
  predicate: {
    buildDefinition: {
      externalParameters: { workflow: { ref: string; repository: string; path: string } };
      resolvedDependencies: { uri: string; digest: { gitCommit: string } }[];
      internalParameters: { github: { event_name: string } };
    };
  };
}

/** Metadatos de `npm view <pkg>@<version> --json`, en lo que usa el gate. */
export interface NpmMeta {
  gitHead?: string;
  dist?: {
    /** `sha512-<base64>`. */
    integrity?: string;
    shasum?: string;
    attestations?: { url?: string };
  };
  [k: string]: unknown;
}

/** Resultado de verificar una firma. Se INYECTA en `buildRows` para que la
 *  lógica de comparación sea testeable sin red ni clave privada. */
export interface SignatureResult {
  ok: boolean;
  detail: string;
}

/** Una afirmación de la tabla: qué se esperaba, qué se midió y si cuadra. */
export interface ProvenanceRow {
  key: string;
  ok: boolean;
  esperado: string;
  medido: string;
  nota?: string;
}

/** Lo que el release afirma de sí mismo; el asset `release-record.json`. */
export interface ReleaseRecord {
  version?: string;
  distTag?: string;
  tag?: string;
  tagCommit?: string;
  runId?: string;
  runAttempt?: string;
  gitHead?: string | null;
  tarballSha512?: string | null;
  attestationUrl?: string | null;
}

export interface ExpectedIdentity {
  pkg: string;
  version: string;
  tag: string;
  commit: string;
  repo: string;
  workflow: string;
  event: string;
}

/**
 * DSSE Pre-Authentication Encoding:
 * `DSSEv1 <len(tipo)> <tipo> <len(payload)> <payload>`, con longitudes en
 * BYTES y el payload en crudo (no su base64).
 */
export declare function pae(payloadType: string, payloadBytes: Buffer): Buffer;

/**
 * Convierte `dist.integrity` (`sha512-<base64>`) al hex que usa el `subject`
 * de la attestation. Devuelve `null` si no es un sha512 — nunca un valor
 * inventado, porque una comparación contra basura pasaría por verde.
 */
export declare function tarballSha512Hex(integrity: unknown): string | null;

/** Separa las attestations POR `predicateType`, nunca por índice. */
export declare function selectAttestations(bundleDoc: unknown): {
  slsa: Attestation[];
  npm: Attestation[];
};

/**
 * Verifica la attestation `npm-publish` contra las claves del registro. Pura:
 * recibe las claves ya cargadas y el instante contra el que juzgar la
 * caducidad.
 */
export declare function verifyNpmSignatureWithKeys(
  bundle: AttestationBundle,
  keysDoc: RegistryKeysDoc | { keys: RegistryKey[] },
  now?: Date,
): SignatureResult;

/** Verifica la attestation SLSA contra el trust root de sigstore (Fulcio). */
export declare function verifySlsaSignature(bundle: AttestationBundle): Promise<SignatureResult>;

/**
 * Construye la tabla de afirmaciones. Si no hay exactamente UNA attestation
 * SLSA, devuelve las filas emitidas hasta ese punto y no afirma nada sobre el
 * contenido: fail-closed, en vez de elegir una arbitrariamente.
 */
export declare function buildRows(args: {
  meta: NpmMeta;
  bundleDoc: unknown;
  expected: ExpectedIdentity;
  signatures: { slsa: SignatureResult; npm: SignatureResult };
  record?: ReleaseRecord | null;
}): ProvenanceRow[];

export declare function formatReport(
  rows: ProvenanceRow[],
  ctx: { pkg: string; version: string; tag: string; commit: string },
): string;

export interface ParsedArgs {
  version: string | undefined;
  pkg: string;
  tag: string | undefined;
  commit: string | undefined;
  repo: string;
  workflow: string;
  event: string;
  fromDir: string | undefined;
  record: string | undefined;
  asJson: boolean;
}

/** Parseo de CLI. Las flags-con-valor están enumeradas para no confundir el
 *  valor de una flag con el argumento posicional. */
export declare function parseArgs(argv: string[]): ParsedArgs;
