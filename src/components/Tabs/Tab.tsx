import { useEffect, useLayoutEffect } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, Ref } from "react";
import { cn } from "@/utils/cn";
import { useTabs } from "./TabsContext";

// useLayoutEffect en cliente, useEffect en server (evita warning SSR de
// React: "useLayoutEffect does nothing on the server"). En cliente
// queremos que el register corra ANTES del primer paint para que el
// auto-select del primer Tab no produzca un flicker visible donde
// inicialmente ningún tab es activo. Convención del ecosistema React:
// el fallback en SSR es `useEffect`, no un noop — preserva el
// contrato de los hooks (deps válidos, cleanup) cuando el componente
// se renderiza en server con un runtime que sí soporta efectos.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  // inicial cuando el consumer omite `value` y `defaultValue`. Usamos
  // useLayoutEffect (en cliente) para que el register corra ANTES del
  // primer paint y se evite el flicker "ningún tab activo" en el primer
  // frame visible. En SSR cae a noop (no hay paint que proteger).
  useIsoLayoutEffect(() => register(value), [register, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    const next = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const prev = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";

    // Buscamos el tablist por role en lugar de parentElement para que
    // el componente sobreviva a wrappers intermedios (ej. un <span>
    // decorativo entre TabList y Tab que un consumer pueda introducir).
    const tablist = e.currentTarget.closest('[role="tablist"]');
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
