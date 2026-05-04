import { useCallback, useRef, useState } from "react";
import { useIsoLayoutEffect } from "@/utils/useIsoLayoutEffect";

export interface UseControllableStateBaseOptions<T> {
  /**
   * Valor controlado. Si está definido (≠ undefined), el componente es
   * controlled — el valor externo manda y `setValue` solo dispara
   * `onChange`.
   */
  value?: T | undefined;
  /** Callback al cambiar el valor. Disparado en ambos modos. */
  onChange?: ((value: T) => void) | undefined;
}

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
   * Setter de la fuente local que alimenta `derive()`. Se invoca cuando
   * el consumer llama a `setValue` y el componente NO es controlled.
   */
  setDerivedValue: (next: T) => void;
  defaultValue?: never;
}

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

export interface UseControllableStateReturn<T> {
  /** Valor actual (controlled, derivado o internal). */
  value: T;
  /**
   * Setter que respeta el modo. En controlled solo dispara `onChange`.
   * Pasa `{ silent: true }` para no notificar al consumer.
   */
  setValue: (next: T, options?: SetValueOptions) => void;
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
 *   onChange: onThemeChange,
 * });
 */
export function useControllableState<T>(
  options: UseControllableStateInternalOptions<T>,
): UseControllableStateReturn<T>;

export function useControllableState<T>(
  options: UseControllableStateDerivedOptions<T>,
): UseControllableStateReturn<T>;

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

  useIsoLayoutEffect(() => {
    isControlledRef.current = isControlled;
    onChangeRef.current = options.onChange;
    setDerivedValueRef.current = isDerived
      ? options.setDerivedValue
      : undefined;
  });

  const value = isControlled
    ? (controlledValue as T)
    : isDerived
      ? options.derive()
      : internalValue;

  const setValue = useCallback((next: T, setOptions?: SetValueOptions) => {
    if (!isControlledRef.current) {
      const setDerivedValue = setDerivedValueRef.current;
      if (setDerivedValue) {
        setDerivedValue(next);
      } else {
        setInternalValue(next);
      }
    }
    if (!setOptions?.silent) {
      onChangeRef.current?.(next);
    }
  }, []);

  return { value, setValue, isControlled };
}
