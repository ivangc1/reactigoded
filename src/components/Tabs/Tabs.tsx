import {
  useCallback,
  useEffect,
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

  // Registro de Tabs montados. Resuelve dos casos edge sin pisar la
  // intención del consumer:
  //  (a) `<Tabs>` sin `defaultValue`/`value` → el primer Tab registrado se
  //      auto-selecciona (el `internal` arrancó como "").
  //  (b) `<Tabs defaultValue="missing">` → tras montar TODOS los Tabs, si
  //      el internal actual no matchea ninguno, fallback al primero +
  //      console.warn dev-only. Lo hacemos en un useEffect independiente
  //      con timeout 0, no dentro del register, para que NO se dispare
  //      durante la fase de registro tab-a-tab.
  //  En modo controlled: warning sin auto-corregir.
  const registeredRef = useRef<string[]>([]);
  const warnedRef = useRef(false);
  const [registryVersion, setRegistryVersion] = useState(0);

  // `register` se referencia con identidad estable desde el efecto de Tab
  // (deps `[register]`), así que NO debe cambiar entre renders ni capturar
  // `internal` por closure. En su lugar lee la selección actual desde un
  // ref que se sincroniza en cada render.
  const internalRef = useRef(internal);
  internalRef.current = internal;
  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const register = useCallback((tabValue: string) => {
    if (!registeredRef.current.includes(tabValue)) {
      registeredRef.current.push(tabValue);
      // Notifica al efecto de validación post-mount.
      setRegistryVersion((v) => v + 1);
    }
    // Caso (a): auto-select inmediato si todavía no hay selección.
    // Lectura por ref para evitar stale closure si el primer Tab tarda
    // en montarse o cambian las deps.
    if (!isControlledRef.current && internalRef.current === "") {
      internalRef.current = tabValue;
      setInternal(tabValue);
    }
    return () => {
      registeredRef.current = registeredRef.current.filter(
        (v) => v !== tabValue,
      );
      setRegistryVersion((v) => v + 1);
    };
  }, []);

  // Validación post-mount para defaultValue/value inválido (caso b).
  // Se ejecuta después de que los Tabs hayan registrado sus values,
  // evitando falsos positivos durante el registro intermedio.
  useEffect(() => {
    if (registeredRef.current.length === 0) return;
    const effective = isControlled ? value : internal;
    if (effective === "") return; // caso (a) ya cubierto en register
    if (registeredRef.current.includes(effective)) return;
    const firstRegistered = registeredRef.current[0];
    if (firstRegistered === undefined) return;
    if (!warnedRef.current && import.meta.env.DEV) {
      warnedRef.current = true;
      const propName = isControlled ? "value" : "defaultValue";
      const action = isControlled
        ? "El tablist queda sin tab stop accesible. Pasa un value que coincida con un Tab montado."
        : `Cayendo a "${firstRegistered}". Pasa un defaultValue que coincida con el value de un Tab.`;
      console.warn(
        `[reactigoded] <Tabs ${propName}="${effective}"> no matchea ningún <Tab>. ${action}`,
      );
    }
    if (!isControlled) {
      setInternal(firstRegistered);
    }
  }, [registryVersion, internal, value, isControlled]);

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
