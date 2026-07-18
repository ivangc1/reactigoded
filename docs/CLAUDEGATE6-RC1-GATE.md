# GATE REVIEW v5 (claudegate6) — reactigoded 1.0.0-beta.27 (API FREEZE gate → rc.1)

> **Nota de versionado (LÉELA ANTES DE EMPEZAR — evita un falso hallazgo garantizado).** Este ciclo se nombra internamente **beta.27** en el CHANGELOG, comentarios de código y branches (`*/beta27-*`), pero el **tag publicado en npm es `v1.0.0-beta.26`** (HEAD `89a34cd`, branch `main`). Son **el mismo ciclo**: hubo un rename tardío beta.27→beta.26 al taggear. Verás `DialogAction ELIMINADO en beta.27` (`src/components/Dialog/index.ts:25`) y `## [1.0.0-beta.26] — ... (bloque claudegate5 / beta.27 cerrado)` (`CHANGELOG.md:10`). **NO lo reportes como discrepancia de versionado** — es ruido conocido. Cuando este prompt dice "beta.27" se refiere al bloque; cuando dice "tag beta.26" se refiere al artefacto publicado.
>
> Este es el **v5 (claudegate6)**. Sucede al v4 (claudegate5), que auditó beta.25→beta.26. El bloque beta.27 (**25 PRs #105-#129**) **YA SE CERRÓ y se taggeó**. Por tanto, todo lo que el v4 pedía auditar como ABIERTO ahora **está HECHO**: las preocupaciones del v4 (asChild/Slot DS-wide, consumer-pack gate, catálogo-vs-Node, ΔE 0.07, matriz Windows, Rating form-value, server-safe AST marker) son AHORA **implementaciones reales a auditar por calidad/huecos/escalabilidad** — no preguntas abiertas de si hacerlas.
>
> Este gate es **potencialmente el del API FREEZE**. Máxima exigencia. Lo que se cuele aquí se hereda congelado en 1.0.0 sin posibilidad de breaking hasta 2.0.0.
>
> **Staleness ya corregida en este prompt — NO la reintroduzcas en tu informe:** `DialogAction` está **ELIMINADO** (no existe; lo reemplazó `asChild` en `*Close`); `asChild` está en **4 familias / 5 superficies de firma** (ya implementado, no propuesto); el **consumer-pack gate YA EXISTE** (`scripts/test-consumer-pack.mjs` — audítalo, no propongas crearlo); el catálogo server-safe **tiene exactamente 46 entradas** (no "46-47"). No preguntes "¿deberías hacer X?" sobre nada de lo anterior: audita correctness, completitud y escalabilidad de lo ya construido.

---

## 0. Setup / sanity-check (minuto 1 — si esto falla, todo lo demás es inválido)

**¿No tienes el repo (estás en un sandbox limpio, web, sin acceso a la WSL de Iván)? CLÓNALO — NO PARES, NO audites desde el texto de este prompt.** Auditar regurgitando la narrativa del prompt es exactamente el failure mode que §1 regla 4 prohíbe. El repo es público; tienes (o pide) egress de red. Bootstrap estándar:

```
git clone https://github.com/ivangc1/reactigoded
cd reactigoded
git checkout 89a34cdba80dcd3777c6d2ac469e1f918d7adf4d   # el commit anclado
```

Tras clonar, sustituye en todos los comandos de abajo `cd ~/reactigoded` por `cd <tu-clone>`. Un auditor que clona en un sandbox Linux **ES un Auditor B válido** (§9): ejecuta TODOS los `[MUST]` (pipeline, server-safe stress, consumer-pack, Slot, EOPT, tipos publicados) y declara `[MAY-SKIP]` lo que requiera navegador/Playwright (§5.10, §5.11) si no lo tienes. NO necesitas Windows ni Node 22.12 exacto para entregar un informe valioso — declara tu `node -v` real (§1 regla 2) y marca como inferido lo que dependa del engine mínimo.

Antes de auditar nada, confirma que estás en el árbol correcto. **Disciplina shell (memoria del proyecto):** en la WSL de Iván el repo vive en `/home/igoded/reactigoded` (= `~/reactigoded`) y el cwd del shell rebota al default tras cada Bash, así que cada bloque empieza con `cd ~/reactigoded && ...`. En un clone propio, usa la ruta de tu clone. **PROHIBIDO** `bash scripts/verify-cold.sh 2>&1 | tail -N` — el pipe enmascara el exit code real (`tail` siempre devuelve 0).

```
git rev-parse HEAD          # esperado: 89a34cdba80dcd3777c6d2ac469e1f918d7adf4d
git status --porcelain      # esperado: vacío (árbol limpio)
node -v                      # declara el valor EXACTO en tu informe
npm ci                        # limpio primero; ver nota peers abajo
```

**Si `git rev-parse HEAD` ≠ `89a34cd` Y no puedes hacer checkout de ese commit, PARA** (el commit fue borrado/reescrito, o el repo cambió). Si simplemente estás en otro HEAD, haz `git checkout 89a34cd...` y continúa. Todas las líneas `:NNN` de este prompt están ancladas a ese commit; en otro HEAD son inválidas.

**Sobre peers.** _(NOTA post-#138: en el `main` actual esto está **SUPERADO** — `overrides` en package.json + el bump storybook 10.5 / vitest 4 hacen que el `npm ci` **plano** pase sin ERESOLVE, cubriendo también el 3er conflicto; el `--legacy-peer-deps` se quitó de los 3 jobs CI. El párrafo de abajo describe el estado en el commit anclado `89a34cd`.)_ El `npm ci` plano de este repo **falla con ERESOLVE**, pero NO por los peers de runtime del paquete publicado (`react`/`react-dom >=19`, `clsx ^2.1`, `@floating-ui/react ^0.27`), que resuelven limpiamente. El conflicto que dispara el fallo es de **devDependencies/toolchain**: `eslint-plugin-jest-dom@5.5.0` declara `peer eslint@"^6.8.0 || ^7.0.0 || ^8.0.0 || ^9.0.0"` (cap en `^9`) y el repo pinea `eslint@^10.4.0` (`eslint-plugin-jsx-a11y@6.10.2` está en el mismo caso). Hay un `patches/eslint-plugin-jest-dom+5.5.0.patch` (corre en `prepare: patch-package`) que arregla el **runtime** del plugin para eslint 10 — por eso `npm run lint` pasa — pero **NO toca el peer range del manifest**, así que el ERESOLVE persiste en la fase de resolución (el patch corre post-install, demasiado tarde para evitarlo). Esto **solo afecta a la DX del contributor que clona el repo, NO al artefacto npm publicado ni a sus consumers** (la API surface y el `dist` no dependen de estos plugins). Al instalar deps de dev, **reporta primero el fallo del `npm ci` plano** (es el comportamiento esperado y verificado, severidad LOW — devDep-only) y **reintenta con `npm ci --legacy-peer-deps`** para continuar. El CI usa ese flag en todos sus jobs de install (`.github/workflows/chromatic.yml:29`, `.github/workflows/verify.yml:53` y `:198`), por lo que CI está **verde**; el fallo del plano es conocido, no un rojo oculto. (Existe además un 3er conflicto documentado en la cadena `@storybook/addon-vitest`/`@vitest/browser` que un `overrides` de eslint no cubriría — tenlo en cuenta si auditas si `--legacy-peer-deps` es eliminable.)

---

## 1. Quién eres + reglas innegociables

Eres un **senior staff engineer** auditando un design system **el día antes de congelar su API pública (rc.1)**. No eres linter, no eres cheerleader, no trabajas para el equipo. Tu trabajo: encontrar lo que rompe en prod, lo que se hereda como deuda permanente al congelar, lo que escala mal de ~32 a ~100 componentes, y los gates que **convergen a "pasa verde" en vez de a "son correctos"**.

**Reglas innegociables:**

1. **Reproduce, no teorices.** Bypass del gate = escríbelo y córrelo (`node --input-type=module -e '...'` contra el script real). Contraste = mídelo en DOM real con Playwright/Chromium, no a ojo. Tipos publicados = `tsc --noEmit` sobre el tarball instalado, no sobre el repo. Lo no reproducible va explícitamente en "Suposiciones", separado de lo confirmado.
2. **El entorno importa — declara el tuyo EXACTO.** Blockers de rondas previas (publish roto por `rm` POSIX, `.d.ts` inválido con `skipLibCheck:false`, 259× TS2834 bajo NodeNext) **solo eran visibles en ciertos entornos**. Linux/bash no ve bugs Windows/PowerShell. Bundler-resolution no ve bugs NodeNext. Por eso el cruce A+B es obligatorio (§9). **El `node -v` que reportes manda:** si tu Node ≠ 22.12.0, NO afirmes haber verificado el comportamiento del engine mínimo — decláralo como "verificado en Node X; 22.12.0 por inferencia" en Suposiciones.
3. **Distingue decisión consciente de bug.** Comprueba `docs/decisions/`, CHANGELOG, JSDoc, allowlists y `D13-name-reservations-pre-rc1.md` **ANTES** de reportar. Reportar una decisión documentada como "pendiente" quema tiempo y credibilidad (pasó con i18n D12 en beta.25). Si hay registro, el framing correcto es "ratificar/endurecer/cambiar", NO "decidir". Ver §7 para lo que NO se reporta.
4. **No leas la narrativa interna como verdad.** Claims tipo "✅ aplicado", "decisión cerrada", "ya cubierto por X", "18 rondas codex limpio" = claims sin evidencia hasta que cites `archivo:línea` del código real. CHANGELOG y docs cuentan la versión idealizada. **CI verde ≠ correcto. Test pasando ≠ feature funcionando.** Un gate que el propio bot iteró hasta ponerlo verde converge a "el gate pasa", no a "el gate es correcto" — **audita el gate en sí, no solo su salida** (sesgo central; ver §3).
5. **Severidad honesta y calibrada.**
   - **BLOCKER** = impide rc.1 o se hereda roto en 1.0.0 (bypass de invariante, breaking accidental, type hole en superficie congelada).
   - **HIGH** = arreglar o documentar escape explícito antes del freeze.
   - **MEDIUM** = decisión consciente que conviene ratificar pre-freeze.
   - **LOW** = monitor post-1.0.
   - **DEFERRED** = post-1.0, no bloquea.
   - **≥1 BLOCKER = no se tagea rc.1.**
6. **Reconoce lo que está bien** (calibración, no cortesía). El walker AST de scope/TDZ/deferred-body está sólido; el contenido del catálogo no. Distingue.
7. **Cuantifica.** "Escala mal" vale cero. "El consumer-pack valida 2/36 exports server-safe; el bug NodeNext que lo motivó sigue latente en 34" es accionable. "El catálogo omite ≥33 globals client-only incl. `self` y los DOM-constructors" es accionable. **Prohibido** dejar una pregunta retórica abierta ("¿es BLOCKER?", "¿debe haber banda?"): **clasifica con severidad y justifica**. Prohibido "depende"/"podría" sin decisión.
8. **Mide contra estándares de industria, no contra el propio repo.** Radix / Base UI / Ark / React Aria / Headless / Mantine. El burden of proof está en el DS. **Esta regla es operativa, no decorativa:** donde el prompt te pida comparar (Slot/asChild §5.4, controllable-state §5.12), produce un **diff de comportamiento concreto** contra el contrato de la librería de referencia, no una opinión.

---

## 2. Contexto del proyecto (a beta.27 cerrada / tag beta.26)

**reactigoded** = design system + marca de Iván Goded. React 19 + Vite + Storybook + TypeScript strict total + tokens OKLCH dual lux/nox (7 cardinales latinos: `vitreus` brand, `axis` secondary, `laurus` success, `rutilus` warning, `malum` danger, `kobalium` info, `cinis` neutral, + `fundus` bg). ESM-only. Publicado en npm. Storybook en https://igoded.es. Repo `github.com/ivangc1/reactigoded`, rama `main`, espejo local en WSL2 (ext4, NO NTFS — la corrupción NTFS es real).

**Estado:** tag `v1.0.0-beta.26` (HEAD `89a34cd`), bloque interno beta.27. **~32 componentes públicos + 36 en el subset server-safe.** Siguiente tag esperado: `1.0.0-rc.1`. Este es el gate del freeze.

**Node engine: `>=22.12.0`.** Crítico para server-safe: `fetch`/`URL`/`Blob`/`crypto`/`EventTarget`/`PerformanceObserver`/`WebSocket`/`BroadcastChannel` **EXISTEN en Node ≥22.12** (NO son client-only, NO deben estar en el catálogo). `localStorage`/`window`/`matchMedia`/`document`/`navigator`/`HTMLElement`/`self` **NO existen** (sí son client-only). El catálogo `CLIENT_GLOBALS` codifica esa frontera — y ahí están los huecos (§3).

**Filosofía:** hand-rolled, sin deps UI runtime salvo `@floating-ui/react` (peer `^0.27.0`) + `clsx` (peer `^2.1.0`). Subset `@server-safe` de 36 componentes presentacionales RSC-safe, expuesto vía subpath `reactigoded/server-safe` + condición `react-server`. TS strict total: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Cero `as any` / `@ts-ignore` en `src/`. Convención de hooks `Use{Name}Return` (D11). Defaults i18n en español (D12, deliberado).

**Cambios estructurales de beta.27 que tocan el freeze:** existe `Slot` primitive interno (`@internal`, NO exportado); `asChild` en 4 familias / 5 superficies (Dialog: Trigger+Close, AlertDialog: Close, Menu: Trigger, Tooltip: forward); `DialogAction` ELIMINADO; 307 props opcionales ensanchadas a `?: T | undefined` (EOPT #155); gate consumer-pack (tarball→install→tsc bajo Bundler+NodeNext); matriz CI 4 combos; ΔE threshold 0.07.

---

## 3. START finding pre-verificado — BLOCKER de entrada, NO el techo

> **Cómo usar esta sección.** START-1 está **sembrado a propósito** como onboarding del modo de fallo. Está confirmado y reproducido. **Confirmarlo NO cuenta como hallazgo tuyo.** Tu entregable sobre START-1 es **EXTENDERLO** (puntos 2 y 3 de "tu trabajo"). Un informe que solo copia START-1 y marca "confirmado" se considera **incompleto** (ver criterio de parada, §8). El repro transitivo está en el **Anexo A** precisamente para que lo corras tú, no para que lo des por hecho.

**START-1 (BLOCKER, CONFIRMADO): el catálogo `CLIENT_GLOBALS` omite la clase entera de DOM-constructors / event-constructors / window-accessors — bypass real del invariante `@server-safe`, incluso por la ruta transitiva cross-módulo.**

**Estado: latente.** El gate hoy pasa en verde (39 archivos marcados, 0 violations vivas en `src/`). NO hay violación viva. Pero el gate **es bypasseable**: deja pasar código que lanza `ReferenceError` en SSR/RSC, **incluso atravesando la capa transitiva** (la más fuerte, cerrada en beta.27 / SS-SMUGGLE). Mismo nivel que el `matchMedia` del gate anterior, pero ~33 nombres más amplio.

### Qué falla

`CLIENT_GLOBALS` (`scripts/check-server-safe-markers.mjs:291`) es un denylist hardcodeado de **46** nombres. Cubre `matchMedia`, `getComputedStyle`, `localStorage`, `IntersectionObserver`, `navigator` (wholesale), etc. **Omite por completo** la clase de DOM/event constructors y window accessors que (a) NO existen como global en Node 22.12+ y (b) son idiomáticos en un DS React. **33 nombres probados están ausentes del catálogo Y lanzan `ReferenceError` en Node** (probados, no exhaustivos — acotar la clase total es tu trabajo, punto 2):

`HTMLElement, Element, Node, HTMLInputElement, HTMLAnchorElement, HTMLButtonElement, SVGElement, Event, CustomEvent, KeyboardEvent, MouseEvent, PointerEvent, FocusEvent, DragEvent, Touch, Range, CSS, self, top, parent, frames, innerWidth, innerHeight, scrollX, scrollY, devicePixelRatio, cookieStore, ShadowRoot, DataTransfer, ClipboardItem, FontFace, DOMRect`.

El más sólido es **`instanceof HTMLElement` / `instanceof Element`**: **ya es patrón vivo en el propio DS** (verificado @ `89a34cd`):
- `src/components/floating/Tooltip/Tooltip.tsx:490` → `if (raw instanceof Element)`
- `src/components/floating/Menu/MenuItem.tsx:186` → `if (e.currentTarget instanceof HTMLElement)`

Hoy esos archivos no son `@server-safe`, pero nada impide que un componente `@server-safe` futuro —o un util importado transitivamente— use ese idiom en render path. `x instanceof HTMLElement` evalúa el binding bare `HTMLElement` durante el render → `ReferenceError` en Node.

### Repro 1 — single file (vía `checkSourceFile`, igual que `server-safe-gate.test.ts`)

```
cd ~/reactigoded && node --input-type=module -e '
import { checkSourceFile } from "./scripts/check-server-safe-markers.mjs";
const src = `
/** @server-safe */
export function Foo({ node }: { node: unknown }) {
  const isEl = node instanceof HTMLElement;
  return isEl ? "el" : "not";
}`;
console.log(checkSourceFile(src, "Foo.tsx"));
'
```
Output real: `[]` (cero violations → **pasa el gate**). Mismo resultado para `instanceof Element`, `CSS.supports(...)`, `const w = self`, `cookieStore.get(...)`, `const w = innerWidth`. **Control negativo:** `new Image()` SÍ se caza (`Image` está en el catálogo) — confirma que el walker funciona y el fallo es de **contenido del denylist**, no del walker.

### Repro 2 — transitivo cross-módulo

Está en el **Anexo A**. Córrelo tú: debe imprimir `BYPASS (green)`, demostrando que un util sucio importado por alias `@/` no se flaggea ni siguiendo imports.

### Verificación de la premisa (ReferenceError en el engine)

```
cd ~/reactigoded && node -e 'try { ("a") instanceof HTMLElement } catch(e){ console.log(e.constructor.name, e.message) }'
# -> ReferenceError HTMLElement is not defined
cd ~/reactigoded && node -e 'try { const w = self } catch(e){ console.log(e.constructor.name, e.message) }'
# -> ReferenceError self is not defined
```
`typeof globalThis[n]` es `undefined` para `HTMLElement, Element, Node, CSS, self, innerWidth, cookieStore`. (Verificado en Node 24.15. Si tu engine ≠ 22.12.0, declara el claim sobre 22.12 como inferencia del engine field, no como ejecución directa — Regla 2.) Es exactamente la premisa documentada del catálogo (`scripts/check-server-safe-markers.mjs:324-329`: "acceder bare en render server lanza ReferenceError exactamente igual que `window`").

### Por qué no lo cazan las defensas existentes

- `src/__tests__/server-safe-catalog-vs-node.test.ts:69` solo verifica que los nombres **que YA están** en el catálogo no colisionen con globals de Node. Es **estructuralmente incapaz** de detectar nombres **ausentes** — itera `for (const name of CLIENT_GLOBALS)`. Cubre solo la mitad benigna del drift (Node añade API), no la peligrosa (API client-only nunca catalogada).
- `src/_audit/server-safe-gate.test.ts` menciona `class extends HTMLElement` solo como payload de `customElements.define(...)`; assertea la captura de `customElements`, nunca de `HTMLElement`.
- El walker (scope/TDZ/deferred-body) está bien construido; el fallo es puramente del **contenido del denylist**.

### Descartado (verificado, NO es hallazgo — no lo repitas)

- **`WebSocket`/`BroadcastChannel`**: ausentes del catálogo pero SON globals en Node 22.12+ (`typeof` → `function`). Excluidos correctamente. No bypass.
- **Gate muerto en `verify.yml`**: ninguno conocido. Confírmalo igualmente (§5.1).

### Tu trabajo a partir de aquí (esto SÍ es tu entregable)

1. **Confirma START-1** corriendo Repro 1 y el Anexo A (declara entorno). Esto es el peldaño, no el premio.
2. **Enumera exhaustivamente la clase completa.** NO te quedes en los 33: barre TODA la superficie de Web APIs client-only ausentes en Node 22.12 (DOM constructors, event constructors, window accessors, CSSOM, selection/range, clipboard, observers no portados, `*Event` subtypes). **Reporta el conteo total** de la clase ausente del catálogo. Sin ese número, el informe está incompleto.
3. **Evalúa y propón el modelo de fondo (con coste/riesgo).** Un denylist hardcodeado **no escala** vs la superficie Web API (centenares de nombres, crece cada release del browser). Propón convertirlo a una verificación **anti-drift de completitud**: lista de referencia de Web APIs client-only enforced contra el catálogo + allowlist explícita de overlaps Node. El test catalog-vs-Node cubre un solo sentido del drift; el otro sentido es el que sangra. Clasifica el coste de implementarlo.

---

## 4. Qué se arregló en beta.27 — NO re-reportar, SÍ verificar que sigue cerrado

El bloque beta.27 cerró 25 PRs (#105-#129). Cada fila tiene un **grep/comando** de re-verificación. **Confía en el grep-por-símbolo, no en los `:NNN`** (los números de línea pueden derivar con refactors; los nombres de función/símbolo aguantan). Si el resultado cambió, la regresión está abierta y eso SÍ es hallazgo.

**Columna "Tipo":** **E** = verificación **estática** (existencia/definición en el archivo — barata, fiable). **D** = requiere ejecución **dinámica** (correr el gate / CI / browser; si tu entorno no puede, decláralo en Suposiciones, no marques "cerrado" a ciegas). Ver §4C para lo no ejecutable en un solo entorno.

### 4A. Lista mínima verificada (19 filas)

| ID | Tipo | Qué cambió | PR | Re-verificación (resultado esperado) |
|---|---|---|---|---|
| **EOPT-307** | D | 307 props ensanchadas a `?: T \| undefined`; 11 OUT_OF_SCOPE (3 undefined-literal + 8 never) | #114 | `cd ~/reactigoded && node scripts/eopt-classify.mjs` → "sin widen: 11", "undefined literal: 3", "never: 8", "CLASE 1: 0", "CLASE 2: 0". **NO uses `--json`** (lleva banner de cabecera que rompe `JSON.parse`; usa modo texto) |
| **SLOT-PRIM** | E | `<Slot>` primitive interno standalone, NO exportado | #110 | `cd ~/reactigoded && ls src/components/Slot/Slot.tsx && grep -ciE "\bSlot\b\|composeRefs\|composeEventHandlers" src/index.ts` → archivo existe; grep = **0** |
| **SLOT-DIALOG** | E | `asChild` en DialogTrigger/DialogClose/AlertDialogClose; **DialogAction ELIMINADO**; AlertDialogClose default = icon-button "×" | #111 | `cd ~/reactigoded && grep -rl asChild src/components/Dialog/DialogTrigger.tsx src/components/Dialog/DialogClose.tsx src/components/AlertDialog/AlertDialogClose.tsx && ! grep -rn "export.*DialogAction\|DialogAction =" src/components/Dialog/index.ts` → asChild presente; sin export DialogAction |
| **SLOT-TOOLTIP** | E | Tooltip forwardea outer Slot props via index signature + Slot interno; aria-describedby concatenado | #112 | `cd ~/reactigoded && grep -nE "\[key: string\]: unknown\|import \{ Slot \}" src/components/floating/Tooltip/Tooltip.tsx` → index signature + import Slot presentes |
| **SLOT-MENU** | E | `asChild` en MenuTrigger (clona child; aplica id+haspopup+expanded+controls; triggerId gana sobre child id) | #113 | `cd ~/reactigoded && grep -nE "asChild\|import \{ Slot \}\|triggerId" src/components/floating/Menu/MenuTrigger.tsx` → `asChild?: boolean \| undefined`, Slot import presentes |
| **SS-MARKER-AST** | E | Marker `@server-safe` detectado vía `ts.getJSDocTags`, no substring | #118 | `cd ~/reactigoded && grep -n "ts.getJSDocTags" scripts/check-server-safe-markers.mjs` → 2 hits (≈1816 y 1856) |
| **SS-CATALOG** | D | Catálogo `CLIENT_GLOBALS` = **46** globals; test runtime vs Node | #122,#105 | `cd ~/reactigoded && node -e "import('./scripts/check-server-safe-markers.mjs').then(m=>console.log(m.CLIENT_GLOBALS.size, m.CLIENT_GLOBALS.has('navigator')))"` → `46 true` |
| **SS-NAV-DENY** | E | `navigator` wholesale denylist blindada con audit fixtures | #125 | `cd ~/reactigoded && grep -c "navigator" src/_audit/server-safe-gate.test.ts` → **≥28** |
| **SS-SMUGGLE** | E | Gate sigue imports transitivos (depth-first) + honra modificador `type` inline | #106 | `cd ~/reactigoded && grep -n "function checkFileWithImports" scripts/check-server-safe-markers.mjs` → ≈1332 |
| **CI-MATRIX** | D | Matriz 4 combos ubuntu/windows × Node 22.12.0/24 + cross-OS guard | #121 | **Estático:** `cd ~/reactigoded && grep -nE "os:\|node:\|fail-fast" .github/workflows/verify.yml` → `os: [ubuntu-latest, windows-latest]`, `node: ["22.12.0", "24"]`, `fail-fast: false`. **Dinámico (solo con acceso CI):** los 4 combos en verde (ver §4C) |
| **CONSUMER-PACK** | D | Gate `npm pack`→install sandbox→`tsc --noEmit` (Bundler + NodeNext), copia lockfile | #108 | `cd ~/reactigoded && grep -nE "pack-destination\|package-lock\|--noEmit" scripts/test-consumer-pack.mjs` → usa `--pack-destination`, copia lockfile |
| **DELTAE-007** | E | `error_threshold` 0.05→0.07 + axis-kobalium (ΔE 0.0522) ratificado | #115 | `cd ~/reactigoded && python3 -c "import json;print(json.load(open('scripts/perceptual-allowlist.json'))['error_threshold'])"` → `0.07` |
| **DLGCTX-INT** | E | DialogContext: 4 exports `@internal`; `.d.ts` publicado vacío (`export {}`) | #120 | `cd ~/reactigoded && grep -c "@internal" src/components/Dialog/DialogContext.ts` → `4`; `grep -c "export {}" dist/components/Dialog/DialogContext.d.ts` → `1` (requiere build) |
| **STEP-SPLIT** | E | 4 props movidas de StepProps público a StepInternalProps `@internal` | #119 | `cd ~/reactigoded && grep -nE "StepInternalProps\|index\?:\|active\?:\|complete\?:\|labeled\?:" src/components/Stepper/Step.tsx` → interface `StepInternalProps @internal`; `StepProps` solo `label?: ReactNode` |
| **SIZE-BUDGET** | E | size-limit JS entries con extglob `dist/!(index\|server-safe\|cn).js`; limits 20KB/8KB | #126 | `cd ~/reactigoded && python3 -c "import json;d=json.load(open('package.json'));print([e['path'] for e in d['size-limit'] if 'JS bundle' in e['name']])"` → cada entry incluye el extglob |
| **RATING-NAME** | E | `Rating` añade `name?: string`; renderiza `<input type=hidden name value>` | #117 | `cd ~/reactigoded && grep -nE "name\?: string\|type=\"hidden\"" src/components/Rating/Rating.tsx` → prop `name` (≈45) + hidden input (≈272) |
| **CN-DTS-ORPHAN** | E | `dist/cn.d.ts` huérfano eliminado del tarball; el real es `dist/utils/cn.d.ts` | #123 | `cd ~/reactigoded && ! ls dist/cn.d.ts 2>/dev/null && grep -n 'rmFile("cn.d.ts")' scripts/clean-internal-dist.mjs` → ausente; `rmFile` presente (requiere build) |
| **DEV-VULNS** | D | 3 devDep vulns parcheadas; runtime 0 vulns | #124 | `cd ~/reactigoded && npm audit --omit=dev` → "found 0 vulnerabilities" |
| **CONTRAST-PW** | D | Fixture Playwright mide ΔE OKLab sobre DOM real (Chromium) vs `deltaE_at_decision` | #129 | **Estático:** `cd ~/reactigoded && grep -nE "ΔE OKLab\|deltaE_at_decision\|drift_tolerance\|differenceEuclidean" src/stories/ContrastPairs.stories.tsx`. **Dinámico (solo con browser):** ver §4C |

### 4B. Ítems adicionales del bloque

| ID | Tipo | Qué cambió | PR | Re-verificar |
|---|---|---|---|---|
| **FUI-PEER-DOC** | E | README documenta semántica caret pre-1.0 de `@floating-ui/react ^0.27` | #128 | `grep -nE "Riesgo pre-1.0\|0.27.x SOLAMENTE\|0.28.0" README.md` presente; `docs/decisions/D10-fui-peer-dep-verify.md` existe |
| **D13-RESERV** | E | Reservas léxicas pre-rc.1 | #107 | `ls docs/decisions/D13-name-reservations-pre-rc1.md` → existe |
| **TOAST-JSDOC** | E | `ToastProvider.container` JSDoc alineado con Tooltip/MenuContent | #127 | `grep -n "container" src/components/Toast/ToastProvider.tsx` (ref a `C-02`) |
| **DTS-NODENEXT** | E | Specifiers relativos resueltos en `.d.ts` para consumers NodeNext | #105 | `ls scripts/fix-dts-esm-extensions.mjs`; consumer-pack cubre NodeNext |

### 4C. Lo NO verificable en un solo entorno (decláralo, no lo des por cerrado)

- **Ejecución CI real de la matriz Windows+Node** (CI-MATRIX) y **Playwright en Chromium real** (CONTRAST-PW): este prompt solo verificó la *definición* en YAML/tsx, no la ejecución. **Si tienes acceso a CI** (`gh run view`, runner de la matriz), confirma que los 4 combos pasan verde y que Playwright corre de verdad. **Si NO**, marca ambas filas como "estático verificado / dinámico NO ejecutado" en tu informe y reclasifica §5.7 honestamente como auditoría de la *definición* + lógica de los helpers `crossOs*`, NO de su ejecución. **No marques estas filas como "regresión cerrada" sin haber corrido nada.**
- **`eopt-classify.mjs --json`**: el flag lleva banner de cabecera, así que `JSON.parse` directo falla. Verificación robusta = modo texto (totales 11/3/8/0/0). No automatices `--json`.
- **Reparto histórico 271 CLASE-1 / 36 CLASE-2 de #155**: post-widening el árbol reporta CLASE 1=0, CLASE 2=0 (correcto). Los números históricos viven en el commit rojo del codemod; no re-derivables sin revertirlo.

---

## 5. Áreas de auditoría — con PRIORIDAD explícita

> Para CADA gate/contrato de beta.27: **NO** preguntes si hacerlo (ya está). Pregunta: **¿está bien hecho? ¿tiene huecos de cobertura/completitud? ¿escala a ~100 componentes?**
>
> **PRIORIDAD (resuelve la tensión "profundidad > amplitud"):**
> - **MUST-RUN (bloqueantes — sin estas el informe NO está completo):** §3 (extender START), §5.1 (pipeline), §5.2 (server-safe stress + catálogo), §5.3 (consumer-pack), §5.4 (Slot/asChild correctness), §5.5 (EOPT fronteras), §5.9 (tipos publicados attw).
> - **SHOULD-RUN (cubre si queda presupuesto, en este orden):** §5.6 (ContrastPairs lógica), §5.7 (CI matrix — estático si no hay CI), §5.8 (size-limit + navigator), §5.13 (API freeze surface).
> - **MAY-SKIP-IF-TIME (decláralo si lo saltas):** §5.10 (Storybook browser), §5.11 (contraste DOM real — requiere Playwright), §5.12 (escalabilidad primitives, parcialmente criterio).

### 5.1 [MUST] Pipeline completa — gate por gate

```
cd ~/reactigoded && cat package.json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(k) for k in d['scripts'] if k.startswith(('test:','verify:'))]"
cd ~/reactigoded && grep -nE "npm run (test:|verify:)" .github/workflows/verify.yml
```
Para CADA gate: ¿pasa? ¿qué cubre / qué NO? ¿está en CI? **Gate en `package.json` pero no en `verify.yml` = gate muerto — clasifícalo como hallazgo.** Gates: `lint`, `typecheck`, `test:unit:ci`, `test:contrast`, `test:scope-leaks`, `test:hex-drift`, `test:server-safe-markers`, `build`, `test:state-css-exclusion`, `publint`, `test:rsc-fixture`, `test:consumer-types(+nodenext)`, `test:consumer-pack`, `test:no-dev-warns`, `verify:size`, job `storybook` (browser). (`test:unit` "ausente" es esperado: CI usa `test:unit:ci`.)

### 5.2 [MUST] Server-safe gate — stress adversarial + auditoría del catálogo

El walker AST es sólido (scope, TDZ, deferred-body, optional chaining, element-access, class fields, default params, IIFE, callbacks `.map`/`.then`). Los huecos están en **(a) completitud del catálogo** (§3) y **(b) reconocimiento de formas de guard**.

- **Completitud del catálogo** (§3). Enumera lo que falta (punto 2 de §3). Audita `src/__tests__/server-safe-catalog-vs-node.test.ts:69` — confirma que es unidireccional.
- **Falsos positivos de guards `typeof`** (verificados): el gate **rechaza** formas idiomáticas seguras que `extractPositiveTypeofGuard` (def `:832`, activación `:1508`) no reconoce. Reprodúcelos y clasifica severidad:
  - inline `const x = typeof window !== "undefined" && window.location` → FLAG
  - ternario `typeof window !== "undefined" ? window.location : null` → FLAG
  - `if` compuesto `if (typeof window !== "undefined" && cond)` → FLAG
  Ironía: el propio comment del gate (`src/_audit/server-safe-gate.test.ts`, busca el bloque de "alternativa segura") recomienda la forma `&&` que luego rechaza.
- **Meta-hueco del test suite:** NO existe **ni un test del camino POSITIVO del guard** (que un acceso correctamente guardado PASE). El bloque "no falsos positivos en código limpio" solo prueba código SIN client APIs. El guard podría romperse sin que ningún test se ponga rojo. Caso de libro de "converge a verde". Clasifica severidad.
- **Marker anidado (fail-open):** `isFileServerSafeMarked` solo escanea `sourceFile.statements` top-level (`:1839`). Un `@server-safe` en JSDoc de función anidada NO se detecta → archivo sin auditar pasa silencioso. Verifica y clasifica severidad.

**Los 25 casos adversariales obligatorios (marca cobertura uno a uno):**
1. bare global `HTMLElement`; 2. bare `Element`; 3. bare `self`; 4. bare `innerWidth`; 5. `CSS.supports(...)`; 6. `cookieStore.get(...)`; 7. `x instanceof HTMLElement`; 8. `eval(...)`; 9. `new Function(...)`; 10. `Reflect.construct(...)`; 11. `globalThis.constructor.constructor`; 12. getter que accede a client API; 13. lazy initializer; 14. default param con client API; 15. computed key `obj[window.x]`; 16. class field initializer; 17. top-level await con client API; 18. generator function; 19. tagged template; 20. destructure default `({x = window.y})`; 21. custom event prop / `new CustomEvent`; 22. guard `&&` inline (FP esperado); 23. guard ternario (FP esperado); 24. `self.location`; 25. smuggling depth 3+ con barrel + ciclo + type-only import. Documenta cuáles cazó, cuáles pasaron (bypass) y cuáles flaggeó de más (FP).

### 5.3 [MUST] Auditar el gate consumer-pack (`scripts/test-consumer-pack.mjs`)

**Ya existe** (reemplaza la pregunta del v4). Audítalo:

- **Superficie server-safe validada por tarball = 2/36.** El fixture (`fixtures/consumer-pack/app.tsx:39`) importa solo `Button` y `Toast` de `reactigoded/server-safe`. El bug que MOTIVÓ el gate (259× TS2834 bajo NodeNext, `.d.ts` relativo-sin-extensión) **sigue pudiendo emerger en 34 de los 36 exports**, porque la completitud (36) la cubre `test:rsc-fixture` vía `compilerOptions.paths` — el mismo mecanismo que enmascaró el bug original. **Clasifica con severidad: ¿es BLOCKER de freeze?** Confirma que ningún otro fixture toca los otros 34:
```
cd ~/reactigoded && grep -rn "from \"reactigoded" scripts/ test/ fixtures/ 2>/dev/null | grep -i "server-safe"
```
- **Subpaths CSS sin validar:** las entradas `./styles/*.css` + el wildcard `./styles/state/*.css` NO se tocan en ningún fixture. Un rename en el wildcard no lo caza ningún gate de resolución. Clasifica severidad.
- **Solo type-check, no runtime:** `tsc --noEmit`, sin `node -e "import('reactigoded')"`. Un `exports` válido en types pero roto en `default` runtime (`.js` a path inexistente, ESM mismatch) pasaría. `publint` mitiga parcial pero corre sobre el repo, no sobre el tarball instalado. **Conviértelo en acción:** corre tú el runtime import del tarball instalado y reporta.
- Confirma `skipLibCheck: false` en AMBOS tsconfig (`tsconfig.bundler.json`, `tsconfig.nodenext.json`) y que copia el lockfile para pinear transitivos.
- **`./cn` asimetría:** types → `dist/utils/cn.d.ts`, default → `dist/cn.js` (raíz). Confirma que consumer-types/publint lo aceptan en ambas resoluciones.

### 5.4 [MUST] Contrato Slot/asChild — correctness + paridad industria + escalabilidad

**Ya está en 4 familias / 5 superficies.** Audita:

- **Correctness de merge** (`src/components/Slot/Slot.tsx`): `className`→`cn(slot,child)`; `style`→shallow merge child-wins; `ref`→`composeRefs`; handlers `/^on[A-Z]/`→`composeEventHandlers` (child primero, slot solo si no `preventDefault`); resto→child gana **solo si `childValue !== undefined`** (fix codex P2 #110). Verifica que `composeEventHandlers` respeta `preventDefault` y que `composeRefs` maneja callback refs + object refs + null.
- **Paridad de industria (Regla 8 — diff concreto):** compara las reglas de merge de este Slot hand-rolled contra el contrato de `@radix-ui/react-slot` (composeRefs / composeEventHandlers / orden child-vs-slot / manejo de `preventDefault` / merge de `style` y `className`). **Reporta divergencias de comportamiento observable**, no solo "está bien internamente". El Slot es hand-rolled por decisión D14 (cobertura server-safe) — eso NO exime de paridad de comportamiento con el estándar que los consumers esperan.
- **Uniformidad de firma:** las 5 superficies (`DialogTrigger`, `DialogClose`, `AlertDialogClose`, `MenuTrigger`, `Tooltip`) deben tener `asChild?: boolean | undefined` idéntico. Confirma que `DialogAction` NO existe.
- **Escalabilidad:** el roadmap añade Popover/HoverCard/ContextMenu/Combobox/Select-FUI — todos necesitarán `asChild` en su trigger. ¿El `Slot` interno escala a ~12 triggers más sin duplicar lógica? ¿Hay patrón `Trigger` reutilizable o cada familia re-implementa el wiring `getReferenceProps` + Slot? Clasifica el riesgo de deuda.
- **`@internal` correcto:** confirma que Slot NO sale del barrel ni del `exports` (`src/components/Slot/index.ts` ausente de `src/components/index.ts`).

### 5.5 [MUST] EOPT widening (#155) + sus 2 fronteras

- Confirma el invariante runtime: `src/hooks/useControllableState.ts` usa `isControlled = controlledValue !== undefined` (NO `"prop" in props`). Guardrail: `src/__tests__/eopt-undefined-uncontrolled.test.tsx`. Verifica que `<Comp prop={cond ? val : undefined}>` se trata como uncontrolled, no como controlled-con-undefined.
- **Las 2 fronteras documentadas** (CHANGELOG, sección "EOPT widening — fronteras") son decisiones conscientes (§7) — NO las reportes como bug. **Pero audita su soundness:** (1) discriminantes con literal `?: undefined` (`MenuItem.href`, `SidebarItem.href`, `NavbarBrand.AsDiv.href`) — el literal `undefined` activa la rama `button`/`div`; widening rompería el discriminated union. (2) exclusiones `?: never` (8 props `OUT_OF_SCOPE_NEVER`) — `never` es el mecanismo de exclusión de variantes; widening lo rompería.
- **NO existe una "3ª frontera React-inherit" — NO la reportes.** Una versión anterior del CHANGELOG listaba "props heredadas de `InputHTMLAttributes` (React)" (`Switch.checked`, `Slider.value`, `Slider.defaultValue`) como una 3ª frontera con un workaround de spread. **Era FALSA y se eliminó en este mismo ciclo** (codex P3, commit `58fba7a`). Razón verificada empíricamente: con peer `react >=19.0.0`, `@types/react@19+` ya tipa `checked?: boolean | undefined` / `value?: ... | undefined` / `defaultValue?: ... | undefined` en `InputHTMLAttributes`, así que `<Switch checked={cond ? true : undefined} />` **compila sin error** bajo `exactOptionalPropertyTypes` + `skipLibCheck:false`. Si tu auditoría te lleva a "estas props deberían documentarse como frontera EOPT", **PARA y verifica primero con un probe real** (instala el tarball + `@types/react@19`, escribe `<Switch checked={cond?true:undefined}/>`, corre `tsc`); confirmarás que compila y que NO es un gap. Reportarla sería re-introducir exactamente el falso hallazgo que P3 cerró. (Sí es legítimo, en cambio, auditar que el CHANGELOG describe las 2 fronteras reales con precisión y que el inventory `scripts/eopt-classify.mjs --json` cuadra: 271 CLASE 1 + 36 CLASE 2 + 11 OUT_OF_SCOPE = 318.)

### 5.6 [SHOULD] ContrastPairs (#152) — race + asimetría de aserción

- **Aserción UNIDIRECCIONAL** (`src/stories/ContrastPairs.stories.tsx:297-302`): `toBeGreaterThanOrEqual(driftLowerBound)` con `driftLowerBound = expected * driftTolerance`. Solo falla si el ΔE BAJA del umbral (pares se acercan). **NO falla si el ΔE SUBE** arbitrariamente → un cambio de token que ALEJE perceptualmente dos cardinales (rompiendo la cohesión de "eje compartido", ej. `laurus-vitreus`) pasa silencioso. **Clasifica: ¿debe haber banda superior?** (severidad + justificación, no pregunta retórica).
- **Fail-open en cardinal no mapeado:** `CARDINAL_TO_VARIANT` (`:47`) excluye `cinis` (text-body). Si se añade un par con `cinis` al allowlist, `CARDINAL_TO_VARIANT[cinis]` es `undefined` → `<Badge variant={undefined}>` mide el variant DEFAULT (el par equivocado) **sin fallar**. Hoy las 7 entradas usan cardinales mapeados; el roadmap añade tokens. Clasifica severidad.
- **Race en `waitForCascade`:** verifica solo el PRIMER badge. Si resuelve antes que los demás en un run cargado, `assertPairsDeltaE` podría medir badges sin cascade. Además `withForcedTheme` y el `globals.theme` del addon-themes mutan el MISMO `<html data-theme>`: el `finally` restaura el valor *previo* (que pudo ser del addon) → estado cruzado entre stories. Reproduce si tienes browser; si no, declárala como Suposición.
- **Mide menos que el allowlist:** solo pares Badge-vs-Badge, no pares COMPONENTE reales (Badge-sobre-Card, texto-sobre-surface).

### 5.7 [SHOULD] Matriz CI Windows/Node (#151) — estático si no hay CI

> Si NO tienes acceso a CI (§4C): audita SOLO la *definición* YAML + la lógica de los helpers `crossOsResolve/Relative/Dirname`. NO afirmes que "los 4 combos pasan".

- Confirma matriz `{ubuntu, windows} × {22.12.0, 24}` con `fail-fast: false` (`.github/workflows/verify.yml:31-34`) y que el job `unit` corre TODOS los gates non-browser en los 4 combos.
- **HUECO confirmado:** el job `storybook` (browser tests, incl. ContrastPairs #152) corre en **UN SOLO combo** (`ubuntu-latest`, `:186`). NO está en la matriz. El gate de contraste browser NO es parte de la red multiplataforma que #151 vende. Clasifica: ¿importa (mismo Chromium engine) o es asimetría a documentar?
- **Ruido (menor):** `verify:size` corre ×4 sobre output idéntico. El step de size en Windows mide los mismos bytes.

### 5.8 [SHOULD] size-limit extglob (#160-equiv) + navigator denylist (#164-equiv)

- **extglob entry-agnóstico:** `dist/!(index|server-safe|cn).js` cuenta TODO chunk no-entry contra AMBOS budgets (index 20KB, server-safe 8KB), sin verificar qué entry lo importa. Hoy `Toast-*.js` lo referencian ambos (correcto). **Falso positivo latente:** un chunk lazy reachable SOLO desde `index` se contaría contra el budget server-safe, inflándolo. Además el denylist de exclusión se sincroniza a mano con los entries del `exports`, sin gate que verifique la sincronía. Si un build futuro emite `dist/theme.js` se contaría como lazy chunk. Clasifica severidad.
- **navigator wholesale:** sólido. Único cabo: la aserción `v.detail.includes("navigator")` acopla el test a un string de formato. **Cuantifica el coste antes de llamarlo "menor"** (Regla 7): ¿qué refactor lo rompería y con qué probabilidad? LOW solo si el coste es trivial.

### 5.9 [MUST] Tipos publicados consumer-estricto

```
cd ~/reactigoded && npm run build && npm pack
cd ~/reactigoded && tar -tzf reactigoded-*.tgz | grep "\.d\.ts$" | head -50
cd ~/reactigoded && npx attw --pack reactigoded-*.tgz
```
- `tsc --noEmit --skipLibCheck false` sobre `dist/**/*.d.ts` bajo Bundler Y NodeNext. Patrón `as InternalProps` en TODOS los compound. `@internal` efectivamente stripped (DialogContext `.d.ts` = `export {}`, StepInternalProps fuera, Slot fuera). `attw` para ESM/CJS/condiciones (`react-server`, `default`, `./server-safe`, `./cn`).

### 5.10 [MAY-SKIP] Storybook vs código

```
cd ~/reactigoded && grep -rln "play:" src/**/*.stories.tsx
```
Bug pattern controlled+spy: barre stories con `play()`+`userEvent` sobre prop controlado sin `default*`. El Storybook publicado tiene autoridad sobre el código — reproduce en navegador si puedes. Verifica `dist/` vs source freshness por separado.

### 5.11 [MAY-SKIP] Contraste real (requiere Playwright)

Todos los warnings ΔE en el allowlist (7 entradas, threshold 0.07). `axis-kobalium` dark ΔE 0.0522 ratificado. Mídelos en DOM real (Chromium), no a ojo. Rating canal-de-forma (★/☆). Pares COMPONENTE, no solo cardinal-vs-cardinal (hueco §5.6). Si no tienes browser, decláralo en Suposiciones.

### 5.12 [MAY-SKIP] Arquitectura escalar ~100

useControllableState: ¿la cadena controlled aguanta Combobox/MultiSelect/async? Compárala con `useControllableState` de Radix/React-Aria (Regla 8). floating/primitives: ¿`FloatingTreeRoot` + `useFloatingNode` son extracción real o fachada? ¿soportan Submenu/ContextMenu sin retrofit breaking? Forms: NO hay `Form`/`Field` provider — ¿los inputs serializan en `<form>` nativo? (Rating ya tiene `name`+hidden input; el resto ver §6.8).

### 5.13 [SHOULD] API freeze surface — lo que se firma

- **`exports` field** (`package.json`): `.` (react-server + default), `./server-safe`, `./cn` (asimetría types/default), subpaths `./styles/*.css` + wildcard `./styles/state/*.css`. Confirma que cada uno resuelve.
- **Subset server-safe exacto = 36** (`grep -c "^export \* from" src/server-safe.ts` = 36). Nota: `Toast` standalone server-safe es de utilidad marginal (el consumer usa `useToast()` client) pero coherente (markup puro). `Slider` correctamente FUERA.
- **3 hooks públicos:** `useTheme`, `useControllableState`, `useToast`. `useMenu`/`useTabs`/`useAccordion`/`useSidebar`/`useFloatingNode` internos (confirma fuera del barrel). Tipos congelados: `Theme`, `UseThemeReturn`, `SetValueOptions`, `UseControllableStateOptions`, `UseControllableStateReturn`, `ToastOptions`, `ToastEntry`, `ToastContextValue`, `UseToastReturn`.
- **Tokens OKLCH** 3 tiers. **HUECO:** el set de NOMBRES de tokens Tier-2 públicos NO está enforced mecánicamente (`check-hex-drift.mjs` cubre drift de hex, no renombrado de nombre). **Extiende el mismo razonamiento a las ~250 clases `.ig-*`** (`docs/CSSAPI.mdx`) y a los **data-attributes públicos** (`data-theme/state/side/align/placement/step-index/disabled/mode`): son superficie congelada igual de frágil y mucho mayor, sin gate que cace un renombrado. Clasifica cada uno con severidad: ¿reportable pre-freeze?
- **Peers:** `react`/`react-dom >=19.0.0`, `clsx ^2.1.0`, `@floating-ui/react ^0.27.0` (pre-1.0, riesgo aceptado D10 — ampliar range es additive, congelar es seguro).

---

## 6. Roadmap ~100 componentes — inventario vs escalabilidad

> **Dos trabajos distintos, mídelos con varas distintas:** (a) **escalabilidad técnica** de los primitives existentes = reproducible, exige evidencia; (b) **naming reservations** = criterio de diseño, NO reproducible — preséntalo como recomendación argumentada, no como hallazgo con repro. No mezcles las dos varas.

Estado actual (`src/components/` + barrel `src/index.ts`, `export *` plano → todo símbolo nuevo compite en el namespace root).

**Existe hoy:** Accordion, Alert, AlertDialog, Avatar(+AvatarGroup), Badge, Breadcrumb, Button, Card, Checkbox, Chip, Divider, Dialog, Input(+Label/Helper/InputGroup/InputAddon), Navbar, Pagination, Progress, Radio, Rating(+name), NativeSelect, Sidebar, Skeleton(+Container/Variant), Slider, Spinner, Stepper, Switch, Table(+subs), Tabs(+vertical), Textarea, ThemeToggle, Timeline, Toast, namespace `floating/` (FloatingTreeRoot + Tooltip + Menu). **Interno:** `Slot` (+composeRefs/composeEventHandlers), `useFloatingNode`. **Hooks:** useTheme, useControllableState, useToast. **Util:** cn.

| Sección | Existe | NO existe / reservar |
|---|---|---|
| **floating/** (~19) | Tooltip✓, Menu✓ (ambos asChild). Submenu PARCIAL (infra `FloatingTreeRoot`+`useFloatingNode` soporta árbol; falta componente público) | HoverCard, Popover, ContextMenu, MenuBar, Select-FUI, Combobox, Autocomplete, MultiSelect, TagInput, DatePicker, DateRangePicker, TimePicker, ColorPicker, EmojiPicker, FloatingToolbar, MentionMenu, SlashCommand, Tour, FloatingActionMenu |
| **Overlays** (~5) | Dialog✓, AlertDialog✓ | Drawer, BottomSheet, Confirm, Prompt, CommandPalette |
| **Forms** (~12) | Input✓, Textarea✓, NativeSelect✓, Checkbox✓, Radio✓ (suelto, sin RadioGroup), Switch✓, Slider✓, Rating✓(+name) | Form, Field, RadioGroup, CheckboxGroup, SegmentedControl, ToggleGroup, NumberInput, PinInput/OTP, SearchInput, PasswordInput, MaskedInput, RichTextEditor |
| **Data display** (~10) | Table✓ | DataGrid, VirtualList, TreeView, Carousel, **Calendar** (bloquea DatePickers), Stat/KPI, MetricCard, DiffViewer, JsonViewer, CodeBlock |
| **Layout** (~7) | Accordion✓ (cubre Disclosure) | Splitter, ScrollArea, AspectRatio, Affix, BackToTop, Marquee, Anchor/TOC |
| **Primitives** (~4) | Slot✓ (interno) | Portal público (PARCIAL: solo FloatingPortal interno), FocusScope público (PARCIAL: FloatingFocusManager interno), VisuallyHidden, ErrorBoundary |
| **Feedback** (~3) | Toast✓, Spinner✓, Skeleton✓, Progress✓, Alert✓ | EmptyState, Loader fullpage, Notification center |
| **Rich/Nav/variants** | AvatarStack✓(=AvatarGroup), Tabs-vertical✓, Skeleton-variants✓ | Kbd, Tag(↔Chip), Highlight/Mark, Mention(↔MentionMenu), Image-zoom, Video/Audio, InfiniteScroll, Breadcrumb-collapse (PARCIAL), PaginationCursor (PARCIAL), Stepper-vertical (PARCIAL), Timeline-horizontal (PARCIAL) |

**Naming a RESERVAR/RATIFICAR antes de congelar** (recomendación, no hallazgo). D13 ya reserva 8: `Select`, `Form`, `Field`, `RadioGroup`, `CheckboxGroup`, `Popover`, `HoverCard`, `ContextMenu`. Confirma que es reserva contra **reinterpretación** (no contra introducción) y evalúa:
- **Colisiones directas con símbolos ocupados:** `Chip`↔`Tag`, `Menu`↔`MenuBar`/`Submenu`, `Pagination`↔`PaginationCursor` (recomendado `variant="cursor"`, NO símbolo nuevo — añadir variant no es breaking-surface, añadir símbolo sí), `AvatarGroup`↔`AvatarStack`, `NativeSelect`↔`Select`.
- **Libres pero bloqueantes/reservar:** `Calendar` (bloquea DatePicker/DateRangePicker/TimePicker), `Form`/`Field` (Field se solapa con Label/Helper/InputGroup ya exportados — decidir si los absorbe), `Image` (familia, zoom=variante), `Mark`, `Tour`, `MenuBar`, `Mention` vs `MentionMenu`.
- **Propón añadir a D13** si faltan: `Calendar`, `MenuBar`, `Tag`, `Image`, `Mark`, `Tour`, `Mention`.

### 6.8 Form-value serialization (paralelo a RATING-NAME) — verifica con grep

RATING-NAME añadió `name`+hidden input a Rating. Verifica si los demás form-inputs **standalone** serializan en `<form>` nativo (mismo patrón). Para cada uno: ¿emite `name`/`value` o `<input hidden>` cuando se usa fuera de un Field provider (que no existe)?
```
cd ~/reactigoded && grep -nE "name\?: string|type=\"hidden\"|name=\{" src/components/Radio/*.tsx src/components/Checkbox/*.tsx src/components/Switch/*.tsx src/components/Slider/*.tsx src/components/NativeSelect/*.tsx
```
Clasifica: ¿los que NO serializan son un gap de freeze (se hereda un contrato de forms incompleto) o decisión consciente diferida a `Form`/`Field` 1.x?

---

## 7. Decisiones conscientes — NO reportar como hallazgos

Cuestionar con argumento ≠ reportar como bug. Comprueba `docs/decisions/` antes de escribir. Deliberadas y documentadas:

- **D6** dialog-compound (breaking ya aplicado beta.24). **IMPLEMENTADO.**
- **D8** alert-dialog (family reusando infra Dialog; `role="alertdialog"`+`closeOnBackdrop=false`). **IMPLEMENTADO.**
- **D10** `@floating-ui/react` required peer, range `^0.27.0` cerrado hasta verificar 0.28. **DONE.** Congelar el range es seguro.
- **D12** strings user-facing default ES, cada uno con override. Reeval condicionada a 1.1.0. **VIGENTE.**
- **D13** reserva 8 nombres contra reinterpretación durante 1.x. **VIGENTE.**
- **D14** Slot/asChild en 4 familias, `Slot` hand-rolled (no Radix) para cobertura server-safe. **IMPLEMENTADO.**
- **C-02** Tooltip/overlays dentro de Dialog: patrón manual `container={modalRef}`; NO exportar `ModalPortalContext` (trap permanente). **Consciente.**
- **M-01** polimórfica `as` solo en `Card`; superseded parcial por D14 (la parte Slot revertida a 1.0; `as` general diferido a 1.x).
- **Las 2 fronteras EOPT** (discriminantes undefined-literal + exclusiones `never`) son deliberadas. NO las reportes como bug. **NO existe una 3ª frontera "React-inherit"**: se verificó falsa y se eliminó del CHANGELOG en codex P3 (`58fba7a`) — React 19+ ya tipa esas props con `| undefined`. Reportarla = re-introducir un falso hallazgo cerrado (ver §5.5).
- ESM-only, clsx/react-server: arquitectura cerrada.

**No hay un freeze-check humano separado.** ESTE gate (claudegate6) + el cruce A+B (§9) ES el mecanismo de freeze-check; no esperes ni referencies un checklist firmado a mano. El antiguo `docs/decisions/FREEZE-CHECK-1.0.0-rc.1.md` (premisa "Iván firma cada ítem", bloqueado por tasks B-01/B-02/B-04 ya resueltas en ciclos posteriores) está **eliminado por obsoleto** — si lo ves reaparecer en algún diff, es ruido, no lo restaures.

> **Barre `docs/decisions/` por discrepancias doc/realidad (esto SÍ va en hallazgos):** cada decision doc cuyo `Estado:` contradiga el código publicado es discrepancia reportable (no de API, pero contamina la auditoría futura). Ejemplo ya corregido en el cleanup pre-gate: `D14-slot-pattern-ds-wide.md` decía `🔵 PROPUESTA` estando implementado/taggeado → ya actualizado a `✅ IMPLEMENTADO`. **No re-reportes el D14** (ya cerrado); busca si queda OTRO doc con el mismo patrón (grep `Estado.*PROPUESTA\|en revisión\|condicionada a aprobación` en `docs/decisions/` y contrasta cada hit con el código real). Repórtalos en §8.4.

---

## 8. Formato del informe (español, markdown) + criterio de parada

**Criterio de "hecho" (cuándo has terminado):** el informe está completo cuando has (a) extendido START-1 con el conteo total de la clase Web API ausente (§3 punto 2) + propuesta de modelo (§3 punto 3); (b) cubierto TODAS las áreas **[MUST]**; (c) reportado **≥3 hallazgos NO sembrados** (más allá de START-1 y de los FP/fail-open ya nombrados en §5 — esos son sembrados, confirmarlos no cuenta). Si confirmas solo lo sembrado, el informe está **incompleto**. **[SHOULD]** cubierto o declarado por qué no; **[MAY-SKIP]** explícitamente listado si lo saltas. No sobre-iteres más allá de esto: en rol QA el perfeccionismo es la competencia, pero el entregable tiene frontera definida — alcánzala y cierra.

**Estructura (10 secciones). Longitud: máx 1 página por BLOCKER/HIGH; LOW/DEFERRED en una sola tabla.**

1. **Encabezado:** quién eres (A o B), plataforma/OS/shell/**Node EXACTO** (`node -v`), commit auditado (`89a34cd`), qué ejecutaste DE VERDAD (no qué leíste), y si necesitaste `--legacy-peer-deps`.
2. **Veredicto — 4 preguntas:**
   1. ¿Árbol shippable como rc.1 (API freeze)? Bugs, regresiones, breaking accidental, a11y severa, type holes, bypass SSR/RSC.
   2. ¿La arquitectura aguanta ~100 componentes sin breaking de la API congelada?
   3. ¿El Storybook en vivo coincide con el código? (o declarado no-verificado)
   4. Inventario roadmap: cada componente → completo/parcial/no existe.
3. **Pipeline ejecutada** (tabla: gate → pasa/falla → cubre/no cubre → en CI).
4. **Hallazgos por severidad** (BLOCKER/HIGH/MEDIUM/LOW/DEFERRED), cada uno con: `archivo:línea` + repro ejecutado + por qué bloquea/se hereda en freeze + opciones de fix con coste/riesgo. **Marca cada hallazgo como [SEMBRADO-confirmado] o [NUEVO].** Mínimo 3 [NUEVO].
5. **Verificación regresión beta.27** (tabla §4 — confirma cada fila sigue cerrada; columna Tipo E/D; lo dinámico no ejecutado va declarado, no marcado cerrado; lo que reabrió es hallazgo).
6. **Lo que se firma en el freeze** (superficie API §5.13 ratificada o con reparos).
7. **Decisiones de arquitectura que cuestionas** (con argumento, no como bug).
8. **Suposiciones** (lo no reproducido en tu entorno — incl. claims sobre Node 22.12 si tu engine difiere, CI multi-OS y Playwright si no los corriste).
9. **Plan rc.1 priorizado** (por impacto de freeze: qué se hereda roto si difieres — API surface > tipos > dist > devDeps, NO por visibilidad ni facilidad).
10. **Reconocimientos honestos** (lo sólido — calibración).

---

## 9. Proceso de cruce A+B

Dos auditores independientes, entornos cruzados:
- **Auditor A:** Windows / Node 24 (+ PowerShell). Caza bugs de path Windows, NodeNext resolution, `rm` POSIX, drive-letter.
- **Auditor B:** Linux/WSL / Node 22.12 (+ bash). Caza bugs de engine mínimo, ext4, Bundler resolution. **Si tu Node ≠ 22.12.0, decláralo (Regla 2) y o bien `nvm use 22.12` antes de empezar, o marca los claims sobre el engine mínimo como inferencia.**

**Reparto de las celdas no-reproducibles (§4C) para que NO caigan en tierra de nadie:**
- **CI-MATRIX (4 combos verde):** responsable **Auditor A** si tiene acceso a CI (`gh run view`); si ninguno lo tiene, ambos lo declaran como "estático verificado, dinámico fuera de alcance".
- **CONTRAST-PW / Storybook browser:** responsable quien tenga Playwright/Chromium operativo; si ninguno, ambos lo declaran no-ejecutado.
- **Bugs de path/resolution NodeNext y Windows:** Auditor A es el dueño.
- **Engine mínimo 22.12 (ReferenceError de §3):** Auditor B es el dueño (con `nvm use 22.12`).

El patrón A+B encuentra blockers que ninguno solo ve (la matriz #151 existe porque bugs cross-OS se colaban). **Complementa, no compitas.** Marca explícitamente qué reproduciste y en qué entorno. Si A reporta algo que B no puede reproducir, eso ES señal (probablemente bug de entorno, el más peligroso para el freeze). **Como START-1 y los FP de §5 están sembrados para AMBOS, confirmarlos no os diferencia — vuestro valor está en los ≥3 [NUEVO] de cada uno y en las celdas no-reproducibles que solo uno puede cubrir.**

Sé exhaustivo, minucioso, crítico, cabrón, exigente, perfeccionista. Este es el gate del API freeze: lo que se cuele se hereda congelado hasta 2.0.0. **Profundidad > amplitud** (por eso §5 está priorizado MUST/SHOULD/MAY): 5 hallazgos reproducidos valen más que 50 sospechas. No bikesheds, no nice-to-have sin coste cuantificado, no "el repo no documenta X" sin haberlo verificado con grep.

---

## Anexo A — Repro 2 de START-1 (córrelo tú, NO lo des por hecho)

```
cd ~/reactigoded && node --input-type=module -e '
import { checkFileWithImports } from "./scripts/check-server-safe-markers.mjs";
const files = {
  "/repo/src/components/Widget/Widget.tsx": `
import { isEl } from "@/utils/dom";
/** @server-safe */
export function Widget({ target }: { target: unknown }) {
  return isEl(target) ? "element" : "other";
}`,
  "/repo/src/utils/dom.ts": `
export function isEl(x: unknown): boolean { return x instanceof HTMLElement; }`,
};
const viols = checkFileWithImports("/repo/src/components/Widget/Widget.tsx", {
  tsconfigPaths: [{ prefix: "@/", targetPrefix: "src/" }],
  readFile: (p) => files[p], fileExists: (p) => p in files,
  repoRoot: "/repo", srcRoot: "/repo/src",
});
console.log(viols.length === 0 ? "BYPASS (green)" : viols);
'
```
Resultado esperado: `BYPASS (green)`. El util sucio importado por alias `@/` no se flaggea ni siguiendo imports transitivos — atraviesa la capa SS-SMUGGLE. Si tu salida difiere, repórtalo (puede indicar drift del script desde `89a34cd`).
