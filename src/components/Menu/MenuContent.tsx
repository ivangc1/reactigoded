import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useMenu } from "./MenuContext";

export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * MenuContent — contenedor con `role="menu"` para los items.
 * Su visibilidad la controla el CSS de `.ig-menu.ig-menu-open`.
 */
export function MenuContent({
  className,
  children,
  ref,
  ...rest
}: MenuContentProps) {
  const { menuId, triggerId, menuRef } = useMenu();

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
      className={cn("ig-menu-content", className)}
    >
      {children}
    </div>
  );
}
