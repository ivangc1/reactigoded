"use client";

import {
  useCallback,
  useRef,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";
import { useA11yWarnInput } from "@/utils/useA11yWarnInput";

export type InputSize = "sm" | "md" | "lg";
export type InputState = "default" | "invalid" | "valid";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Tamaño del input. `md` no añade clase. */
  size?: InputSize | undefined;
  /**
   * Estado de validación visual. `invalid` y `valid` aplican color, borde y
   * `aria-invalid`; `default` no añade clase.
   *
   * Si pasas un valor fuera de la unión desde JS sin tipos (por ejemplo los
   * antiguos `"error"`/`"success"`), **no hay error visible en ningún canal**:
   * no se aplica clase de estado, no se emite `aria-invalid` y no se avisa por
   * consola — el input queda igual que si no pasaras `state`.
   */
  state?: InputState | undefined;
  /**
   * IDs de elementos descriptivos (típicamente `Helper`/`ErrorText`) que se
   * combinan en `aria-describedby`. Acepta un id o lista de ids.
   *
   * Si pasas también `aria-describedby` directo (vía rest), AMBOS se
   * concatenan en el atributo final — desde `1.0.0-beta.3`.
   *
   * @example
   * const helperId = useId();
   * const errorId = useId();
   * <Input describedBy={[helperId, errorId]} ... />
   * <Helper id={helperId}>...</Helper>
   * <ErrorText id={errorId}>...</ErrorText>
   */
  describedBy?: string | string[] | undefined;
  ref?: Ref<HTMLInputElement> | undefined;
}

/**
 * Input — `<input>` estilizado con tamaños y estados de validación visual.
 * Acepta cualquier `type` válido de input nativo. Para enlazar `Helper` y
 * `ErrorText` a tecnologías asistivas, pasa sus `id` en `describedBy`.
 *
 * **A11y dev warn**: si en desarrollo se monta sin `<Label htmlFor>`,
 * `aria-label`, `aria-labelledby` ni `placeholder`, se emite warn
 * `[reactigoded] <Input> sin label asociado.` (capa 1.1 debt doc).
 */
export function Input({
  size = "md",
  state = "default",
  describedBy,
  className,
  ref,
  ...rest
}: InputProps) {
  const { "aria-describedby": ariaDescribedByNative, ...inputRest } = rest;
  const describedByValue = mergeDescribedBy(ariaDescribedByNative, describedBy);

  const internalRef = useRef<HTMLInputElement>(null);
  useA11yWarnInput(internalRef, "Input");
  // setRefs estabilizado con useCallback — patrón canónico del DS
  // (Stepper, Checkbox, Switch). Permite mantener un ref interno
  // (para el hook a11y) sin perder el ref del consumer.
  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <input
      {...inputRest}
      ref={setRefs}
      className={cn(
        "ig-input",
        size !== "md" && `ig-input-${size}`,
        state === "invalid" && "ig-input-invalid",
        state === "valid" && "ig-input-valid",
        className,
      )}
      aria-invalid={state === "invalid" ? true : undefined}
      aria-describedby={describedByValue}
    />
  );
}
