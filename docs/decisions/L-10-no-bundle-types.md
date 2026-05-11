# L-10 — Audit dist/index.d.ts: NO activar bundleTypes

**Fecha**: 2026-05-10
**Task**: L-10 ("dist/index.d.ts arrastra 91 símbolos sin filtro" del gate review pre-RC1)
**Decisión**: cerrar L-10 sin activar `bundleTypes` en vite-plugin-dts
**Commit**: ver branch `chore/dts-filter-l10`

## Contexto

Gate review pre-RC1 marcó como LOW que el d.ts root del paquete arrastraba "91 símbolos sin filtro". Sin contexto adicional, la frase es ambigua:

- (a) "no se filtran internals" (problema real)
- (b) "no se aplica bundleTypes" (descripción del estado actual, no necesariamente problema)

Este doc audita las 4 dimensiones que determinan si hay contaminación real, antes de pagar el coste de activar `bundleTypes` (api-extractor: build ~15-30s más lento, configuración adicional).

## Audit (4 verificaciones)

### B1 — `package.json#exports`

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "./styles/tokens.css": "./dist/styles/igoded-tokens.css",
  "./styles/base.css": "./dist/styles/igoded-base.css",
  "./styles/components.css": "./dist/styles/igoded-components.css",
  "./styles/design.css": "./dist/styles/igoded-design.css",
  "./styles/fonts.css": "./dist/styles/igoded-fonts.css",
  "./styles/reset.css": "./dist/styles/igoded-reset.css",
  "./styles/state.css": "./dist/styles/igoded-state-css.css",
  "./styles/state/*.css": "./dist/styles/state/*.css",
  "./styles/all.css": "./dist/styles/index.css",
  "./package.json": "./package.json"
}
```

✅ **Limpio**. Solo entry root + subpaths CSS específicos. Sin `./*` permisivo que abriría imports arbitrarios.

### B2 — `src/index.ts` barrel

```ts
export * from "./components";
export { useTheme, type Theme, type UseThemeReturn } from "./hooks/useTheme";
export {
  useControllableState,
  type SetValueOptions,
  type UseControllableStateOptions,
  type UseControllableStateReturn,
} from "./hooks/useControllableState";
export { cn } from "./utils/cn";
```

Un solo `export *` apunta a `./components/index.ts`. Ese sub-barrel tiene 32 `export *` adicionales hacia cada componente. Cada barrel de componente lista símbolos **explícitamente** (revisado: Accordion, Dialog, Stepper, Tabs, Toast, etc).

✅ **Limpio**. No hay arrastres tipo `export * from "./internal"` ni `export * from "./AccordionContext"` directos.

### B3 — `dist/index.d.ts` post-rebuild + clasificación tripartita

`dist/index.d.ts` (36 líneas, 4 export statements) reproduce literalmente `src/index.ts`. **Símbolos públicos resueltos vía árbol de barrels: 228**.

> Nota: el "91" del gate review no se refiere al conteo realmente accesible; mi resolución completa devuelve 228. Probablemente el reviewer contó solo runtime exports (no types) o uso `wc -l` sobre el d.ts root parseado pre-resolución. La cifra exacta no cambia la decisión; lo que importa es la clasificación.

#### Cat 1 — públicos esperados (componentes + Props/Variants/Sizes): **213**

Componentes raíz (38), sub-componentes documentados (Accordion{Item,Header,Content}, Card{Body,Header,Footer,...}, Dialog{Header,Body,Footer,Close}, Tab{,List,Panel}, Sidebar{Header,Footer,Item,Nav,Section,Toggle,Divider}, Navbar{Brand,Link,Nav,Actions,MenuButton}, Table{Body,Cell,...}, etc), Props types correspondientes, Variant/Size/Layout/Position/Side/State/Direction/Placement/Appearance/Status types.

#### Cat 2 — hooks/utils públicos intencionales: **3**

```
cn
useControllableState
useTheme
```

Los 3 documentados explícitamente en README + src/index.ts como API público.

#### Cat 3 — sospechosos: **12**

```
AccordionContextValue           ← pareja tipada de useAccordion
AccordionItemContextValue       ← pareja tipada de useAccordionItem
MenuContextValue            ← pareja tipada de useMenu
SidebarContextValue             ← pareja tipada de useSidebar
TabsContextValue                ← pareja tipada de useTabs
ToastContextValue               ← pareja tipada de useToast
useAccordion          [C-04]    ← gate review backlog
useAccordionItem      [C-04]
useMenu           [C-04]
useSidebar            [C-04]
useTabs               [C-04]
useToast              [C-04]
```

**Análisis**: los 12 sospechosos son 6 hooks `useFoo` + 6 `FooContextValue` que son su pareja tipada (un consumer que use el hook necesita el ContextValue para tiparse). El gate review ya identificó los 6 hooks como "accidentalmente públicos" en **C-04** (task pending).

⚠️ **Coupling con C-04**: la decisión sobre los 6 ContextValues está acoplada a la decisión sobre los 6 hooks. Si C-04 retira los hooks del API público → retiramos también los ContextValue en la misma operación. Si C-04 los mantiene → ContextValues quedan como API público válido.

**0 sospechosos genuinos no-C-04** desde el punto de vista de L-10 puro.

### B4 — Consumer real test

#### B4.1 — `npm pack --dry-run`

```
total files: 282
package size: 1.6 MB
unpacked size: 13.7 MB
```

Contenido relevante:
- `dist/index.{js,cjs,d.ts}` (entry)
- `dist/styles/*.css` (8 stylesheets canon + 22 fragments granulares en `state/`)
- `dist/utils/cn.d.ts` (único `.d.ts` standalone porque el utility se exporta directamente en runtime, no via barrel — verificado L-08 cerró el resto de leaks de `dist/utils/`)
- `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`

#### B4.2 — Consumer test (positivo + negativo)

```tsx
// test-positive.tsx — debe compilar
import { Button, Card, Tooltip, Sidebar, Switch, useTheme, useControllableState, cn } from "reactigoded";
import type { ButtonProps, CardProps } from "reactigoded";
```

✅ **Compila** (`tsc --noEmit` exit 0).

```tsx
// test-negative-check.tsx — debe FALLAR
import {} from "reactigoded/dist/components/Menu/menuSelectors";
import {} from "reactigoded/components/Button/Button";
import {} from "reactigoded/dist/utils/cn";
import {} from "reactigoded/hooks/useTheme";
```

✅ **Falla con TS2307** en los 4 imports:

```
test-negative-check.tsx(3,16): error TS2307: Cannot find module 'reactigoded/dist/components/Menu/menuSelectors' or its corresponding type declarations.
test-negative-check.tsx(4,16): error TS2307: Cannot find module 'reactigoded/components/Button/Button' or its corresponding type declarations.
test-negative-check.tsx(5,16): error TS2307: Cannot find module 'reactigoded/dist/utils/cn' or its corresponding type declarations.
test-negative-check.tsx(6,16): error TS2307: Cannot find module 'reactigoded/hooks/useTheme' or its corresponding type declarations.
```

El campo `exports` de `package.json` bloquea efectivamente todos los subpath imports a internals.

## Decisión

**Cerrar L-10 sin activar `bundleTypes`** en vite-plugin-dts.

### Razonamiento

Las 4 verificaciones del audit pasaron limpias:

1. **B1** — `exports` minimal sin `./*` permisivo
2. **B2** — barrels explícitos sin arrastres de internals
3. **B3** — 0 sospechosos genuinos en cat3 (los 12 candidates son pareja indivisible de C-04, decisión política aparte)
4. **B4** — `tsc --noEmit` confirma que el consumer real NO puede importar internals via subpath

### Trade-off rechazado

`bundleTypes: true` colapsaría todos los `.d.ts` en uno solo y eliminaría los archivos individuales en `dist/components/*/`. Beneficio: dist tarball ~30% más pequeño (estimado, los `.d.ts` son ~50KB del 1.6MB total — la mayor parte es CSS), defensa-en-profundidad si el consumer modifica `exports` o `node_modules`.

Coste: build +15-30s (api-extractor es time-intensive), requiere `api-extractor.json` adicional, conocido issue 416 con symbol forwarding que puede dejar internals colados igualmente. **El coste no compensa el beneficio cuando el `exports` field ya bloquea el vector que `bundleTypes` defendería**.

### Ganancias del cierre (commits del PR)

- (a) Eliminada opción muerta `rollupTypes: true` (era flag v4 antiguo aceptado silenciosamente por v5 sin efecto)
- (b) `dts(dtsOptions)` con `satisfies PluginOptions` para que TS rechace en typecheck cualquier opción inválida en el futuro (en lugar de descubrirlo solo inspeccionando dist tras build)

## Reapertura

Reabrir si:
- `package.json#exports` se modifica para añadir paths `./*` o `./components/*` (defense-in-depth se vuelve relevante).
- C-04 decide que los `useFoo` hooks NO son públicos. En ese caso, una **operación combinada** retira hooks + ContextValues del barrel del componente, y este audit se actualiza para reflejar 0 cat3.
- Migración a un bundler que no respete el `exports` field (raro en 2026+).
- Audit periódico (anual) detecta nuevos sospechosos en cat3.
