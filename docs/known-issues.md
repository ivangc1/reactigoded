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
  `"type":"module"`. **El veredicto de attw es sobre los TIPOS y es correcto**;
  el paréntesis que había aquí («un `require` CJS debe pasar a `import()`
  dinámico») era falso en runtime y se ha quitado: ver la corrección de abajo.
- `node10`: 💀 — resolución legacy sin soporte de `exports`; irrelevante
  (engine floor `>=22.22`).
- Entrypoints `styles/*.css`: 💀 — los bundlers los resuelven sin problema, pero
  **no es un falso positivo de attw**. Ver la corrección justo debajo.

> **Corrección de registro (gate 1.0.0, `PR-4`).** El paréntesis de la fila `node16 (from CJS)`
> decía que un `require` desde CJS «debe pasar a `import()` dinámico». En runtime es falso, y
> encima el propio CHANGELOG dice lo contrario en su entrada de D1-P4. Medido sobre el `dist`:
> `require("reactigoded")` devuelve los **97 exports** tanto en **22.12** (el floor anterior)
> como en 24 — Node soporta `require()` síncrono de ESM desde 22.12, con un warning de feature
> experimental. Lo que attw dice sigue siendo cierto **para los tipos**: en la resolución
> `node16 from CJS` los `.d.ts` no se ven como CJS. Son dos cosas distintas y la línea las
> mezclaba en una.

> **Corrección de registro (gate 1.0.0, `A-CSS-01`).** Esta línea decía «falso positivo de attw
> (no entiende exports CSS sin tipos)». Lo primero es cierto, lo segundo no: el hueco es real y
> `tsc` lo ve **sin attw de por medio**. Medido sobre el tarball instalado — un consumer con
> `noUncheckedSideEffectImports: true` recibe **9 × TS2882**, uno por subpath CSS, y **exit 0**
> sin el flag. Es decir: los 9 subpaths no tienen declaración de tipos, y ese flag es
> exactamente el que la exige.
>
> **Workaround del consumer**, una línea en cualquier `.d.ts` de su proyecto:
> ```ts
> declare module "reactigoded/styles/*.css";
> ```
>
> **Por qué no se tipa desde el paquete (todavía)**: exigiría convertir los 9 targets del
> `exports` map de string a objeto con condición `types`, y generar y shippear ~37 `.d.ts`
> vacíos (los 28 fragmentos de `state/` incluidos). Es superficie de `exports` —lo que el freeze
> de 1.0 protege— tocada para un flag opt-in con workaround de una línea. Queda como decisión
> abierta para 1.1.0, ya medida: no es que no se sepa hacer, es que el momento es malo.

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
