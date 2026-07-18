# POST-RC1 backlog

Cosas que se han visto durante la sesión `rc1-gate-fixes` y se han
**dejado intencionalmente fuera** del scope de los Blockers/Highs del
plan. No bloquean la promoción a `1.0.0-rc.1`. Se procesan en una
sesión posterior.

Cada entrada documenta:
- **De dónde sale**: el fix que descubrió la observación.
- **Por qué no se arregló ahora**: scope creep, decisión política,
  riesgo, o coste/beneficio bajo.
- **Acción concreta** cuando se procese.

---

## Externalizar `@floating-ui/react` como peer-dep ✅ aplicado en post-RC1

**De dónde sale**: post-RC1 sesión, tras añadir Tooltip Floating UI
(commit `74d41b7`). El step CI `Bundle has no dev warns` falló por
el `console.error` de `tabbable` (dep transitiva de `@floating-ui/react`)
que llega al bundle publicado.

**Por qué no se arregla ahora**: la solución del fallo CI fue refinar
el assertion (alcanzarlo solo a la firma `[reactigoded]`), no
externalizar la dep. Externalizar es una decisión de empaquetado
separada con su propio mérito y propios trade-offs.

**Razones legítimas para externalizar (cuando se aborde)**:
- **Tamaño**: ahorra ~17 KB gz del JS bundle ESM (de 31.74 → ~15 KB).
- **Deduplicación**: si el consumer ya tiene `@floating-ui/react`
  en su árbol (Radix, Headless UI, otra DS), la versión bundleada
  duplica la dep en runtime.

**NO es razón legítima**: "bundle más limpio sin console.error
foreign". Externalizar NO elimina los console del consumer — solo
los mueve a su bundle. La higiene de logs se cubre vía el guardrail
CI con scope a `[reactigoded]`.

**Decisiones a definir cuando se aplique**:
- Range del peer (`"@floating-ui/react": "^0.27.0"` o el actual).
- ¿`peerDependenciesMeta` opcional o requerido? **Probablemente
  requerido** — sin la dep, Tooltip no renderea.
- Verificar que Storybook propio tenga `@floating-ui/react` en
  `devDependencies` directas (no solo transitiva vía la lib que
  consume).
- Documentar en CHANGELOG como BREAKING CHANGE (consumer debe
  hacer `npm install @floating-ui/react`).
- Ventana: post-1.0.0 estable. Pre-1.0.0 todavía aceptable como
  breaking, pero merece su propio commit/PR aislado.

**Estimación**: 1h (cambio config + actualizar docs + verificar
Storybook).

**Aplicado en post-RC1** (commit a continuación de cade31e):
- `package.json`: `@floating-ui/react` movida de `dependencies` a
  `peerDependencies` con range `>=0.27.0` (requerido, sin
  `peerDependenciesMeta` opcional). Añadida también a
  `devDependencies` (`^0.27.19`) para que el dev local + Storybook
  la tengan resuelta.
- `vite.lib.config.ts`: añadida a `rollupOptions.external`.
- `README.md`: instalación documenta el peer obligatorio.
- size-limit budgets ESM/CJS revertidos a 16/15 KB (era 35/32 KB
  para acomodar floating-ui bundleada).
- Verificado local: ESM 31.74 → 14.42 KB gz (−54%), CJS 28.5 →
  12.89 KB gz (−55%). `console.*` count = 0 (la dep externalizada
  se llevó el `console.error` de tabbable). `[reactigoded]` count
  = 0 (DCE de nuestros warns intacto). 20/20 Tooltip tests verde.

---

## CSP estricta — script inline en `.storybook/main.ts` ✅ resuelto en post-RC1

**De dónde sale**: revisión humana de C5 (B-04 + B-05).

**Observación**: el `managerHead` inyectaba un script inline que
ejecutaba JS en el `<head>` (lang fix, dedupe, rewrite del title).
Si el sitio quería CSP estricta con `script-src 'self'` (sin
`'unsafe-inline'`), este script rompía.

