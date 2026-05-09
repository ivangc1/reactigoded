import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useDropdown } from "./DropdownContext";
import { NAVIGABLE_ITEM_SELECTOR } from "./dropdownSelectors";

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
    menuRef.current?.querySelectorAll<HTMLElement>(NAVIGABLE_ITEM_SELECTOR) ??
      [],
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
 *
 * **Roving tabindex consistente desde 1.0.0-beta.3**: tanto buttons como
 * anchors usan `tabIndex={-1}` (los menuitems no deben ser tab stops del
 * documento; el foco entra al menú vía el trigger). Items con
 * `aria-disabled="true"` se saltan en la nav por flechas Y bloquean clicks.
 */
export function DropdownItem(props: DropdownItemProps) {
  const { setOpen, triggerRef, menuRef, closeOnSelect } = useDropdown();

  const close = () => {
    if (!closeOnSelect) return;
    setOpen(false);
    triggerRef.current?.focus();
  };

  // True si el item está marcado como aria-disabled. Los browsers no
  // bloquean clicks por defecto en estos items (no es como `disabled` en
  // <button>), así que lo hacemos manualmente.
  const isAriaDisabled = props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";

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
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          if (isAriaDisabled) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
          if (!e.defaultPrevented) close();
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          // Activación por teclado: aria-disabled bloquea Enter+Space.
          if (isAriaDisabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            return;
          }
          // H-19 (gate review, WAI-ARIA APG menu-button-links):
          // role="menuitem" debe activarse con Enter Y Space. Para
          // <a>, Enter dispara click nativo pero Space NO — sintetizar
          // el click manualmente. El click handler ya cubre aria-disabled,
          // onClick consumer y close().
          if (e.key === " ") {
            e.preventDefault();
            e.currentTarget.click();
            return;
          }
          handleNavKeys(e, menuRef);
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
      tabIndex={-1}
      className={cn(
        "ig-dropdown-item",
        danger && "ig-dropdown-item-danger",
        active && "ig-dropdown-item-active",
        className,
      )}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (isAriaDisabled) {
          e.preventDefault();
          return;
        }
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
