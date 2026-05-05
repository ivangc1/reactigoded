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
import { useControllableState } from "@/hooks/useControllableState";
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
  const {
    value: selected,
    setValue: setSelectedRaw,
    isControlled,
  } = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? "",
    onChange: onValueChange,
  });

  // Setter expuesto a `Tab` (vía context). Es acción del usuario, dispara
  // onValueChange. El auto-select interno y el fallback de defaultValue
  // inválido usan el mismo `setSelectedRaw` con `{ silent: true }` para
  // NO filtrar al consumer.
  const setSelected = useCallback(
    (next: string) => {
      setSelectedRaw(next);
    },
    [setSelectedRaw],
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

  // `register` se referencia con identidad estable desde el efecto de
  // Tab. Sin closure stale: el setter del hook ya es estable y
  // setSelectedRaw siempre escribe el state correcto.
  const register = useCallback((tabValue: string) => {
    if (!registeredRef.current.includes(tabValue)) {
      registeredRef.current.push(tabValue);
      // Notifica al efecto de validación post-mount.
      setRegistryVersion((v) => v + 1);
    }
    return () => {
      registeredRef.current = registeredRef.current.filter(
        (v) => v !== tabValue,
      );
      setRegistryVersion((v) => v + 1);
    };
  }, []);

  // Caso (a): auto-select inmediato del primer Tab montado cuando el
  // consumer no pasa value/defaultValue. Silent: NO dispara
  // onValueChange — el auto-select no es acción del usuario.
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (isControlled) return;
    if (selected !== "") return;
    const first = registeredRef.current[0];
    if (first === undefined) return;
    didAutoSelectRef.current = true;
    setSelectedRaw(first, { silent: true });
  }, [registryVersion, isControlled, selected, setSelectedRaw]);

  // Caso (b): validación post-mount para defaultValue/value inválido.
  // Si el effective no matchea ningún Tab montado, fallback al primero
  // (silent — no es acción del usuario) y warn dev-only.
  useEffect(() => {
    if (registeredRef.current.length === 0) return;
    if (selected === "") return; // caso (a) ya cubierto arriba
    if (registeredRef.current.includes(selected)) return;
    const firstRegistered = registeredRef.current[0];
    if (firstRegistered === undefined) return;
    if (!warnedRef.current && import.meta.env.DEV) {
      warnedRef.current = true;
      const propName = isControlled ? "value" : "defaultValue";
      const action = isControlled
        ? "El tablist queda sin tab stop accesible. Pasa un value que coincida con un Tab montado."
        : `Cayendo a "${firstRegistered}". Pasa un defaultValue que coincida con el value de un Tab.`;
      console.warn(
        `[reactigoded] <Tabs ${propName}="${selected}"> no matchea ningún <Tab>. ${action}`,
      );
    }
    if (!isControlled) {
      setSelectedRaw(firstRegistered, { silent: true });
    }
  }, [registryVersion, selected, isControlled, setSelectedRaw]);

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
