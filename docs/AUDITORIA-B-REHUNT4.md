# AUDITORÍA B — REHUNT4 · Informe final de implementación (gate `@server-safe`, ronda 4)

| Campo | Valor |
|---|---|
| PR | `ivangc1/reactigoded#133` |
| Regla | `scripts/check-server-safe-markers.mjs` @ HEAD `85ee3f6` |
| Input | `REHUNT4-REPORT.md` (pasada de completitud, 13 revisores + crítico) |
| Auditor | B (Claude), revisión adversarial de ronda 4 |
| Verificación empírica | Contenedor efímero x86_64 · Node `v22.22.2` · TypeScript `6.0.3` |
| Fecha | 2026-07-02 |
| Destinatario | Claude Code (agente de implementación) |

> **Nota sobre líneas:** todas las referencias `L____` provienen del informe de ronda 4 sobre HEAD `85ee3f6`. Re-verificar tras cualquier rebase.

---

## 0. Veredicto

**GO con ajustes al spec.** El insight central del informe (el colapso first-match persiste en la capa de raíces) es correcto y queda validado; las clases #1, #2, #4 y #5 son cerrables por construcción. Antes de implementar, el spec debe incorporar tres correcciones obligatorias:

1. **Ley de polaridad (§1):** el principio "warn when a candidate is un-resolvable" solo vale para la capa de claves. En raíces, los candidatos irresolubles se **ignoran**; si no, `(b ? crypto : objetoLocal).foo` inunda de falsos positivos.
2. **Semántica por operador (§3, FIX-1):** el modelo "todas las hojas son candidatas" es incorrecto para la coma (valor = último operando, siempre) y para `&&` (solo la derecha). Consolidar el set sin esto convierte un FP latente en FP permanente.
3. **Reclasificación del #3 (§3, FIX-3):** no es cerrable por construcción — es un denylist de idiomas reflexivos dentro de una regla de filosofía allowlist. La frase del crítico *"all fixable by construction"* debe corregirse a **"acotado"** para #3 en la documentación de convergencia.

Además: un candidato del #3 queda **eliminado empíricamente** (`structuredClone` lanza), dos idiomas nuevos quedan **verificados y sin cubrir** (`Object.create`, `fromEntries∘entries`), y el espacio del marcador aporta **dos hallazgos nuevos** (M1, M2) que definen el alcance de la ronda 5.

---

## 1. Ley de polaridad (fundamento; incorporar al ADR §141)

El error de la predicción §7 tiene una explicación estructural que conviene fijar como doctrina:

- En un resolver **fail-closed** (clave/miembro/especificador sobre un receptor ya conocido), un candidato irresoluble dispara default-deny. Un colapso first-match ahí **degrada a falso positivo**. Por eso §7 era cierta en la capa `canonicalNumericKey`/`resolveKeyCandidates`.
- En un resolver **fail-open** (raíz/receptor), un candidato irresoluble cae fuera de mandato → silencio. El mismo colapso **degrada a falso negativo**. Por eso §7 era falsa en `exprPartialRoot`.

**Corolario normativo:**

| Familia de resolver | Semántica de set | Candidato irresoluble |
|---|---|---|
| Clave / miembro / especificador (receptor conocido) | comprobar todos | **WARN** (default-deny, ya vigente) |
| Raíz / receptor | comprobar todos los **resueltos** | **IGNORAR** (procedencia renunciada) |

**Discriminador gap-vs-renuncia** (la pieza más sólida del informe, se conserva y se promueve a invariante): si intercambiar el orden de las ramas cambia el veredicto, es un gap; si hay silencio en ambos órdenes, es un caso renunciado. Ver INV-SYM en §4.

---

## 2. Verificación empírica (resultados del contenedor de auditoría)

Lo verificado aquí es **semántica JS y comportamiento real del scanner de TS**. El comportamiento de la regla (SILENT/WARNS) se toma como medido por el harness de ronda 4 con controles; los probes de §5 lo re-verifican contra la regla real.

