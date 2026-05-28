"use client";

import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useTabs } from "./TabsContext";

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Identificador del tab al que pertenece este panel. */
  value: string;
  /** Si `true`, el panel se mantiene en el DOM aunque no sea el activo (oculto con `hidden`). */
  keepMounted?: boolean | undefined;
  ref?: Ref<HTMLDivElement> | undefined;
}

/**
 * TabsContent — contenedor `role="tabpanel"`. Por defecto sólo se renderiza
 * cuando su `value` coincide con el tab activo; con `keepMounted` se mantiene
 * en el DOM y se oculta vía atributo `hidden` (útil si necesitas conservar
 * estado interno del panel al cambiar de tab).
 */
export function TabsContent({
  value,
  keepMounted = false,
  className,
  children,
  ref,
  ...rest
}: TabsContentProps) {
  const { selected, baseId } = useTabs();
  const isActive = selected === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (!isActive && !keepMounted) return null;

  return (
    <div
      {...rest}
      ref={ref}
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!isActive}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        "ig-tabs-content",
        isActive && "ig-tabs-content-active",
        className,
      )}
    >
      {children}
    </div>
  );
}
