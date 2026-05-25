"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import {
  SUPPRESS_NO_HANDLER_WARN,
  useControllableState,
} from "@/hooks/useControllableState";
import type { StepInternalProps, StepProps } from "./Step";

export interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Índice (0-based) del step activo en **modo controlled**. Steps
   * anteriores se marcan completos; el de este índice lleva
   * `aria-current="step"`.
   *
   * **D5 (beta.24)**: `active` ahora es opcional. Patrón controlled/
   * uncontrolled DS-wide alineado con Pagination, Sidebar, Tabs,
   * Switch, Accordion:
   *
   *   - Pasas `active` → controlled. Tu app gestiona el estado y este
   *     debe actualizarse en respuesta a `onActiveChange`. Si lo dejas
   *     congelado, el Stepper se queda congelado (consciente).
   *   - Omites `active` (y opcionalmente pasas `defaultActive`) →
   *     uncontrolled. El Stepper mantiene su propio estado interno y
   *     `onActiveChange` actúa como observer (callback opcional).
   *
   * En modo controlled SIN `onActiveChange` el Stepper queda
   * presentational (sin keyboard nav ni clicks activos). En modo
   * uncontrolled siempre es interactive — `defaultActive` solo describe
   * el valor inicial; sin un mecanismo para mutarlo el componente sería
   * un display estático sin razón de ser.
   */
  active?: number;
  /**
   * Valor inicial en **modo uncontrolled** (cuando `active` es
   * undefined). Por defecto `0`. Ignorado en modo controlled.
   */
  defaultActive?: number;
  /**
   * Callback cuando el usuario navega o activa por teclado / click.
   * Dispara en ambos modos:
   *
   *   - **Controlled** (`active` definido): el callback es el único
   *     mecanismo para que el consumer actualice `active`. Si está
   *     omitido en controlled, el Stepper queda presentational
   *     (consumer no puede observar cambios → sin sentido habilitar
   *     interactive).
   *   - **Uncontrolled** (`active` undefined): el callback actúa como
   *     observer. El Stepper actualiza su estado interno aunque el
   *     consumer no pase callback.
   *
   * Interactive mode (focus + keyboard nav):
   * - Cada step lleva `role="button"` + `tabIndex` roving.
   * - ArrowLeft / ArrowUp → step anterior.
   * - ArrowRight / ArrowDown → step siguiente.
   * - Home → primer step.
   * - End → último step.
   * - Enter / Space → activa el step focuseado.
   *
   * El callback recibe el índice 0-based del step destino. En modo
   * controlled el consumer decide si lo aplica (puede rechazar saltos
   * hacia adelante en un wizard, p.ej.).
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
  defaultActive,
  onActiveChange,
  labeled = false,
  className,
  children,
  ref,
  ...rest
}: StepperProps) {
  const steps = Children.toArray(children).filter(isValidElement);
  const stepCount = steps.length;
  const isControlled = active !== undefined;

  // Interactive mode:
  // - Controlled + onActiveChange → interactive (consumer aplica
  //   transiciones via su state).
  // - Uncontrolled → interactive (estado interno + opcional observer
  //   `onActiveChange`).
  // - Controlled SIN onActiveChange → presentational. Sin callback el
  //   consumer no puede aplicar la transición; habilitar keyboard nav
  //   sería confuso (focus se moverá visualmente pero nada cambia).
  const interactive = !isControlled || onActiveChange !== undefined;

  // D5 (beta.24): wiring controlled/uncontrolled estándar DS-wide.
  // - Controlled (`active` definido): forward a `onActiveChange` igual
  //   que antes, consumer responsable de la transición.
  // - Uncontrolled (`active` undefined): estado interno gestionado por
  //   `useControllableState`, `onActiveChange` actúa como observer.
  //
  // Codex P2 sobre PR #85: `useControllableState` emite dev-warn de
  // "controlled without onChange" cuando `value` está definido sin
  // `onChange`. Para Stepper esto es un falso positivo en modo
  // controlled-presentational legítimo (`<Stepper active={1}>` sin
  // callback → display estático sin interactividad, decisión
  // consciente del consumer, no UI bloqueada). Suprimimos el warn
  // exactamente en ese caso usando el escape hatch Symbol-keyed
  // (C-07). Mismo patrón que Rating (readOnly) y Switch.
  const isPresentationalControlled = isControlled && !interactive;
  const { value: rawActive, setValue: setActive } = useControllableState<number>(
    {
      value: active,
      defaultValue: defaultActive ?? 0,
      onChange: onActiveChange,
      [SUPPRESS_NO_HANDLER_WARN]: isPresentationalControlled,
    },
  );

  // B-05 (gate review): clamp `active` (controlled o internal) a un
  // índice válido. Sin esto, valores fuera de rango (active=999, -1,
  // NaN) hacían que ningún Step recibiera `active=true` → todos
  // `tabIndex=-1` → tablist sin tab stop → keyboard inaccessible.
  // Patrón Pagination/Slider del propio DS: cálculo puro + dev warn
  // separado en useEffect.
  const clampedActive = useMemo(() => {
    if (stepCount === 0) return 0;
    const lastIdx = stepCount - 1;
    if (!Number.isFinite(rawActive)) return 0;
    if (rawActive < 0) return 0;
    if (rawActive > lastIdx) return lastIdx;
    return rawActive;
  }, [rawActive, stepCount]);

  // D5 codex P2 round 2 (sobre `8a35b8f`) + codex P1 round 3 (sobre
  // `138c032`): persistir el clamp al estado interno cuando
  // `stepCount` se reduce en modo uncontrolled. Sin esto, `rawActive`
  // queda stale (el clamp visual solo afecta el render, no el state
  // committed). Si el consumer remueve steps dinámicamente y luego
  // los re-añade, el componente "resurrecta" al índice viejo en lugar
  // de mantenerse en el último visible.
  //
  // El clamp NO es una interacción del usuario — es sincronización
  // forzada por cambio de prop (stepCount). Por eso usamos
  // `setActive(..., { silent: true })`: actualiza el state interno
  // sin disparar `onActiveChange` (que está reservado para
  // interacciones reales). Esto cierra los dos vectores:
  //
  //   - Codex P1 round 3: render-time `setActive(...)` SIN `silent`
  //     invocaba `onActiveChange` durante render. Si el consumer hace
  //     setState en su parent dentro del callback → warning Strict
  //     Mode + re-render duplicado.
  //   - Patrón canónico React docs "Resetting state when a prop
  //     changes": render-time reset es correcto si el setter solo
  //     toca state interno. La `silent` flag del hook
  //     `useControllableState` está diseñada exactamente para esto
  //     (auto-selects internos, rehidrataciones desde storage, y
  //     ahora prop-driven sync).
  //
  // Solo aplica en uncontrolled — en controlled el consumer es dueño
  // del valor y debe sincronizarlo con stepCount externamente.
  // https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
  const [prevStepCount, setPrevStepCount] = useState(stepCount);
  if (prevStepCount !== stepCount) {
    setPrevStepCount(stepCount);
    if (!isControlled && stepCount > 0 && rawActive > stepCount - 1) {
      setActive(stepCount - 1, { silent: true });
    }
  }

  // Dev warn diferenciado, solo una vez por componente. Patrón Slider:
  // `import.meta.env.DEV` (Vite, sin Node types) + warnedRef para no
  // spamear el mismo warn en re-renders. Side effect aislado en
  // useEffect, no dentro de render/useMemo.
  //
  // El warn aplica solo en modo controlled — en uncontrolled, los
  // valores out-of-range no pueden llegar (`setActive` siempre recibe
  // un idx válido del propio Stepper). Si igual ocurriera por un
  // `defaultActive` inválido (consumer pasa `defaultActive={999}`),
  // el clamp aplica silenciosamente al inicial — sin warn, es
  // configuración estática, no un bug recurrente que vale spam de
  // consola.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!isControlled) return;
    if (warnedRef.current) return;
    if (stepCount === 0) return;
    const lastIdx = stepCount - 1;
    if (!Number.isFinite(active)) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Stepper active=${JSON.stringify(active)}> no es un número finito; usando 0.`,
      );
    } else if (active < 0) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Stepper active=${String(active)}> < 0; clamping a 0.`,
      );
    } else if (active > lastIdx) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Stepper active=${String(active)}> > ${String(lastIdx)} (último step); clamping a ${String(lastIdx)}.`,
      );
    }
  }, [active, isControlled, stepCount]);

  // 1.0.0-beta.4: aria-label del rest (HTML std) en vez de prop ariaLabel.
  const { "aria-label": ariaLabelOverride, ...divRest } = rest;

  // H-25 (beta.22): focus management sin setTimeout suelto.
  // - rootRef: ref interno al wrapper para localizar dots tras rerender.
  // - focusTargetIdxRef: marca el step que el siguiente useEffect debe
  //   focusear post-commit. Se setea en el handler de teclado y se
  //   limpia en el effect.
  // El effect dispara cuando cambia `active` (la prop la mueve el
  // consumer tras `onActiveChange`), garantizando que el focus ocurre
  // DESPUÉS del rerender que actualizó los `tabIndex` roving.
  const rootRef = useRef<HTMLDivElement>(null);
  const focusTargetIdxRef = useRef<number | null>(null);

  useEffect(() => {
    if (focusTargetIdxRef.current === null) return;
    const idx = focusTargetIdxRef.current;
    focusTargetIdxRef.current = null;
    // Codex P1 post-audit sobre PR #19: si el consumer rechaza la
    // transición (no actualiza `active`), clampedActive no cambia y
    // este effect no fire — pero el ref queda apuntando al idx
    // rechazado. Posteriormente, cuando el padre SÍ commitea una
    // transición distinta (ej. un set programático de active), el
    // effect fire con el ref stale y movería focus al idx ANTIGUO.
    // Guard: solo movemos focus si el idx solicitado coincide con
    // el clampedActive committed. Si no coincide, el padre rechazó
    // o cambió la transición — abortamos para mantener focus
    // sincronizado con el active real.
    if (idx !== clampedActive) return;
    // data-step-index resuelve por índice lógico, no por orden DOM —
    // robusto contra conditional rendering, Steps decorativos sin
    // role=button intercalados o CSS reordering. Step.tsx inyecta el
    // atributo a partir del prop `index` (1-based) que Stepper envía
    // vía cloneElement.
    const target = rootRef.current?.querySelector<HTMLElement>(
      `.ig-step[role="button"][data-step-index="${String(idx)}"]`,
    );
    target?.focus();
  }, [clampedActive]);

  const handleStepKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!interactive) return;
      const lastIdx = stepCount - 1;
      // Codex P2 sobre PR antiguo: el cómputo de nextIdx debe partir
      // del step que TIENE FOCUS, no del `clampedActive` (la prop que
      // el consumer maneja). Cuando focus y active divergen — el
      // parent rechaza onActiveChange por validación, lo aplica
      // async, o el user mueve focus con Tab manualmente sin que
      // active cambie — usar `clampedActive` deja al user atrapado:
      // pulsar arrow desde un step distinto del active devuelve
      // active±1 y termina llamando `onActiveChange` con el mismo
      // destino una y otra vez.
      //
      // El index 0-based se lee desde `data-step-index` que Step.tsx
      // inyecta en cada dot interactive. Si el atributo no existe o
      // no parsea (defensivo, no debería pasar en interactive mode),
      // caemos a `clampedActive` como fallback.
      const datasetIdx = Number(event.currentTarget.dataset["stepIndex"]);
      const fromIdx =
        Number.isInteger(datasetIdx) && datasetIdx >= 0 && datasetIdx <= lastIdx
          ? datasetIdx
          : clampedActive;
      let nextIdx = -1;
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
          nextIdx = fromIdx > 0 ? fromIdx - 1 : lastIdx;
          break;
        case "ArrowRight":
        case "ArrowDown":
          nextIdx = fromIdx < lastIdx ? fromIdx + 1 : 0;
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
      // Marca intent de focus; el effect post-commit lo aplicará
      // cuando React termine de actualizar los tabIndex roving.
      focusTargetIdxRef.current = nextIdx;
      // D5: `setActive` resuelve a (a) controlled → forward a
      // onActiveChange; (b) uncontrolled → actualizar state interno
      // + dispatch a onActiveChange como observer. Mismo callsite,
      // ambos modos.
      setActive(nextIdx);
    },
    [clampedActive, interactive, setActive, stepCount],
  );

  const handleActivate = useCallback(
    (idx: number) => {
      if (!interactive) return;
      if (idx === clampedActive) return;
      setActive(idx);
    },
    [clampedActive, interactive, setActive],
  );

  // Callback ref que combina rootRef interno (focus management H-25) con
  // el ref opcional del consumer. useCallback ESTABILIZA la identidad
  // del callback entre renders — sin él, cada render dispararía
  // cleanup+rewrite del ref por React, lo cual es importante en
  // Stepper porque el useEffect H-25 LEE rootRef.current y necesita
  // que esté escrito sólo en mount/unmount, no en cada render.
  // (Checkbox y Switch usan el mismo patrón sin useCallback — invisible
  // allí porque nunca leen el ref. Apuntado en POST_RC1_BACKLOG.md
  // para alinear esos dos al patrón de Stepper post-RC1.)
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  return (
    <div
      {...divRest}
      ref={setRefs}
      role="group"
      aria-label={ariaLabelOverride ?? "Progreso"}
      className={cn(labeled ? "ig-stepper-labeled" : "ig-stepper", className)}
    >
      {/* eslint-disable-next-line react-hooks/refs -- la regla experimental marca useCallback que captura refs por riesgo de stale capture en closures persistentes. Para merge-refs es falso positivo: el callback solo escribe a refs en commit, no lee .current ni se pasa a hijos memoizados. Checkbox.tsx:65 y Switch.tsx:110 implementan el mismo patrón sin useCallback (callback inline) y por eso no disparan la regla — la diferencia es estilística, no funcional. */}
      {steps.map((step, idx) => {
        // En modo presentational omitimos los handlers (no los pasamos
        // como `undefined`) por exactOptionalPropertyTypes.
        const interactiveProps: Partial<StepInternalProps> = interactive
          ? {
              onActivate: () => {
                handleActivate(idx);
              },
              onStepKeyDown: handleStepKeyDown,
            }
          : {};
        const enriched = cloneElement(
          step as ReactElement<StepProps & StepInternalProps>,
          {
            index: idx + 1,
            active: idx === clampedActive,
            complete: idx < clampedActive,
            labeled,
            interactive,
            ...interactiveProps,
          },
        );
        if (labeled) return <Fragment key={idx}>{enriched}</Fragment>;
        return (
          <Fragment key={idx}>
            {enriched}
            {idx < stepCount - 1 && (
              <span
                className={cn(
                  "ig-step-line",
                  idx < clampedActive && "ig-step-line-complete",
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
