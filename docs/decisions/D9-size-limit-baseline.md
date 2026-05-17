# D9 — Re-baseline de size-limit + budget creep policy

**Fecha**: 2026-05-17
**Estado**: ✅ **IMPLEMENTADO en beta.24** (gate review claudegate3)
**Origen**: H-13 (RC1) re-aplicado post-beta.24, drift de margen JS

## Contexto

H-13 (RC1) había seteado budgets de `size-limit` con 25-30% headroom respecto al tamaño real. Tras los cambios de beta.24 (Menu Full FUI portal, callbacks rename, Avatar fallback, Progress CSP, hooks disposition), el bundle JS creció:

| Entry | Pre-beta.24 budget | Pre-beta.24 real | Beta.24 real | Margen |
|---|---|---|---|---|
| JS ESM (gzip) | 16 KB | ~14.5 KB | **15.82 KB** | 0.18 KB (1.1%) — CRÍTICO |
| JS CJS (gzip) | 15 KB | ~13 KB | **14.06 KB** | 0.94 KB (6.3%) — apretado |

El margen ESM de 0.18 KB es funcionalmente cero — cualquier PR mediano de beta.24+ rompía CI por scope creep accidental. Pre-RC1 H-13 había documentado el principio "25-30% headroom"; este budget se erosionó orgánicamente sin alarma porque el ratchet siempre era pequeño per-PR.

CSS budgets se mantienen en su zona 23-30% headroom post-H-13 (sin drift relevante en beta.24, los cambios fueron JS-side).

## Decisión

### Re-baseline JS

| Entry | Beta.24 real | **Nuevo budget** | Headroom | Headroom % |
|---|---|---|---|---|
| JS ESM (gzip) | 15.82 KB | **20 KB** | 4.18 KB | 26.4% |
| JS CJS (gzip) | 14.06 KB | **18 KB** | 3.94 KB | 28.0% |

Razón del ratio asimétrico ESM/CJS: el `vite build` agrupa el ESM con tree-shaking más agresivo y dynamic imports; el CJS arrastra siempre la fachada `require()` y algunos polyfills, lo que aplana la diferencia. Históricamente ESM > CJS por ~1.5-2 KB; budgets nuevos preservan el spread con headroom paralelo.

### CSS budgets — sin cambio

| Entry | Real | Budget | Headroom |
|---|---|---|---|
| tokens.css | 6.53 KB | 8.5 KB | 23.2% |
| components.css | 27.65 KB | 36 KB | 23.2% |
| base.css | 456 B | 600 B | 24.0% |
| reset.css | 924 B | 1.2 KB | 23.0% |
| fonts.css | 142 B | 200 B | 29.0% |
| design.css | 70 B | 256 B | 72.7% |
| state.css | 713.54 KB | 800 KB | 10.8% |
| state/hover.css | 35.75 KB | 47 KB | 23.9% |
| state/focus.css | 53.82 KB | 70 KB | 23.1% |
| state/disabled.css | 36.1 KB | 47 KB | 23.2% |
| state/active.css | 35.99 KB | 47 KB | 23.4% |

`state.css` standalone tiene menos headroom (10.8%) pero su tamaño es totalmente function of cardinal × prefijo × propiedad CSS (math determinístico, no scope-creep prone). Los fragmentos individuales tienen headroom normal.

## Budget creep policy

### Headroom target

Target permanente: **25-30% headroom** entre tamaño real y budget. CSS budgets pueden estar más cerca (10-15%) si el contenido es determinístico (tokens × cardinal × prop), no scope-creep prone.

### Cuándo subir un budget

1. ✅ **Feature documentada**: el PR añade comportamiento descrito en roadmap o issue tracking. El PR debe:
   - Linkear al doc / issue que define la feature.
   - Mostrar el growth real medido (output de `npm run size`).
   - Calcular el nuevo budget = real + 25-30% headroom.
   - Actualizar el budget en el mismo PR (no en uno separado).
2. ✅ **Dep upstream con justificación**: una dep peer (React, FUI) o devDep crítica creció en versión nueva. PR debe linkear al CHANGELOG upstream relevante.

### Cuándo NO subir un budget

1. ❌ **Refactor / cleanup**: si un refactor sube el tamaño, el refactor está mal hecho. Revertir o rediseñar — no subir el budget.
2. ❌ **Dep bumps cosméticos**: minor / patch de deps que crecen el bundle por scope creep upstream, sin feature value para el DS. Pin versión, no subir budget.
3. ❌ **"CI falla, fix rápido"**: si CI rompe por size-limit, primer paso es identificar el commit responsable y discutir alternativas. Subir budget solo después de validar que el growth es legítimo.
4. ❌ **Comodidad de iteración**: "lo subimos para no rompernos en cada PR" anula el propósito del gate. Si CI rompe demasiado seguido, el problema es scope creep, no el budget.

### Quien decide

El budget se aprueba en el mismo PR que lo cambia. No requiere comité — pero el PR description debe articular cuál de las dos categorías "cuándo subir" aplica + número antes/después + cálculo de headroom resultante. Auditable en `git log -- package.json` con grep `size-limit`.

## H-07 gate ejecutable

`scripts/check-state-css-exclusion.mjs` + `npm run test:state-css-exclusion` añadido a `verify:unit` pipeline post-build.

Invariante: ninguna utility de `state.css` (clases con prefijo `hover:ig-`, `focus:ig-`, `active:ig-`, `disabled:ig-`, `checked:ig-`, `default:ig-`, `empty:ig-`, `first-child:ig-`, `last-child:ig-`) puede aparecer como string literal en `dist/index.js` ni `dist/index.cjs`. Si un componente del DS empieza accidentalmente a referenciarlas, el gate explota pre-publish.

Razón del gate: H-07 (RC1) decidió conservar `state.css` standalone como opt-in CSS-only para HTML-utility-first prototyping (story canónica `CSS-Only-Prototyping.stories.tsx`). El módulo standalone pesa 713 KB gzip — si entrara al bundle React por error, el TTI del consumer típico se rompería. El gate cierra ese vector de escape.

Decision doc `H-07-state-css-and-future.md` actualizado para referenciar este gate como su seguro ejecutable.

## Implementación beta.24

1. `package.json` `size-limit[]`:
   - `JS bundle ESM (gzip)` 16 KB → **20 KB**.
   - `JS bundle CJS (gzip)` 15 KB → **18 KB**.
   - CSS budgets sin cambio.
2. `scripts/check-state-css-exclusion.mjs` nuevo.
3. `package.json` scripts: `test:state-css-exclusion` añadido + encadenado en `verify:unit` (post-build).
4. `docs/decisions/H-07-state-css-and-future.md` actualizado con pointer al gate.

## No breaking change

Budgets son configuración interna de CI. Consumers no perciben cambio. Bundle real no cambió (solo se relaja el techo). El gate `check-state-css-exclusion` es interno también — falla solo si futuro código del DS rompe el invariante.
