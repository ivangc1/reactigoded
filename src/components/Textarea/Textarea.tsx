"use client";

import {
  useCallback,
  useRef,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";
import { useA11yWarnInput } from "@/utils/useA11yWarnInput";

export type TextareaState = "default" | "error" | "success";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Auto-resize basado en contenido. */
  auto?: boolean | undefined;
  /** Estado de validación visual. */
  state?: TextareaState | undefined;
  /**
   * IDs de elementos descriptivos (`Helper`/`ErrorText`) combinados en
   * `aria-describedby`. Acepta un id o lista de ids. Si pasas también
   * `aria-describedby` directo (vía rest), AMBOS se concatenan.
   */
  describedBy?: string | string[] | undefined;
  ref?: Ref<HTMLTextAreaElement> | undefined;
}

/**
 * Textarea — `<textarea>` estilizado. `auto=true` activa auto-grow basado en
 * contenido (clase `ig-textarea-auto`).
 *
 * **Soporte de `auto`**: usa `field-sizing: content` (CSS).
 * - Chrome/Edge 123+ (mar 2024) ✅
 * - Safari 17.4+ (mar 2024) ✅
 * - Firefox: aún no (en progreso, sin ETA pública).
 *   Bugs Mozilla: #1977176 (input), #1977177 (textarea).
 *
 * En Firefox el textarea cae al comportamiento por defecto (`rows`) sin
 * auto-grow. Para auto-grow universal, gestiona el alto vía JS desde el
 * consumer, idealmente envuelto en un `@supports not (field-sizing: content)`.
 *
 * Detección runtime para activar fallback JS:
 * ```js
 * const needsJsFallback = !CSS.supports('field-sizing', 'content');
 * ```
 *
 * Y a nivel CSS:
 * ```css
 * @supports not (field-sizing: content) {
 *   // estilos del fallback
 * }
 * ```
 *
 * **A11y dev warn**: si en desarrollo se monta sin `<Label htmlFor>`,
 * `aria-label`, `aria-labelledby` ni `placeholder`, se emite warn
 * `[reactigoded] <Textarea> sin label asociado.` (capa 1.1 debt doc).
 *
 * @example
 * <Textarea placeholder="Cuéntanos…" rows={4} />
 * <Textarea state="error" describedBy={errorId} />
 * <Textarea auto value={text} onChange={(e) => setText(e.target.value)} />
 */
export function Textarea({
  auto = false,
  state = "default",
  describedBy,
  className,
  ref,
  ...rest
}: TextareaProps) {
  const { "aria-describedby": ariaDescribedByNative, ...textareaRest } = rest;
  const describedByValue = mergeDescribedBy(ariaDescribedByNative, describedBy);

  const internalRef = useRef<HTMLTextAreaElement>(null);
  useA11yWarnInput(internalRef, "Textarea");
  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <textarea
      {...textareaRest}
      ref={setRefs}
      className={cn(
        auto ? "ig-textarea-auto" : "ig-textarea",
        state === "error" && "ig-input-error",
        state === "success" && "ig-input-success",
        className,
      )}
      aria-invalid={state === "error" ? true : undefined}
      aria-describedby={describedByValue}
    />
  );
}
