import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { TabsContext } from "./TabsContext";

export type TabsVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  /** Tab seleccionado (modo controlado). */
  value?: string;
  /** Tab inicial (modo no controlado). */
  defaultValue?: string;
  /** Callback al cambiar de tab. */
  onValueChange?: (value: string) => void;
  /** Color del indicador del tab activo. */
  variant?: TabsVariant;
  /** Estilo "pills" en vez de underline. */
  pills?: boolean;
  /** Orientación del tablist. */
  orientation?: "horizontal" | "vertical";
  ref?: Ref<HTMLDivElement>;
}

/**
 * Tabs — wrapper que provee contexto a `TabList`+`Tab`+`TabPanel`.
 *
 * Soporta controlled (`value`+`onValueChange`) y uncontrolled (`defaultValue`).
 * `Tab` es un `<button role="tab">` y `TabPanel` un `<div role="tabpanel">`
 * conectados por `aria-controls`/`aria-labelledby`. Keyboard nav con flechas
 * (←→ horizontal, ↑↓ vertical) + Home/End.
 *
 * **Auto-selección del primer Tab desde `1.0.0-beta.3`**: si el consumer no
 * pasa ni `value` ni `defaultValue`, el primer `Tab` que se monte queda
 * seleccionado automáticamente. Antes el tablist se quedaba sin tab stop
 * (todos los `tabIndex=-1`), inaccesible por teclado.
 *
 * @example
 * <Tabs defaultValue="perfil">
 *   <TabList ariaLabel="Cuenta">
 *     <Tab value="perfil">Perfil</Tab>
 *     <Tab value="seguridad">Seguridad</Tab>
 *   </TabList>
 *   <TabPanel value="perfil">Datos personales</TabPanel>
 *   <TabPanel value="seguridad" keepMounted>Contraseña y 2FA</TabPanel>
 * </Tabs>
 */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  variant,
  pills = false,
  orientation = "horizontal",
  className,
  children,
  ref,
  ...rest
}: TabsProps) {
  const baseId = useId();
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(defaultValue ?? "");
  const selected = isControlled ? value : internal;

  const setSelected = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  // Registro de Tabs montados. El primer Tab registrado, si todavía no hay
  // selección efectiva, se auto-selecciona. Esto soluciona el caso edge de
  // `<Tabs>` sin `defaultValue`: antes todos los tabs quedaban con
  // `tabIndex=-1` y el grupo era inaccesible por teclado.
  const registeredRef = useRef<string[]>([]);
  const register = useCallback((tabValue: string) => {
    if (!registeredRef.current.includes(tabValue)) {
      registeredRef.current.push(tabValue);
    }
    // Auto-selección del primer Tab si nadie está seleccionado y estamos
    // en modo uncontrolled.
    if (!isControlled && internal === "" && registeredRef.current.length === 1) {
      setInternal(tabValue);
    }
    return () => {
      registeredRef.current = registeredRef.current.filter(
        (v) => v !== tabValue,
      );
    };
    // `internal` y `isControlled` se leen al efecto del Tab — no incluirlos
    // como deps porque eso reejecutaría register en cada render del Tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctxValue = useMemo(
    () => ({ selected, setSelected, baseId, orientation, register }),
    [selected, setSelected, baseId, orientation, register],
  );

  return (
    <TabsContext.Provider value={ctxValue}>
      <div
        {...rest}
        ref={ref}
        className={cn(
          "ig-tabs",
          variant && `ig-tabs-${variant}`,
          pills && "ig-tabs-pills",
          orientation === "vertical" && "ig-tabs-vertical",
          className,
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}
