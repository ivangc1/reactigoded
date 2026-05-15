"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsoLayoutEffect } from "@/utils/useIsoLayoutEffect";

/**
 * Escape hatch interno para suprimir el dev warn de "controlled sin
 * onChange" en componentes con modo display-only legítimo (Rating con
 * `readOnly`, patterns similares).
 *
 * **Por qué Symbol (no string como en pre-RC1)**: la versión anterior
 * usaba un campo `__suppressNoHandlerWarn?: boolean` con key string.
 * `stripInternal` eliminaba el campo del `.d.ts` (TS error consumer-
 * side) PERO el bundle JS contenía el string literal 3× — un consumer
 * con `// @ts-expect-error` podía pasar `{ __suppressNoHandlerWarn:
 * true }` runtime y suprimir el warn arbitrariamente. Vector real
 * documentado en gate review § VI C-07.
 *
 * Symbol cierra el agujero: aunque el bundle contenga el Symbol como
 * código, el consumer NO puede recrearlo desde fuera —
 * `Symbol("foo") !== Symbol("foo")`. Y como este Symbol NO se re-
 * exporta desde `src/index.ts` (barrel root), no es accesible vía la
 * API pública del paquete. La única forma de pasarlo es importándolo
 * desde el módulo del hook, y los `exports` field de `package.json`
 * bloquea subpath imports a internals (verificado L-10).
 *
 * `Symbol(...)` (no `Symbol.for(...)`): único per realm, no registrable
 * en el global Symbol registry — cierra también el vector de un
 * consumer que intente `Symbol.for("reactigoded.suppressNoHandlerWarn")`
 * desde su código.
 *
 * @internal
 */
export const SUPPRESS_NO_HANDLER_WARN: unique symbol = Symbol(
  "reactigoded.suppressNoHandlerWarn",
);

export type UseControllableStateBaseOptions<T> = {
  /**
   * Valor controlado. Si está definido (≠ undefined), el componente es
   * controlled — el valor externo manda y `setValue` solo dispara
   * `onChange`.
   */
  value?: T | undefined;
  /** Callback al cambiar el valor. Disparado en ambos modos. */
  onChange?: ((value: T) => void) | undefined;
} & {
  /**
   * @internal — Symbol-keyed escape hatch. Ver `SUPPRESS_NO_HANDLER_WARN`.
   */
  [SUPPRESS_NO_HANDLER_WARN]?: boolean;
};

export interface UseControllableStateInternalOptions<T>
  extends UseControllableStateBaseOptions<T> {
  /** Valor inicial uncontrolled. Ignorado si `value` está definido. */
  defaultValue?: T | undefined;
  derive?: never;
  setDerivedValue?: never;
}

export interface UseControllableStateDerivedOptions<T>
  extends UseControllableStateBaseOptions<T> {
  /**
   * Valor uncontrolled derivado en cada render desde fuentes externas
   * (storage, MediaQueryList, otro hook). Debe ser **puro**: no
   * escribas storage, DOM ni estado dentro.
   */
  derive: () => T;
  /**
   * Setter de la fuente local React que alimenta `derive()`.
   *
   * IMPORTANTE: debe actualizar una fuente React/local que `derive()`
   * lea. No debe escribir únicamente en una fuente externa como
   * `localStorage`, porque `useSyncExternalStore` no notifica cambios
   * same-tab en browsers reales y la UI no se actualizaría tras una
   * interacción del usuario.
   *
   * Ejemplo correcto en ThemeSwitch:
   *
   * ```ts
   * const [override, setOverride] = useState<Theme | null>(null);
   *
   * useControllableState({
   *   derive: () => override ?? stored ?? defaultTheme ?? "dark",
   *   setDerivedValue: setOverride,
   * });
   * ```
   */
  setDerivedValue: (next: T) => void;
  defaultValue?: never;
}

