"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/utils/cn";
import { useControllableState } from "@/hooks/useControllableState";

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
  variant?: AlertVariant | undefined;
  /** Icono opcional al inicio (suele ser un SVG o emoji). */
  icon?: ReactNode | undefined;
  /** Título destacado. */
  title?: ReactNode | undefined;
  /** Permite cerrar el alert (muestra botón ×). */
  dismissible?: boolean | undefined;
  /** Callback al pulsar el botón ×. Disparado tanto en modo controlado como uncontrolled. */
  onClose?: (() => void) | undefined;
  /** Texto a11y para el botón de cerrar. */
  closeLabel?: string | undefined;
  /** Si está abierto (modo controlado). */
  open?: boolean | undefined;
  /** Estado inicial (modo no controlado). Por defecto `true`. */
  defaultOpen?: boolean | undefined;
  /** Callback con el siguiente estado. Modo controlado o uncontrolled. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  ref?: Ref<HTMLDivElement> | undefined;
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
  // i18n: ES default deliberado (D12). Override: closeLabel.
  closeLabel = "Cerrar",
  open,
  defaultOpen = true,
  onOpenChange,
  className,
  children,
  ref,
  ...rest
}: AlertProps) {
  const { value: visible, setValue: setVisible } = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  if (!visible) return null;

  const isAlertRole = variant === "danger" || variant === "warning";

  const handleClose = () => {
    setVisible(false);
    onClose?.();
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
      <div className="ig-alert-content">
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
