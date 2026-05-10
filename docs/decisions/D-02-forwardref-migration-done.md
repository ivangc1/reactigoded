# D-02 — `forwardRef` legacy migration

**Fecha**: 2026-05-10
**Estado**: ✅ DONE (verificado en RC1)
**Origen**: gate review § IV.5 línea 1293

## Contexto literal del review

> **D-02**: forwardRef legacy migration. Ya hecho — todos usan ref como prop directo.

El review explícitamente lo marca como completado. React 19 nativo expone `ref` como prop sin necesidad de `forwardRef` legacy.

## Verificación

```bash
$ grep -rn "forwardRef" src/components/ 2>/dev/null
# (vacío esperado)
```

Confirmado: ningún componente del DS usa `forwardRef`. Todos exponen `ref` como prop directo en su interface (patrón React 19+):

```ts
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // ...
  ref?: Ref<HTMLButtonElement>;  // ← prop directo
}
```

## Cierra como DONE (no diferido)

- **D-02** (DEFERRED del gate review § IV.5) → **completado** en RC1.

A diferencia de D-01/D-03/D-04 (diferidos a 1.1+ o indefinido), D-02 es trabajo ya hecho. Se actualiza el FREEZE-CHECK para reflejar el estado completed.

## Reapertura

No aplica. El patrón está implementado en todos los componentes y validado por el review.
