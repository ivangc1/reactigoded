import { createContext, useContext, type ReactNode } from "react";
import type { ToastVariant } from "./Toast";

export interface ToastOptions {
  /** Título del toast. */
  title?: ReactNode;
  /** Mensaje secundario. */
  message?: ReactNode;
  /** Variant semántico. Por defecto `"default"`. */
  variant?: ToastVariant;
  /**
   * Tiempo en ms hasta auto-dismiss. `0` desactiva el auto-dismiss (queda
   * hasta que se cierre manualmente). Por defecto `5000`.
   */
  duration?: number;
  /** Override del icono del toast. `false` lo oculta. */
  icon?: ReactNode | false;
  /** Si el toast muestra botón "×". Por defecto `true`. */
  dismissible?: boolean;
  /** Callback al cerrar (manual o auto). */
  onDismiss?: () => void;
}

export interface ToastEntry extends ToastOptions {
  id: string;
}

export interface ToastContextValue {
  /** Crea un toast y devuelve su id. */
  toast: (options: ToastOptions) => string;
  /** Cierra un toast por id. */
  dismiss: (id: string) => void;
  /** Cierra todos los toasts. */
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
