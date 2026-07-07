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
- **Member-presence guards do not suppress the flag; use `?.()`.** A `typeof R.m === "function"` or `"m" in R`
  guard on a partial-safe global (`performance`, `WebAssembly`, `console`, `import.meta`) does **not** suppress
  the member-divergence flag (ADR D1-P1, member level). Two reasons: the guard cannot tell *absent-in-Edge* from
  *present-but-throws* (`typeof WebAssembly.Module === "function"` is `true` in Workers, yet
  `new WebAssembly.Module(bytes)` throws), and the language already gives a flow-free safe-probe. Remediate a
  **call-shaped** divergent member with `R.m?.()` (the sanctioned safe-probe). **Data members have no `?.()`
  escape:** a divergent data property (`import.meta.dirname`) cannot be safe-probed into a call — redesign (read
  it off a server-only boundary) or a justified disable is the only path.

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
`&&`/`||`/`??`/ternary/assignment), **container-literal projection** (`[X][0]`, `({k:X}).k`, and spread of an
*in-site literal* `({...{k:X}}).k` — closed in rc.1 / R6), and **in-scope declaration & assignment aliases**
(`const p = performance; … p.member` in either textual order, forward and call-time deferred views — the
two-view fixed point). It does **not** follow values through **calls, parameters, cross-module boundaries,
representation round-trips** (`Object.entries`/`JSON`/`structuredClone`), or a spread/copy of a **variable**
(`const b = {k:X}; ({...b}).k`) — that is data-flow provenance, renounced by design (catching only the obvious
syntactic subset would be false coverage).

- **`for (x of <iterable>) {}` iteration-assignment target.** The deferred-assignment hoist (two-view model)
  tracks `x = <root>`, `var x = <root>` and destructuring `[x] = [<root>]` to outer bindings. A for-of whose
  target is an *existing* binding (`for (c of [performance]) {}`, not `for (const c of …)`) assigns `c` the
  iterable's elements — following that requires element-of-iterable value-flow (§141). Renounced: the loop
  target sees the value only through iteration, and the pattern (assign into a pre-declared binding via for-of)
  is rare. `for (const c of …)` declares a fresh block-scoped binding and is unaffected.
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
  forms (incl. a spread of an *in-site literal* in a destructure init — `{p:{compile}}={...{p:WA}}` member-extract,
  `[x]=[...[performance]]` root-alias — R10), the alias of an identifier *root* (`const p = performance;
  p.eventLoopUtilization()`), and `<root>[variableKey]` / `Reflect.get(<root>, variableKey)` on a **default-deny
  partial root** (`performance`, `console`, `import.meta` — fail-closed, indirection-zero; `#4-OVERTURNED R10`).
  Residual: a cross-statement alias of a *member* (`const M = WebAssembly.Module; new M(b)`), a computed-key
  destructure of a member (`const {[k]: x} = performance`), a spread/copy of a **variable** in a destructure init
  (`const o={k:X}; ({...o}).k`, `const arr=[X]; [x]=[...arr]`), `Reflect.get(R, variableKey)` on a *wholesale-safe*
  or *unknown* R, and object-rest own-copy (`const {...r} = import.meta`).
- **for-of loop-var provenance (R9).** Caught: the loop variable bound from an *inline* array-literal, read
  *inside* the body (`for (const p of [performance]) { p.eventLoopUtilization() }` — positional extraction, same
  as `const [p] = [performance]`). Residual: (a) *use-after-loop* — a `let` var reassigned by a for-of head and
  read *after* the loop; the for-of head is not an `AssignmentExpression` and is outside the operator set the
  taint-union enumerates (`=`/`??=`/`||=`/`&&=`), so it falls outside that domain by the letter of the frontier
  (rc.2: add the for-of head to the operator set). (b) *destructured loop-var* (`for (const [a] of [[performance]])`)
  — a nested-pattern binding from the iterated element, not the positional identifier case. (c) *variable iterable*
  (`const arr = [performance]; for (const p of arr)`) — data-flow through a variable, renounced by design.

## 4. Flagged wider than the danger (`§373`, on purpose)

Flags slightly more than strictly executes; resolving the exact boundary needs a package-resolution
subsystem the gate renounces. Never hides anything executable.

