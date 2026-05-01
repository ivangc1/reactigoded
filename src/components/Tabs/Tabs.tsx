import {
  useCallback,
  useId,
  useMemo,
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
  defaultValue = "",
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
  const [internal, setInternal] = useState(defaultValue);
  const selected = isControlled ? value : internal;

  const setSelected = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const ctxValue = useMemo(
    () => ({ selected, setSelected, baseId, orientation }),
    [selected, setSelected, baseId, orientation],
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
