import type { Ref, RefObject } from "react";

/**
 * Asigna `node` a un ref (function u object). Para una function ref de React 19
 * devuelve su cleanup si lo produce; para un object ref escribe `.current` y no
 * hay cleanup (`undefined`).
 */
function setRef<T>(ref: Ref<T>, node: T | null): (() => void) | undefined {
  if (typeof ref === "function") {
    const cleanup = ref(node);
    return typeof cleanup === "function" ? cleanup : undefined;
  }
  // React 19: `RefObject<T>` admite `.current` writable (legacy `MutableRefObject`
  // deprecated). Cast localizado a RefObject<T | null> porque el union `Ref<T>`
  // también incluye function refs.
  (ref as RefObject<T | null>).current = node;
  return undefined;
}

/**
 * Compose multiple React refs into a single callback ref. Each ref
 * (function or object) recibe el DOM node — ninguno se pierde.
 *
 * Patrón canónico para composición asChild: el library wrapper
 * (`<DialogClose asChild>`) y el child del consumer (`<Button ref={...}>`)
 * pueden tener cada uno su propio ref; ambos deben apuntar al mismo
 * DOM node tras el cloneElement.
 *
 * React 19: `ref` es prop normal (no `forwardRef`), y una **function ref puede
 * devolver un cleanup** `(node) => () => {…}`. Esta utility maneja ambos tipos
 * (function refs y object refs `{ current }`) Y propaga el cleanup: si algún ref
 * devolvió uno, el ref compuesto devuelve un cleanup agregado que invoca cada
 * cleanup en unmount (y hace teardown `null` de los refs que no lo devolvieron),
 * en vez del teardown legacy `ref(null)` que perdería el cleanup del consumer y
 * le pasaría un `null` inesperado. Paridad con `@radix-ui/react-compose-refs`.
 *
 * @example
 * ```tsx
 * const merged = composeRefs(slotRef, child.props.ref);
 * cloneElement(child, { ref: merged });
 * ```
 *
 * @returns Callback ref que distribuye el node a todos los refs no-null y, si
 *   alguno de ellos devuelve un cleanup (React 19), un cleanup agregado. Devuelve
 *   `null` si todos los refs son null/undefined (evita render-loops innecesarios).
 *
 * @internal Solo usado por `<Slot>` y components del DS internamente.
 *   No exportado al consumer; el flow consumer normal pasa por
 *   `asChild` props que delegan al Slot.
 *
 * @server-safe — no toca client globals.
 */
export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): ((node: T | null) => (() => void) | undefined) | null {
  const cleaned = refs.filter((r): r is Ref<T> => r != null);
  if (cleaned.length === 0) return null;
  return (node: T | null) => {
    // Emparejamos cada ref con su cleanup (React 19) para el teardown.
    const applied = cleaned.map((ref) => ({ ref, cleanup: setRef(ref, node) }));
    // Solo devolvemos un cleanup agregado si ALGÚN ref produjo uno (React 19).
    // Sin cleanups → undefined: React usa su teardown legacy (`ref(null)`).
    if (applied.some((a) => typeof a.cleanup === "function")) {
      return () => {
        for (const { ref, cleanup } of applied) {
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            // Ref sin cleanup propio → teardown legacy explícito.
            setRef(ref, null);
          }
        }
      };
    }
    return undefined;
  };
}
