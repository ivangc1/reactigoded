import type { ButtonHTMLAttributes, KeyboardEvent, Ref } from "react";
import { cn } from "@/utils/cn";
import { useDropdown } from "./DropdownContext";
import { NAVIGABLE_ITEM_SELECTOR } from "./dropdownSelectors";

export interface DropdownTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DropdownTrigger — botón que abre/cierra el menú.
 *
 * Click toggleea. ↓/Enter/Space abren y enfocan el primer item; ↑ abre y
 * enfoca el último. Aplica `aria-haspopup="menu"` y `aria-expanded`.
 */
export function DropdownTrigger({
  className,
  children,
  type = "button",
  onClick,
  onKeyDown,
  ref,
  ...rest
}: DropdownTriggerProps) {
  const { open, setOpen, triggerId, menuId, triggerRef, menuRef } =
    useDropdown();

  const handleRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = node;
  };

  const focusItem = (which: "first" | "last") => {
    // Usa requestAnimationFrame para esperar a que el menu esté visible.
    requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>(
        NAVIGABLE_ITEM_SELECTOR,
      );
      if (!items || items.length === 0) return;
      (which === "first" ? items[0] : items[items.length - 1])?.focus();
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) setOpen(true);
      focusItem("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      focusItem("last");
    }
  };

  return (
    <button
      {...rest}
      ref={handleRef}
      id={triggerId}
      type={type}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      className={cn("ig-dropdown-trigger", className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) setOpen(!open);
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </button>
  );
}
