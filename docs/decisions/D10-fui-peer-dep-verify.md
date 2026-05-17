# D10 — `@floating-ui/react` peer-dep policy

**Fecha**: 2026-05-16
**Estado**: ✅ DONE — verificado empíricamente.
**Origen**: gate review § H-09 + sesión Bloque 0 reopened D10.

## Decisión

**Mantener `@floating-ui/react` como required peer-dep** (status quo). NO marcar optional.

Rango versión: `^0.27.0` (status quo). Expandir a `^0.27.0 || ^0.28.0` manualmente cuando FUI 0.28 release + compatibility verified.

## Hipótesis original (audit gate review)

> H-09: marcar `@floating-ui/react` como optional peer-dep + ampliar rango a `>=0.27.0`. Consumer que solo usa Button + Card no debería instalar 17 KB de FUI peer.

## Verificación in situ

**Comprobación 1 — `sideEffects` configurado**:
```json
"sideEffects": ["**/*.css"]
```
Declarado correctamente en `package.json`. Bundlers respetan: JS tree-shakeable, CSS preservado.

**Comprobación 2 — Install cost real**:
- Reactigoded tarball: 1.6 MB.
- `@floating-ui/*` familia (core + dom + react): 956 KB descargado adicional.
- Total install consumer típico bajo C: ~2.6 MB.

Nota: el "17 KB" que se citaba previamente era **runtime bundle gzip**, no install cost. Distinción material para el rationale.

**Comprobación 3 — Símbolos FUI usados**:
20 símbolos importados desde `@floating-ui/react` en `dist/index.js`:
```
FloatingFocusManager, FloatingNode, FloatingPortal, FloatingTree,
autoUpdate, flip, offset, shift,
useClick, useDismiss, useFloating, useFloatingNodeId,
useFloatingParentNodeId, useFocus, useHover, useInteractions,
useListNavigation, useMergeRefs, useRole, useTypeahead
```

Total exports FUI 0.27.x: ~136 símbolos. reactigoded usa 20/136 (~15%). Cero dead imports.

**Comprobación 4 — React 19 compat**:
```json
// node_modules/@floating-ui/react/package.json
"peerDependencies": {
  "react": ">=17.0.0",
  "react-dom": ">=17.0.0"
}
```
Compat formal verificada con React 19.

**Comprobación 5 — Webpack 5 ambos modes empíricos** (la clave):

**N1 — `@floating-ui/react@0.27.19` declara `"sideEffects": false`**. Tree-shake teóricamente supported por bundlers.

**N2 — Webpack 5 production mode**: con FUI installed, bundle output es 477 bytes minimizado + "orphan modules 381 KiB" (FUI parseado pero excluido del bundle). Tree-shake completo de símbolos.

**Test crítico — Webpack 5 prod SIN FUI installed** (fixture `/tmp/d10-verify/webpack5-prod-optional/`):
```
webpack 5.106.2 compiled with 1 error in 2004 ms
Module not found: Error: Can't resolve '@floating-ui/react'
```

**Webpack production mode falla igual que dev mode**. Tree-shake ocurre POST-resolution, NO sustituye resolution. Sin FUI installed → build fail en CUALQUIER webpack mode.

**N3 — Test real D10.1-A optional** (no simulación post-delete):

Pasos:
1. Modificar `reactigoded/package.json` añadiendo `peerDependenciesMeta["@floating-ui/react"].optional = true`.
2. `npm pack` re-genera tarball con manifest optional.
3. `npm install` en fixture limpia.
4. Verificar: `ls node_modules/@floating-ui` → **no existe**. npm 11 respeta optional flag, NO auto-instala.
5. `npm run build` (webpack 5 prod):
   ```
   webpack 5.106.2 compiled with 1 error in 1949 ms
   Module not found
   ```

**Caso D10.1-A optional real, reproducido empíricamente**. Build fail confirmado bajo configuración exacta de optional peer-dep.

Webpack resolvió en orden ascendente buscando FUI:
1. `reactigoded/dist/node_modules` — no existe.
2. `reactigoded/node_modules` — no existe.
3. `webpack5-prod-optional/node_modules` — no instalado por npm (optional respected).
4. Árbol arriba hasta `/node_modules` — no existe.

Build falla incluso aunque Card NO usa FUI transitivamente. Webpack 5 (prod y dev) parsea `dist/index.js` y intenta resolver `import "@floating-ui/react"` a parse-time, sin esperar a tree-shake.

**Tres verificaciones independientes convergen** + **N4 confirmación universal en 3 bundlers**: webpack 5 (cualquier mode) + esbuild + Vite (Rollup) requieren FUI presente para resolución. Tree-shake elimina símbolos del bundle final pero NO previene resolution at parse-time.

