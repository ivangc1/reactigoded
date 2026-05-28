import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from "react";
import { cn } from "@/utils/cn";
import { composeRefs } from "./composeRefs";
import { composeEventHandlers } from "./composeEventHandlers";

/**
 * Props del `<Slot>` primitive.
 *
 * - `children`: el elemento React a clonar. Debe ser **exactamente UN
 *   elemento concreto** — no Fragment, no array, no string, no null.
 *   Validación en runtime con error dev (silencioso en prod).
 * - Cualquier otra prop (className, style, ref, onClick, aria-*, data-*,
 *   etc.): se mergea con las props del child siguiendo D14 §"Patrón Slot
 *   — diseño del primitive":
 *     - `className`: `cn(slot, child)` — child override en cascade CSS.
 *     - `style`: shallow merge, child wins en colisiones de keys.
 *     - `ref`: `composeRefs(slot, child)` — ambos refs reciben el node.
 *     - Event handlers (`/^on[A-Z]/`): `composeEventHandlers(child, slot)`
 *       — child primero, slot solo si no fue `preventDefault`-ado.
 *     - Resto: slot provee default, child override.
 *
 * @internal — no exportado al consumer. Power de los `asChild` props
 *   de DialogTrigger/DialogClose/AlertDialogClose/MenuTrigger/Tooltip.
 */
export interface SlotProps {
  children: ReactNode;
  // `| undefined` explícito para `exactOptionalPropertyTypes: true`. Los
  // wrappers asChild (DialogClose, DialogTrigger, etc.) frecuentemente
  // pasan `className={consumerClassName}` donde el value puede ser
  // undefined. Sin `| undefined` aquí, cada wrapper tendría que hacer
  // spread condicional (`...(x ? { x } : {})`) — ruido innecesario en
  // 4 components.
  className?: string | undefined;
  style?: CSSProperties | undefined;
  ref?: Ref<HTMLElement> | undefined;
  // Index signature for arbitrary props (event handlers, aria-*, data-*,
  // role, etc.). Unknown type forces explicit narrowing en el merge.
  [key: string]: unknown;
}

/**
 * `<Slot>` — primitive de composición asChild.
 *
 * Recibe exactamente UN React element como child, lo clona y mergea
 * sus props con las del slot. Es el motor detrás de los `asChild` props
 * de los componentes del DS:
 *
 * ```tsx
 * // Lo que el consumer escribe:
 * <DialogClose asChild>
 *   <Button variant="brand">Aceptar</Button>
 * </DialogClose>
 *
 * // Lo que DialogClose hace internamente (Bloque B):
 * function DialogClose({ asChild, children, ...slotProps }) {
 *   if (asChild) {
 *     return <Slot {...slotProps}>{children}</Slot>;
 *   }
 *   return <button {...slotProps}>{children}</button>;
 * }
 * ```
 *
 * **Edge cases** (cobertura completa en Slot.test.tsx):
 *
 * 1. `<React.Fragment>` como child → dev error + render `null` en prod.
 *    Sin auto-unwrap del primer-child del Fragment (ambigüedad con 0 ó 2+
 *    children). Mismo patrón que Radix Slot.
 *
 * 2. Múltiples children → dev error + render primer valid element en
 *    prod (fail-soft, no crashea consumer).
 *
 * 3. Child con ref propio → `composeRefs` distribuye node a ambos
 *    (slot ref + child.props.ref).
 *
 * 4. Event handlers: **child handler primero** (consumer's existing).
 *    Slot handler corre solo si consumer no llamó `preventDefault`.
 *    Patrón canónico Radix. Permite al consumer abortar el library
 *    behavior con `preventDefault()` en su handler.
 *
 * 5. `null`/`false`/`undefined` child (conditional render) → dev warn
 *    + render `null`. Caso típico: `<Trigger asChild>{cond && <X/>}</Trigger>`.
 *
 * 6. Nested Slot → emerge naturalmente del cloneElement chain.
 *    Requiere que componentes intermedios (Tooltip, etc.) USEN Slot
 *    internamente y acepten `...rest` para forwarding — ver Bloque C.
 *
 * 7. Props aria-* / data-* / role → slot provee default, child override.
 *
 * 8. Polymorphic `as` prop → **out of scope** (sigue M-01 deferred).
 *    Slot cubre el 80% de casos donde se quería `as`.
 *
 * @internal — solo usado por components del DS via `asChild` opt-in.
 * @server-safe — solo `cloneElement` + `Children` + JSX, sin accesos
 *   a client globals (no DOM, no window, no eventos directos).
 */
