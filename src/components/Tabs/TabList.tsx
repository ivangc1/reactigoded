import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useTabs } from "./TabsContext";

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * TabList — contenedor `role="tablist"` para `Tab`s. Hereda la orientación
 * del `Tabs` padre. Pasa `aria-label` para etiquetar el tablist (i18n vía
 * el atributo HTML estándar).
 */
export function TabList({
  className,
  children,
  ref,
  ...rest
}: TabListProps) {
  const { orientation } = useTabs();
  // 1.0.0-beta.4: aria-label del rest (HTML std). Antes prop ariaLabel.
  return (
    <div
      {...rest}
      ref={ref}
      role="tablist"
      aria-orientation={orientation}
      className={cn("ig-tabs-list", className)}
    >
      {children}
    </div>
  );
}