**N4 hallazgo Vite-específico**: Vite implementa partial support para `peerDependenciesMeta.optional` vía módulo virtual `__vite-optional-peer-dep:...`. Pero el placeholder no exporta símbolos → bind fail con static imports. Funcionaría con dynamic imports (`import("@floating-ui/react")`), pero reactigoded usa static imports eager.

**N5 — Vite mecanismo es roadmap-relevant, no curiosidad**:

El `__vite-optional-peer-dep` virtual placeholder de Vite **funcionaría correctamente** si reactigoded refactorizara los componentes Tooltip y Menu a dynamic imports lazy:

```ts
// Hipotético refactor 2.x
const Tooltip = React.lazy(() => import("./floating/Tooltip"));
const Menu = React.lazy(() => import("./floating/Menu"));
// Consumer envuelve en <Suspense> donde use Tooltip/Menu.
```

Bajo esta arquitectura + D10.1-A optional:
- Vite consumers que solo usan Card: cero referencia a FUI, build OK sin FUI installed. Tree-shake completo.
- Vite consumers que usan Tooltip: trigger dynamic import → __vite-optional-peer-dep detecta FUI ausente → error específico "FUI required to use Tooltip, install with: npm install @floating-ui/react".
- Webpack/esbuild consumers: comportamiento bundler-específico (probablemente fail similar).

**Decisión arquitectónica deferida a 2.x (no 1.x)**: Bloque 0 D10.X-b (chunk split) considera refactor a dynamic imports. Hoy diferido por scope creep + breaking ergonomics consumer (Suspense API obligatorio). Si en 2.x se materializa, **reabrir D10 específicamente para Vite consumers**.

**N6 — Dos foot-guns distintos bajo D10.1-A, no uno**:

| Variant | Quién | Mental model | Error message DX |
|---|---|---|---|
| **Card-only** | Consumer que nunca quiso FUI, solo usa Card/Button/etc. | "Solo usé Card, por qué pide FUI?" | "Module not found: @floating-ui/react" — confuso, problema percibido como bug de reactigoded |
| **Tooltip-user** | Consumer que SÍ quería Tooltip, asume reactigoded incluye FUI bundled | "He instalado reactigoded, debería incluir todo" | Mismo mensaje técnico — más confuso, no obvio que FUI sea peer-dep separada |

Ambos comparten causa raíz (FUI missing under A optional) pero distintos failure modes. Bajo C status quo:
- Variant 1 (Card-only): pnpm/npm auto-instala FUI → build OK. Consumer paga ~956 KB install que no usa (caso edge raramente notado).
- Variant 2 (Tooltip-user): pnpm/npm auto-instala FUI → Tooltip works out of box. Patrón esperado del consumer ("instalé reactigoded, funciona").

C preserva la experiencia DX en ambos variants. A rompe ambos.

**Confirmación documental**: webpack 5 docs específicamente listan resolution como step 1 del pipeline, antes de optimization (tree-shake). Module resolution ocurre en parse-time independientemente de usage.

## Hallazgo material sobre comportamiento package managers (N7)

**npm 11.13.0 verificado**: `npm install reactigoded` auto-instala `@floating-ui/react` como required peer-dep al top-level:
```
$ ls node_modules/@floating-ui
core  dom  react  react-dom  utils
```

**pnpm 11.1.2 verificado**: pnpm auto-instala FUI en content-addressable store (NO top-level), pero webpack/Vite resuelven correctamente via symlinks parent dir traversal:
```
$ ls node_modules/.pnpm/ | grep floating
@floating-ui+core@1.7.5
@floating-ui+dom@1.7.6
@floating-ui+react@0.27.19_react-dom@19.2.6_react@19.2.6__react@19.2.6
@floating-ui+react-dom@2.1.8_...
@floating-ui+utils@0.2.11

$ npx webpack --mode=production
webpack 5.106.2 compiled successfully (bundle 477 B + FUI orphan)
```

**Convergencia npm + pnpm bajo C**: ambos auto-instalan FUI funcional (mecánica diferente, mismo resultado para bundler). Yarn berry y bun no verificados empíricamente — comportamiento histórico similar a pnpm (strict tree). Bajo asunción razonable, mismo patrón aplica.

**Edge case verificado**: si consumer desactiva `auto-install-peers` en su `.npmrc` (existe en npm 7+, pnpm, yarn berry), entonces bajo C también ve foot-gun. Caso power-user opt-in. Bajo A optional, TODOS los consumers (no solo power-users) ven foot-gun. Asimetría C vs A se preserva en favor de C.

Bajo D10.1-C status quo (required), **el consumer normal nunca encuentra el foot-gun** porque npm/pnpm le instala FUI automáticamente. La supuesta carga de "consumer que no usa overlays paga FUI install" es real solo para consumers que explícitamente desactiven auto-install-peers — caso edge.

