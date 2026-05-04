import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useDropdown } from "./DropdownContext";

export interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * DropdownMenu — contenedor con `role="menu"` para los items.
 * Su visibilidad la controla el CSS de `.ig-dropdown.ig-dropdown-open`.
 */
export function DropdownMenu({
  className,
  children,
  ref,
  ...rest
}: DropdownMenuProps) {
  const { menuId, triggerId, menuRef } = useDropdown();

  const handleRef = (node: HTMLDivElement | null) => {
    menuRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  return (
    <div
      {...rest}
      ref={handleRef}
      id={menuId}
      role="menu"
      aria-labelledby={triggerId}
      className={cn("ig-dropdown-menu", className)}
    >
      {children}
    </div>
  );
}