**Solución aplicada**: el script se extrajo a
`.storybook/static/manager-runtime.js`. `main.ts` configura
`staticDirs: [{ from: "./static", to: "/static" }]` para que el
archivo se copie a `storybook-static/static/manager-runtime.js`
durante el build. `managerHead` ahora solo inyecta
`<script src="/static/manager-runtime.js" defer></script>` —
externo, CSP-friendly.

**Verificado local (post-RC1)** ejecutando `npm run build-storybook`:
- archivo `storybook-static/static/manager-runtime.js` (2877 B) presente,
- `index.html` contiene `<script src="/static/manager-runtime.js" defer>`,
- `[fix-lang] OK — 2 archivo(s) modificado(s)` (lang fix sigue
  aplicándose post-build),
- comportamiento de los 3 fixes (lang, dedupe, rewrite) inalterado.

**Caveat documentado**: Storybook upstream sigue inyectando un
inline `<script>` con `window['FEATURES']` config en
`index.html`. Eso es intrínseco al runtime de Storybook 10 y
queda fuera del control del DS — para CSP TOTAL el consumer
necesita o (a) `script-src 'self' 'unsafe-inline'`, o (b) un
nonce inyectado vía proxy reverso, o (c) un PR upstream a
Storybook. **El script DEL DS está externalizado al 100%**.

---

## Observer race benigna en el script de `.storybook/main.ts`

**De dónde sale**: análisis del C5.

**Observación**: si Storybook hace `head.replaceChild(newTitle,
oldTitle)`, el observer registrado en el `<title>` viejo dispara con
un valor stale **un tick antes** de que el observer del `head` también
dispare con la mutación de `childList`. Resultado: `rewrite() + dedupe()`
corren 2 veces seguidas.

**Por qué no se arregla ahora**: el dedupe es idempotente y rewrite
solo escribe si la condición de regex matchea. Coste: cero. No es bug.
Tras la consolidación de metas en beta.22 (commit `2ee4ba5`), el
dedupe ya no es curativo sino defensivo, así que el doble disparo es
aún más benigno.

**Acción**: ninguna. Documentado para que un futuro lector no se
asuste si ve `rewrite()` corriendo en pares en DevTools.

---

## CI step explícito de greps `console.*` en `dist/` ✅ cerrado en `1b84a4f`

**De dónde sale**: B-07.
**Acción**: step `Bundle has no dev warns` añadido a
`.github/workflows/verify.yml` entre `Build` y `Size budgets`. Falla
si `console.*` o `[reactigoded]` aparecen en `dist/index.{js,cjs}`.

---

## `src/utils/env.ts` huérfano ✅ cerrado en `e07eead`

**De dónde sale**: B-07.
**Acción**: archivo borrado, entradas correspondientes en
`tsconfig.build.json:exclude` y `scripts/clean-internal-dist.mjs`
(prefix `env.`) limpiadas.

---

## `.claude/` directorio untracked en el repo ✅ cerrado en `4eba440`

**De dónde sale**: `git status` toda la sesión.
**Acción**: `.claude/` añadido a `.gitignore`.

---

## Notas dispersas locales del autor ✅ cerrado en `6b28080`

**De dónde sale**: `git status` toda la sesión.
**Acción**: patrones `.notes-*`, `.release-*`, `BLOQUEOS.md`,
`SESION-RESUMEN*.md` añadidos a `.gitignore` para que cualquier
`git add -A` futuro no los incluya por accidente.

---

## ThemeSwitch SSR test versión A ✅ aplicado y verificado en `72c4e13`

**De dónde sale**: C6 (B-08).
**Acción**: test añadido a `ThemeSwitch.test.tsx` con
`vi.stubGlobal('document', undefined)` + `vi.unstubAllGlobals()` en
`finally`. Valida explícitamente el branch
`typeof document === "undefined"` del derive.

