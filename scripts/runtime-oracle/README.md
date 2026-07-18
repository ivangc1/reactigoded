# Runtime oracle — `@server-safe` catalog premises (Auditoría B R5 §4.2 / D3, absorbs #190)

The `@server-safe` gate classifies each catalog member by a **runtime premise** (does it exist in strict
Edge? does calling it throw?). Historically these premises were *asserted* or derived from docs — the root-H
lesson (memory) is that mis-asserting a premise reopens a false-negative by catalog (e.g. classifying
`URL.createObjectURL` as `absence` when it is `present-but-throws` would let the `?.()` sanction silence it).

This directory measures the premises against the **real Edge baseline** (`workerd`, not the leaky
`@edge-runtime/vm`) so they become **continuously measured** instead of asserted.

## Pinned premises (measured against workerd `2026-07-17`, compat dates `2026-07-01` and `2026-07-17`, identical)

| Member | workerd | hazard-kind | gate treatment |
|---|---|---|---|
| `performance.eventLoopUtilization` | `undefined` | absence | allowlist deny; `?.()` / `?? fb` protect |
| `console.table` | present, call works | (diverges in `@edge-runtime/vm`, absent there) | allowlist deny; absence where it diverges |
| `URL.createObjectURL` / `revokeObjectURL` | **THROWS** `not implemented` | **present-but-throws** | denylist; `?.()` does NOT protect; no `?.()` remediation |
| `WebAssembly.compile` / `compileStreaming` / `instantiateStreaming` | **THROWS** `CompileError` (codegen disallowed) | **present-but-throws** | denylist; `?.()` does NOT protect |
| `new Function(...)` | **THROWS** `EvalError` | universal-in-Edge | eval-sink |

## Runner — `npm run oracle` (verified end-to-end, 13/13 premises PASS against real workerd)

`run.mjs` boots **real workerd** against `worker.js`, reads the premise JSON and asserts each of the 13 pinned
premises. It **generates its own `config.capnp`** into a temp dir (the checked-in `config.capnp` is reference
only). **Fail-loud, never skip**: if workerd is absent it exits `1` with instructions — an oracle that "passes"
because the runtime is missing is false coverage.

```
npm run oracle                              # uses node_modules/.bin/workerd if installed
WORKERD_BIN=/path/to/workerd npm run oracle # or point at a binary explicitly
```

Design decisions (baked into `run.mjs`):
- **`workerd` is NOT in `devDependencies`** (~90 MB native binary). Resolved via `$WORKERD_BIN` or
  `node_modules/.bin/workerd` if the repo/CI installs it. Keeps `npm i` light for consumers.
- **The compat date is pinned** (`2026-07-17`) as *part of the premise* — a member can appear behind a future
  compat flag; bumping it is a catalog decision, not a chore. Bumped `2026-07-01`→`2026-07-17` after measuring
  13/13 identical at both dates.

### Cross-runtime corroboration (2026-07-17)

The three mandate runtimes were measured with the same 13 probes:
- **workerd** (faithful, real isolate): 13/13 PASS, 0 drift at both compat dates.
- **Deno** `2.9.3` (faithful, real runtime): most permissive — only divergence is `elu` absent (already covered);
  eval/WASM/`console.table`/`createObjectURL` all work. No Deno-specific hazard uncovered.
- **`@edge-runtime/vm`** (partial — Node-based sandbox): confirms the one Edge-specific divergence
  (`console.table` absent) which the gate covers; the rest leaks Node globals (`elu`, `createObjectURL`,
  `WebAssembly.Module` all falsely "work") so it is **not** faithful beyond Vercel's explicit removals.

### Vercel Edge faithful — #18 DONE (deploy real medido 2026-07-18, lhr1)

El probe de [`vercel/`](./vercel/README.md) se deployó a producción y midió los **119** nombres del catálogo
(`SAFE_GLOBALS ∪ EDGE_MISSING_GLOBALS ∪ EDGE_MISSING_REAL`) con **`typeof <bare>`** — el único test fiel: el
objeto-global de Vercel Edge es **exótico** y miente por enumeración / `in globalThis` / `globalThis[x]` (medido:
`getOwnPropertyNames` da 59 nombres y omite `URL`/`Blob`/`fetch`, que sí funcionan; `globalThis.performance`
da `undefined` pero `typeof performance` bare da `"object"`). Resultado:

- **Premisas: 6/6 PASS** en el Edge real (elu absent, `createObjectURL`/`revoke` THROW, `WebAssembly.compile`
  THROWS `CompileError`, `new Function` THROWS `EvalError`, `new URL` OK).
- **3 falsos negativos cazados** → nuevo set **`EDGE_MISSING_REAL`** (`DOMException`, `FinalizationRegistry`,
  `WeakRef`): `@edge-runtime/vm` los filtraba de Node (falso-presente) y se colaban a `SAFE_GLOBALS`; el Edge
  real NO los expone. Restados de SAFE (0 módulos los usan → FN latente cerrado). Es el payload exacto de #18.
- **10 candidatos a relajar → #190** (`CompressionStream`, `CustomEvent`, stream controllers…): en
  `EDGE_MISSING_GLOBALS` (derivado de `@edge-runtime/vm`) pero PRESENTES en el Edge real. Sobre-estrictez
  **fail-closed = SEGURA** (el gate nunca da un FN por esto); relajarlos exige la intersección
  `{workerd ∩ Deno ∩ Edge}` = #190. `compare-vercel.mjs` los reporta como WARNING, no falla.

