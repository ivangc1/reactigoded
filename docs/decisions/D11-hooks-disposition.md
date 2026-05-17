# D11 — Disposición pública de hooks del DS

**Fecha**: 2026-05-17
**Estado**: ✅ **IMPLEMENTADO en beta.24** (gate review claudegate3)
**Origen**: H-11 + C-04 + plan post-beta.20

## Contexto

Pre-RC1 había drift entre lo que el README mostraba, lo que `src/index.ts` exportaba y lo que el bundle de `dist/` exponía:

- Hooks marcados `useDropdown` / `useTabs` / etc. aparecían en `dist/index.d.ts` como subpath leak pese a ser internals.
- `useFloatingNode` se filtraba al bundle root por wildcard re-export pese a tener `@example interno` en su JSDoc.
- `UseToastReturn` no existía: consumers que tipaban el destructuring de `useToast()` debían importar `ToastContextValue` (que parecía nombre de implementación, no de API).
- No había distinción explícita en el código entre "público estable" e "internal" para hooks.

D11 cierra la disposición canónica.

## Decisión

### Símbolos públicos (estables 1.0)

| Símbolo | Ubicación canónica | Re-exportado desde | JSDoc tag |
|---|---|---|---|
| `useTheme` + `Theme` + `UseThemeReturn` | `src/hooks/useTheme.ts` | `src/index.ts` explícito + `reactigoded` root | `@public` |
| `useControllableState` + opciones + `UseControllableStateReturn` | `src/hooks/useControllableState.ts` | `src/index.ts` explícito + `reactigoded` root | `@public` |
| `useToast` + `UseToastReturn` (alias de `ToastContextValue`) | `src/components/Toast/ToastContext.ts` | `src/components/Toast/index.ts` → `components` wildcard → `reactigoded` root | `@public` |
| `FloatingTreeRoot` + `FloatingTreeRootProps` | `src/components/floating/primitives/FloatingTreeRoot.tsx` | `src/components/floating/primitives/index.ts` → `floating` wildcard → `components` wildcard → `reactigoded` root | `@public` |

### Símbolos internal (no parte de API pública)

| Símbolo | Ubicación | Estrategia | JSDoc tag |
|---|---|---|---|
| `useFloatingNode` | `src/components/floating/primitives/useFloatingNode.ts` | NO re-exportado desde `primitives/index.ts` (D7.4). Internal consumers (Tooltip / Menu) importan via path directo `@/components/floating/primitives/useFloatingNode`. | `@internal` |
| `SUPPRESS_NO_HANDLER_WARN` | `src/hooks/useControllableState.ts` | Symbol-keyed escape hatch para `useControllableState`. Exportado por necesidad (cross-component coordination) pero NO parte de la API pública. | `@internal` |

### Patrón organizacional

- **Hooks generic** (sin componente específico) → viven en `src/hooks/` y se exportan **explícitamente** desde `src/index.ts` (`useTheme`, `useControllableState`).
- **Hooks family-specific** (tied a un componente) → viven en `src/components/<Family>/` y se exportan via la barrel chain de la familia (`useToast` desde `Toast/`, `FloatingTreeRoot` desde `floating/primitives/`).

Razón de la asimetría: la barrel chain de cada componente reúne todos sus símbolos públicos (component + types + hook si lo tiene). Hookear el hook al barrel del componente preserva la cohesión semántica. Forzar export explícito desde root para todos los hooks duplicaría declaraciones sin ganancia.

### Alias `UseToastReturn`

Convención DS-wide: el tipo de retorno de un hook se llama `Use{Name}Return`. Antes de D11, `useToast` rompía la convención exponiendo `ToastContextValue` directamente. Ahora:

```ts
export interface ToastContextValue { /* shape canónico */ }

/** @public */
export type UseToastReturn = ToastContextValue;

/** @public */
export function useToast(): UseToastReturn { /* ... */ }
```

`ToastContextValue` queda exportado para consumers que tipan el shape del Provider en mocks o adapters. Pero el nombre canónico que un consumer tipa al destructurar el hook es `UseToastReturn`.

## JSDoc tags

`@public` y `@internal` se usan como **declaración de intención** del DS. Hoy son sólo documentación (no triggers de linter / build), pero:

1. Hacen explícito al lector lo que es API pública vs detalle de implementación leaked.
2. Habilitan automatización futura (api-extractor, tsdoc-emit, etc.) sin refactor.
3. Trazan la disposición que `D11-hooks-disposition.md` documenta como narrativa.

Patrón existente en el codebase: `@internal` ya se usaba en `Stepper/Step.tsx`, `useControllableState.ts:32` (símbolo de escape hatch), `useLandmarkRegistry.ts:81`, `useTopLevelLandmarkCheck.ts:109`. D11 estandariza `@public` con la misma sintaxis (línea de JSDoc, sin metadata adicional).

## Implementación beta.24

- Añadido `UseToastReturn = ToastContextValue` alias en `Toast/ToastContext.ts`.
- Re-exportado `UseToastReturn` desde `Toast/index.ts` (entra al bundle root via wildcard chain).
- `@public` JSDoc tags en: `useTheme`, `useControllableState`, `useToast`, `FloatingTreeRoot`.
- `@internal` JSDoc tag en: `useFloatingNode` (con doc apuntando a `FloatingTreeRoot` como entrypoint público para anidación de floats).
- README sección "Hooks públicos del DS" añadida apuntando a esta tabla.
- `dist/` ya no expone `useFloatingNode` (cerrado en B-04 RC1 + D7.4 reforzado).

## No hay breaking change

API pública pre-D11 ya exponía `useToast` + `FloatingTreeRoot`. El alias `UseToastReturn` es adicional (no rompe consumers que ya tipaban con `ToastContextValue`). El `@internal` sobre `useFloatingNode` es documentación, no remueve nada del bundle root (ya fue removido en D7.4).