## Rationale

D10.1-A (optional peer-dep) tenía como atractivo "consumers no-overlay no pagan install". La verificación con 3 niveles (N1/N2/N3) revela:

1. **Bajo C, npm 11 auto-instala FUI**. Cero confusión para consumer normal.
2. **Bajo A, webpack 5 prod Y dev rompen** para consumers que no instalan FUI. Empíricamente verificado con peerDependenciesMeta.optional declarado real en manifest. **No es "solo webpack-dev rompe" — todos los webpack modes rompen** porque resolution ocurre antes de tree-shake en el pipeline.
3. **El ahorro real** (saved 956 KB descargado de FUI) es pequeño vs el coste (breaking todos los webpack consumers).
4. **Aplicar A** entregaría foot-gun documentado — anti-pattern que el filtro agresivo de Bloque 0 rebatió en D1, D4, D5, D6 (no documentar limitación como feature).
5. **Vite, esbuild, webpack — TODOS fallan empíricamente** bajo D10.1-A optional + FUI not installed. Verificado in situ con 3 fixtures:
   - **esbuild 0.24**: "Could not resolve '@floating-ui/react'". Eager resolve, no lazy.
   - **Vite 7 (Rollup)**: error específico `__vite-optional-peer-dep:@floating-ui/react:reactigoded:false`. **Vite tiene mecanismo para optional peer-deps** (crea placeholder virtual) pero falla en bind con static imports porque el placeholder está vacío de símbolos.
   - **webpack 5 dev+prod**: "Module not found" (verificado en N2+N3).

Decisión: **D10.1-C status quo**.

## Rango versión

Audit propuso `>=0.27.0`. Rechazo: FUI pre-1.0 hace breaking changes por minor (verificable en su CHANGELOG: 0.26→0.27 breakings). `>=0.27.0` permite 0.28, 0.29, ..., 1.x sin verificación, riesgo real.

Status quo `^0.27.0`. Cuando FUI 0.28 release + compatibility verified (test suite reactigoded passes contra 0.28), expandir manualmente a `^0.27.0 || ^0.28.0`.

## Acciones implementación (Bloque 1)

Cero código a cambiar. D10 es decisión de NO acción:
- `package.json` peerDependencies `@floating-ui/react: ^0.27.0` se mantiene.
- NO añadir `peerDependenciesMeta.@floating-ui/react.optional = true`.
- README sección Installation: documentar que FUI es required peer-dep auto-instalado por npm.

## CI gate para futuro (POST_RC1_BACKLOG)

Si en 1.x se reconsidera D10.1-A (por presión de ecosystem moves), el CI gate empírico está documentado:

1. `npm pack` reactigoded.
2. Setup fixture en directorio ephemeral fuera del workspace.
3. Install tarball + react + react-dom + webpack5 + ts-loader.
4. Manualmente `rm -rf node_modules/@floating-ui` (o equivalente).
5. `npx webpack --mode=development`.
6. Assert non-zero exit code (build fail).

Si en algún momento webpack o ecosystem cambia y este test pasa, reabrir D10.

Fixture de referencia preservada en `/tmp/d10-verify/webpack5-dev/` durante esta sesión. Para CI permanente: crear script `scripts/verify-d10-peer-dep.sh` que setupea fixture ephemeral + ejecuta + assert. Asignado a Bloque 2 implementation o POST_RC1_BACKLOG según prioridad.

## Reapertura

Reabrir si:
- **Reactigoded refactoriza Tooltip/Menu a dynamic imports lazy en 2.x** (D10.X-b chunk split). Vite consumers se beneficiarían de A optional vía __vite-optional-peer-dep mechanism. Verificar webpack y esbuild behavior bajo dynamic imports antes de migration.
- Webpack 5 cambia defaults de `mode: "development"` para habilitar tree-shake (improbable).
- npm/pnpm/yarn/bun cambian comportamiento de auto-install peer-deps required (improbable, es comportamiento canónico).
- FUI publica major version (1.0) — re-evaluar rango.

## Fixtures preservadas para reapertura futura

```
/tmp/d10-verify/webpack5-dev/         (N1-N3 webpack dev)
/tmp/d10-verify/webpack5-prod/        (N2 webpack prod)
/tmp/d10-verify/webpack5-prod-optional/ (N3 optional declared real)
/tmp/d10-verify/esbuild-test/         (N4 esbuild)
/tmp/d10-verify/vite-test/            (N4 Vite + __vite-optional-peer-dep finding)
/tmp/d10-verify/pnpm-test/            (N7 pnpm + webpack pnpm-store resolution)
```

Para reapertura: re-empacar reactigoded con manifest deseado, re-run fixtures.
