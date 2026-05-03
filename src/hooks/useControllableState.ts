import { useCallback, useRef, useState } from "react";

export interface UseControllableStateOptions<T> {
  /** Valor controlado. Si está definido, el componente es controlled. */
  value?: T;
  /** Valor inicial uncontrolled. Ignorado si `value` está definido. */
  defaultValue?: T;
  /** Callback al cambiar el valor. Disparado en ambos modos. */
  onChange?: (value: T) => void;
}

export interface UseControllableStateReturn<T> {
  /** Valor actual (controlled o internal). */
  value: T;
  /** Setter que respeta el modo. En controlled solo dispara onChange. */
  setValue: (next: T) => void;
  /** True si el componente está en modo controlled. */
  isControlled: boolean;
}

/**
 * Hook para componentes con patrón controlled/uncontrolled.
 *
 * Encapsula la lógica:
 * - `isControlled = value !== undefined`
 * - state interno con `defaultValue` cuando uncontrolled
 * - setter unificado que respeta el modo y dispara `onChange` en ambos
 *   casos
 *
 * Estable: el `setValue` devuelto es la misma referencia entre renders.
 * `onChange` y el modo se leen de refs sincronizadas para no recrear
 * el setter cuando cambian.
 *
 * @example
 * function MyToggle({ checked, defaultChecked, onChange }) {
 *   const { value, setValue } = useControllableState({
 *     value: checked,
 *     defaultValue: defaultChecked ?? false,
 *     onChange,
 *   });
 *   return <input type="checkbox" checked={value} onChange={(e) => setValue(e.target.checked)} />;
 * }
 */
export function useControllableState<T>(
  options: UseControllableStateOptions<T>,
): UseControllableStateReturn<T> {
  const { value: controlledValue, defaultValue, onChange } = options;
  const isControlled = controlledValue !== undefined;

  const [internalValue, setInternalValue] = useState<T>(defaultValue as T);

  const isControlledRef = useRef(isControlled);
  const onChangeRef = useRef(onChange);

  isControlledRef.current = isControlled;
  onChangeRef.current = onChange;

  const value = isControlled ? (controlledValue as T) : internalValue;

  const setValue = useCallback((next: T) => {
    if (!isControlledRef.current) {
      setInternalValue(next);
    }
    onChangeRef.current?.(next);
  }, []);

  return { value, setValue, isControlled };
}
