"use client";

import type { ButtonHTMLAttributes, KeyboardEvent, Ref } from "react";
import { cn } from "@/utils/cn";
import { useIsoLayoutEffect } from "@/utils/useIsoLayoutEffect";
import { useTabs } from "./TabsContext";

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Identificador único del tab. Debe coincidir con el `value` del `TabsContent` correspondiente. */
  value: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * TabsTrigger — botón `role="tab"` dentro de `TabsList`. Incluye `aria-selected`,
 * `aria-controls` y roving tabindex (sólo el activo es focuseable directamente).
 *
 * Keyboard:
 *   - ←/→ (horizontal) o ↑/↓ (vertical): mueve foco al sibling y lo activa.
 *   - Home/End: salta al primero/último activable.
 */
export function TabsTrigger({
  value,
  className,
  children,
  disabled,
  onKeyDown,
  ref,
  ...rest
}: TabsTriggerProps) {
  const {
    selected,
    setSelected,
    baseId,
    orientation,
    register,
    selectedExists,
    firstRegistered,
  } = useTabs();
  const isActive = selected === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;
  // H-26: si el `selected` del Tabs no matchea ningún TabsTrigger montado
  // (controlled con value inválido), el PRIMER TabsTrigger registrado entra
  // en modo fallback con tabIndex=0 para mantener el tablist accesible
  // por teclado. Sin esto, todos los Tabs tendrían tabIndex=-1 y el
  // tablist quedaría sin tab stop. NO afecta a aria-selected (sigue
  // false en todos), solo al tab stop.
  const isFirstFallback = !selectedExists && value === firstRegistered;

  // Registra este TabsTrigger al montar; el primer TabsTrigger montado es la selección
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
    // decorativo entre TabsList y TabsTrigger que un consumer pueda introducir).
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
      tabIndex={isActive || isFirstFallback ? 0 : -1}
      disabled={disabled}
      className={cn("ig-tabs-trigger", isActive && "ig-tabs-trigger-active", className)}
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
