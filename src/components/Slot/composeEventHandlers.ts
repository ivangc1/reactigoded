import type { SyntheticEvent } from "react";

/**
 * Compose dos event handlers en uno. El handler del child (consumer)
 * corre PRIMERO; el del slot (library) corre DESPUÉS, solo si el child
 * no llamó `event.preventDefault()`.
 *
 * Patrón canónico (Radix `composeEventHandlers`): respeta la intención
 * del consumer. Si quiere abortar el comportamiento library (e.g.,
 * validar un form antes de cerrar el dialog), `preventDefault()` en
 * su handler funciona — el slot handler nunca corre tras `preventDefault`.
 *
 * Vocabulario alineado con D14:
 * - `originalEventHandler` = handler del child (consumer's existing).
 * - `ourEventHandler` = handler del slot wrapper (library's, e.g.
 *   `setOpen(false)` de DialogClose).
 *
 * @returns Composed handler, o `undefined` si ambos inputs son `undefined`
 *   (evita asignar handlers vacíos al cloned element).
 *
 * @example
 * ```tsx
 * // En Slot merge:
 * merged.onClick = composeEventHandlers(
 *   child.props.onClick,    // consumer first
 *   slotProps.onClick,      // library second, skipped if prevented
 * );
 * ```
 *
 * @internal — solo usado por `<Slot>`.
 * @server-safe — no toca client globals.
 */
export function composeEventHandlers<E extends SyntheticEvent>(
  originalEventHandler: ((event: E) => void) | undefined,
  ourEventHandler: ((event: E) => void) | undefined,
): ((event: E) => void) | undefined {
  if (!originalEventHandler && !ourEventHandler) return undefined;
  return (event: E) => {
    originalEventHandler?.(event);
    if (!event.defaultPrevented) {
      ourEventHandler?.(event);
    }
  };
}
