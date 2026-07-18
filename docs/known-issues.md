# Known issues — reactigoded

Tracking de issues técnicos diferidos. Cada entrada incluye el motivo de la
postergación + link al upstream cuando aplica + condición de re-evaluación.

## `@arethetypeswrong/cli` (attw) — diferido en D1-P3

**Estado**: ✅ crash **RESUELTO upstream** (verificado 2026-07-18 en Node
ARM64 / Debian 13 WSL2). `npx @arethetypeswrong/cli@latest --pack .` ya
corre completo, sin el `Cannot read properties of undefined (reading
'filename')`. El diagnóstico histórico del crash se conserva abajo.

**Resultado actual de attw** (perfil esperado de un paquete ESM-only —
NO defectos del `dist`):
- Entrypoints JS (`reactigoded`, `/server-safe`, `/cn`): `node16 (from
  ESM)` 🟢 + `bundler` 🟢 → los consumers modernos resuelven bien.
- `node16 (from CJS)`: ⚠️ ESM dynamic-import-only — inherente a
  `"type":"module"` (un `require` CJS debe pasar a `import()` dinámico).
- `node10`: 💀 — resolución legacy sin soporte de `exports`; irrelevante
  (engine floor `>=22.12`).
- Entrypoints `styles/*.css`: 💀 — **falso positivo** de attw (no entiende
  exports CSS sin tipos; los bundlers los resuelven sin problema).

**Follow-up (no bloquea rc.1)**: promover attw a gate CI con
`--ignore-rules cjs-resolves-to-esm no-resolution` (cubre la matriz de
resolución node_modules cjs/esm/types que publint no valida). publint
sigue siendo el gate primario.

**Estado histórico**: diferido a follow-up post-beta.24 (por el crash de
abajo, ya resuelto).

**Síntoma**: `attw --pack .` y `attw --from-npm <cualquier-paquete>`
fallan con `Cannot read properties of undefined (reading 'filename')` en
máquinas Linux ARM64 (WSL Debian sobre Surface CLANGARM64). El error
ocurre en `node_modules/@arethetypeswrong/core/dist/createPackage.js:230`
donde `data[0]` (resultado de untar) es `undefined`.

**Diagnóstico**: el comentario en `createPackage.js:226` señala que el
extractor usa el streaming API de `fflate`'s `Gunzip` (issue
[101arrowz/fflate#207](https://github.com/101arrowz/fflate/issues/207))
con una implementación que solo captura el último chunk emitido. Para
tarballs grandes (5 MB+ típico de un design system) la API emite
múltiples chunks y la captura pierde data. Hipótesis sin verificar:
fflate decode en ARM64 emite más chunks que x86_64 por características
del JIT V8.

**Workaround actual**: usar `publint` (sin dep fflate, funciona en
ARM64) como gate de validación de exports. Cobertura ~70% de attw —
publint valida exports config + types resolution patterns; attw valida
también node_modules resolution matrix (cjs/esm/types interaction)
que publint no cubre.

**Re-evaluar cuando**:
- Upstream fflate cierre el issue de streaming.
- O attw cambie a otra librería de extracción de tarballs (zlib nativo
  de Node sería suficiente).
- O en spike de 5 min: `bunx @arethetypeswrong/cli@latest --pack .`
  (Bun usa decompresión nativa, podría bypassar fflate).

**No bloquea**: el CI de GitHub Actions corre en Ubuntu x86_64 donde
attw funciona. Si se requiere validación urgente, ejecutar attw vía CI
ad-hoc (workflow_dispatch step).
