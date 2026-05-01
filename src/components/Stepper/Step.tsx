import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/utils/cn";

export interface StepProps extends HTMLAttributes<HTMLDivElement> {
  /** Etiqueta debajo del círculo (sólo aplica con `Stepper labeled`). */
  label?: ReactNode;
  /**
   * Índice (1-based) que se muestra dentro del círculo. Lo inyecta el `Stepper`
   * automáticamente — no lo pases manualmente.
   */
  index?: number;
  /** Inyectado por `Stepper`. Marca el step actual. */
  active?: boolean;
  /** Inyectado por `Stepper`. Marca el step como completado. */
  complete?: boolean;
  /** Inyectado por `Stepper` cuando usa layout labeled. */
  labeled?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Step — un paso de un `Stepper`. No se usa suelto: pasa los `Step`s como
 * children del `Stepper` y este se encarga de inyectar `index`/`active`/`complete`.
 */
export function Step({
  label,
  index,
  active = false,
  complete = false,
  labeled = false,
  className,
  ref,
  ...rest
}: StepProps) {
  const ariaCurrent = active ? "step" : undefined;
  const dot = (
    <span
      aria-current={ariaCurrent}
      className={cn(
        "ig-step",
        active && "ig-step-active",
        complete && "ig-step-complete",
      )}
    >
      {complete ? "✓" : index}
    </span>
  );

  if (labeled) {
    return (
      <div
        {...rest}
        ref={ref}
        className={cn(
          "ig-step-item",
          active && "ig-step-active",
          complete && "ig-step-complete",
          className,
        )}
      >
        {dot}
        {label !== undefined && <span className="ig-step-label">{label}</span>}
      </div>
    );
  }

  return (
    <div {...rest} ref={ref} className={className}>
      {dot}
    </div>
  );
}
