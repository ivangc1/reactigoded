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
  ref?: Ref<HTMLDivElement>;
}

/**
 * Props que `Stepper` inyecta a cada `Step` vía `cloneElement`. Deliberadamente
 * NO viven en `StepProps` (público) — antes de beta.25 lo estaban con marker
 * `@internal`, pero `stripInternal` las borraba de la interface emitida mientras
 * la firma de `Step({...})` seguía destructurándolas, dejando un `.d.ts`
 * autocontradictorio (codex BLOCKER 3 / Step.d.ts:28 — TS2339 contra
 * consumidores con `skipLibCheck: false`). Al sacarlas a un tipo interno que
 * NO se reexporta del barrel, el `.d.ts` público queda coherente.
 *
 * @internal
 */
export interface StepInternalProps {
  /**
   * Inyectado por `Stepper` cuando es interactivo (`onActiveChange`
   * definido). Convierte el dot en un `<button>` semántico vía
   * `role="button"` + `tabIndex` (roving) + handlers click/keydown.
   */
  interactive?: boolean;
  /**
   * Inyectado por `Stepper` cuando es interactivo. Llamado al click
   * o al activar por teclado (Enter/Space). Stepper interpreta la
   * activación y dispara `onActiveChange` con el índice 0-based.
   */
  onActivate?: () => void;
  /**
   * Inyectado por `Stepper` cuando es interactivo. Maneja
   * ArrowLeft/Right/Up/Down/Home/End para navegar entre steps.
   */
  onStepKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Step — un paso de un `Stepper`. No se usa suelto: pasa los `Step`s como
 * children del `Stepper` y este se encarga de inyectar `index`/`active`/`complete`.
 *
 * Cuando el Stepper padre es interactivo (`onActiveChange` definido),
 * el dot del Step lleva `role="button"` + `tabIndex` roving y soporta
 * activación por teclado (Enter/Space) y navegación (ArrowKey/Home/End).
  *
 * @server-safe
 */
export function Step(props: StepProps) {
  // Destructuring en el body (no en el parámetro) para que el `.d.ts` emita
  // `Step(props: StepProps)` limpio. Si estas internal estuvieran en la firma
  // del parámetro, `stripInternal` borraba la prop de `StepProps` pero
  // tsc dejaba el nombre en la firma — `Step.d.ts` autocontradictorio
  // (codex BLOCKER 3). Ver `StepInternalProps` arriba.
  const {
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
  } = props as StepProps & StepInternalProps;
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

  // data-step-index 0-based: lo usa el effect H-25 del Stepper para
  // localizar el dot a focusear sin depender del orden DOM nth-of-type
  // (robusto contra conditional rendering, Steps decorativos sin
  // role=button intercalados, o reordenamiento por CSS `order`). Es
  // implementation detail, NO API pública — un consumer no debe
  // targetear con CSS `[data-step-index]`. `index` (1-based) lo
  // inyecta el Stepper para el aria-label visible "Paso N";
  // restamos 1 para volver al índice 0-based del array.
  const dataStepIndex =
    interactive && index !== undefined ? index - 1 : undefined;

  const dot = (
    <span
      aria-current={ariaCurrent}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? (active ? 0 : -1) : undefined}
      aria-label={
        interactive && index !== undefined ? `Paso ${String(index)}` : undefined
      }
      data-step-index={dataStepIndex}
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
