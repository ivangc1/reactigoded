"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useSidebar } from "./SidebarContext";

interface CommonProps {
  /** Icono al inicio (siempre visible, incluso colapsada). */
  icon?: ReactNode;
  /** Marca el item como ruta/sección actual. Aplica `aria-current="page"`. */
  active?: boolean;
}

type AnchorItemProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    ref?: Ref<HTMLAnchorElement>;
  };

type ButtonItemProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };

export type SidebarItemProps = AnchorItemProps | ButtonItemProps;

/**
 * SidebarItem — entrada navegable. Renderiza `<a>` si recibe `href`,
 * `<button>` si no. El icono permanece visible en modo colapsado y el texto
 * lo oculta el CSS automáticamente.
 *
 * **D4 (RC1 gate review)**: `aria-label` se aplica condicionalmente:
 * - **Sidebar expandida**: el texto del item está en el a11y tree
 *   (visible + parseado por SR como nombre accesible). NO se aplica
 *   `aria-label` automático — duplicaría el nombre (anti-pattern ARIA
 *   APG: "if visible text serves as accessible name, do not add
 *   aria-label").
 * - **Sidebar colapsada**: CSS `.ig-sidebar-collapsed .ig-sidebar-text`
 *   con `display: none` saca el texto del a11y tree. SIN `aria-label`,
 *   el item queda sin nombre accesible (icono es `aria-hidden`). Por
 *   eso aplicamos `aria-label = children` cuando collapsed y children
 *   es string.
 *
 * Override explícito de `aria-label` siempre tiene prioridad sobre
 * cualquier fallback automático.
 *
 * SidebarItem es client component porque consume `useSidebar()` para
 * detectar el estado collapsed. Debe estar dentro de `<Sidebar>` —
 * `useSidebar` lanza si no hay ancestor (D11.4 regla DS-wide).
 */
export function SidebarItem(props: SidebarItemProps) {
  const { collapsed } = useSidebar();

  if (props.href !== undefined) {
    const {
      icon,
      active,
      className,
      children,
      ref,
      "aria-label": ariaLabel,
      ...rest
    } = props;
    const fallbackLabel =
      ariaLabel ??
      (collapsed && typeof children === "string" ? children : undefined);
    return (
      <a
        {...rest}
        ref={ref}
        aria-current={active ? "page" : undefined}
        aria-label={fallbackLabel}
        className={cn(
          "ig-sidebar-item",
          active && "ig-sidebar-item-active",
          className,
        )}
      >
        {icon !== undefined && (
          <span className="ig-sidebar-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="ig-sidebar-text">{children}</span>
      </a>
    );
  }

  const {
    icon,
    active,
    className,
    type = "button",
    children,
    ref,
    "aria-label": ariaLabel,
    ...rest
  } = props;
  const fallbackLabel =
    ariaLabel ??
    (collapsed && typeof children === "string" ? children : undefined);
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-current={active ? "page" : undefined}
      aria-label={fallbackLabel}
      className={cn(
        "ig-sidebar-item",
        active && "ig-sidebar-item-active",
        className,
      )}
    >
      {icon !== undefined && (
        <span className="ig-sidebar-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ig-sidebar-text">{children}</span>
    </button>
  );
}