export function Slot({
  children,
  ...slotProps
}: SlotProps): ReactElement | null {
  // Conditional render: null/false/undefined child es uso legítimo
  // (consumer hace `{condition && <X/>}`). Dev warn pero NO error;
  // render nothing.
  if (children == null || children === false) {
    if (import.meta.env.DEV) {
      console.warn(
        "[reactigoded] <Slot> received a null/false child. " +
          "This often happens with conditional rendering: " +
          "`<MyTrigger asChild>{cond && <Button/>}</MyTrigger>`. " +
          "Slot renders nothing.",
      );
    }
    return null;
  }

  // Fragment como child: error en dev (no auto-unwrap ambiguo);
  // render null en prod.
  if (isValidElement(children) && children.type === Fragment) {
    if (import.meta.env.DEV) {
      console.error(
        "[reactigoded] <Slot> received a React.Fragment as its child. " +
          "Slot needs a single concrete element (e.g., <Button>, <a>, " +
          "<button>). Replace <>...</> with a single element wrapper.",
      );
    }
    return null;
  }

  // Múltiples children: error en dev; primer valid element en prod.
  const count = Children.count(children);
  if (count > 1) {
    if (import.meta.env.DEV) {
      console.error(
        `[reactigoded] <Slot> expects exactly 1 child element; received ${String(count)}. ` +
          "Wrap multiple children in a single parent element (e.g., <div>).",
      );
    }
    const arr = Children.toArray(children);
    const firstValid = arr.find(isValidElement);
    if (!firstValid) return null;
    return mergeAndClone(firstValid, slotProps);
  }

  // Caso normal: single valid element.
  if (!isValidElement(children)) {
    if (import.meta.env.DEV) {
      console.error(
        "[reactigoded] <Slot> received an invalid child " +
          `(typeof: ${typeof children}). Slot needs a single concrete ` +
          "React element (e.g., <Button>, <a>, <button>).",
      );
    }
    return null;
  }

  return mergeAndClone(children, slotProps);
}

/**
 * Merge slot props con child.props per D14 reglas. Devuelve cloneElement
 * con las props mergeadas.
 *
 * Reglas en orden de chequeo (per key):
 *   1. `className` → `cn(slot, child)`. cn maneja undefined/falsy.
 *   2. `style` → shallow merge `{...slot, ...child}` (child wins en colisiones).
 *   3. `ref` → `composeRefs(slot, child)`. Ambos refs reciben el node.
 *   4. Event handler (key match `/^on[A-Z]/` y ambos values function) →
 *      `composeEventHandlers(child, slot)`. Child primero, slot si no
 *      prevented.
 *   5. Default → child wins (consumer's value).
 *
 * Si una key existe solo en slot, slot.value se mantiene (slot provee
 * default). Si existe solo en child, child.value se mantiene (consumer
 * lo configuró explícitamente).
 */
function mergeAndClone(
  child: ReactElement,
  slotProps: Record<string, unknown>,
): ReactElement {
  // React 19: child.props tipado como unknown en algunos contextos. Cast
  // localizado — sabemos que un valid element siempre tiene props object.
  const childProps = (child.props ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...slotProps };

  for (const key of Object.keys(childProps)) {
    const childValue = childProps[key];
    const slotValue = merged[key];

    if (key === "className") {
      merged[key] = cn(
        slotValue as string | undefined,
        childValue as string | undefined,
      );
    } else if (key === "style") {
      merged[key] = {
        ...((slotValue ?? {}) as CSSProperties),
        ...((childValue ?? {}) as CSSProperties),
      };
    } else if (key === "ref") {
      merged[key] = composeRefs(
        slotValue as Ref<HTMLElement> | undefined,
        childValue as Ref<HTMLElement> | undefined,
      );
    } else if (
      typeof slotValue === "function" &&
      typeof childValue === "function" &&
      /^on[A-Z]/.test(key)
    ) {
      merged[key] = composeEventHandlers(
        childValue as (e: SyntheticEvent) => void,
        slotValue as (e: SyntheticEvent) => void,
      );
    } else if (childValue !== undefined) {
      // Default: child wins SOLO si el consumer definió la prop con valor
      // genuino. Explícito `prop={undefined}` desde el consumer NO debe
      // sobrescribir el default del slot — esto pasa con event handlers
      // condicionales (`onClick={maybeHandler}` donde `maybeHandler` es
      // a veces `undefined`) y rompía el library behavior (e.g., el close
      // handler del DialogClose dropeado).
      //
      // Codex P2 round 1 sobre PR #110: caso real para Bloques B/C/D
      // donde el outer Slot pasa `onClick={closeDialog}` y un consumer
      // dynamic-set su `onClick={maybeFn}` con `maybeFn=undefined`. Sin
      // este check el dialog dejaba de cerrarse silenciosamente.
      //
      // Aplica a TODAS las props (no solo events): `aria-label={undefined}`
      // tampoco debe borrar el `aria-label="Cerrar"` que el slot provee.
      merged[key] = childValue;
    }
    // else: childValue === undefined → keep slotValue (no override).
  }

  return cloneElement(child, merged);
}
