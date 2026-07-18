# Vercel Edge — oráculo fiel (#18, cierra el ~5% de `@edge-runtime/vm`)

El runtime-oracle mide las premisas del gate `@server-safe` contra **workerd**
y **Deno** (reales, 13/13 PASS). El tercer runtime del mandato es **Vercel
Edge**, que `@edge-runtime/vm` solo aproxima (~95%): es un sandbox sobre Node
y **filtra globals Node-shared** (`performance.eventLoopUtilization`,
`URL.createObjectURL`, `WebAssembly.Module`…) que en el Edge REAL no existen o
lanzan. Este probe se deploya al Vercel Edge de **producción** — el único
oráculo fiel para ese runtime — y confirma que el catálogo del gate
(`SAFE_GLOBALS`, `EDGE_MISSING_GLOBALS`, premisas) coincide con la realidad.

## Deploy (requiere cuenta Vercel)

`vercel dev` **NO sirve** — corre `@edge-runtime/vm` (el 95%). Hace falta un
deploy de **producción** (runtime Edge real).

```bash
# 0. Regenerar el probe desde el catálogo del gate (OBLIGATORIO si el catálogo
#    cambió: hornea un `typeof <bare>` literal por nombre). `compare` aborta si
#    el probe desplegado no cubre el catálogo actual.
node scripts/runtime-oracle/gen-probe.mjs

# 1. Vercel CLI (si no la tienes)
npm i -g vercel

# 2. Deploy de producción desde ESTE directorio
cd scripts/runtime-oracle/vercel
vercel deploy --prod --yes        # primera vez: te pide login + link a un proyecto

# 3. Comparar contra el catálogo del gate (fail-loud si hay drift DURO). El probe
#    responde por GET con la `presence` ya horneada — un `typeof <identificador
#    -bare>` por nombre. NO se usa enumeración ni `name in globalThis`: en Edge
#    ambas MIENTEN (getOwnPropertyNames omite URL/Blob/fetch aunque funcionen;
#    `in globalThis` da false para ellos). Solo el bare resuelve como el código.
cd -                              # volver al repo root
node scripts/runtime-oracle/compare-vercel.mjs https://<tu-deploy>.vercel.app/api/probe
# equivalente en 2 pasos (para inspeccionar el JSON crudo):
#   curl -s https://<tu-deploy>.vercel.app/api/probe -o /tmp/edge.json
#   node scripts/runtime-oracle/compare-vercel.mjs /tmp/edge.json

# 4. Borrar el deploy efímero cuando termines
vercel rm <nombre-del-proyecto> --yes
```

## Medición pineada (#18) — 2026-07-18, región `lhr1`

Deploy real medido. `compare-vercel.mjs` → **✓ verde** (0 falsos negativos,
premisas 6/6). Resultado, para detectar drift futuro (bump del Edge runtime):

- **Premisas 6/6 PASS**: `elu` absent · `createObjectURL`/`revoke` THROW ·
  `WebAssembly.compile` THROWS `CompileError` · `new Function` THROWS `EvalError` ·
  `new URL` OK.
- **3 FN cazados → `EDGE_MISSING_REAL`** (`DOMException`, `FinalizationRegistry`,
  `WeakRef`): `@edge-runtime/vm` los filtraba de Node; el Edge real no los expone.
  Restados de `SAFE_GLOBALS`.
- **10 `EDGE_MISSING` presentes** (over-strict SEGURO → #190): `CompressionStream`,
  `CustomEvent`, `ByteLengthQueuingStrategy`, `CountQueuingStrategy`,
  `DecompressionStream`, `ReadableByteStreamController`, `ReadableStreamBYOBRequest`,
  `ReadableStreamDefaultController`, `TransformStreamDefaultController`,
  `WritableStreamDefaultController`.

## Interpretación (si un re-run diverge del pin)

- **`SAFE_GLOBAL` ausente** (typeof bare `undefined`) → **falso negativo**: un
  módulo `@server-safe` que lo use bare crashea en producción → restarlo de SAFE
  (a `EDGE_MISSING_REAL` con provenance).
- **`EDGE_MISSING_REAL` presente** → se restó de más: revisar.
- **`EDGE_MISSING` (vm-derivado) presente** → over-strict SEGURO (fail-closed);
  relajar es #190 (`{workerd ∩ Deno ∩ Edge}`). `compare` lo marca WARNING, no falla.
- **premisa que no coincide** → re-clasificar el hazard en el catálogo.

## Notas

- Proyecto Vercel **aislado y efímero** (`package.json`/`vercel.json` propios): NO
  forma parte del paquete npm ni del build del DS. Se deploya, se mide y se borra.
- **`api/probe.ts` es GENERADO** por `../../gen-probe.mjs` desde el catálogo del
  gate (un `typeof <bare>` por nombre — el único test fiel dado el objeto-global
  exótico de Edge). NO editar a mano: editar `api/probe.template.ts` + regenerar.
  Las premisas (hazards) replican las sondas de `../worker.js` (workerd) con
  identificadores bare.
