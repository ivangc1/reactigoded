import { useEffect, useRef, type RefObject } from "react";

/**
 * useA11yWarnInput — warn dev cuando un componente Input/Textarea/NativeSelect
 * se monta sin ningún mecanismo de label accesible.
 *
 * Capa 1.1 del debt doc. Mecanismos aceptados:
 *
 *   - `<Label htmlFor>` apuntando al `id` del input (label visible).
 *   - `aria-label` directo en el input.
 *   - `aria-labelledby` apuntando a un id externo.
 *   - `placeholder` (degraded — accesible pero no ideal).
 *
 * Una vez por instancia. En `useEffect` (no during render) por la
 * regla react-hooks/refs.
 *
 * @example
 * ```tsx
 * export function Input({ ref, ...rest }: InputProps) {
 *   const internalRef = useRef<HTMLInputElement>(null);
 *   useA11yWarnInput(internalRef, "Input");
 *   const setRefs = useCallback(...);
 *   return <input ref={setRefs} ... />;
 * }
 * ```
 *
 * @param ref - Ref al elemento input/textarea/select del DOM.
 * @param componentName - Nombre del componente (`"Input"`, `"Textarea"`,
 *   `"NativeSelect"`) que sale en el mensaje del warn.
 */
export function useA11yWarnInput(
  ref: RefObject<HTMLElement | null>,
  componentName: "Input" | "Textarea" | "NativeSelect",
) {
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || warnedRef.current) return;
    const el = ref.current;
    if (!el) return;

    const id = el.id;
    const hasLabelFor = id
      ? document.querySelector(`label[for="${id}"]`) !== null
      : false;
    const hasAriaLabel = el.hasAttribute("aria-label");
    const hasAriaLabelledby = el.hasAttribute("aria-labelledby");
    const placeholderAttr = el.getAttribute("placeholder");
    const hasPlaceholder = placeholderAttr !== null && placeholderAttr !== "";

    if (
      !hasLabelFor &&
      !hasAriaLabel &&
      !hasAriaLabelledby &&
      !hasPlaceholder
    ) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <${componentName}> sin label asociado. Añade <Label htmlFor>, aria-label, aria-labelledby o placeholder para accesibilidad.`,
      );
    }
  }, [ref, componentName]);
}
