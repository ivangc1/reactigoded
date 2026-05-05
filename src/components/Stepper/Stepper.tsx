import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
  type HTMLAttributes,
  type KeyboardEvent,
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
   * **Stepper es presentational por defecto**: la prop es requerida y
   * refleja el estado actual que el consumer mantenga. No hay modo
   * "uncontrolled" — si pasas un valor inicial sin actualizarlo, el
   * stepper queda congelado para siempre.
   *
   * Cuando se pasa `onActiveChange`, el Stepper se vuelve **interactive**
   * (focus + keyboard nav). Sigue siendo el consumer quien aplica el
   * cambio actualizando esta prop.
   */
  active: number;
  /**
   * Callback cuando el usuario navega o activa por teclado / click.
   * Si está definido, el Stepper entra en **modo interactive**:
   * - Cada step lleva `role="button"` + `tabIndex` roving.
   * - ArrowLeft / ArrowUp → step anterior.
   * - ArrowRight / ArrowDown → step siguiente.
   * - Home → primer step.
   * - End → último step.
   * - Enter / Space → activa el step focuseado.
   *
   * El callback recibe el índice 0-based del step destino. El consumer
   * decide si lo aplica (puede rechazar saltos hacia adelante en un
   * wizard, p.ej.).
   */
  onActiveChange?: (next: number) => void;
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
 *
 * **Modo interactive** (cuando `onActiveChange` está definido):
 * cada step es focuseable con roving tabIndex y soporta teclado completo
 * (ArrowKey, Home/End, Enter/Space). Patrón inspirado en WAI-ARIA APG
 * Tabs adaptado a stepper. El consumer es quien finalmente aplica el
 * cambio actualizando `active`.
 *
 * @example
 * // Presentational (sin keyboard nav, default)
 * <Stepper active={2}>
 *   <Step label="Paso 1" />
 *   <Step label="Paso 2" />
 *   <Step label="Paso 3" />
 * </Stepper>
 *
 * @example
 * // Interactive (teclado completo)
 * const [step, setStep] = useState(0);
 * <Stepper active={step} onActiveChange={setStep} labeled>
 *   <Step label="Datos" />
 *   <Step label="Pago" />
 *   <Step label="Confirmar" />
 * </Stepper>
 */
export function Stepper({
  active,
  onActiveChange,
  labeled = false,
  className,
  children,
  ref,
  ...rest
}: StepperProps) {
  const steps = Children.toArray(children).filter(isValidElement);
  const interactive = onActiveChange !== undefined;

  // 1.0.0-beta.4: aria-label del rest (HTML std) en vez de prop ariaLabel.
  const { "aria-label": ariaLabelOverride, ...divRest } = rest;

  const handleStepKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!interactive) return;
      const lastIdx = steps.length - 1;
      let nextIdx = -1;
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
          nextIdx = active > 0 ? active - 1 : lastIdx;
          break;
        case "ArrowRight":
        case "ArrowDown":
          nextIdx = active < lastIdx ? active + 1 : 0;
          break;
        case "Home":
          nextIdx = 0;
          break;
        case "End":
          nextIdx = lastIdx;
          break;
        default:
          return;
      }
      event.preventDefault();
      onActiveChange(nextIdx);
      // Mover foco al nuevo active después del rerender. Localizamos el
      // wrapper desde el dot focuseado (event.currentTarget) vía
      // closest — evita mantener un ref propio + merge con el ref del
      // prop. setTimeout(0) garantiza que el focus ocurra tras el
      // commit de React (el rerender ya actualizó los tabIndex roving).
      const wrapper = event.currentTarget.closest(
        ".ig-stepper, .ig-stepper-labeled",
      );
      setTimeout(() => {
        const dots = wrapper?.querySelectorAll<HTMLElement>(
          '.ig-step[role="button"]',
        );
        dots?.[nextIdx]?.focus();
      }, 0);
    },
    [active, interactive, onActiveChange, steps.length],
  );

  const handleActivate = useCallback(
    (idx: number) => {
      if (!interactive) return;
      if (idx === active) return;
      onActiveChange(idx);
    },
    [active, interactive, onActiveChange],
  );

  return (
    <div
      {...divRest}
      ref={ref}
      role="group"
      aria-label={ariaLabelOverride ?? "Progreso"}
      className={cn(labeled ? "ig-stepper-labeled" : "ig-stepper", className)}
    >
      {steps.map((step, idx) => {
        // En modo presentational omitimos los handlers (no los pasamos
        // como `undefined`) por exactOptionalPropertyTypes.
        const interactiveProps: Partial<StepProps> = interactive
          ? {
              onActivate: () => {
                handleActivate(idx);
              },
              onStepKeyDown: handleStepKeyDown,
            }
          : {};
        const enriched = cloneElement(step as ReactElement<StepProps>, {
          index: idx + 1,
          active: idx === active,
          complete: idx < active,
          labeled,
          interactive,
          ...interactiveProps,
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