Reproducir: `vercel --prod` desde `vercel/` → `node compare-vercel.mjs <url>` (ver `vercel/README.md`).

### Hunt FP/FN sobre la superficie restante (2026-07-18, lhr1) — 0 hallazgos reales

Con el oráculo ya fiel se barrió lo que seguía asumido o derivado del VM. **Ningún FP/FN real**; el valor es
que estos ejes pasan de *asumidos* a *medidos*. Las 3 sospechas se retiraron, cada una con su razón:

| Eje | Medido | Veredicto |
|---|---|---|
| `BROWSER_ONLY_GUARD_GLOBALS` (22) | **0 presentes** (`navigator`/`window`/`document` → `undefined`) | ✅ Sin fail-open. El gate los usa como prueba de rama client-only y **deja de auditarla**; si alguno existiera, esa rama correría sin auditar. No ocurre. |
| `SAFE_PARTIAL_MEMBERS.performance` | Edge real = `{now, timeOrigin}` (+`constructor`) | ✅ Allowlist **exacto**. El caveat "VM contaminado" era inocuo → cierra medido lo que #190 difería |
| `SAFE_PARTIAL_MEMBERS.console` | Edge real 13 vs allowlist 12 → extra `clear` | ⏸ Candidato a FP **bloqueado en #190**: `console.clear` nunca se midió en workerd; añadirlo con solo el dato de Edge sería asumir la unión desde un runtime (el error que trajo `@edge-runtime/vm`) |
| `compileStreaming` / `instantiateStreaming` | **AUSENTES** en Edge real | ✅ La clasificación *present-but-throws* sigue siendo correcta: es un modelo de **UNIÓN** y en workerd están presentes y lanzan (tabla pineada arriba) → `?.()` no protegería allí |
| `WebAssembly.instantiate` | `function`, y `instantiate(bytes)` → **THROWS CompileError** | ✅ **Residual §141 documentado**, no un FN. Denegarlo entero sería FP sobre `instantiate(Module)` —el único Wasm soportado en Edge—; separar ambos exige provenance/data-flow que el gate renuncia por diseño. Esta medición **confirma con traza real** el "confirmado" del comentario de `PARTIAL_SAFE_GLOBAL_MEMBERS` |
| `WebAssembly.validate` | `function`, llamada → **OK** | ✅ Control: la denylist no es "todo WebAssembly" sino las vías de codegen |
| `INTENTIONAL_DENY` (11) | `Buffer`/`Function`/`eval`/`globalThis`/`process` existen; `global`/`localStorage`/`sessionStorage`/`navigator`/`setImmediate`/`clearImmediate` no | ℹ Informativo — la denegación es intencional en ambos casos |

### Barrido de superficie COMPLETA (2026-07-18, lhr1) — 0 FN confirmados

Segunda pasada, ya sin limitarse al catálogo del gate:

- **Presencia de los 1314 nombres** del universo `globals` (builtin ∪ nodeBuiltin ∪ browser ∪ worker ∪
  serviceworker ∪ es2025) → **129 presentes** en Vercel Edge real. Es el **mapa definitivo** del runtime, y
  habilita re-derivar `EDGE_MISSING_GLOBALS` desde producción en vez de desde `@edge-runtime/vm` (la fuga de
  Node de ese VM es el ORIGEN de `EDGE_MISSING_REAL`; atacarla en la raíz es trabajo de #190).
- **Miembros de los 10 roots volcados**; 6 sin modelo bucket-1/2. **4 coinciden EXACTOS** con el floor →
  valida el tratamiento *wholesale*, incluida la afirmación (VM-derivada) de que `crypto` es idéntico en los
  3 runtimes. Los otros 2 (`Atomics.pause`, `Math.f16round`) son **artefacto de baseline, NO un FN**:
  `compare` calcula el lado Node contra el Node que lo ejecuta (v24), pero el gate ancla al **floor
  `>=22.12`**; ambos son adiciones ES2025/TC39 posteriores al floor — misma familia que `Float16Array`, que
  el gate ya trata como `GLOBALS_OVERCLAIM`. La clase "miembro ausente en el floor" **ya está modelada**
  (bucket-2) y su cobertura parcial **ya está registrada en #190**.

**Limitación estructural del método** (no es pereza, es el runtime): solo se puede medir **presencia de
nombres horneados** en el source. El objeto-global miente por enumeración y Edge bloquea `eval`, así que un
global que no esté ni en `globals` ni en los ~59 *own* permanece invisible. Y el **comportamiento** (llamar)
sigue siendo curado — llamar 1314 APIs no es seguro ni significativo. `compare` ahora imprime el Node con el
que corre y advierte del baseline, para que el diff de miembros no se lea como floor-verificado.

### Deferred with line
- **CI wiring**: install workerd on the CI runner so `npm run oracle` runs there — infra, not code.
- **Cross-check workerd/Deno de los 3 `EDGE_MISSING_REAL`** + la intersección sistemática
  `{workerd ∩ Deno ∩ Edge}` de los 10 candidatos → **#190** (la ausencia en Vercel Edge real ya basta para el FN;
  el ancla del gate es Edge).

Independently, the premises are pinned in the gate's own fixtures (`server-safe-gate.test.ts`, describe
"Auditoría B R5") and in `docs/AUDITORIA-B-REHUNT5.md` §2.1 — so drift is caught even before CI wiring lands.
