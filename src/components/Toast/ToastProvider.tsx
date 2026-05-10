import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
  /**
   * Número máximo de toasts visibles a la vez. Cuando se excede, el más
   * antiguo se desmonta automáticamente (FIFO eviction) y se dispara su
   * `onDismiss`. Por defecto sin límite (M-11 gate review). Útil para
   * evitar spam visual en bucles de errores de red, validación masiva,
   * etc.
   */
  maxToasts?: number;
  /**
   * Función opcional que extrae una clave de identidad del toast. Si la
   * clave de un toast nuevo coincide con una en cola, el nuevo se ignora
   * y `toast()` devuelve el id del existente (M-11 gate review).
   *
   * Por defecto sin dedupe (cada llamada crea un toast nuevo). Patrón
   * típico:
   *
   * ```tsx
   * <ToastProvider dedupeBy={(t) => `${t.variant}:${t.title}`}>
   * ```
   *
   * Aplica solo en el momento de la inserción — toasts ya en cola no se
   * fusionan retroactivamente si `dedupeBy` cambia.
   */
  dedupeBy?: (toast: ToastOptions) => string;
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
  maxToasts,
  dedupeBy,
  children,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const idPrefix = useId();
  const seqRef = useRef(0);
  // M-11: snapshot del state para que `toast()` (callback estable que
  // cambia solo si props relevantes cambian) pueda hacer dedupe lookup
  // sin re-suscribirse a cada cambio de `toasts`. Sincronizado en
  // useEffect (ref-write, no setState — fuera del scope de la regla
  // react-hooks/set-state-in-effect).
  const toastsRef = useRef<ToastEntry[]>([]);
  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

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
      // M-11 dedupe: si una entrada con la misma clave ya está en cola,
      // ignora el nuevo y devuelve el id del existente. Snapshot via
      // toastsRef.current — race condition en mismo tick es tolerable
      // (peor caso: duplicado entra, no crash).
      if (dedupeBy) {
        const newKey = dedupeBy(options);
        const existing = toastsRef.current.find(
          (t) => dedupeBy(t) === newKey,
        );
        if (existing) return existing.id;
      }

      seqRef.current += 1;
      const id = `${idPrefix}-${String(seqRef.current)}`;
      const entry: ToastEntry = { id, ...options };

      setToasts((prev) => {
        const next = [...prev, entry];
        // M-11 maxToasts: cuando se excede, FIFO eviction — drop el más
        // antiguo. Dispatch onDismiss del dropped + clear de su timer
        // para no leakear setTimeout pendientes.
        if (maxToasts !== undefined && next.length > maxToasts) {
          const dropCount = next.length - maxToasts;
          const dropped = next.slice(0, dropCount);
          dropped.forEach((t) => {
            const timer = timersRef.current.get(t.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(t.id);
            }
            t.onDismiss?.();
          });
          return next.slice(dropCount);
        }
        return next;
      });

      const duration = options.duration ?? defaultDuration;
      if (duration > 0) {
        const timer = setTimeout(() => { dismiss(id); }, duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [defaultDuration, dismiss, idPrefix, maxToasts, dedupeBy],
  );

  // Limpieza de timers al desmontar.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => { clearTimeout(t); });
      timers.clear();
    };
  }, []);

  // SSR-safe: durante render server `document` no existe; durante el primer
  // render cliente document.body sí existe pero usar el portal ya rompería
  // hydration mismatch (server pintó inline → cliente pinta vía portal).
  // Solución idiomática React 19: `useSyncExternalStore` con server snapshot
  // `false` y client snapshot `true`. El primer render cliente coincide con
  // server (mounted=false → inline); React detecta el cambio sin necesidad
  // de setState dentro de useEffect (que la regla `set-state-in-effect`
  // prohíbe).
  const mounted = useSyncExternalStore(
    () => () => {
      /* no resubscriptions: 'mounted' is a one-shot transition */
    },
    () => true,
    () => false,
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss, dismissAll }),
    [toast, dismiss, dismissAll],
  );

  // Resuelve container del portal:
  // - container === null → render inline siempre.
  // - container HTMLElement → ese.
  // - container undefined + cliente montado → document.body.
  // - todo lo demás (server o pre-mount) → null = render inline.
  const portalTarget =
    container === null
      ? null
      : container !== undefined
        ? container
        : mounted
          ? document.body
          : null;

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
