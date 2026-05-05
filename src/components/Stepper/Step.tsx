import type { HTMLAttributes, KeyboardEvent, ReactNode, Ref } from "react";
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
  /**
   * Inyectado por `Stepper` cuando es interactivo (`onActiveChange`
   * definido). Convierte el dot en un `<button>` semántico vía
   * `role="button"` + `tabIndex` (roving) + handlers click/keydown.
   * @internal
   */
  interactive?: boolean;
  /**
   * Inyectado por `Stepper` cuando es interactivo. Llamado al click
   * o al activar por teclado (Enter/Space). Stepper interpreta la
   * activación y dispara `onActiveChange` con el índice 0-based.
   * @internal
   */
  onActivate?: () => void;
  /**
   * Inyectado por `Stepper` cuando es interactivo. Maneja
   * ArrowLeft/Right/Up/Down/Home/End para navegar entre steps.
   * @internal
   */
  onStepKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Step — un paso de un `Stepper`. No se usa suelto: pasa los `Step`s como
 * children del `Stepper` y este se encarga de inyectar `index`/`active`/`complete`.
 *
 * Cuando el Stepper padre es interactivo (`onActiveChange` definido),
 * el dot del Step lleva `role="button"` + `tabIndex` roving y soporta
 * activación por teclado (Enter/Space) y navegación (ArrowKey/Home/End).
 */
export function Step({
  label,
  index,
  active = false,
  complete = false,
  labeled = false,
  interactive = false,
  onActivate,
  onStepKeyDown,
  className,
  ref,
  ...rest
}: StepProps) {
  const ariaCurrent = active ? "step" : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!interactive) return;
    // Activación por teclado: Enter/Space sigue patrón WAI-ARIA APG
    // para botones custom (role="button" en elementos no nativamente
    // interactivos).
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate?.();
      return;
    }
    // Navegación entre steps delegada al Stepper, que conoce la lista.
    onStepKeyDown?.(event);
  };

  const dot = (
    <span
      aria-current={ariaCurrent}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? (active ? 0 : -1) : undefined}
      aria-label={
        interactive && index !== undefined ? `Paso ${String(index)}` : undefined
      }
      onClick={interactive ? onActivate : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      className={cn(
        "ig-step",
        active && "ig-step-active",
        complete && "ig-step-complete",
        interactive && "ig-step-interactive",
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