**Verificación**: ejecutado local en WSL Linux aarch64 (Iván tiene
WSL2 con node 24.15 vía nvm; el wsl.exe -- bash es accesible desde
el agente). Resultado: 23 tests unit + 7 storybook = 30/30 verdes
para ThemeSwitch, suite global 596/596. El test no rompe el runner
ni los tests posteriores; el `vi.unstubAllGlobals()` restaura
`document` correctamente.

---

## Patrón `merge-refs` inconsistente entre componentes ✅ cerrado en `6272e92`

**De dónde sale**: D5 (H-25).
**Acción**: Checkbox.tsx y Switch.tsx alineados al patrón
`useCallback(setRefs, [ref])` de Stepper. Sorpresa post-fix: la regla
`react-hooks/refs` que disparó en Stepper NO disparó en Checkbox ni
Switch — no fue necesario `eslint-disable`. El comentario disable
inline que sigue en Stepper documenta la diferencia.

**Pendiente menor (post-RC1)**: documentar el patrón canónico en
`docs/PATTERNS.md` (que aún no existe) cuando haya >3 componentes
con el patrón y tenga sentido escribir la guía.

---

## Reevaluación del tripwire `dark axis-kobalium` (post-RC1)

**De dónde sale**: B-13. Tras el audit RC1, el tripwire introducido en
`c8a5202` (beta.18) resultó no-operativo (`error_threshold=0.05`
quedaba por debajo del valor real `0.0522`, así que pasaba como warn).
beta.22 lo allowlistea con justificación honesta como reversión
consciente.

**Acción post-RC1**: revisar la allowlist tras 1-2 betas con feedback
real de consumers. Tres condiciones para reabrir y recalibrar tokens:

1. Un consumer reporta confusión visual entre `axis` y `kobalium` en
   tema oscuro.
2. Un componente nuevo del DS coloca ambos cardinales adyacentes en
   un patrón documentado (Toast con icono `axis` + chip `info`,
   Sidebar con item `secondary` + badge `info`, etc.).
3. El audit cross-check de `1.0.0` final pide endurecer el threshold.

Si ninguna de las tres se cumple en 2 meses, dejar la allowlist
permanentemente y considerarlo cerrado.

**Implementación si toca recalibrar**: opciones del plan original B-13:

- (Opción 1) Rotar `--ig-axis-nox` H +12° (separa de kobalium pero
  introduce tinte rosado en gris secundario).
- (Opción 2) Mover `--ig-kobalium-nox` H 240°→220° (acerca a vitreus
  brand H≈207°; cross-check ΔE con vitreus tras el cambio).

Recalibrar dispara cascada WCAG en 30+ componentes. NO empezar sin
validación de Iván sobre los OKLCH alternativos visualmente.

---

## Deploy externo igoded.es desacoplado del repo ✅ documentado

**Observación**: el deploy a igoded.es se hace fuera del repo (manual o
cron desde `~/domains/igoded.es/public_html/storybook/` en cPanel
Hostinger). Si quien deploya invoca un comando distinto a
`build-storybook` (ej. `storybook build` directo, o
`npm run build-storybook:chromatic`), el HTML deployado pierde
`lang="es"` en el `<html>` inicial y B-04 regresa silenciosamente.

**Mitigación actual** (beta.22, commits del split build):
- `package.json` documenta el split en `_comment_build_storybook`.
- `scripts/fix-storybook-static-lang.mjs` emite log explícito al
  ejecutarse con el path destino y el número de archivos modificados.
- Si quien deploya invoca `storybook build` directo, NO se aplica el
  lang fix y el log no aparece — eso ES la señal para auditar.

**Acción tomada**: documentado en `docs/DEPLOY.md` con (a) contrato
actual + comando obligatorio, (b) síntomas de regresión silenciosa
y debug, (c) Opción A workflow GitHub Actions con secret SFTP
Hostinger, (d) Opción B script versionado `scripts/deploy-storybook.sh`.
Decisión A vs B se difiere a post-1.0.0 según volumen de deploys
reales. Iván sigue invocando manualmente con `npm run build-storybook`
hasta que se elija opción.

---

## Auditar todos los scripts de CI/build por contexto de invocación ✅ aplicado

