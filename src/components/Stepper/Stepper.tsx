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
   * Índice (0-based) del step activo (modo controlado). Steps anteriores se
   * marcan completos. Si se omite, se usa `defaultActive`.
   */
  active?: number;
  /** Índice inicial (modo no controlado). Por defecto 0. */
  defaultActive?: number;
  /** Si true, usa el layout con labels debajo (`ig-stepper-labeled`). */
  labeled?: boolean;
  /** Texto a11y para el wrapper. */
  ariaLabel?: string;
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
  active: activeProp,
  defaultActive = 0,
  labeled = false,
  ariaLabel = "Progreso",
  className,
  children,
  ref,
  ...rest
}: StepperProps) {
  // Stepper es presentational (no muta estado interno). En modo uncontrolled
  // sólo respeta el `defaultActive` inicial; el consumer debe pasar `active`
  // si quiere reflejar progreso dinámico.
  const active = activeProp ?? defaultActive;
  const steps = Children.toArray(children).filter(isValidElement);

  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      aria-label={ariaLabel}
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
