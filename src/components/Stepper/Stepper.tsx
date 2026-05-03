import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import type { StepProps } from "./Step";

export interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Índice (0-based) del step activo. Steps anteriores se marcan
   * completos; el de este índice lleva `aria-current="step"`.
   *
   * **Stepper es presentational**: la prop es requerida y refleja el
   * estado actual que el consumer mantenga. No hay modo "uncontrolled"
   * — si pasas un valor inicial sin actualizarlo, el stepper queda
   * congelado para siempre.
   */
  active: number;
  /** Si true, usa el layout con labels debajo (`ig-stepper-labeled`). */
  labeled?: boolean;
  /** Una lista de `Step`. */
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Stepper — secuencia visual de pasos. Steps con índice menor que `active`
 * se marcan como `complete`; el del índice `active` lleva `aria-current="step"`.
 *
 * Dos layouts:
 *   - **Compacto** (default): círculos conectados por una línea fina.
 *   - **Labeled** (`labeled`): círculos sobre labels; conector como `::after`.
 *
 * Pasa los `Step`s como children — el Stepper inyecta `index`/`active`/`complete`
 * a cada uno automáticamente.
 */
export function Stepper({
  active,
  labeled = false,
  className,
  children,
  ref,
  ...rest
}: StepperProps) {
  const steps = Children.toArray(children).filter(isValidElement);

  // 1.0.0-beta.4: aria-label del rest (HTML std) en vez de prop ariaLabel.
  const { "aria-label": ariaLabelOverride, ...divRest } = rest;

  return (
    <div
      {...divRest}
      ref={ref}
      role="group"
      aria-label={ariaLabelOverride ?? "Progreso"}
      className={cn(labeled ? "ig-stepper-labeled" : "ig-stepper", className)}
    >
      {steps.map((step, idx) => {
        const enriched = cloneElement(step as ReactElement<StepProps>, {
          index: idx + 1,
          active: idx === active,
          complete: idx < active,
          labeled,
        });
        if (labeled) return <Fragment key={idx}>{enriched}</Fragment>;
        return (
          <Fragment key={idx}>
            {enriched}
            {idx < steps.length - 1 && (
              <span
                className={cn(
                  "ig-step-line",
                  idx < active && "ig-step-line-complete",
                )}
                aria-hidden="true"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
