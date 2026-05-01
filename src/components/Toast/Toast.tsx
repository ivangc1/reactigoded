import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/utils/cn";

export type ToastVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand"
  | "secondary";

const DEFAULT_ICONS: Record<Exclude<ToastVariant, "default">, string> = {
  success: "✓",
  warning: "!",
  danger: "✕",
  info: "i",
  brand: "★",
  secondary: "•",
};

export interface ToastProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Color/semántica del toast. Por defecto `"default"` (sin border-left coloreado). */
  variant?: ToastVariant;
  /** Título destacado en la parte superior. */
  title?: ReactNode;
  /** Mensaje secundario (también acepta `children`). */
  message?: ReactNode;
  /**
   * Icono al inicio. `undefined` muestra el icono por defecto del variant
   * (excepto "default", que no tiene). Pasa `false` para ocultarlo o un nodo
   * propio para sustituirlo.
   */
  icon?: ReactNode | false;
  /** Si se muestra el botón "×". Alias estandarizado con `Alert`. */
  dismissible?: boolean;
  /** Callback al pulsar el botón "×". */
  onClose?: () => void;
  /** Texto a11y para el botón de cerrar. Por defecto `"Cerrar"`. */
  closeLabel?: string;
  ref?: Ref<HTMLDivElement>;
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
 */
export function Toast({
  variant = "default",
  title,
  message,
  icon,
  dismissible = true,
  onClose,
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
        : variant === "default"
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
        variant !== "default" && `ig-toast-${variant}`,
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
