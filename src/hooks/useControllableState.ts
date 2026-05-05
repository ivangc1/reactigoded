import { useCallback, useEffect, useRef, useState } from "react";
import { useIsoLayoutEffect } from "@/utils/useIsoLayoutEffect";
import { isDev } from "@/utils/env";

export interface UseControllableStateBaseOptions<T> {
  /**
   * Valor controlado. Si está definido (≠ undefined), el componente es
   * controlled — el valor externo manda y `setValue` solo dispara
   * `onChange`.
   */
  value?: T | undefined;
  /** Callback al cambiar el valor. Disparado en ambos modos. */
  onChange?: ((value: T) => void) | undefined;
  /**
   * Escape hatch interno (NO documentado en API pública). Suprime el
   * dev warn cuando un componente está en modo controlled (`value`
   * definido) sin `onChange`. Usado por componentes con un modo
   * legítimo de "value sin onChange" (Rating con `readOnly`,
   * display-only patterns) para no acoplar el hook a la prop específica
   * del componente. Para uso interno del DS — los consumers no deberían
   * pasar este flag.
   * @internal
   */
  __suppressNoHandlerWarn?: boolean;
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

  // Dev-only warn: controlled (`value` definido) sin `onChange` y sin
  // el escape hatch `__suppressNoHandlerWarn` = UI bloqueada al input
  // del usuario. Una vez por instancia. En useEffect (no during render)
  // por la regla react-hooks/refs.
  //
  // El flag interno `__suppressNoHandlerWarn` lo activan los
  // componentes con modo display-only legítimo (Rating con `readOnly`)
  // para no disparar el warn donde el patrón es intencional.
  // beta.21: re-aplicado tras revert en beta.20 con Option E.
  const warnedControlledNoHandlerRef = useRef(false);
  useEffect(() => {
    if (!isDev() || warnedControlledNoHandlerRef.current) return;
    if (
      isControlled &&
      options.onChange === undefined &&
      options.__suppressNoHandlerWarn !== true
    ) {
      warnedControlledNoHandlerRef.current = true;
      console.warn(
        "[useControllableState] componente controlled (value definido) sin " +
          "onChange. La UI quedará bloqueada al input del usuario. Usa " +
          "`defaultValue=` para modo uncontrolled, o pasa `onChange` para " +
          "controlar el valor.",
      );
    }
  }, [isControlled, options.onChange, options.__suppressNoHandlerWarn]);

  return { value, setValue, isControlled };
}
