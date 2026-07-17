# AUDITORÍA B — REHUNT5 · Informe final de implementación (gate `@server-safe`, ronda 5)

| Campo | Valor |
|---|---|
| Regla | `scripts/check-server-safe-markers.mjs` @ `097308e` |
| Input | `REHUNT5-REPORT.md` (pasada generalista, 16 revisores + verificación adversarial + crítico) |
| Auditor | B (Claude), revisión adversarial de ronda 5 |
| Verificación empírica | Contenedor x86_64 · Node `v22.22.2` · **workerd `2026-07-03` (runtime real)** · `@edge-runtime/vm` `5.0.0` · TS probes previos `6.0.3` |
| Fecha | 2026-07-03 |
| Destinatario | Claude Code (agente de implementación) |

---

## 0. Veredicto

**GO al plan de unificación, con el eje central del informe ratificado y un hallazgo resuelto por medición.**

- **R5-CODE queda falsificada** — la segunda predicción de cierre que cae (§7, R5-CODE), y arrastra el veredicto de convergencia del crítico de R4 ("no new axis") y la ratificación condicionada de Q6 del Auditor B. Las **0 regresiones** confirman que los fixes de R4 aguantan en los sitios donde se midieron; el fallo está en el alcance de los claims, no en los fixes.
- **El diagnóstico del informe (propagación-incompleta) es correcto y es LA lección de la ronda:** cada fix de R4 se aplicó en el sitio medido, pero la semántica compartida tiene sitios hermanos que no se actualizaron. El cierre por-casos de #1–#11 repetiría el mismo modo de fallo; el cierre correcto son las **6 unificaciones** de §3.
- **#11 (URL) queda RESUELTO por medición contra workerd real** (§2): premisa confirmada, y con una clasificación (`present-but-throws`) que una aserción basada en docs o `typeof` habría errado como `absence` — reabriendo por catálogo el FN que M-1 cerró.
- Marcador acumulado del ciclo: **código 4, predicciones 0.**

---

## 1. Doctrina nueva (incorporar al ADR)

