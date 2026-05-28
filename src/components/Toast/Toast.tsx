import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/utils/cn";

export type ToastVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand"
  | "secondary";

// L-06: defaults unificados a símbolos Unicode con peso visual similar.
// Pre-fix: 4 eran Unicode (✓ ✕ ★ •) y 2 eran ASCII plain ('!' e 'i') —
// renderizados como letras del flow text en lugar de iconos.
//
// Variation Selector text (︎) en warning/info: fuerza render glifo
// monocromático en sistemas que por defecto los pintarían como emoji
// color (iOS Safari, Chrome con segoe-ui-emoji). Sin VS-15, "⚠" puede
// salir como triángulo amarillo grande contraste contra el resto.
const DEFAULT_ICONS: Record<Exclude<ToastVariant, "neutral">, string> = {
  success: "✓",
  warning: "⚠︎",
  danger: "✕",
  info: "ℹ︎",
  brand: "★",
  secondary: "•",
};

export interface ToastProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Color/semántica del toast. Por defecto `"neutral"` (sin border-left coloreado). */
  variant?: ToastVariant | undefined;
  /** Título destacado en la parte superior. */
  title?: ReactNode | undefined;
  /** Mensaje secundario (también acepta `children`). */
  message?: ReactNode | undefined;
  /**
   * Icono al inicio. `undefined` muestra el icono por defecto del variant
   * (excepto "neutral", que no tiene). Pasa `false` para ocultarlo o un nodo
   * propio para sustituirlo.
   */
  icon?: ReactNode | false | undefined;
  /** Si se muestra el botón "×". Alias estandarizado con `Alert`. */
  dismissible?: boolean | undefined;
  /** Callback al pulsar el botón "×". */
  onClose?: (() => void) | undefined;
  /** Texto a11y para el botón de cerrar. Por defecto `"Cerrar"`. */
  closeLabel?: string | undefined;
  ref?: Ref<HTMLDivElement> | undefined;
}

/**
 * Toast — notificación efímera presentational.
 *
 * Variants `danger`/`warning` se anuncian con `role="alert"` (assertive); el
 * resto con `role="status"` + `aria-live="polite"`. Para el patrón habitual
 * (cola de toasts con auto-dismiss) usa `ToastProvider` + `useToast()`.
 *
 * @example
 * <ToastProvider position="bottom-right">
 *   <App />
 * </ToastProvider>
 *
 * function SaveButton() {
 *   const { toast } = useToast();
 *   return (
 *     <Button onClick={() => toast({ variant: "success", title: "Guardado" })}>
 *       Guardar
 *     </Button>
 *   );
 * }
  *
 * @server-safe
 */
export function Toast({
  variant = "neutral",
  title,
  message,
  icon,
  dismissible = true,
  onClose,
  // i18n: ES default deliberado (D12). Override: closeLabel.
  closeLabel = "Cerrar",
  className,
  children,
  ref,
  ...rest
}: ToastProps) {
  const isAlertRole = variant === "danger" || variant === "warning";
  const resolvedIcon =
    icon === false
      ? null
      : icon !== undefined
        ? icon
        : variant === "neutral"
          ? null
          : DEFAULT_ICONS[variant];

  return (
    <div
      {...rest}
      ref={ref}
      role={isAlertRole ? "alert" : "status"}
      aria-live={isAlertRole ? "assertive" : "polite"}
      className={cn(
        "ig-toast",
        variant !== "neutral" && `ig-toast-${variant}`,
        className,
      )}
    >
      {resolvedIcon !== null && (
        <span className="ig-toast-icon" aria-hidden="true">
          {resolvedIcon}
        </span>
      )}
      <div className="ig-toast-content">
        {title !== undefined && <div className="ig-toast-title">{title}</div>}
        {(message !== undefined || children !== undefined) && (
          <div className="ig-toast-message">{message ?? children}</div>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          className="ig-toast-close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}
