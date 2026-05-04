import type { SelectHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";

export type SelectState = "default" | "error" | "success";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Estado de validación visual. */
  state?: SelectState;
  /**
   * IDs de elementos descriptivos (`Helper`/`ErrorText`) combinados en
   * `aria-describedby`. Acepta un id o lista de ids. Si pasas también
   * `aria-describedby` directo (vía rest), AMBOS se concatenan.
   */
  describedBy?: string | string[];
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Select — `<select>` nativo estilizado. Pasa `<option>` como children.
 *
 * **Limitación de plataforma**: la apariencia depende de
 * `appearance: none` + un caret SVG inyectado en CSS. Cubre Chrome,
 * Firefox, Safari y Edge modernos (los del browserslist). En motores
 * antiguos sin soporte de `appearance: none` el `<select>` cae al chrome
 * nativo del navegador (caret nativo, sin el icono igoded). El menú de
 * opciones siempre lo pinta el sistema operativo — la librería no
 * intenta reemplazarlo (un combobox custom requeriría un componente
 * separado, fuera del alcance del DS).
 *
 * @example
 * <Select value={country} onChange={(e) => setCountry(e.target.value)}>
 *   <option value="es">España</option>
 *   <option value="mx">México</option>
 *   <option value="ar">Argentina</option>
 * </Select>
 * <Select state="error" describedBy={errorId}>
 *   <option value="">Selecciona…</option>
 * </Select>
 */
export function Select({
  state = "default",
  describedBy,
  className,
  children,
  ref,
  ...rest
}: SelectProps) {
  const { "aria-describedby": ariaDescribedByNative, ...selectRest } = rest;
  const describedByValue = mergeDescribedBy(ariaDescribedByNative, describedBy);
  return (
    <select
      {...selectRest}
      ref={ref}
      className={cn(
        "ig-select",
        state === "error" && "ig-input-error",
        state === "success" && "ig-input-success",
        className,
      )}
      aria-invalid={state === "error" ? true : undefined}
      aria-describedby={describedByValue}
    >
      {children}
    </select>
  );
}
