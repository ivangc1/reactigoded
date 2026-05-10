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
import { useIsoLayoutEffect } from "@/utils/useIsoLayoutEffect";
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
 *   <TabList aria-label="Cuenta">
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

  // Registro de Tabs montados como state (no ref) desde beta.22 / H-26:
  // el render necesita leer el registry para calcular `selectedExists` y
  // `firstRegistered` (fallback de tabIndex en modo controlled inválido),
  // y leer un ref durante render dispara la regla react-hooks/refs y
  // puede entregar un snapshot stale.
  //
  // Resuelve dos casos edge sin pisar la intención del consumer:
  //  (a) `<Tabs>` sin `defaultValue`/`value` → el primer Tab registrado se
  //      auto-selecciona (el `internal` arrancó como "").
  //  (b) `<Tabs defaultValue="missing">` → tras montar TODOS los Tabs, si
  //      el internal actual no matchea ninguno, fallback al primero +
  //      console.warn dev-only. Lo hacemos en un useEffect independiente,
  //      no dentro del register, para que NO se dispare durante la fase
  //      de registro tab-a-tab. En modo controlled: warning sin
  //      auto-corregir + fallback de tabIndex en Tab.tsx (H-26).
  const [registered, setRegistered] = useState<readonly string[]>([]);
  const warnedRef = useRef(false);

  // `register` con identidad estable; usa el setter functional del state
  // para evitar closure stale.
  const register = useCallback((tabValue: string) => {
    setRegistered((prev) =>
      prev.includes(tabValue) ? prev : [...prev, tabValue],
    );
    return () => {
      setRegistered((prev) => prev.filter((v) => v !== tabValue));
    };
  }, []);

  // Caso (a): auto-select inmediato del primer Tab montado cuando el
  // consumer no pasa value/defaultValue. Silent: NO dispara
  // onValueChange — el auto-select no es acción del usuario.
  //
  // Codex P2 sobre commit antiguo: este auto-select corría en
  // `useEffect` (post-paint). En render inicial sin defaultValue,
  // el primer frame pintaba con `selected === ""` (sin tab activo,
  // sin tab stop, sin panel content) y el segundo frame ya tenía el
  // primer Tab seleccionado — flash visual y transient state
  // inaccesible. `useIsoLayoutEffect` ejecuta el efecto pre-paint
  // en cliente (no-op síncrono en SSR), eliminando el flash sin
  // romper SSR-safety.
  const didAutoSelectRef = useRef(false);
  useIsoLayoutEffect(() => {
    if (didAutoSelectRef.current) return;
    if (isControlled) return;
    if (selected !== "") return;
    const first = registered[0];
    if (first === undefined) return;
    didAutoSelectRef.current = true;
    setSelectedRaw(first, { silent: true });
  }, [registered, isControlled, selected, setSelectedRaw]);

  // Caso (b): validación post-mount para defaultValue/value inválido.
  // Si el effective no matchea ningún Tab montado, fallback al primero
  // (silent — no es acción del usuario) y warn dev-only.
  useEffect(() => {
    if (registered.length === 0) return;
    if (selected === "") return; // caso (a) ya cubierto arriba
    if (registered.includes(selected)) return;
    const firstRegistered = registered[0];
    if (firstRegistered === undefined) return;
    if (!warnedRef.current && import.meta.env.DEV) {
      warnedRef.current = true;
      const propName = isControlled ? "value" : "defaultValue";
      const action = isControlled
        ? "El tablist queda sin tab stop accesible. El primer Tab montado entra en modo fallback con tabIndex=0 para mantener el tablist navegable; pasa un value que matchee un Tab para restaurar aria-selected correcto."
        : `Cayendo a "${firstRegistered}". Pasa un defaultValue que coincida con el value de un Tab.`;
      console.warn(
        `[reactigoded] <Tabs ${propName}="${selected}"> no matchea ningún <Tab>. ${action}`,
      );
    }
    if (!isControlled) {
      setSelectedRaw(firstRegistered, { silent: true });
    }
  }, [registered, selected, isControlled, setSelectedRaw]);

  // H-26: en modo controlled con `value` inválido, el componente NO
  // auto-corrige (warn pero no toca el state). Sin un fallback de
  // tabIndex, TODOS los Tab tendrían tabIndex=-1 y el tablist quedaría
  // inaccesible por teclado. Calculamos en cada render si el `selected`
  // actual matchea algún Tab montado, y exponemos el primer registrado
  // como fallback. Tab.tsx aplica tabIndex=0 al primer Tab si
  // selectedExists es false.
  const selectedExists = registered.includes(selected);
  const firstRegistered = registered[0];

  const ctxValue = useMemo(
    () => ({
      selected,
      setSelected,
      baseId,
      orientation,
      register,
      selectedExists,
      firstRegistered,
    }),
    [
      selected,
      setSelected,
      baseId,
      orientation,
      register,
      selectedExists,
      firstRegistered,
    ],
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
