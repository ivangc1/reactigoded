import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useTabs } from "./TabsContext";

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  /** Texto a11y para el tablist. */
  ariaLabel?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * TabList — contenedor `role="tablist"` para `Tab`s. Hereda la orientación
 * del `Tabs` padre.
 */
export function TabList({
  ariaLabel,
  className,
  children,
  ref,
  ...rest
}: TabListProps) {
  const { orientation } = useTabs();
  return (
    <div
      {...rest}
      ref={ref}
      role="tablist"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      className={cn("ig-tabs-list", className)}
    >
      {children}
    </div>
  );
}
