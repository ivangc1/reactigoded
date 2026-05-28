import type { Ref, RefObject } from "react";

/**
 * Compose multiple React refs into a single callback ref. Each ref
 * (function or object) recibe el DOM node — ninguno se pierde.
 *
 * Patrón canónico para composición asChild: el library wrapper
 * (`<DialogClose asChild>`) y el child del consumer (`<Button ref={...}>`)
 * pueden tener cada uno su propio ref; ambos deben apuntar al mismo
 * DOM node tras el cloneElement.
 *
 * React 19: `ref` es prop normal (no `forwardRef`). Esta utility maneja
 * ambos tipos: function refs `(node) => {...}` y object refs
 * `{ current: T | null }`.
 *
 * @example
 * ```tsx
 * const merged = composeRefs(slotRef, child.props.ref);
 * cloneElement(child, { ref: merged });
 * ```
 *
 * @returns Callback ref que distribuye el node a todos los refs no-null.
 *   Devuelve `null` si todos los refs son null/undefined (evita render-loops
 *   innecesarios cuando ningún ref necesita el node).
 *
 * @internal Solo usado por `<Slot>` y components del DS internamente.
 *   No exportado al consumer; el flow consumer normal pasa por
 *   `asChild` props que delegan al Slot.
 *
 * @server-safe — no toca client globals.
 */
export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): ((node: T | null) => void) | null {
  const cleaned = refs.filter((r): r is Ref<T> => r != null);
  if (cleaned.length === 0) return null;
  return (node: T | null) => {
    for (const ref of cleaned) {
      if (typeof ref === "function") {
        ref(node);
      } else {
        // React 19: `RefObject<T>` ya admite `.current` writable
        // (legacy `MutableRefObject` deprecated). Cast localizado a
        // RefObject<T | null> porque el union `Ref<T>` también incluye
        // function refs.
        (ref as RefObject<T | null>).current = node;
      }
    }
  };
}
