import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  KeyboardEvent,
  Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useDropdown } from "./DropdownContext";

interface CommonProps {
  /** Marca el item como acción destructiva (color malum). */
  danger?: boolean;
  /** Marca el item como seleccionado actualmente. */
  active?: boolean;
}

type ButtonItemProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };

type AnchorItemProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    ref?: Ref<HTMLAnchorElement>;
  };

export type DropdownItemProps = ButtonItemProps | AnchorItemProps;

function handleNavKeys(
  e: KeyboardEvent<HTMLElement>,
  menuRef: { current: HTMLDivElement | null },
) {
  if (
    e.key !== "ArrowDown" &&
    e.key !== "ArrowUp" &&
    e.key !== "Home" &&
    e.key !== "End"
  ) {
    return;
  }
  const items = Array.from(
    menuRef.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    ) ?? [],
  );
  if (items.length === 0) return;
  const idx = items.indexOf(e.currentTarget);
  let target: HTMLElement | undefined;
  if (e.key === "ArrowDown") target = items[(idx + 1) % items.length];
  else if (e.key === "ArrowUp")
    target = items[(idx - 1 + items.length) % items.length];
  else if (e.key === "Home") target = items[0];
  else target = items[items.length - 1];
  e.preventDefault();
  target?.focus();
}

/**
 * DropdownItem — entrada del menú con `role="menuitem"`.
 *
 * Si recibe `href` renderiza un `<a>`, si no un `<button>`. Cierra el menu
 * al activarse cuando `Dropdown.closeOnSelect` está activo (por defecto).
 * Soporta navegación con ↑/↓/Home/End entre los items hermanos.
 */
export function DropdownItem(props: DropdownItemProps) {
  const { setOpen, triggerRef, menuRef, closeOnSelect } = useDropdown();

  const close = () => {
    if (!closeOnSelect) return;
    setOpen(false);
    triggerRef.current?.focus();
  };

  if (props.href !== undefined) {
    const {
      danger,
      active,
      className,
      onClick,
      onKeyDown,
      children,
      ...rest
    } = props;
    return (
      <a
        {...rest}
        role="menuitem"
        tabIndex={-1}
        className={cn(
          "ig-dropdown-item",
          danger && "ig-dropdown-item-danger",
          active && "ig-dropdown-item-active",
          className,
        )}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) close();
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (!e.defaultPrevented) handleNavKeys(e, menuRef);
        }}
      >
        {children}
      </a>
    );
  }

  const {
    danger,
    active,
    className,
    type = "button",
    onClick,
    onKeyDown,
    children,
    ...rest
  } = props;
  return (
    <button
      {...rest}
      type={type}
      role="menuitem"
      className={cn(
        "ig-dropdown-item",
        danger && "ig-dropdown-item-danger",
        active && "ig-dropdown-item-active",
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) close();
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!e.defaultPrevented) handleNavKeys(e, menuRef);
      }}
    >
      {children}
    </button>
  );
}