/**
 * Opciones de `useControllableState`.
 *
 * Dos modos mutuamente excluyentes garantizados por unión discriminada:
 *
 * **Modo interno clásico** — para componentes con state interno simple.
 *
 * ```ts
 * useControllableState({
 *   value,
 *   defaultValue,
 *   onChange,
 * });
 * ```
 *
 * **Modo derivado** — para componentes cuyo valor uncontrolled deriva de
 * fuentes externas o compuestas.
 *
 * ```ts
 * useControllableState({
 *   value,
 *   derive: () => override ?? stored ?? defaultValue ?? "fallback",
 *   setDerivedValue: setOverride,
 *   onChange,
 * });
 * ```
 *
 * En modo derivado NO pases `defaultValue`; mete el fallback dentro de
 * `derive()`. TypeScript impide la combinación inválida vía `never`.
 */
export type UseControllableStateOptions<T> =
  | UseControllableStateInternalOptions<T>
  | UseControllableStateDerivedOptions<T>;

export interface SetValueOptions {
  /**
   * Si `true`, NO se invoca `onChange`. Útil para auto-selects internos
   * y rehidrataciones desde storage que NO son acción del usuario.
   */
  silent?: boolean;
}

/**
 * Acción aceptada por `setValue`: un valor directo `T` o una función
 * updater `(prev: T) => T` (M-06, RC1) — mismo patrón que `useState`
 * de React. La updater function recibe el `value` actual del hook
 * (controlled, derivado o internal según el modo) y debe retornar el
 * siguiente valor sin mutar el anterior.
 *
 * Útil para updates que no dependen del closure del callback:
 *
 * ```tsx
 * <button onClick={() => setValue((prev) => !prev)}>Toggle</button>
 * ```
 *
 * vs. el equivalente con valor directo (depende del closure):
 *
 * ```tsx
 * <button onClick={() => setValue(!value)}>Toggle</button>
 * ```
 */
export type SetValueAction<T> = T | ((prev: T) => T);

export interface UseControllableStateReturn<T> {
  /** Valor actual (controlled, derivado o internal). */
  value: T;
  /**
   * Setter que respeta el modo. En controlled solo dispara `onChange`.
   * Pasa `{ silent: true }` para no notificar al consumer.
   *
   * Acepta valor directo `T` o updater function `(prev: T) => T`
   * (M-06, RC1) — mismo patrón que `useState`.
   */
  setValue: (action: SetValueAction<T>, options?: SetValueOptions) => void;
  /** True si el componente está en modo controlled. */
  isControlled: boolean;
}

function isDerivedOptions<T>(
  options: UseControllableStateOptions<T>,
): options is UseControllableStateDerivedOptions<T> {
  return (
    "derive" in options &&
    typeof options.derive === "function" &&
    "setDerivedValue" in options &&
    typeof options.setDerivedValue === "function"
  );
}

/**
 * Hook para componentes con patrón controlled/uncontrolled.
 *
 * Dos modos:
 * - **Internal** (default): `useState(defaultValue)` para uncontrolled.
 * - **Derived** (opt-in): `derive()` se computa en render desde una
 *   fuente externa (storage, MediaQueryList…) y `setDerivedValue` la
 *   actualiza. Útil cuando el origen del valor uncontrolled es un
 *   sistema externo y no queremos un `useState` espejo que se
 *   desincronice.
 *
 * `setValue` mantiene identidad estable entre renders (útil para
 * pasarlo a contextos sin invalidar consumers). `onChange` y el modo
 * se sincronizan vía refs.
 *
 * @example // Modo internal (la mayoría de componentes)
 * const { value, setValue } = useControllableState({
 *   value: checked,
 *   defaultValue: defaultChecked ?? false,
 *   onChange: onCheckedChange,
 * });
 *
 * @example // Modo derive (ThemeSwitch con useStoredTheme)
 * const stored = useStoredTheme(storageKey);
 * const { value, setValue } = useControllableState<Theme>({
 *   value: themeProp,
 *   derive: () => stored ?? defaultTheme ?? "dark",
 *   setDerivedValue: (next) => writeStoredTheme(storageKey, next),
 *   onChange: onValueChange,
 * });
 */
