import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";
import { Toast } from "./Toast";
import {
  ToastContext,
  type ToastContextValue,
  type ToastEntry,
  type ToastOptions,
} from "./ToastContext";

export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

export interface ToastProviderProps {
  /** Posición del contenedor. Por defecto `"top-right"`. */
  position?: ToastPosition;
  /** Duración por defecto en ms. Toasts individuales pueden sobrescribirla. Por defecto `5000`. */
  defaultDuration?: number;
  /**
   * Nodo donde montar el portal. Por defecto `document.body`. Pasa `null`
   * para renderizar inline (útil en SSR o en tests sin portal).
   */
  container?: HTMLElement | null;
  children?: ReactNode;
}

/**
 * ToastProvider — pone `useToast()` a disposición y renderiza la cola de
 * toasts en un portal fixed con la posición elegida. Cada toast se
 * auto-dismisea a los `duration` ms (o `defaultDuration` del provider).
 */
export function ToastProvider({
  position = "top-right",
  defaultDuration = 5000,
  container,
  children,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const idPrefix = useId();
  const seqRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => {
      const found = prev.find((t) => t.id === id);
      found?.onDismiss?.();
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const dismissAll = useCallback(() => {
    timersRef.current.forEach((t) => { clearTimeout(t); });
    timersRef.current.clear();
    setToasts((prev) => {
      prev.forEach((t) => t.onDismiss?.());
      return [];
    });
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      seqRef.current += 1;
      const id = `${idPrefix}-${String(seqRef.current)}`;
      const entry: ToastEntry = { id, ...options };
      setToasts((prev) => [...prev, entry]);

      const duration = options.duration ?? defaultDuration;
      if (duration > 0) {
        const timer = setTimeout(() => { dismiss(id); }, duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [defaultDuration, dismiss, idPrefix],
  );

  // Limpieza de timers al desmontar.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => { clearTimeout(t); });
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss, dismissAll }),
    [toast, dismiss, dismissAll],
  );

  // Resuelve container del portal: si se pasa `null` explícitamente, render
  // inline. Si se pasa undefined, usa document.body cuando exista.
  const portalTarget =
    container === null
      ? null
      : (container ?? (typeof document !== "undefined" ? document.body : null));

  const containerNode = (
    <div
      className={cn("ig-toast-container", `ig-toast-${position}`)}
      data-toast-container=""
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          {...(t.variant !== undefined ? { variant: t.variant } : {})}
          {...(t.title !== undefined ? { title: t.title } : {})}
          {...(t.message !== undefined ? { message: t.message } : {})}
          {...(t.icon !== undefined ? { icon: t.icon } : {})}
          dismissible={t.dismissible ?? true}
          onClose={() => { dismiss(t.id); }}
        />
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portalTarget ? createPortal(containerNode, portalTarget) : containerNode}
    </ToastContext.Provider>
  );
}
