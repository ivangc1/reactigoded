"use client";

import {
  useCallback,
  useRef,
  type Ref,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";
import { useA11yWarnInput } from "@/utils/useA11yWarnInput";

export type NativeSelectState = "default" | "invalid" | "valid";

export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Estado de validación visual. */
  state?: NativeSelectState | undefined;
  /**
   * IDs de elementos descriptivos (`Helper`/`ErrorText`) combinados en
   * `aria-describedby`. Acepta un id o lista de ids. Si pasas también
   * `aria-describedby` directo (vía rest), AMBOS se concatenan.
   */
  describedBy?: string | string[] | undefined;
  ref?: Ref<HTMLSelectElement> | undefined;
}

/**
 * NativeSelect — `<select>` nativo estilizado. Pasa `<option>` como children.
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
 * **A11y dev warn**: si en desarrollo se monta sin `<Label htmlFor>`,
 * `aria-label` ni `aria-labelledby`, se emite warn
 * `[reactigoded] <NativeSelect> sin label asociado.` (capa 1.1 debt doc).
 * Nota: `<select>` no tiene `placeholder`.
 *
 * @example
 * <NativeSelect value={country} onChange={(e) => setCountry(e.target.value)}>
 *   <option value="es">España</option>
 *   <option value="mx">México</option>
 *   <option value="ar">Argentina</option>
 * </NativeSelect>
 * <NativeSelect state="invalid" describedBy={errorId}>
 *   <option value="">Selecciona…</option>
 * </NativeSelect>
 */
export function NativeSelect({
  state = "default",
  describedBy,
  className,
  children,
  ref,
  ...rest
}: NativeSelectProps) {
  const { "aria-describedby": ariaDescribedByNative, ...selectRest } = rest;
  const describedByValue = mergeDescribedBy(ariaDescribedByNative, describedBy);

  const internalRef = useRef<HTMLSelectElement>(null);
  useA11yWarnInput(internalRef, "NativeSelect");
  const setRefs = useCallback(
    (el: HTMLSelectElement | null) => {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <select
      {...selectRest}
      ref={setRefs}
      className={cn(
        "ig-native-select",
        state === "invalid" && "ig-input-invalid",
        state === "valid" && "ig-input-valid",
        className,
      )}
      aria-invalid={state === "invalid" ? true : undefined}
      aria-describedby={describedByValue}
    >
      {children}
    </select>
  );
}