1. **Alcance de los claims de cierre:** *un claim de cierre vale exactamente lo que cuantifica el invariante que lo custodia.* INV-SYM/INV-WRAP (R4) cuantificaban formas (wrapper × profundidad) en sitios fijos, no sitios que comparten una semántica — por eso R5-CODE cayó sin que fallara ningún test. Toda predicción futura se registra **por eje**, atada al cuantificador exacto de su invariante (§8).
2. **Polaridad de DECISIÓN** (completa la ley de polaridad de resolución de R4): **deny = ∃** sobre los candidatos resueltos; **suppress = ∀**. Un first-match es incorrecto en ambas, en direcciones opuestas: en un deny degrada a FN por rama no comprobada; en un suppress degrada a FN por rama que valida la supresión indebidamente (#1).
3. **Clasificación de hazard-kind = peor caso sobre los targets donde el miembro diverge.** La heterogeneidad por runtime es real y está medida (§2): `console.table` funciona en workerd y falta en EdgeVM; `createObjectURL` lanza en workerd y funciona en EdgeVM. Si algún target divergente es present-but-throws → la entrada se clasifica present-but-throws (la sanción nunca suprime).
4. **Punto ciego del discriminador asimetría⇒gap:** presupone que ambas formas están dentro del mismo mandato. Cuando la asimetría coincide con una frontera de renuncia declarada (FIX-2: "solo const/structural"), la asimetría es diseño, no gap → se adjudica por política, no por control. Aplica a #7.

---

## 2. Verificación empírica

### 2.1 Runtimes (workerd real, binario `2026-07-03`, compat dates `2025-05-01` y `2026-07-01` — resultados idénticos)

| Premisa | workerd (real) | EdgeVM (emulación Vercel) | Node 22 (host) |
|---|---|---|---|
| `typeof URL.createObjectURL` | `"function"` | `"function"` | `"function"` |
| **llamada** `URL.createObjectURL(new Blob())` | **THROWS** `Error: URL.createObjectURL() is not implemented` | funciona (`blob:nodedata:…`) | funciona |
| llamada `URL.revokeObjectURL(...)` | **THROWS** `not implemented` | — | funciona |
| `URL.canParse` / `new URL()` | funcionan | funcionan | funcionan |
| `console.table` | presente **y la llamada funciona** | **`undefined`** | presente |
| `performance.eventLoopUtilization` | **`undefined`** | presente (fuga de Node) | presente |
| `WebAssembly.compile` (typeof / llamada) | `"function"` / **THROWS** `CompileError: Wasm code generation disallowed by embedder` | compila OK | compila OK |
| `new Function('return 1')` | **THROWS** `EvalError` | **THROWS** `EvalError` | funciona |

**Consecuencias:**

- **#11 confirmado y clasificado:** `URL.createObjectURL` / `revokeObjectURL` divergen en workerd con hazard **present-but-throws** (el `typeof` da `function`; solo la llamada revela el hazard). Con hazard=absence la sanción `?.()` habría suprimido `URL.createObjectURL?.(b)` en silencio. `canParse` / `new URL()` medidos correctamente-silenciosos → **denylist mínima**, no registro blanket de `URL`.
- **EdgeVM es un oráculo con fugas** (createObjectURL funciona, elu presente, compile OK): el oráculo de premisas debe ser **workerd-proper** (+Deno después). EdgeVM se conserva como *target de divergencia adicional*: es el único donde `console.table` falta.
- Premisas del catálogo ahora **medidas contra runtime real** (antes asertadas o derivadas): elu = absence ✓; `WebAssembly.compile` = present-but-throws ✓; `Function`-ctor lanza `EvalError` ✓ (premisa de #10).

### 2.2 Semántica JS (Node 22)

| Hallazgo | Probe | Resultado |
|---|---|---|
| #4 | `gOPD(import.meta,'dirname')['value']` ≡ lectura | ✅ |
| #5 | `Object.create(null, gOPDs(import.meta)).dirname` · `Object.defineProperties({}, gOPDs(R)).k` · `Object.defineProperty({},'k',gOPD(R,'k')).k` | ✅ los tres leen el valor |
| #6 | `JSON.parse(JSON.stringify(import.meta)).dirname` | ✅ lee (y descarta `resolve`) |
| #3 | `({100n:'X'})[100] === 'X'` | ✅ (100n canonicaliza a `'100'`) |

---

## 3. Las 6 unificaciones (cierre por construcción; mapa hallazgo → mecanismo)

Principio de implementación para TODAS: **mismo predicado, cuantificador/ruta correctos** — no rediseñar la decisión, enrutar la existente por el camino canónico.

### U1 — ∀-lift de la sub-decisión de sonda `?.()` (cierra **#1**) · PRIORIDAD MÁXIMA
La sub-decisión de sanción lee hoy el PRIMER global resuelto del receptor. Fix: levantar el **predicado single-root existente** (absence-only; miembro sin anotar → conservador, FLAG) a **∀ sobre el set** de `exprPartialRoots`:
`suppress ⟺ ∀ c ∈ candidatos_resueltos: predicadoSanciónSingleRoot(c, m)`.
Sev "med" en el informe, prioridad máxima aquí: es un agujero en el mecanismo ratificado que el gate recomienda a los usuarios. Fixture: la **ley M-1 parametrizada gana eje receptor** — `veredicto(sonda(op(D,N))) === veredicto(sonda(op(N,D)))` en ambos órdenes, sobre el catálogo entero.

### U2 — Resolución de clave ÚNICA (cierra **#2** y **#3**)
1. Una sola ruta de resolución de clave para **ambas polaridades de catálogo**: la clave ensamblada foldable (`'comp'+'ile'`) consulta también la denylist de roots denylist-style (hoy solo alimenta el default-deny de los allowlist-style). Adjudicación ratificada del informe: **assembled-foldable = gap; clave variable pura = renuncia correcta por diseño denylist-style** (fix preciso, no total).
2. `propNameCanonical` ≡ `canonicalNumericKey`: **literalmente una función** (def-side y use-side). #3 (BigInt def-side) cae de paso — sev high de clase, probabilidad real ≈ 0, coste marginal 0 con la unificación.

### U3 — El recognizer reflexivo resuelve miembros vía el resolver compartido (cierra **#4**)
`reflectiveValueReads` deja de hardcodear `.value` dotted y resuelve la clave leída vía `resolveKeyCandidates`/`accessedMemberNames`: bracket ≡ dotted ≡ template ≡ assembled, **gratis** y para siempre. (El póster de la propagación: FIX-3 nació sin reutilizar la maquinaria que el resto del gate ya tenía.)

### U4 — Pipeline de origen único (cierra **#8**)
Una sola función "resuelve el set de orígenes-global de esta expresión" = `exprPartialRoots` ∘ pass-reflexivo ∘ flatten. `resolveConstructionDeny` la consume igual que member-read; ningún consumidor resuelve orígenes por su cuenta.

### U5 — Spread-flatten en el helper de arg-list compartido (cierra **#9**)
El aplanado de spread-de-array-literal de R4 se mueve al ÚNICO helper de extracción de argumentos que usan ambos call-sites (`Reflect.construct` arg0 incluido).

### U6 — Ascent = descent: eval-sink callee transparente + INV-WRAP consumer-edge (cierra **#10**)
El consumidor eval-sink resuelve su callee vía `valueTransparentLeaves` y testea CADA hoja contra la forma-hazard (cadena `.constructor` / Function). **INV-WRAP se amplía al edge de consumo**: para todo consumidor C y wrapper value-transparent W, `veredicto(C(W(hazard))) === veredicto(C(hazard))` — callee, target de construcción y targets Reflect incluidos, ambos órdenes, prof. ≤ 3.

### Meta-lints de sitio (el "registro de sitios" de la pregunta 2 del informe — patrón INV-VT)
Sobre el fuente del gate (infra gate-source existente), prohibir la forma cruda fuera del helper canónico:
1. bucle sobre hojas con `return` de valor único (forma first-match) fuera de los helpers canónicos;
2. canonicalización de clave/nombre-de-propiedad fuera de la función única de U2;
3. extracción de nombre de miembro en recognizers fuera del resolver compartido (U3);
4. manejo de spread en extracción de argumentos fuera del helper de U5.
Los meta-lints son defensa-en-profundidad; **el cierre primario son los invariantes conductuales** (INV-SYM × 6 consumidores ya vigente; INV-WRAP consumer-edge; ley de sonda × receptor × forma).

---

## 4. Catálogo

### 4.1 Registro de `URL` (resuelve **#11**)
- Root **denylist-style**; denegados: `{createObjectURL, revokeObjectURL}`; hazard-kind: **present-but-throws** (medido §2.1).
- `canParse`, `new URL()` y el resto: fuera (fixtures SILENT pineados).
- **La remediación del flag NO sugiere `?.()`** (el typeof da `function` y la llamada lanza — la sonda no protege). Texto: rediseño (el patrón blob-URL no existe en Workers) o disable justificado.

### 4.2 Oráculo de runtime a CI (esto ES #190, hecho sistema)
`workerd` a devDependencies + fixture worker que asierta las premisas de cada entrada del catálogo; spec que lo arranca en puerto efímero y compara JSON. Esqueleto verificado en el contenedor:

```js
// scripts/runtime-oracle/worker.js
export default { async fetch() {
  const out = { elu: typeof performance?.eventLoopUtilization, table: typeof console.table };
  try { URL.createObjectURL(new Blob(['x'])); out.createObjectURL = 'OK'; }
  catch (e) { out.createObjectURL = 'THROWS:' + e.message.slice(0, 40); }
  try { await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0])); out.waCompile = 'OK'; }
  catch (e) { out.waCompile = 'THROWS:' + e.constructor.name; }
  try { new Function('return 1'); out.fnCtor = 'OK'; } catch (e) { out.fnCtor = 'THROWS:' + e.constructor.name; }
  return new Response(JSON.stringify(out));
} };
```

```capnp
# scripts/runtime-oracle/config.capnp
using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [ (name = "main", worker = .mainWorker) ],
  sockets = [ (name = "http", address = "127.0.0.1:0", http = (), service = "main") ]
);
const mainWorker :Workerd.Worker = (
  modules = [ (name = "worker.js", esModule = embed "worker.js") ],
  compatibilityDate = "2026-07-01",
);
```

Aserciones iniciales (pinean lo medido hoy): `elu === 'undefined'`, `createObjectURL` THROWS, `waCompile` THROWS `CompileError`, `fnCtor` THROWS `EvalError`, `table === 'function'` **en workerd** (la divergencia de `table` vive en EdgeVM → segundo target del oráculo, follow-up; Deno, tercero). El catálogo pasa de premisas-asertadas a premisas-medidas-continuamente.

---

## 5. Familia reflexiva (FIX-3) — extensión y frontera re-redactada

**Pendiente de firma D2 (Iván).** Propuesta:

- **Entran** (verificados §2.2): el trío descriptor-transfer — `Object.create(_, gOPDs(R)).k`, `Object.defineProperties(_, gOPDs(R)).k`, `Object.defineProperty(_,'k',gOPD(R,'k')).k`. Con U3, sus lecturas heredan bracket/template/assembled.
- **Frontera como regla** (sustituye a la lista): el recognizer cubre la **familia property-copy** — intrínsecos cuya semántica es transferencia de own-properties/descriptores (`gOPD(s)`, `assign`, spread, `create`-con-props, `defineProperty/ies`), **incluidas composiciones intra-familia** (`create(_, gOPDs(R))` es un idioma de plataforma: el segundo parámetro existe para eso).
- **Renunciados: round-trips de representación** — `entries`/`values`/`fromEntries`, **JSON round-trip (#6)**, `structuredClone`: destruyen y reconstruyen la identidad a través de una representación intermedia; el inicio del data-flow arbitrario. #6 cae del lado renunciado **con rationale**, fixture SILENT-renunciado pineado.
- La familia sigue siendo **ACOTADA**, no cerrada por construcción (ratificación R4 intacta).

---

## 6. Sobre-advertencias (4) y la familia de sondas

- **O4 — fix real: familia de sondas sancionadas tri-forma en UNA sub-decisión.** `{call: R.m?.(), bind: destructuring-default, value: R.m ?? fb}` comparten código y la ley parametrizada (absence-only; sin anotar → FLAG). La forma value suprime solo el flag-de-lectura de miembros hazard=absence; para present-but-throws el hazard vive en la llamada y la ley ya lo cubre. Con U1, la tri-forma hereda el ∀ sobre receptores gratis. Fixtures: `performance.eventLoopUtilization ?? fb` → SILENT; contraejemplo present-throws → FLAG.
- **O1 — misma decisión que #7** (dos caras de "las asignaciones no existen"): se resuelve con D1. En ambas opciones, el mensaje del flag gana remediación: *"la reasignación no limpia el alias; usa un binding nuevo"*.
- **O2 — se traslada al PR M1 (marcador).** Es un hallazgo de marker-space colándose en la pasada de código — señal de que M1 está maduro. Fix allí: diagnóstico de higiene con mensaje correcto ("separa los tags con whitespace"), no throw con explicación falsa.
- **O3 — ratificar FLAG.** Es la política P3 más el hecho de que el modelo de guards es **por-root, sin inferencia de entorno** (`window` presente ⇒ browser ⇒ `table` presente es un lattice de entorno: backlog post-RC). Línea en `server-safe-limitations.md`. Dato §2.1: `table` funciona en workerd y falta en EdgeVM → sigue in-mandate vía el target Vercel, hazard=absence donde diverge, `console.table?.(rows)` escape válido. Fixture pineado FLAG-as-is.

---

## 7. Decisiones pendientes de Iván (no de CC)

| ID | Decisión | Recomendación del Auditor B |
|---|---|---|
| **D1** | Frontera #7/O1: (a) ratificar residual §141 (asignaciones = flujo) vs **(b) unión monotónica de asignaciones** (enrolar `x = <resolvable>`, `??=`, `\|\|=`, `&&=` al set del binding; sin kill-set) | **(b)** — `let clock; if (cond) clock = performance; clock.elu()` es lazy-init real, con más peso de mundo real que la mitad de los high exóticos. Coste documentado: FPs flow-insensitive (read-before-assign, raros) + O1 pasa a precio ratificado de la monotonicidad. **Enmienda la frontera ratificada de FIX-2** → firma tuya. |
| **D2** | Frontera property-copy vs round-trip de representación (§5): #5 dentro, #6 fuera | Ratificar tal cual: es regla, no lista, y consistente con "acotado" de R4. |
| **D3** | Registro de `URL` con hazard present-but-throws + oráculo de runtime como test permanente (§4) | Ratificar: la medición está hecha contra workerd real con dos compat dates; #190 queda absorbido por el oráculo de CI. |

---

## 8. Ronda 6 — predicciones POR EJE (pre-registrar en el commit de docs; nunca otra global)

Las predicciones globales han caído dos de dos (§7, R5-CODE); las por-eje son lo único que los invariantes licencian:

- **PRED-WRAP:** ningún FN alcanzable envolviendo (edge receptor O edge de consumo) un hazard catalogado con wrappers value-transparent hasta prof. 3 — custodia: INV-WRAP ampliado (U6).
- **PRED-SYM:** ningún FN por orden de rama en operadores multi-candidato, en los 6 consumidores — custodia: INV-SYM.
- **PRED-KEY:** ningún FN por forma de clave (dotted/bracket/template/assembled/numérica/BigInt; def-side y use-side) sobre pares catalogados — custodia: función única U2 + diferencial ToPropertyKey.
- **PRED-PROBE:** `veredicto(sonda(m))` sigue la ley parametrizada sobre catálogo × receptor × forma — custodia: ley M-1 ampliada (U1 + tri-forma).
- **PRED-ORACLE:** toda entrada del catálogo tiene premisa medida en el oráculo workerd de CI — custodia: §4.2.
- **Fuera de predicción (declarado):** familia reflexiva (acotada §5), fronteras renunciadas (flujo salvo D1-b, round-trips de representación, clave variable en denylist-roots), y marker-space hasta cerrar M1/M2 (+O2) en su PR.

---

## 9. Criterios de aceptación (gate PR-R5-A)

1. **U1:** ∀-lift con el predicado single-root existente; fixture ley-de-sonda × receptor en ambos órdenes sobre el catálogo.
2. **U2:** función única de clave (ambas polaridades, def+use). Fixtures: `WebAssembly['comp'+'ile'](b)` → FLAG; `WebAssembly[m](b)` → SILENT-renunciado; `({100n: WebAssembly})[100].compile` → FLAG.
3. **U3:** recognizer vía resolver compartido. Fixtures: `gOPD(import.meta,'dirname')['value']` → FLAG (+ formas template/assembled heredadas).
4. **U4:** pipeline de origen único. Fixture: `new (Object.assign(WebAssembly, {}).Module)(b)` → FLAG.
5. **U5:** flatten en helper compartido. Fixture: `Reflect.construct(...[WebAssembly.Module, [b]])` → FLAG.
6. **U6:** eval-sink callee transparente + INV-WRAP consumer-edge en suite. Fixture: `[x.constructor][0]('return window')()` → FLAG, ambos órdenes.
7. **Sondas tri-forma** en una sub-decisión; O4 SILENT (absence) + contraejemplo present-throws FLAG; destructuring-default enrutado por la misma sub-decisión.
8. **URL registrada** (denylist mínima, present-throws); `canParse`/`new URL` SILENT pineados; remediación sin `?.()`.
9. **Oráculo de runtime en CI** con las premisas de §2.1 aserta­das (workerd; EdgeVM/Deno como follow-ups declarados).
10. **Meta-lints de sitio** activos sobre el fuente del gate (las 4 formas crudas prohibidas).
11. **D1/D2/D3 firmadas** y reflejadas: tabla de renuncias actualizada + fixtures de #7/O1 según D1, #5 FLAG y #6 SILENT-renunciado según D2.
12. **O2 → PR M1** (tracking), **O3 ratificada** con línea en limitations y fixture FLAG-as-is.
13. **Predicciones por-eje de §8 registradas** en el commit de docs, con su invariante-custodio nombrado.

---

## 10. Trazabilidad — las 4 preguntas del informe

| Pregunta | Respuesta |
|---|---|
| Q1 (cierre por construcción en TODOS los sitios) | Sí: patrón INV-VT generalizado — helper canónico + meta-lint de sitio + invariante conductual parametrizado sobre (consumidor × wrapper × edge). Las 6 unificaciones de §3 son ese cierre; la pieza doctrinal que faltaba es la polaridad de decisión (deny=∃, suppress=∀). |
| Q2 (meta-test que enumera sitios) | Sí, como defensa-en-profundidad (§3 meta-lints); el cierre primario son los invariantes ampliados (INV-WRAP consumer-edge; ley de sonda × receptor × forma), porque un meta-lint sintáctico no ve `leaves[0]` ni semántica por operador. |
| Q3 (#2 polaridad; #5/#6 familia) | #2: adjudicación ratificada (assembled = gap; variable = renunciado por diseño denylist-style), causa = clave no compartida entre polaridades (U2). #5 dentro / #6 fuera con la frontera-como-regla de §5 (property-copy vs round-trip de representación), pendiente D2. |
| Q4 (las 4 sobre-advertencias) | O1 → D1 (con remediación en el mensaje en ambas opciones); O2 → PR M1 con mensaje de higiene correcto; O3 → ratificada FLAG (guards por-root, sin inferencia de entorno; backlog environment-lattice) + limitations; O4 → fix (tri-forma de sondas, §6). |

---

**Secuencia:** PR-R5-A (CC: U1–U6 + meta-lints + invariantes ampliados + URL + oráculo CI + fixtures §9) → firmas D1–D3 de Iván (D1/D2 afectan tabla de renuncias; pueden firmarse durante la implementación) → O2 al PR M1 (marcador, antes de rc.1, como acordado) → ronda 6 con las predicciones por-eje de §8 pre-registradas.

---

## Addendum R5-A1 (checkpoint de implementación, 2026-07-03)

**U2.1 ANULADA — #2 ratificado como residual §141, no como gap.** Medición de implementación:
`performance['n'+'ow']()` → FLAG pese a que `now` es miembro permitido; si el gate foldara claves
ensambladas sería SILENT. El gate NO folda concat (revert ratificado en deepest-hunt #173).
`performance[ensamblada]` flaggea por fail-closed allowlist sobre clave irresoluble (candidatos
vacíos); `WebAssembly[ensamblada]` calla por polaridad denylist sobre la misma clave irresoluble.
Ambos veredictos son consecuencia de dos fronteras ratificadas — no hay inconsistencia interna, y
implementar U2.1 habría reintroducido el mecanismo que #173 rechazó.

**Criterio de aceptación 2 — reescrito.** U2 = solo U2.2 (función única def/use). Fixtures:
- `performance['n'+'ow']()` → **FLAG-as-is** — la sonda discriminante entra en la suite y pinea el
  mecanismo (no-fold + fail-closed sobre clave irresoluble).
- `WebAssembly['comp'+'ile'](b)` → **SILENT-renunciado** (§141 vía #173 + polaridad denylist).
- `WebAssembly[m](b)` → SILENT-renunciado (sin cambio).
- `({100n: WebAssembly})[100].compile` → FLAG (sin cambio); `({100n: WebAssembly})[k].compile` →
  **FLAG** (∃ sobre elementos con clave variable — expectativa corregida en implementación, pineada).

**PRED-KEY (§8) — alcance corregido.** «assembled» sale de la predicción y pasa a «fuera de
predicción» (renunciado por #173). Tal como estaba, la ronda 6 la habría falsificado por diseño
sobre un caso renunciado.

**Trazabilidad Q3 — corregida.** La adjudicación de R5 («assembled = gap») queda anulada: ensamblada
y variable son ambas renuncia ratificada; el veredicto asimétrico lo explica polaridad de catálogo ×
clave irresoluble, no un fold que no propaga.

**Doctrina — tercer discriminador.** Control de veredicto ⇒ existe diferencia. Identificar el
MECANISMO exige una sonda donde los mecanismos candidatos predigan resultados distintos. Sin ella,
ninguna afirmación de mecanismo entra en un spec.
