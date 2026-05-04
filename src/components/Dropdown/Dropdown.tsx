import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type HTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useControllableState } from "@/hooks/useControllableState";
import { DropdownContext } from "./DropdownContext";

export type DropdownPlacement = "left" | "right";
export type DropdownDirection = "down" | "up";

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  /** Estado abierto (modo controlado). Si se omite, el componente gestiona su propio estado. */
  open?: boolean;
  /** Estado inicial (modo no controlado). Por defecto `false`. */
  defaultOpen?: boolean;
  /** Callback al abrir/cerrar. Disparado en ambos modos. */
  onOpenChange?: (open: boolean) => void;
  /** Alineación horizontal del menu. Por defecto `"left"`. */
  placement?: DropdownPlacement;
  /** Hacia dónde abre verticalmente. Por defecto `"down"`. */
  direction?: DropdownDirection;
  /** Si los `DropdownItem` cierran el menu al activarse. Por defecto `true`. */
  closeOnSelect?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Dropdown — menú desplegable accesible.
 *
 * Compón con `DropdownTrigger`, `DropdownMenu`, `DropdownItem`,
 * `DropdownDivider`, `DropdownHeader`. Cierra con ESC y al hacer click fuera;
 * soporta navegación con ↑/↓/Home/End/Enter/Espacio siguiendo el patrón
 * WAI-ARIA menu button.
 *
 * Modo controlado: pasa `open` + `onOpenChange`. Modo no controlado: omite `open`.
 *
 * @example
 * <Dropdown>
 *   <DropdownTrigger>Acciones ▼</DropdownTrigger>
 *   <DropdownMenu>
 *     <DropdownItem onClick={editar}>Editar</DropdownItem>
 *     <DropdownDivider />
 *     <DropdownItem danger onClick={borrar}>Eliminar</DropdownItem>
 *   </DropdownMenu>
 * </Dropdown>
 */
export function Dropdown({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = "left",
  direction = "down",
  closeOnSelect = true,
  className,
  children,
  ref,
  ...rest
}: DropdownProps) {
  const reactId = useId();
  const triggerId = `${reactId}-trigger`;
  const menuId = `${reactId}-menu`;

  const { value: open, setValue: setOpen } = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click fuera cierra.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, setOpen]);

  // ESC global cierra y devuelve foco al trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const handleRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  const ctxValue = useMemo(
    () => ({
      open,
      setOpen,
      triggerId,
      menuId,
      triggerRef,
      menuRef,
      closeOnSelect,
    }),
    [open, setOpen, triggerId, menuId, closeOnSelect],
  );

  return (
    <DropdownContext.Provider value={ctxValue}>
      <div
        ref={handleRef}
        className={cn(
          "ig-dropdown",
          placement === "right" && "ig-dropdown-right",
          direction === "up" && "ig-dropdown-up",
          open && "ig-dropdown-open",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
}
