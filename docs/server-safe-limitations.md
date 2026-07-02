# `@server-safe` — Known Limitations

The `@server-safe` JSDoc marker certifies that a module (and its audited dependency graph) reads no
Edge-incompatible global and performs no Edge-incompatible operation at module-evaluation / render time,
so it is safe to render on the server (SSR / Edge: Cloudflare Workers, Deno, Vercel Edge without
`nodejs_compat`).

The gate's mandate is **Edge-runtime divergence** — code that works in one production runtime and breaks
in the strict Edge/SSR baseline. It is **not** a general production linter. The groups below are the honest
boundary of the guarantee, in two distinct senses a reader should read differently:

- **The gate cannot** — undecidable by static analysis (data-flow / provenance). `§141`.
- **The gate should not** — decidable, but outside the Edge-safety mandate (a bug that breaks in *every*
  production runtime, not an Edge-specific divergence — a `vite build` / smoke test catches it). *Out of
  mandate.*

The discriminator that separates them from a real fail-open: **is there a production runtime where this
works?** If yes → Edge divergence → the gate catches it. If no → universal production crash → out of
mandate.

> This is a search, not a proof. An adversarial re-hunt (16 axes + cross-axis sweep + focused deferred-body
> hunt + an independent cross-review) converged on the items below; the residual risk is unknown-unknowns.

---

## 1. Runtime assumptions — the contract

- **Standard runtime, no global shims.** The gate assumes a server without `window`, and the strict Edge
  baseline without `process` (Workers / Deno without `nodejs_compat`). If your SSR runtime injects a fake
  `window` or a partial `process`, a `typeof X !== "undefined"` guard the gate trusts can become true where
  it should not. Shimming globals voids the guarantee for those names.

## 2. Out of mandate — the gate *should not* catch these (a production build's job)

- **Unguarded dev-only artifacts — `import.meta.hot`.** `import.meta.hot.accept()` / `.dispose()` without
  `if (import.meta.hot)` or `?.` passes, but Vite prunes `import.meta.hot` to `undefined` in *every*
  production build (Node, Edge, browser alike) → an unguarded call crashes in all production, not just Edge.
  Guard it or use `?.`.
- **Assembled / wrapped `import.meta.glob` callee.** `(import.meta.glob)(...)`, `(import.meta.glob as any)(...)`,
  etc. pass. Vite recognizes the glob macro by a raw regex; any wrapper defeats recognition → the macro is
  not expanded → `import.meta.glob` is `undefined`/throws at runtime → a universal crash on the first import
  (browser, Node-SSR, Edge alike), visible in `vite dev`/`build`. No production runtime where it works. Call
  `import.meta.glob(...)` directly (unwrapped).
- **Reflective descriptor read of a Node-only member.**
  `Object.getOwnPropertyDescriptor(performance, "eventLoopUtilization").value()` passes, but `performance`'s
  members live on the prototype (not own props) → the descriptor is `undefined` → `.value()` throws a
  `TypeError` **in Node too**. Universal, not divergence.

## 3. Not followed — indirect / data-flow forms (`§141`, the gate *cannot*)

Catches the dangerous token **in its site** and through value-transparent wrappers (cast/paren/`!`/comma/
`&&`/`||`/`??`/ternary/assignment) and **container-literal projection** (`[X][0]`, `({k:X}).k` — closed in
rc.1). It does **not** follow values through variables, arguments, or cross-statement aliases — that is
data-flow, renounced by design (catching only the obvious syntactic subset would be false coverage).

- **`import(variable)` / assembled specifier.** Caught: `import("fs")` literal (and container projection
  `import(["fs"][0])`). Residual: the specifier assembled from variables.
- **`WebAssembly.instantiate(bytes)`.** Caught: `compile` / `compileStreaming` / `instantiateStreaming` /
  `new WebAssembly.Module(bytes)`. Residual: `instantiate` is overloaded — `instantiate(Module)` is the
  Edge-supported path, `instantiate(bytes)` compiles; telling them apart needs the argument's type. *Prefer
  `instantiate(importedModule)`.*
- **Assembled key.** Caught: literal / value-transparent key (`x["constructor"]`, `x[1 && "constructor"]`).
  Residual: a key built by concatenation / `join` / `fromCharCode` (`x["con" + "structor"]`) — needs a
  general constant-evaluator, renounced by design.
- **Cross-statement alias / computed destructure of a member.** Caught: the in-site and container-projection
  forms, and the alias of an identifier *root* (`const p = performance; p.eventLoopUtilization()`). Residual:
  a cross-statement alias of a *member* (`const M = WebAssembly.Module; new M(b)`), a computed-key destructure
  (`const {[k]: x} = performance`), `Reflect.get(R, variableKey)`, and object-rest (`const {...r} = import.meta`).

## 4. Flagged wider than the danger (`§373`, on purpose)

Flags slightly more than strictly executes; resolving the exact boundary needs a package-resolution
subsystem the gate renounces. Never hides anything executable.

- **Self-reference by the package's own name.** `import … from "<own-package>"` (and any subpath) is flagged.
  *Inside the package, import by relative path or the `@/` alias.*

## 5. Deferred — solvable, tracked for a later release

- **Guarded `process.env` (rc.2).** Denied (it `ReferenceError`s on the strict Edge baseline). The guarded
  form `if (typeof process !== "undefined") process.env.X` is safe but currently flagged. *Workaround: read
  env via `import.meta.env`, or annotate the guarded read.*
- **Systematic Edge-global derivation (#190).** `SAFE_GLOBALS` is derived from Node ∪ ES builtins minus the
  Vercel-Edge-missing set, with `SharedArrayBuffer` additionally removed (Cloudflare disables it — Spectre).
  A fully systematic `{workerd ∩ Deno ∩ Vercel-Edge}` intersection (and the `Atomics` / high-resolution-timer
  questions) is pending a real-runtime globalThis dump.

---

*Internal rationale and ratifications live in `docs/decisions/D1-P1-server-safe-marker.md`. Groups 2–4 are
by-design boundaries (2 = won't, 3 = can't, 4 = over-flags); group 5 is the only TODO.*