export function useControllableState<T>(
  options: UseControllableStateOptions<T>,
): UseControllableStateReturn<T> {
  const isDerived = isDerivedOptions(options);
  const controlledValue = options.value;
  const isControlled = controlledValue !== undefined;

  const [internalValue, setInternalValue] = useState<T>(() => {
    if (isDerived) return options.derive();
    return options.defaultValue as T;
  });

  // Refs always-fresh sincronizados en useIsoLayoutEffect (corre antes
  // del paint en cliente, useEffect en server). Esto preserva la
  // identidad estable de setValue sin caer en el lint react-hooks/refs
  // que prohíbe assigns durante render.
  const isControlledRef = useRef(isControlled);
  const onChangeRef = useRef(options.onChange);
  const setDerivedValueRef = useRef<((next: T) => void) | undefined>(
    isDerived ? options.setDerivedValue : undefined,
  );
  // M-06 (RC1): ref del value "pending" para resolver updater functions
  // contra el último valor — incluso si hay encadenamientos en el mismo
  // tick antes de que React re-renderice. Codex P1 sobre PR #70 detectó
  // que leer solo el ref committed dejaba `setValue(p=>p+1); setValue(p=>p+1)`
  // resolviendo ambos a `1` en lugar de `2`. Fix: tras resolver una
  // updater, advanzamos el ref para que la siguiente llamada vea el
  // valor pendiente. useIsoLayoutEffect resincroniza el ref con el
  // value committed en el próximo render — relevante cuando un re-render
  // externo cambia el controlled prop o el derived source.
  const pendingValueRef = useRef<T>(undefined as T);

  const value = isControlled
    ? (controlledValue as T)
    : isDerived
      ? options.derive()
      : internalValue;

  useIsoLayoutEffect(() => {
    isControlledRef.current = isControlled;
    onChangeRef.current = options.onChange;
    setDerivedValueRef.current = isDerived
      ? options.setDerivedValue
      : undefined;
    pendingValueRef.current = value;
  });

  const setValue = useCallback(
    (action: SetValueAction<T>, setOptions?: SetValueOptions) => {
      // M-06 (RC1): si el caller pasa una function, la invocamos contra
      // el pending value para producir el siguiente. Si pasa un valor
      // directo, se usa tal cual. Tras resolver, advanzamos el ref para
      // permitir chaining `setValue(p=>p+1); setValue(p=>p+1)` → +2.
      const resolved =
        typeof action === "function"
          ? (action as (prev: T) => T)(pendingValueRef.current)
          : action;
      pendingValueRef.current = resolved;
      if (!isControlledRef.current) {
        const setDerivedValue = setDerivedValueRef.current;
        if (setDerivedValue) {
          setDerivedValue(resolved);
        } else {
          setInternalValue(resolved);
        }
      }
      if (!setOptions?.silent) {
        onChangeRef.current?.(resolved);
      }
    },
    [],
  );

  // Dev-only warn: controlled (`value` definido) sin `onChange` y sin
  // el escape hatch SUPPRESS_NO_HANDLER_WARN = UI bloqueada al input
  // del usuario. Una vez por instancia. En useEffect (no during render)
  // por la regla react-hooks/refs.
  //
  // C-07 (gate review): migrado de string-keyed (`__suppressNoHandlerWarn`)
  // a Symbol-keyed. El Symbol no se re-exporta desde el barrel root
  // (`src/index.ts`), por lo que un consumer con `// @ts-expect-error`
  // ya no puede recrearlo runtime ni accederlo vía API pública.
  const suppress = options[SUPPRESS_NO_HANDLER_WARN] === true;
  const warnedControlledNoHandlerRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedControlledNoHandlerRef.current) return;
    if (isControlled && options.onChange === undefined && !suppress) {
      warnedControlledNoHandlerRef.current = true;
      console.warn(
        "[useControllableState] componente controlled (value definido) sin " +
          "onChange. La UI quedará bloqueada al input del usuario. Usa " +
          "`defaultValue=` para modo uncontrolled, o pasa `onChange` para " +
          "controlar el valor.",
      );
    }
  }, [isControlled, options.onChange, suppress]);

  return { value, setValue, isControlled };
}
