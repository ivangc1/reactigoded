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

## Activation (makes it a live CI gate)

The verified `worker.js` + `config.capnp` are ready. To turn this into a permanent CI assertion:

1. Add `workerd` to `devDependencies`.
2. Add a test/spec that boots `workerd serve scripts/runtime-oracle/config.capnp` on an ephemeral port,
   `fetch`es it, and asserts the JSON against the pinned premises above (`elu === "undefined"`,
   `createObjectURL` / `waCompile` `THROWS`, `fnCtor` `THROWS:EvalError`, `table === "function"` in workerd).
3. Follow-ups (declared): `@edge-runtime/vm` as a second divergence target (the only one where `console.table`
   is absent), then Deno as a third.

Until activated, the premises are pinned in the gate's own fixtures (`server-safe-gate.test.ts`, describe
"Auditoría B R5") and in `docs/AUDITORIA-B-REHUNT5.md` §2.1.
