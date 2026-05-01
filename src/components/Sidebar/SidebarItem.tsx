import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { cn } from "@/utils/cn";

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
 * Cuando `children` es un string se aplica como `aria-label` automático para
 * que el item siga teniendo nombre accesible en modo colapsado (donde el
 * texto está oculto). Si pasas un `children` no-string sin `aria-label`,
 * añádelo tú.
 */
export function SidebarItem(props: SidebarItemProps) {
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
      ariaLabel ?? (typeof children === "string" ? children : undefined);
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
    ariaLabel ?? (typeof children === "string" ? children : undefined);
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
