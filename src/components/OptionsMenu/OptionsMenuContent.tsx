import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useOptionsMenu } from "./OptionsMenuContext";

export interface OptionsMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * OptionsMenuContent — contenedor con `role="menu"` para los items.
 * Su visibilidad la controla el CSS de `.ig-options-menu.ig-options-menu-open`.
 */
export function OptionsMenuContent({
  className,
  children,
  ref,
  ...rest
}: OptionsMenuContentProps) {
  const { menuId, triggerId, menuRef } = useOptionsMenu();

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
      className={cn("ig-options-menu-content", className)}
    >
      {children}
    </div>
  );
}
