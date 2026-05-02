import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";

export type InputSize = "sm" | "md" | "lg";
export type InputState = "default" | "error" | "success";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Tamaño del input. `md` no añade clase. */
  size?: InputSize;
  /** Estado de validación visual. `error` y `success` aplican color y borde. */
  state?: InputState;
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
  describedBy?: string | string[];
  ref?: Ref<HTMLInputElement>;
}

/**
 * Input — `<input>` estilizado con tamaños y estados de validación visual.
 * Acepta cualquier `type` válido de input nativo. Para enlazar `Helper` y
 * `ErrorText` a tecnologías asistivas, pasa sus `id` en `describedBy`.
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

  return (
    <input
      {...inputRest}
      ref={ref}
      className={cn(
        "ig-input",
        size !== "md" && `ig-input-${size}`,
        state === "error" && "ig-input-error",
        state === "success" && "ig-input-success",
        className,
      )}
      aria-invalid={state === "error" ? true : undefined}
      aria-describedby={describedByValue}
    />
  );
}
