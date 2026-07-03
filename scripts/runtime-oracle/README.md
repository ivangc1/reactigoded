# Runtime oracle — `@server-safe` catalog premises (Auditoría B R5 §4.2 / D3, absorbs #190)

The `@server-safe` gate classifies each catalog member by a **runtime premise** (does it exist in strict
Edge? does calling it throw?). Historically these premises were *asserted* or derived from docs — the root-H
lesson (memory) is that mis-asserting a premise reopens a false-negative by catalog (e.g. classifying
`URL.createObjectURL` as `absence` when it is `present-but-throws` would let the `?.()` sanction silence it).

This directory measures the premises against the **real Edge baseline** (`workerd`, not the leaky
`@edge-runtime/vm`) so they become **continuously measured** instead of asserted.

## Pinned premises (measured against workerd `2026-07-03`, compat dates `2025-05-01` and `2026-07-01`)

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
- **The compat date is pinned** (`2026-07-01`) as *part of the premise* — a member can appear behind a future
  compat flag; bumping it is a catalog decision, not a chore.

### Deferred with line: CI wiring

The only remaining piece is **installing workerd on the CI runner** so `npm run oracle` runs there — infra, not
code (the runner itself is verified). Follow-ups (declared): `@edge-runtime/vm` as a second divergence target
(the only one where `console.table` is absent), then Deno as a third.

Independently, the premises are pinned in the gate's own fixtures (`server-safe-gate.test.ts`, describe
"Auditoría B R5") and in `docs/AUDITORIA-B-REHUNT5.md` §2.1 — so drift is caught even before CI wiring lands.