**Observación**: durante esta sesión se descubrieron 3 fallos de
"by construction" donde un script asumía contexto de invocación que
no se sostuvo en CI/Chromatic real:

1. H-01 (`prepare → prepack`): el patch local de jest-dom no se
   aplicaba en `npm ci` de CI. Revertido en `7d62faf`.
2. ESLint 10.3 + jest-dom rule `prefer-to-have-class` rompe sin el
   patch local — síntoma de #1, no causa nueva.
3. `fix-storybook-static-lang.mjs`: encadenado a `build-storybook`
   pero Chromatic invoca el mismo script con `--output-dir=/tmp/...`
   provocando fallo. Resuelto vía split de scripts + `chromatic.config.json`.

**Acción aplicada**: cada script de `scripts/` ahora incluye un
bloque `─── Contrato de invocación ───` con tres bullets:
- **Invoker**: workflow / npm script / manual / cron.
- **Entorno requerido**: paths, devDeps, archivos previos.
- **Fallback / errores**: comportamiento si las asunciones fallan
  (exit code, mensaje de error, propagación).

**Scripts auditados**:
- `clean-internal-dist.mjs`
- `fix-storybook-static-lang.mjs`
- `migrate-tooltip-prefixes.mjs` (one-shot histórico)
- `strip-orphan-css.mjs` (one-shot histórico)
- `check-component-contrast.mjs`
- `check-css-scope-leaks.mjs`

**Convención para nuevos scripts**: cualquier `.mjs` añadido a
`scripts/` debe incluir el bloque del contrato en su header JSDoc.

---

## Notas dispersas sin tocar (`.notes-beta15..18.txt`, `.release-beta14..18.sh`, `BLOQUEOS.md`, `SESION-RESUMEN*.md`) ✅ archivadas en post-RC1

**De dónde sale**: `git status` durante toda la sesión.

**Observación**: archivos locales del autor que aparecen como
`untracked` y nunca se han committeado. Algunos serían interesantes
para tracking interno (BLOQUEOS, SESION-RESUMEN) pero no para el
repo público.

**Acción aplicada**: 12 archivos movidos a `~/notes/reactigoded-archive/`
(fuera del repo). Conservan contenido histórico (release scripts +
notes de beta.14-18 + BLOQUEOS.md + SESION-RESUMEN*.md). El
`.gitignore` ya excluye los patrones (`.notes-*`, `.release-*`,
`BLOQUEOS.md`, `SESION-RESUMEN*.md` desde commit `6b28080`) por si
en el futuro se vuelven a crear localmente.

**Working tree del repo**: limpio post-archive (cero archivos
dispersos en cwd).

---

## `typescript@7` (port nativo) — diferido: ecosistema no listo

**De dónde sale**: sesión `chore/bump-deps` (bump de todas las
librerías, minor + major). TypeScript 6→7 es el único major que NO se
pudo adoptar. Los otros 3 (`@types/node` 25→26, `chromatic` 17→18,
`esbuild` 0.27→0.28) sí se aplicaron.

**Por qué no se arregla ahora** — dos bloqueos independientes, ambos
medidos (no asumidos):

1. **`typescript-eslint@8.64` no soporta TS7**. Su peer es
   `typescript ">=4.8.4 <6.1.0"` (no llega ni a 6.1). Con TS7
   instalado, `npm run lint` crashea con
   `TypeError: Cannot read properties of undefined (reading 'Cjs')`
   — `@typescript-eslint/typescript-estree` lee una API interna que
   el port nativo cambió. **El lint queda roto.**

2. **Los gates AST propios del DS usan la Compiler API que el port
   nativo no expone**. `npm run typecheck` con TS7 falla:
   `error TS2339: Property 'createSourceFile' does not exist` en
   `src/_audit/server-safe-gate.test.ts:54`. El gate server-safe
   (`check-server-safe-markers.mjs`) y sus tests están construidos
   sobre `ts.createSourceFile` + walk del AST (decisión de diseño,
   ver ADR gates-AST). El paquete `typescript@7` (native/tsgo) no
   entrega esa API programática en su entry → los gates habría que
   reescribirlos.

