"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ToastVariant } from "./Toast";

export interface ToastOptions {
  /** Título del toast. */
  title?: ReactNode;
  /** Mensaje secundario. */
  message?: ReactNode;
  /** Variant semántico. Por defecto `"neutral"`. */
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

/**
 * Hook para disparar toasts desde cualquier componente envuelto en un
 * `<ToastProvider>`. Lanza error si se llama fuera del Provider — no
 * intentes hacer try/catch del hook, monta el Provider en la raíz de tu
 * app (igual que `<QueryClientProvider>` o similares).
 *
 * @example
 * // En la raíz de tu app:
 * <ToastProvider position="top-right" defaultDuration={5000}>
 *   <App />
 * </ToastProvider>
 *
 * // En un componente hijo:
 * function SaveButton() {
 *   const { toast } = useToast();
 *   return (
 *     <Button
 *       onClick={async () => {
 *         try {
 *           await save();
 *           toast({ variant: "success", title: "Guardado" });
 *         } catch (err) {
 *           toast({ variant: "danger", title: "Error", message: String(err) });
 *         }
 *       }}
 *     >
 *       Guardar
 *     </Button>
 *   );
 * }
 *
 * @example
 * // Dismiss programático (devuelve un id):
 * function NotificationOnFlight() {
 *   const { toast, dismiss } = useToast();
 *   useEffect(() => {
 *     const id = toast({ variant: "info", title: "Subiendo…", duration: 0 });
 *     uploadFile().finally(() => { dismiss(id); });
 *   }, [toast, dismiss]);
 *   return null;
 * }
 *
 * @returns `{ toast, dismiss, dismissAll }` — todas estables (memoizadas).
 * @throws Error si se llama fuera de `<ToastProvider>`.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