| ID | Afirmación | Resultado |
|---|---|---|
| V1 | `import.meta.dirname` es propiedad **propia, enumerable, writable, de datos**; `proto(import.meta) === null` | ✅ Precondición de #3 confirmada |
| V2 | Equivalencias reflexivas: `getOwnPropertyDescriptor(R,'k').value`, `getOwnPropertyDescriptors(R).k.value`, `({...R}).k`, `Object.assign({},R).k` ≡ `R.k` | ✅ Las 4 verifican |
| V3 | **Idiomas NO listados que también leen el valor:** `Object.create(import.meta).dirname` (lectura vía prototipo) y `Object.fromEntries(Object.entries(import.meta)).dirname` | ✅ Ambos leen el valor |
| V4 | `structuredClone(import.meta)` → **lanza `DataCloneError`** (`import.meta.resolve` es función, no clonable) | ✅ Candidato **eliminado** del #3 |
| V5 | Flatten #5: `[...['fs']][0] === 'fs'`; anidado `[...[...['fs']]][0]`; `[...[WebAssembly.Module]][0] === WebAssembly.Module` | ✅ Las 3 verifican |
| V6 | Operador coma: el valor es **siempre el último operando** | ✅ |
| V7 | #4/NEL: tag reconocido con U+0085 entre `/**` y `@` (corrección del crítico exacta). Cc no-whitespace probados (NUL, SOH, STX, BEL, DEL U+007F, y C1 U+0080/U+009F): tag **no** reconocido. Cuenta de Cc no-whitespace según TS: **59 exactos** | ✅ Gap #4 confirmado en C0 y C1 |
| V8 | **Condición exacta del gap #4: carácter no-whitespace PEGADO al `@`.** `/**\x01 @server-safe */` → tag SÍ (el espacio rescata); `/** \x01@server-safe */` → tag NO. Cc **dentro** del nombre (`@server\x01-safe`) → TS parsea el tag como `"server"` | ✅ Delimita la región de fold |
| V9 | `ts.isWhiteSpaceLike` **no es el oráculo correcto**: LS/PS (U+2028/2029) devuelven `isWhiteSpaceLike === true` y aun así el tag pegado NO se reconoce (`\u2028@` falla; `\u2028 @` pasa). La API es pública, pero el test diferencial debe ser end-to-end contra `ts.getJSDocTags` | ✅ Corrige el enfoque de la pregunta 4 del informe |
| V10 | Espacio del marcador: `/* @server-safe */` (una estrella) → 0 tags; `// @server-safe` → 0 tags; `/** @param x the @server-safe flag */` → tags `['param','server-safe']` (**anotación falsa**); `/**@server-safe*/` sin espacios → SÍ tagea | ✅ Origina M1/M2 (§6) |

---

## 3. Spec de implementación por fix

### FIX-1 — `exprPartialRoots` → Set con semántica por operador (cierra #1 y #2)