**Conclusión**: adoptar TS7 no es un bump, es un proyecto de
migración de toolchain (esperar a `typescript-eslint` con soporte
TS7) **más** reescritura de los gates AST sobre la nueva API. Fuera
del scope de rc.1 (y de un "bump de librerías").

**Intermedia ADOPTADA (branch `chore/ts7-native-typecheck`)** — typecheck
nativo veloz SIN promover TS7 a autoritativo:
- `typescript` se queda en `6.0.3` (bin `tsc`): AUTORITATIVO para build,
  gates AST, eslint, dist y `verify:unit`/CI. Compiler API JS intacta.
- Añadido `@typescript/native-preview` (bin `tsgo`, pin exacto
  `7.0.0-dev.20260707.2`) → script `typecheck:native` = `tsgo --noEmit`.
- `verify:fast` (loop local, NO autoritativo) usa `typecheck:native`.
  Medido: **3.9s vs 14.3s** de tsc (~3.7x), 0 errores, COINCIDE con tsc
  (incl. los tests que usan `ts.createSourceFile` — los tipos los da
  `typescript@6.0.3`, no el nativo).
- Corrección a la receta dual-alias de Nx: su `@typescript/native` es un
  alias LOCAL (`npm:typescript@7`), no un paquete publicado; el binario
  nativo side-by-side real es `@typescript/native-preview` (bin `tsgo`).
  El puente TS6-con-API sería `@typescript/typescript6` (bin `tsc6`), aquí
  innecesario porque `typescript@6.0.3` ya expone la API.

**Para PROMOVER a autoritativo (dropear el split)** cuando el ecosistema
alcance:
- `typescript-eslint` con peer que incluya `^7` (tracking #10940; #12518
  cerrado not-planned — bloqueado en que exista la API de TS7).
- La Compiler API vuelve en **TS 7.1** (dev builds ya en `npm@next`:
  `7.1.0-dev.*`). Entonces reevaluar si los gates AST corren sobre la API
  nativa o siguen en el puente TS6.
- Bump `typescript@7.x` autoritativo + re-verificar `lint` / `typecheck` /
  `build` (tsc + tsc-alias + vite-plugin-dts) / `test:server-safe-markers`.

**Estado**: bump aplicado y verificado (verify completo: unit 2952 +
storybook 239 + size-limit + `npm ci` limpio). Full TS7 (nativo como
autoritativo) diferido; intermedia de velocidad adoptada en rama aparte.

---

## Go-to-definition al source del consumer — shippear `src` + `.d.ts.map`

**De dónde sale**: PR #140, P3 de codex sobre `#23`. #23 apagó
`declarationMap` (`declarationMap:false`) porque los `.d.ts.map` colgaban
apuntando a `src` que `files` no publica → el go-to-def del consumer
rompía. **Esa decisión de #23 es FINAL: maps OFF**, el go-to-def cae en
los `.d.ts` (tipos). Esta entrada NO la reabre.

**Qué queda diferido (decisión NUEVA, no un fix)**: recuperar el
go-to-definition al `.ts` ORIGINAL del consumer (no solo al `.d.ts`). La
vía coherente es shippear las DOS cosas — `src` (los `.ts`) **+**
`.d.ts.map` (con `declarationMap:true` otra vez) — nunca una sin la otra
(una sola es justo el estado colgante que #23 cerró).

**Trade-offs cuando se aborde**:
- **Pro**: DX real — go-to-def aterriza en el source comentado del DS.
- **Contra**: engorda el tarball con toda la fuente `.ts` (~doble de
  ficheros) + los maps.
- **Requisito**: `declarationMap:true` + `"src"` en `files` + verificar
  que attw/publint siguen limpios con el source publicado + medir tamaño.

**Ventana**: post-1.0.0 (aditivo, no breaking — solo añade contenido al
paquete). Su propio PR aislado.

---
