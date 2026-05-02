import { useEffect } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, Ref } from "react";
import { cn } from "@/utils/cn";
import { useTabs } from "./TabsContext";

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Identificador único del tab. Debe coincidir con el `value` del `TabPanel` correspondiente. */
  value: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Tab — botón `role="tab"` dentro de `TabList`. Incluye `aria-selected`,
 * `aria-controls` y roving tabindex (sólo el activo es focuseable directamente).
 *
 * Keyboard:
 *   - ←/→ (horizontal) o ↑/↓ (vertical): mueve foco al sibling y lo activa.
 *   - Home/End: salta al primero/último activable.
 */
export function Tab({
  value,
  className,
  children,
  disabled,
  onKeyDown,
  ref,
  ...rest
}: TabProps) {
  const { selected, setSelected, baseId, orientation, register } = useTabs();
  const isActive = selected === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  // Registra este Tab al montar; el primer Tab montado es la selección
  // inicial cuando el consumer omite `value` y `defaultValue`.
  useEffect(() => register(value), [register, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    const next = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const prev = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";

    const tablist = e.currentTarget.parentElement;
    if (!tablist) return;
    const tabs = Array.from(
      tablist.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not([disabled])',
      ),
    );
    const idx = tabs.indexOf(e.currentTarget);
    if (idx === -1) return;

    let target: HTMLButtonElement | undefined;
    if (e.key === next) target = tabs[(idx + 1) % tabs.length];
    else if (e.key === prev)
      target = tabs[(idx - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") target = tabs[0];
    else if (e.key === "End") target = tabs[tabs.length - 1];
    else return;

    e.preventDefault();
    target?.focus();
    target?.click();
  };

  return (
    <button
      {...rest}
      ref={ref}
      role="tab"
      type="button"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      className={cn("ig-tab", isActive && "ig-tab-active", className)}
      onClick={(e) => {
        rest.onClick?.(e);
        if (!e.defaultPrevented && !disabled) setSelected(value);
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </button>
  );
}
