import {
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";

type CommonProps = {
  className?: string | undefined;
};

type AsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    /** Si se proporciona `href`, se renderiza como `<a>`. */
    href: string;
    ref?: Ref<HTMLAnchorElement> | undefined;
  };

type AsDiv = CommonProps &
  HTMLAttributes<HTMLDivElement> & {
    href?: undefined;
    ref?: Ref<HTMLDivElement> | undefined;
  };

export type NavbarLogoProps = AsAnchor | AsDiv;

/**
 * NavbarLogo — área del logo y nombre. Por defecto es `<div>`; si se pasa
 * `href` se renderiza como `<a>` (clicable).
  *
 * @server-safe
 */
export function NavbarLogo(props: NavbarLogoProps) {
  if (props.href !== undefined) {
    const { className, ref, children, ...rest } = props;
    return (
      <a ref={ref} className={cn("ig-navbar-logo", className)} {...rest}>
        {children}
      </a>
    );
  }
  const { className, ref, children, ...rest } = props;
  return (
    <div ref={ref} className={cn("ig-navbar-logo", className)} {...rest}>
      {children}
    </div>
  );
}