- **Self-reference by the package's own name.** `import … from "<own-package>"` (and any subpath) is flagged.
  *Inside the package, import by relative path or the `@/` alias.*
- **`.at()` positional projection (R9, Δ2).** `[X].at(i)` on an array literal descends to *all* elements
  (`.at` accepts negative indices = from-the-end, so a fixed literal index cannot map to a fixed position without
  over-approximating), while its twin `[X][i]` is precise: `[perf, 0].at(1).m` flags (over-approx) whereas
  `[perf, 0][1].m` is silent. Fail-closed divergence between forms `INV-PARITY` calls twins; documented, never
  hides anything (rc.2 option: precise map for a non-negative literal index).

## 5. Deferred — solvable, tracked for a later release

- **Guarded `process.env` (rc.2).** Denied (it `ReferenceError`s on the strict Edge baseline). The guarded
  form `if (typeof process !== "undefined") process.env.X` is safe but currently flagged. *Workaround: read
  env via `import.meta.env`, or annotate the guarded read.*
- **Systematic Edge-global derivation (#190).** `SAFE_GLOBALS` is derived from Node ∪ ES builtins minus the
  Vercel-Edge-missing set, with `SharedArrayBuffer` additionally removed (Cloudflare disables it — Spectre).
  A fully systematic `{workerd ∩ Deno ∩ Vercel-Edge}` intersection (and the `Atomics` / high-resolution-timer
  questions) is pending a real-runtime globalThis dump.
- **Marker must be on its own line (M2 — resolved 2026-07-04, line-start rule).** `@server-safe` counts only
  when its line has nothing but JSDoc decoration (`/**`, ` * `, whitespace) before it. A sibling tag on the
  *same* line (`/** @internal @server-safe */`) or prose before it (`/** @param x the @server-safe flag */`)
  no longer marks — it raises a **fail-loud hygiene diagnostic** ("put it on its own line"), never a silent
  un-mark (which would be fail-open). Prose/other tags *after* it on the line, or sibling tags on *other*
  lines of the block, are fine. Sister of the M1 near-miss (`/* */` single-star): both turn a mis-placed
  marker into a loud error rather than a silent skip. *No workaround needed — the diagnostic tells you.*
  - **Residual (P-M2-PROSE) — plain prose *before* the marker on the same line is tolerated silently.**
    `/** Does X. @server-safe */` (no sibling tag, just prose then the marker) does **not** mark and does
    **not** warn — a plausible marking intent dies quietly, the M1 class. This is *pre-existing* (BLOCKER-1's
    "pure prose → tolerate" bucket, not introduced by the line-start rule) and **kept for rc.1 by design**:
    the intent-vs-mention discriminator inside prose is genuinely ambiguous — `/** not yet @server-safe */`
    is a legitimate mention that must **not** throw. Tolerating both is the safe default; the cost is that a
    real "prose then marker on one line" is silent. *Workaround: put `@server-safe` on its own line (or make
    it the line's first token).* A finer trailing-token heuristic (marker as the last token before `*/` →
    hygiene) is round-6 backlog.

---

*Internal rationale and ratifications live in `docs/decisions/D1-P1-server-safe-marker.md`. Groups 2–4 are
by-design boundaries (2 = won't, 3 = can't, 4 = over-flags). Group 5 (marker policy) ships fail-loud
diagnostics guarded by a generative **position-axis invariant over the full domain the detector enumerates**
(*every well-formed `@server-safe`, in any position, marks (top-level) or throws (else) — never a silent
skip*): M1 near-miss (single-star, symmetric to leading/trailing punctuation + invisibles, R6/H4), M2
line-start, EOF-orphan (R6/H5), and **nested markers** (in a method, inner function, or block — R6.1: a
well-formed `/** @server-safe */` off the module header now throws `per-FICHERO, move to the header`, closing
the asymmetry where the *wrong* single-star syntax warned but the *correct* double-star nested died silent).
The one tolerated-silent residual is P-M2-PROSE (plain prose adjacent to the marker — a mention, not an
intent — in any position), kept by design (intent-vs-mention ambiguity is irreducible at the text level).*
