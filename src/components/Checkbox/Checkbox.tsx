import {
  useEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";

export type CheckboxVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Color del check cuando está activo. */
  variant?: CheckboxVariant;
  /** Etiqueta visible junto al checkbox. */
  children?: React.ReactNode;
  /**
   * Activa el tercer estado visual del checkbox (línea horizontal en
   * lugar del tick). Se aplica vía `el.indeterminate = true` en el
   * `<input>` nativo (la única forma soportada por la plataforma) y
   * añade `aria-checked="mixed"` para lectores de pantalla.
   *
   * Nota: `indeterminate` es estado del DOM, no del modelo de datos.
   * El `value` del checkbox sigue siendo `checked`/`unchecked`. Mantén
   * tú la sincronización con los hijos cuyo estado lo justifique.
   */
  indeterminate?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Checkbox — `<input type="checkbox">` con marca visual personalizada.
 * Wrappeado en `<label>` para que click en el texto active el input.
 *
 * Soporta tri-state vía `indeterminate` prop (desde 1.0.0-rc.3) o via
 * `ref` manual (`ref.current.indeterminate = true`).
 *
 * @example
 * <Checkbox defaultChecked>Acepto los términos</Checkbox>
 * <Checkbox indeterminate>Selección parcial</Checkbox>
 * <Checkbox checked={on} onChange={(e) => setOn(e.target.checked)}>
 *   Recibir newsletter
 * </Checkbox>
 */
export function Checkbox({
  variant = "brand",
  className,
  children,
  ref,
  disabled,
  indeterminate,
  onChange,
  ...rest
}: CheckboxProps) {
  const internalRef = useRef<HTMLInputElement>(null);

  const setRefs = (el: HTMLInputElement | null) => {
    internalRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Click en un checkbox con .indeterminate=true hace que el navegador
    // limpie automáticamente .indeterminate (toggle a checked/unchecked).
    // Si el consumer mantiene la prop indeterminate=true, lo re-aplicamos
    // para que el estado sea sticky — solo el parent decide cuándo salir.
    if (indeterminate && internalRef.current) {
      internalRef.current.indeterminate = true;
    }
    onChange?.(e);
  };

  return (
    <label
      className={cn("ig-checkbox", `ig-checkbox-${variant}`, className)}
      data-disabled={disabled ? "true" : undefined}
    >
      <input
        type="checkbox"
        disabled={disabled}
        {...rest}
        ref={setRefs}
        aria-checked={indeterminate ? "mixed" : undefined}
        onChange={handleChange}
      />
      <span className="ig-checkbox-mark" aria-hidden="true" />
      {children !== undefined && <span>{children}</span>}
    </label>
  );
}
