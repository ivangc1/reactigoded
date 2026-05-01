import type { HTMLAttributes, ReactNode, Ref } from "react";
import { useState } from "react";
import { cn } from "@/utils/cn";

export type AlertVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand"
  | "secondary"
  | "neutral";

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Color/semántica del alert. */
  variant?: AlertVariant;
  /** Icono opcional al inicio (suele ser un SVG o emoji). */
  icon?: ReactNode;
  /** Título destacado. */
  title?: ReactNode;
  /** Permite cerrar el alert (muestra botón ×). */
  dismissible?: boolean;
  /** Callback al pulsar el botón ×. Disparado tanto en modo controlado como uncontrolled. */
  onClose?: () => void;
  /** Texto a11y para el botón de cerrar. */
  closeLabel?: string;
  /** Si está abierto (modo controlado). */
  open?: boolean;
  /** Estado inicial (modo no controlado). Por defecto `true`. */
  defaultOpen?: boolean;
  /** Callback con el siguiente estado. Modo controlado o uncontrolled. */
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Alert — mensaje de feedback con variants semánticos.
 *
 * Variants `danger`/`warning` usan `role="alert"` (anuncio assertivo);
 * el resto `role="status"` con `aria-live="polite"`. Soporta `dismissible`
 * controlado o no, icono y título.
 *
 * @example
 * <Alert variant="success" title="Guardado">
 *   Cambios persistidos correctamente.
 * </Alert>
 * <Alert variant="warning" dismissible onOpenChange={setOpen}>
 *   Tu plan vence en 3 días.
 * </Alert>
 */
export function Alert({
  variant = "info",
  icon,
  title,
  dismissible = false,
  onClose,
  closeLabel = "Cerrar",
  open,
  defaultOpen = true,
  onOpenChange,
  className,
  children,
  ref,
  ...rest
}: AlertProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const visible = isControlled ? open : internalOpen;

  if (!visible) return null;

  const isAlertRole = variant === "danger" || variant === "warning";

  const handleClose = () => {
    if (!isControlled) setInternalOpen(false);
    onClose?.();
    onOpenChange?.(false);
  };

  return (
    <div
      {...rest}
      ref={ref}
      role={isAlertRole ? "alert" : "status"}
      aria-live={isAlertRole ? "assertive" : "polite"}
      className={cn("ig-alert", `ig-alert-${variant}`, className)}
    >
      {icon && (
        <span className="ig-alert-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div className="ig-alert-title">{title}</div>}
        {children !== undefined && (
          <div className="ig-alert-description">{children}</div>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          className="ig-alert-close"
          onClick={handleClose}
          aria-label={closeLabel}
        >
          ×
        </button>
      )}
    </div>
  );
}