**Firma:** `exprPartialRoots(expr): ReadonlySet<KnownGlobalRoot>` — solo candidatos **resueltos**; los irresolubles se descartan sin warn (ley de polaridad, §1). `import.meta` acumula al set, **sin early-return** (esto restaura la semántica existencial perdida en `71be882` y cierra #2).

**Semántica por operador — NO enumeración uniforme de hojas:**

| Nodo | Candidatos value | Nota |
|---|---|---|
| `ConditionalExpression` | `{whenTrue, whenFalse}` | ambas ramas |
| `\|\|`, `??` | `{left, right}` | sobre-aproximación **documentada** en rama muerta: si `left` resuelve a global conocido (siempre truthy/no-nullish), `right` es código muerto; `(crypto \|\| WebAssembly).x` avisará. Aceptado. |
| `&&` | `{right}` | si `left` es falsy, el acceso lanza igual en Node → no es divergencia Edge |
| Coma / secuencia | `{último operando}` **solo** | ⚠️ El informe describe que `valueTransparentChildren` desciende la coma a múltiples hojas. Eso es semánticamente incorrecto ya hoy (FP latente orden-dependiente: `(performance, crypto).eventLoopUtilization` avisaría por `performance` cuando el valor es `crypto`). **Corregir en `valueTransparentChildren` o filtrar en `exprPartialRoots`**; verificar con P1 antes y después. |
| Paréntesis | `{inner}` | |
| Proyección de contenedor `[a,b][k]` | si `k` resuelve (`canonicalNumericKey`/`resolveKeyCandidates`) → solo los elementos seleccionados; si no resuelve → **todos** los elementos (existencial) | |

**Consumidores a convertir (6 + alias):** member-read `L7088`, construcción `L6047`/`L6101`, `Reflect.get` `L6149`, destructuring `L7296`, function-constructor `L5965`, y el camino de alias (FIX-2). Regla de decisión uniforme en cada consumidor:

> **WARN ⇔ ∃ candidato resuelto** cuyo par `(global, member)` es divergente **o** dispara default-deny para ese global.

**Default-deny con set mixto:** si cualquier candidato resuelto es un global allowlist-style con miembro no enumerado → warn. Es el mismo contrato fail-closed del caso single-root (la rama puede tomarse en runtime); no sobre-avisa. El único sobre-aviso legítimo es la rama muerta documentada arriba.

**Riesgo de FP percibido (gestión, no bloqueo):** el fix convierte silencio-por-suerte-de-orden en warning consistente. Patrones de selección por entorno (`cond ? implEdge : implNode`) que hoy pasaban empezarán a avisar. Mitigación: criterio de aceptación #8 (diff de warnings pre-merge) + decisión de política en P3.

### FIX-2 — `scopePartialAliases` → `Map<name, ReadonlySet<root>>` (cierra el residuo alias de #1)

- Alcance: solo bindings `const` con inicializador value-transparent.
- Unión transitiva en alias-de-alias.
- `let` + reasignación: **RENUNCIADO** (flujo). Añadir línea explícita a la tabla de renuncias del ADR.
- Justificación de necesidad (pregunta 2 del informe): `const R = cond ? implA : implB; R.member()` es exactamente el error de desarrollador que la regla existe para cazar, a un salto de indirección trivial. No es residual aceptable.

### FIX-3 — Reconocedor reflexivo (⚠️ **acota** #3, no lo cierra)

**Para el ADR:** #1/#2/#5 son recursión estructural sobre una gramática finita de operadores → correct-by-construction. #3 es un **denylist de idiomas dentro de una regla allowlist** → espacio abierto. Evidencia: V3 encontró dos idiomas fuera de la lista al primer intento. Corregir la frase del crítico en la documentación de convergencia: para #3, "acotado", no "cerrado por construcción".

**Lista de idiomas v1** (key-explícitos, expression-local; aplicable solo a globals cuyos miembros divergentes son own-data — verificado para `import.meta` en V1):

1. `{Object, Reflect}.getOwnPropertyDescriptor(R, 'k').value`
2. `Object.getOwnPropertyDescriptors(R).k.value` (incluida forma bracket `['k']`; el plural es solo `Object`)
3. `Object.assign({}, …, R, …).k` — `R` en cualquier posición de fuente
4. `({...R}).k`
5. **Decisión recomendada: incluir** `Object.create(R).k` (V3: expression-local, key-explícito, lee vía prototipo).

`R` se resuelve con `exprPartialRoots` (hereda la cobertura multi-rama de FIX-1).

**Renunciados con rationale (añadir a la tabla de renuncias):**

| Idioma | Rationale |
|---|---|
| `Object.entries/values/keys`, `Reflect.ownKeys` → índice | key-implícito: la identidad del miembro se pierde sin data-flow |
| `Object.fromEntries(Object.entries(R)).k` | verificado que lee (V3), pero es composición de copia key-implícita; aceptarla abre la puerta a composiciones arbitrarias → renuncia explícita |
| `structuredClone(R).k` | **eliminado empíricamente** (V4: lanza `DataCloneError`) |
| `new Proxy(R, handler).k` | el handler puede alterar la semántica de lectura; sin equivalencia garantizada |
| Receptor-vía-flujo: `const c = {...import.meta}; c.dirname` | el reconocedor es expression-local (P6 lo fija en tabla) |
| Receptor/clave variable | ya renunciado en el informe |

**Frontera redactada como regla (no como lista) para el ADR:**

> El reconocedor cubre lecturas **key-explícitas** y **expression-local** a través de una lista finita de intrínsecos de copia/reflexión. Todo lo key-implícito, receptor-vía-flujo o vía función de usuario es procedencia renunciada.

### FIX-4 — Normalizador Cc + test diferencial end-to-end (cierra #4 relativo-a-TS)

- **Región de fold:** solo el prefijo inmediatamente pegado al `@` (V8). **No foldear dentro del nombre del tag**: `@server\x01-safe` (que TS parsea como `"server"`) recibe diagnóstico, no fold.
- **Política: fold + diagnóstico de higiene.** Cuando el raw-match módulo-invisibles encuentra el marcador pero TS no emitió el tag: (a) tratar el fichero como anotado (fail-safe: queda lintado), y (b) emitir diagnóstico — *"el marcador contiene U+0001 entre `/**` y `@server-safe`; elimínalo"*. Domina tanto al fold silencioso (que deja basura invisible permanente y divergencia permanente con el tooling basado en TS) como al solo-diagnóstico (que deja el fichero sin lintar).
- Conjunto de fold: los 59 Cc no-whitespace (C0 salvo TAB/LF/VT/FF/CR, más DEL, más C1 salvo NEL), sumados a los Cf/Zl/Zp/Zs ya cubiertos.
- **Test diferencial end-to-end** (patrón del oráculo ToPropertyKey; responde a la pregunta 4 del informe con una corrección de objetivo):
  - Para cada codepoint `c` en `U+0000..U+FFFF`, construir `/**${c}@server-safe */\nexport const x = 1;` y comparar `reconocimientoRegla(c)` vs `ts.getJSDocTags(...)`.
  - Aserciones: **regla ⊇ TS** y **delta ⊆ folds documentados**.
  - **No usar `ts.isWhiteSpaceLike` como oráculo** (V9: falla para Zl/Zp). El oráculo es el comportamiento del parser.
  - Pin de versión de `typescript` en el test; el drift del scanner aparece como diff de test.
  - Coste: ~65k parses de un fichero de 2 líneas — trivial en CI.

Esqueleto del oráculo (verificado en el contenedor):

```js
import ts from 'typescript';
function tsRecognizes(cp) {
  const src = `/**${String.fromCodePoint(cp)}@server-safe */\nexport const x = 1;`;
  const sf = ts.createSourceFile('t.ts', src, ts.ScriptTarget.Latest, true);
  return ts.getJSDocTags(sf.statements[0]).some(t => t.tagName.getText(sf) === 'server-safe');
}
```

### FIX-5 — Flatten de spread-de-array-literal (cierra #5)

- En la rama ElementAccess de `valueTransparentChildren`: cuando el operando de un `SpreadElement` resuelve a array literal(es) vía `arrayLiteralAlternatives`, descender **recursivamente** a sus elementos (cubre el anidado `[...[...['fs']]][0]`).
- Semántica JS verificada (V5).
- Límites sin cambio: spread de string literal, `Set`, generadores/iterables → llamadas → procedencia renunciada.

---

## 4. Tests de propiedad nuevos (mecanismo de cierre duradero; análogos a INV-VT)

El meta-test sintáctico propuesto en la pregunta 5 del informe (prohibir `return` dentro de un bucle de hojas sin acumulación) se acepta **solo como defensa en profundidad**: no ve `leaves[0]` ni la semántica por operador. El cierre real es conductual:

**INV-SYM — simetría de orden.** Para cada operador multi-candidato con posiciones simétricas (ramas de ternario, lados de `||`/`??`, elementos de array), cada lectura divergente `D` y relleno neutro `N`:

```
veredicto(op(D, N)) === veredicto(op(N, D))
```

Habría cazado #1 y #2 mecánicamente; protege contra regresiones tipo `71be882` de forma permanente. Codifica el discriminador gap-vs-renuncia del informe como invariante.

**INV-WRAP — invariancia de envoltorio.** Para composiciones `W` de wrappers value-transparent hasta profundidad 3 (incluye salto de alias `const` y spread-de-literal):

```
veredicto(W(D)) === veredicto(D)
```

Y para wrappers renunciados: **silencio en ambos órdenes** (fija la frontera de renuncia como test, no como prosa).

**Codificación asimétrica obligatoria:** coma (solo la posición final es value) y `&&` (solo la derecha). El generador de composiciones debe conocer las posiciones value por operador de la tabla de FIX-1.

---

## 5. Probes obligatorios (contra la regla real vía `rehunt-harness.mjs`, con control, antes y después del fix)

| # | Snippet | Esperado post-fix | Propósito |
|---|---|---|---|
| P1a | `(f(), import.meta).dirname` | **WARN** | valor de coma = último operando |
| P1b | `(import.meta, obj).x` | **SILENT** | la coma no debe propagar operandos anteriores (detecta el FP latente) |
| P2 | `import.meta?.dirname` · `(b ? crypto : WebAssembly)?.Module` · construcción con `?.` intercalado | WARN | optional chaining por cada consumidor |
| P3 | `typeof X !== 'undefined' ? X.miembroDivergente : y` | **medir y DECIDIR** | política de guards a nivel de expresión: o se enseña `ConditionalExpression` al reconocedor de guards, o se documenta "guards solo statement-level". Decisión escrita pre-merge. |
| P4 | `Object.create(import.meta).dirname` · `Object.fromEntries(Object.entries(import.meta)).dirname` | WARN · SILENT-renunciado | confirma las decisiones incluir/renunciar de FIX-3 |
| P5 | `/* @server-safe */` · `// @server-safe` · `/** @param x the @server-safe flag */` · `/**@server-safe*/` | registrar | línea base del espacio marcador (alimenta §6) |
| P6 | `const c = {...import.meta}; c.dirname` | SILENT-renunciado | fija la entrada receptor-vía-flujo en la tabla de renuncias |

---

## 6. Hallazgos nuevos del espacio marcador (alcance ronda 5 — **no bloquean PR #133**)

El espacio del marcador recibió un solo probe en cuatro rondas (el #4, del crítico) frente a 13 revisores × 4 rondas para el espacio de código. Dos adyacentes salieron al primer intento de sondeo (V10):

- **M1 — falso negativo de fichero completo:** `/* @server-safe */` (una sola estrella) no emite tag en TS → si la detección va vía tags, el fichero entero queda silenciado. En la práctica es **más probable que un Cc**. Recomendación: diagnóstico near-miss — *"marcador encontrado en comentario no-JSDoc; ¿querías `/** */`?"* — misma familia fold+diagnóstico de FIX-4.
- **M2 — anotación falsa:** la mención dentro del texto de otro tag (`/** @param x the @server-safe flag */`) **sí** registra `server-safe` como tag → fichero lintado sin intención del maintainer. Dirección FP (fail-closed), pero sorprendente. Decisión pendiente: ¿exigir que el marcador sea un tag block-level propio?

**Recomendación ronda 5:** en paralelo a la pasada de FPs sobre código, mini-fuzz del espacio marcador (tipo de comentario × posición × incrustado-en-otro-tag × invisibles) reutilizando el oráculo diferencial de FIX-4.

**Predicción falsable para ronda 5** (registrarla, igual que se registró §7 — que §7 fuera falsada es precisamente lo que permitió encontrar estas 5 clases): en el espacio de código, tras FIX-1..5 + INV-SYM/INV-WRAP, solo deben aparecer falsos positivos y silencios-renunciados-en-ambos-órdenes. El espacio marcador queda explícitamente fuera de esa predicción hasta cubrir M1/M2.

---

## 7. Criterios de aceptación (GO del gate)

1. Los 6 consumidores + `import.meta` convertidos a set, sin early-return; irresolubles-en-raíz **ignorados** (ley de polaridad).
2. Semántica por operador implementada y testeada: coma = último, `&&` = derecha, ternario/`||`/`??` = ambos (con la sobre-aproximación de rama muerta documentada).
3. `scopePartialAliases` a sets, const-only, unión transitiva; renuncia de `let`-reasignación escrita en la tabla del ADR.
4. Reconocedor reflexivo v1 implementado + frontera-como-regla en el ADR + reclasificación de #3 como "acotado" en la doc de convergencia.
5. Normalizador Cc solo-prefijo + diagnóstico de higiene + test diferencial end-to-end (regla ⊇ TS, delta ⊆ folds, `typescript` pineado) en CI.
6. INV-SYM e INV-WRAP en la suite permanente, verdes en ambos órdenes de rama.
7. P1–P6 ejecutados con resultados registrados; P3 con decisión de política escrita.
8. Diff de warnings sobre repo + fixtures pre-merge revisado y aceptado (presupuesto de FP del paso de silencio-orden-dependiente a warning consistente).
9. Predicción falsable de ronda 5 registrada (§6), con M1/M2 como alcance declarado de la mini-pasada del marcador.

---

## 8. Trazabilidad — respuestas a las 6 preguntas del informe

| Pregunta | Respuesta |
|---|---|
| Q1 (set en `exprPartialRoots`) | **Sí**, con tres ajustes: semántica por operador (coma/`&&`), irresolubles-en-raíz ignorados, y diff de warnings pre-merge + decisión P3. El default-deny con "any candidato allowlist-style" no sobre-avisa: mismo contrato fail-closed que single-root. |
| Q2 (alias multi-rama) | **Necesario, no residual.** Spec en FIX-2; `let`-reasignación renunciada explícitamente. |
| Q3 (clase reflexiva) | **Acotable, no cerrable.** Incluir `Object.create`; renunciar entries/values/fromEntries∘entries/Proxy/flujo con rationale; `structuredClone` eliminado empíricamente. Frontera redactada como regla. |
| Q4 (marcador Cc) | **Sí al test diferencial, con corrección de oráculo:** end-to-end contra `ts.getJSDocTags`, no contra `isWhiteSpaceLike` (V9). Fold solo-prefijo + diagnóstico de higiene. |
| Q5 (principio unificador) | **Adoptar con división de polaridad** (§1). El meta-lint sintáctico es defensa en profundidad; el cierre real son INV-SYM + INV-WRAP (§4). |
| Q6 (convergencia) | **Sí en el espacio de código**, condicionada a los criterios 1–6. #4 cerrado relativo-a-TS. #3 acotado. El espacio marcador necesita su mini-pasada (M1/M2) antes de declarar la caracterización total. |

---

## Addendum R4-A1 (post-baseline, 2026-07-02)

**Resolución de la advertencia de coma en FIX-1.** El baseline de implementación
(P1a WARN / P1b SILENT contra HEAD `85ee3f6`) confirma que `valueTransparentChildren`
ya implementa la semántica por operador: coma → `[right]` (L3590), `&&` → `[right]`
(L3595), `||`/`??` → `[left, right]` (L3603), ternario → ambas ramas. El "FP latente
de la coma" señalado en la tabla de FIX-1 no existe en el código: la imprecisión
estaba en la prosa de `REHUNT4-REPORT.md`, que debe corregirse. La fila de la coma
y el propósito de P1 quedan resueltos en este sentido; el resto del spec de FIX-1
no cambia. P1a/P1b se conservan en la suite como test de regresión de la coma.

## Addendum R4-A2 (post-implementación, 2026-07-02) — CC

**Δ2 medido: NEL U+0085 hay que foldearlo (60, no 59).** El scan diferencial contra
el detector REAL del gate (`detectServerSafeMarker`, comment-range, NO `ts.getJSDocTags`)
midió `GATE ⊉ TS = {U+0085}`: `ts.getJSDocTags` reconoce `/**<NEL>@server-safe*/` pero el
detector del gate no. Para el criterio "regla ⊇ TS", el fold-set de FIX-4 INCLUYE NEL →
**60 chars** (C0 no-ws + DEL + C1 completo, excepto solo TAB/LF/VT/FF/CR). El test
diferencial end-to-end lo pinea. Es la lección V9 un paso más: el oráculo no es
`isWhiteSpaceLike` NI `ts.getJSDocTags`, es el detector del gate — el fold-set se
determinó midiendo contra él.

**Estado de implementación:** los 5 fixes + INV-SYM (parametrizado sobre los 6
consumidores) + watch-list #1/#4/#6 en la suite permanente. verify-cold VERDE (49
files, 2301 tests), gate-vs-source 0 violations, ESLint 0 (sin eslint-disable), typecheck
OK. Wrapper singular `exprPartialRoot` ELIMINADO (cero call-sites; import-equals convertido
a `exprPartialRoots`, watch-list #3). Pendiente (no bloquea #133): ronda 5 marker-space
(M1/M2) + decisión de política P3 (Iván).

## Addendum R4-A3 (M-1 resuelto + pre-registro ronda 5, 2026-07-02) — CC

**M-1 (condición de Fable) — MEDIDO, el gate distingue.** La sonda `?.()` es la imagen especular del
member-guard: solo discrimina AUSENCIA. Medición contra el gate real:

- `performance.eventLoopUtilization?.()` → **SILENT** (ausencia: la sonda protege de verdad). ✅
- `WebAssembly.compile?.(b)` / `compileStreaming?.(b)` / `instantiateStreaming?.(b)` / `compile?.call(null,b)`
  → **FLAG** (present-but-throws: la sonda NO protege; la sanción `?.()` NO los exime). ✅

La sanción NO silencia `?.()` de forma uniforme — el bloque `PARTIAL_PRESENT_THROWS_ROOTS` del member-read
pone `isSafeOptionalProbe=false` cuando el optional-probe INVOCA un miembro present-throws. No hay reintroducción
del FN por la puerta de la sanción. `WebAssembly.instantiate?.(b)` → SILENT es un **§141 residual APARTE** (ya
ratificado, codex P2): `instantiate` no está en la denylist porque `instantiate(Module)` es la forma legítima
que corre en Edge y el gate no distingue el arg-type sin data-flow; el `?.()` es irrelevante (el plain
`instantiate(b)` también es SILENT). Ambos probes de ausencia/present-throws entran como fixtures junto a la
tabla P3.

**Pre-registro de la predicción falsable de ronda 5 (precede a la pasada, como la §7 precedió a la ronda 4).**
Tras FIX-1..5 + INV-SYM + INV-WRAP + P3 + M-1, sobre el commit del gate nuevo:

> **PREDICCIÓN R5-CODE:** en el ESPACIO DE CÓDIGO (value-survival), una pasada ojos-nuevos no-focalizada solo
> debe devolver (a) FALSOS POSITIVOS y (b) silencios-RENUNCIADOS-en-AMBOS-órdenes (§141 / out-of-mandate). NO
> debe aparecer ningún FN de raíz-nueva ni ninguna asimetría de orden (que INV-SYM ya blindaría). Si aparece un
> FN de raíz-nueva, R5-CODE cae — como cayó la §7 — y hay una capa/eje no cubierto.
>
> **FUERA de R5-CODE (explícito):** el ESPACIO MARCADOR (M1 `/* @server-safe */` una-estrella → fichero
> silenciado; M2 mención-en-otro-tag → tag falso) queda EXPLÍCITAMENTE fuera de esta predicción hasta cubrir
> M1/M2. El diferencial de marker se amplía a Cc∪Cf∪Zs∪Zl∪Zp (o U+0000–U+FFFF) para cazar drift de TS en los
> folds preexistentes (criterio 5) — puede montar en la pasada R5.

**El método de R5 es un HUNT GENERALISTA NO-FOCALIZADO** (ojos-nuevos, completo, profundo, atrapatodo — como
las rondas 3 y 4, NO una re-ejecución estrecha del harness ni una pasada centrada en un eje). La predicción
R5-CODE es precisamente lo que un hunt generalista debe encontrar tras el cierre: solo FPs y silencios
renunciados. Un hunt generalista es MÁS fuerte que una confirmación dirigida — barre todos los ejes (resolvers,
polaridad, reflexión, marker, imports, deferred-body, eval-sinks, cruces profundos) sin saber dónde mirar, así
que si R5-CODE se cumple es porque nada sobrevivió, no porque no se buscó. Hace doble servicio: falsar/confirmar
la predicción Y auditar el presupuesto de FP (criterio 8) sobre el gate nuevo. Cierre limpio del ciclo antes de rc.1.
