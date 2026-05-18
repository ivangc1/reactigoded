# D-02 — `forwardRef` legacy migration

**Fecha**: 2026-05-10
**Estado**: ✅ DONE (verificado en RC1)
**Origen**: gate review § IV.5 línea 1293

## Contexto literal del review

> **D-02**: forwardRef legacy migration. Ya hecho — todos usan ref como prop directo.

El review explícitamente lo marca como completado. React 19 nativo expone `ref` como prop sin necesidad de `forwardRef` legacy.

## Verificación

**M-10 (beta.24) — grep refinado**: el grep canónico para el invariante
"ningún componente del DS USA `forwardRef` como mecanismo de ref" es
el call-form con paréntesis:

```bash
$ grep -rn "forwardRef(" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null
# (vacío esperado — ningún componente del DS invoca forwardRef)
```

El grep amplio `grep -rn "forwardRef"` (sin paréntesis) reporta hoy
11 matches, todos en `src/components/floating/Tooltip/`. Son:

- **Tooltip.tsx (M-07.2 dev-warn)**: el componente analiza
  `$$typeof === REACT_FORWARD_REF_TYPE` para clasificar el child y
  produce mensajes de error que mencionan `forwardRef` como guía al
  consumer (React <19). No es uso de forwardRef del propio DS.
- **Tooltip.test.tsx**: test fixtures que crean componentes envueltos
  con `forwardRef` precisamente para validar el dev-warn anterior.
  Cubren el caso "consumer-side, no DS-side".

Ninguna de las 11 menciones es una declaración `forwardRef(...)` de
un componente del DS. El invariante se mantiene.

Confirmado: ningún componente del DS usa `forwardRef` como pattern de ref. Todos exponen `ref` como prop directo en su interface (patrón React 19+):

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
